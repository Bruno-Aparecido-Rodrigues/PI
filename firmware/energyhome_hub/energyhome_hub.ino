/*
  Fluxo de registro/pareamento (igual ao test_connection):
  - Ao ligar, escreve em /hubs/{hubId}/registered "prova de vida", sem
    dado de consumo. O app usa isso pra confirmar que o hubId existe de
    verdade antes de aceitar o pareamento.
  - Fica checando /hubs/{hubId}/claimed. Enquanto for false, NÃO manda
    nenhuma leitura de consumo só continua se registrando.
  - Quando o app pareia (claimed = true), passa a mandar as leituras reais
    do PZEM. Como esse check só é possível com internet, se o Wi-Fi cair
    DEPOIS de já confirmado o pareamento, o ESP32 continua tratando o hub
    como pareado (usa o último estado conhecido) em vez de parar de medir.

  O que esse firmware manda, e com que frequência:
  - /hubs/{hubId}/current     a cada ~3s  → medidor "ao vivo" do Dashboard
                                             (não é bufferizado é só o
                                             valor "agora", não faz sentido
                                             reenviar um "agora" atrasado)
  - /hubs/{hubId}/readings    a cada ~60s → histórico usado pra calcular kWh
                                             (ESTE é bufferizado se faltar
                                             internet no momento do envio)
    Cada leitura leva { watts, energyKwh, timestamp }. O energyKwh é o
    CONTADOR de energia do próprio PZEM (kWh acumulados desde sempre, igual
    ao relógio de luz da casa). O app calcula o consumo de um período pela
    DIFERENÇA desse contador entre duas leituras, o que é exato mesmo que
    o ESP32 fique um tempo sem mandar nada (o PZEM continua contando
    enquanto a tomada estiver ligada). Por isso o firmware NUNCA deve
    chamar pzem.resetEnergy().

  Consumo de internet / cota do Firebase (plano gratuito: 10 GB de download
  por mês):
  - Cada conexão HTTPS NOVA faz o servidor mandar o certificado (~3-4 KB),
    e o Firebase conta isso como download. Por isso o firmware usa UMA
    conexão só, reaproveitada em todas as requisições (keep-alive), em vez
    de abrir uma nova a cada envio.
  - /registered é gravado só uma vez, ao ligar; /claimed é conferido a cada
    60 s depois de pareado (antes de parear, a cada ~5 s).
  - A resposta de cada requisição precisa ser lida até o fim pra conexão
    poder ser reaproveitada. Por isso as gravações NÃO usam ?print=silent:
    a resposta 204 dele não diz o tamanho, e a biblioteca HTTPClient do
    ESP32 fica esperando o servidor fechar a conexão (travava o envio do
    /current e o app mostrava o hub como desconectado). Sem ele o Firebase
    devolve os poucos bytes gravados, com o tamanho certo.

  Buffer offline como funciona:
  - Cada leitura de /readings que falha ao enviar (sem Wi-Fi, ou o POST deu
    erro) é gravada numa linha do arquivo /buffer.csv na flash (formato
    simples "watts,energyKwh,timestamp"; linhas antigas no formato
    "watts,timestamp" continuam sendo lidas).
  - A cada volta do loop com Wi-Fi conectado, antes de mandar a leitura
    atual, o firmware tenta esvaziar o buffer (reenviar as leituras
    pendentes, em ordem, mais antiga primeiro).
  - Pra não encher a flash numa queda de internet muito longa, o buffer
    guarda no máximo MAX_BUFFERED_READINGS linhas se passar disso, as
    leituras mais antigas são descartadas (prioriza manter o histórico
    recente a travar o dispositivo).
  - Se o Firebase RECUSAR uma leitura (HTTP 4xx, ex: regra de segurança),
    ela é descartada em vez de ir pro buffer: reenviar não adiantaria, e
    ela travaria a fila pra sempre, bloqueando todas as leituras depois
    dela.

  Quedas de Wi-Fi e de energia:
  - O ESP32 nem sempre se reconecta sozinho quando o roteador some por uns
    minutos (o roteador reiniciou, por exemplo): a reconexão automática da
    biblioteca às vezes desiste. Por isso o loop confere o Wi-Fi e, sem
    conexão, força uma nova tentativa a cada 30 s. Se ficar 30 min sem
    Wi-Fi, reinicia o ESP32 (o buffer está na flash e não se perde).
  - Um "cão de guarda" (task watchdog) reinicia o ESP32 se o loop travar por
    mais de 3 min em alguma biblioteca (Wi-Fi, HTTPS…).
  - Ao ligar, o hub NÃO espera o Wi-Fi pra começar a medir: tenta por 20 s
    e segue; as leituras vão pro buffer até a rede voltar.
  - O ESP32 não tem relógio com bateria: depois de faltar energia, só sabe a
    hora quando o NTP responde. Até lá, as leituras vão pro buffer com o
    tempo desde que ligou ("R<boot>:<millis>") e ganham a hora certa quando
    o NTP sincroniza. Se o ESP32 desligar de novo antes disso, essas
    leituras são descartadas (o consumo não se perde: o contador do PZEM
    continua somando e a próxima leitura traz a diferença).
  - O "pareado" fica gravado na flash (/pareado), pra o hub continuar
    medindo mesmo se religar sem internet.

  Fiação do PZEM:
    ESP32 RX2 (GPIO16)  <--  PZEM TX
    ESP32 TX2 (GPIO17)  -->  PZEM RX
    ESP32 GND           <->  PZEM GND
    ESP32 VIN (5V)      -->  PZEM 5V
    PZEM Fase/Neutro    -->  tomada 110V/220V (o PZEM só responde pelo UART
                             com a AC ligada, não só com o 5V)
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <PZEM004Tv30.h>
#include <LittleFS.h>
#include "esp_wifi.h"
#include "esp_task_wdt.h"
#include "time.h"

const char* WIFI_SSID = "wifi-nome";
const char* WIFI_PASSWORD = "senha";
const char* DATABASE_URL = "banco";


// MAC VIRTUAL, necessário porque esta placa não tem MAC de fábrica válido (vem zerado).
uint8_t VIRTUAL_MAC[] = { 0x02, 0xA7, 0x3C, 0x91, 0x5E, 0x48 };

String hubId;


// PZEM-004T — Serial2 dedicada (pinos do ESP32)
#define ESP_RX_PIN 16
#define ESP_TX_PIN 17
PZEM004Tv30 pzem(Serial2, ESP_RX_PIN, ESP_TX_PIN);

// ============================================================================
// NTP — hora real, sincronizada assim que o Wi-Fi conecta. Depois de
// sincronizada uma vez, o relógio interno do ESP32 continua contando
// sozinho (com um pequeno desvio) mesmo se a internet cair — é o que
// permite bufferizar leituras offline com timestamp real, não zerado.
// ============================================================================
const char* NTP_SERVER_1 = "pool.ntp.org";
const char* NTP_SERVER_2 = "time.google.com";
const long GMT_OFFSET_SEC = -3 * 3600; // horário de Brasília (UTC-3, sem horário de verão)
const int DAYLIGHT_OFFSET_SEC = 0;

// Temporização dos envios
const unsigned long CURRENT_INTERVAL_MS = 3000;   // /current  a cada 3s
const unsigned long READING_INTERVAL_MS = 60000;  // /readings a cada 60s

unsigned long lastCurrentSentAt = 0;
unsigned long lastReadingSentAt = 0;

// Último estado de pareamento confirmado com o Firebase. Usado como
// "memória" enquanto o Wi-Fi está fora do ar (ver isClaimed()).
bool cachedClaimed = false;
bool claimCheckedOnce = false;
unsigned long lastClaimCheckAt = 0;
const unsigned long CLAIM_CHECK_INTERVAL_MS = 60000; // depois de pareado

// /registered só precisa ser gravado uma vez por vez que o hub liga
bool registeredThisBoot = false;

// Uma conexão HTTPS só, reaproveitada em todas as requisições (keep-alive).
// Abrir uma conexão nova a cada envio custava ~3-4 KB de certificado por
// requisição na cota de download do Firebase (~300 MB/dia).
WiFiClientSecure secureClient;
HTTPClient http;
bool httpReady = false;          // conexão aberta e pronta pra reaproveitar
unsigned long ultimoSucessoEm = 0; // última requisição que teve resposta
// Conexão parada há mais que isso pode ter morrido sem aviso (queda de
// internet): fecha e abre outra antes de usar. Escrever numa conexão HTTPS
// morta pode travar a biblioteca pra sempre dentro do envio (foi o que
// parou o hub em 04/11 às 14:29, quando o Wi-Fi voltou).
const unsigned long CONEXAO_PARADA_MS = 20000;
unsigned long lastRequestMs = 0; // quanto a última requisição demorou (pro Serial)

// Supervisão do Wi-Fi (ver manterWiFi())
const unsigned long WIFI_RETRY_MS = 30000;              // sem Wi-Fi: tenta de novo a cada 30 s
const unsigned long WIFI_RESTART_MS = 30UL * 60000UL;   // 30 min sem Wi-Fi: reinicia o ESP32
bool wifiEstavaConectado = false;
unsigned long wifiPerdidoDesde = 0;
unsigned long ultimaTentativaWifi = 0;
bool wifiPerdidoMarcado = false;

// Wi-Fi conectado mas sem internet: cada envio espera o tempo limite (vários
// segundos). Depois de uma falha de rede, passa 20 s sem tentar, guardando
// direto no buffer, pra o loop manter o ritmo de 1 leitura por minuto.
const unsigned long PAUSA_REDE_MS = 20000;
unsigned long redeFalhouEm = 0;
bool redeEmPausa = false;

// Cão de guarda: reinicia se o loop ficar travado mais que isso
const int WDT_TIMEOUT_S = 180;

// Hora: antes disso (nov/2023) o relógio ainda não foi acertado pelo NTP
const time_t HORA_MINIMA_VALIDA = 1700000000;
uint32_t bootId = 0; // identifica esta vez que o ESP32 ligou (leituras sem hora certa)

// Resultado de um envio de /readings (ver sendReading()).
enum SendResult { SEND_OK, SEND_REJECTED, SEND_FAILED };


// Buffer offline (LittleFS)
const char* BUFFER_PATH = "/buffer.csv";
const char* PAREADO_PATH = "/pareado"; // existe = hub já confirmado como pareado
const int MAX_BUFFERED_READINGS = 500; // ~8h de histórico a 1 leitura/min

void setup() {
  Serial.begin(115200);
  delay(1000);

  if (!LittleFS.begin(true)) { // true = formata automaticamente se não conseguir montar
    Serial.println("AVISO: não consegui montar o LittleFS. Buffer offline ficará desativado.");
  }

  iniciarWatchdog();
  bootId = esp_random();

  // Último estado de pareamento conhecido (sobrevive à falta de energia)
  cachedClaimed = LittleFS.exists(PAREADO_PATH);

  secureClient.setInsecure();
  secureClient.setHandshakeTimeout(30); // segundos (o padrão é 120)
  http.setReuse(true);

  setupWiFiAndHubId();
  syncTime();

  Serial.println("Pronto. Aguardando leituras do PZEM e checando pareamento...");
}

void loop() {
  esp_task_wdt_reset();
  manterWiFi();
  bool horaOk = horaValida();

  if (podeUsarRede() && horaOk && !registeredThisBoot) {
    registeredThisBoot = registerHub();
  }

  if (!isClaimed()) {
    Serial.println("Aguardando pareamento no app (claimed = false)...");
    delay(5000);
    return;
  }

  float watts = readPowerWatts();
  if (isnan(watts)) {
    Serial.println("ERRO: não consegui ler o PZEM (confira fiação e se a AC está ligada).");
    delay(5000);
    return;
  }

  // Sempre que há rede (e hora certa), aproveita pra esvaziar o que ficou
  // pendente do buffer antes de mandar a leitura de agora, assim o
  // histórico é reenviado na ordem certa.
  if (podeUsarRede() && horaOk) {
    flushBuffer();
  }

  unsigned long now = millis();

  if (now - lastCurrentSentAt >= CURRENT_INTERVAL_MS) {
    if (podeUsarRede() && horaOk) {
      sendCurrent(watts);
    } else if (WiFi.status() != WL_CONNECTED) {
      Serial.println("Wi-Fi desconectado, pulando /current (não é bufferizado).");
    }
    lastCurrentSentAt = now;
  }

  if (now - lastReadingSentAt >= READING_INTERVAL_MS) {
    // Sem hora certa (religou sem internet), a leitura vai pro buffer com o
    // tempo desde que ligou (ts = 0) e ganha a hora quando o NTP acertar.
    unsigned long long ts = horaOk ? nowUnixMs() : 0;
    float energyKwh = readEnergyKwh(); // pode vir NaN se a leitura falhar; aí vai só com watts
    SendResult result = (podeUsarRede() && horaOk) ? sendReading(watts, energyKwh, ts) : SEND_FAILED;
    if (result == SEND_FAILED) {
      bufferReading(watts, energyKwh, ts);
    }
    lastReadingSentAt = now;
  }

  delay(1000);
}

// Setup: Wi-Fi + MAC virtual + hubId
void setupWiFiAndHubId() {
  WiFi.mode(WIFI_STA);

  esp_err_t macResult = esp_wifi_set_mac(WIFI_IF_STA, VIRTUAL_MAC);
  if (macResult == ESP_OK) {
    Serial.println("MAC virtual configurado com sucesso.");
  } else {
    Serial.print("ERRO ao configurar MAC virtual. Codigo: ");
    Serial.println(macResult);
  }

  char macString[13];
  snprintf(macString, sizeof(macString), "%02X%02X%02X%02X%02X%02X",
           VIRTUAL_MAC[0], VIRTUAL_MAC[1], VIRTUAL_MAC[2],
           VIRTUAL_MAC[3], VIRTUAL_MAC[4], VIRTUAL_MAC[5]);
  hubId = String(macString);

  if (hubId.length() == 0 || hubId == "000000000000") {
    Serial.println("ERRO: hubId veio vazio ou zerado. O MAC virtual não foi usado corretamente.");
    while (true) delay(1000);
  }

  Serial.println();
  Serial.println("========================================");
  Serial.print("ID deste hub (use na tela \"Adicionar Dispositivo\" do app): ");
  Serial.println(hubId);
  Serial.println("========================================");

  WiFi.persistent(false);     // não regrava a senha na flash a cada tentativa
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando ao Wi-Fi");
  // Espera no máximo 20 s: sem Wi-Fi, o hub segue medindo e guardando no
  // buffer, e o loop continua tentando (ver manterWiFi()).
  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 20000) {
    esp_task_wdt_reset();
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Conectado! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Sem Wi-Fi por enquanto. Medindo e guardando no buffer; o loop segue tentando.");
  }
}

/** Confere o Wi-Fi a cada volta do loop. Sem conexão, força uma reconexão a
 *  cada 30 s (a automática da biblioteca às vezes desiste depois que o
 *  roteador some por uns minutos) e, depois de 30 min, reinicia o ESP32.
 *  Quando a conexão volta, descarta a conexão HTTPS antiga, que morreu. */
void manterWiFi() {
  unsigned long agora = millis();
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiEstavaConectado) {
      if (wifiPerdidoMarcado) {
        Serial.print("Wi-Fi de volta depois de ");
        Serial.print((agora - wifiPerdidoDesde) / 1000);
        Serial.println(" s.");
      }
      http.end();
      secureClient.stop();
      httpReady = false;
      redeEmPausa = false;
      wifiEstavaConectado = true;
      // (a conexão HTTPS de antes da queda morreu: nunca escrever nela)
    }
    wifiPerdidoMarcado = false;
    return;
  }

  if (!wifiPerdidoMarcado) {
    Serial.println("Wi-Fi caiu. Guardando as leituras no buffer até voltar.");
    wifiEstavaConectado = false;
    wifiPerdidoMarcado = true;
    wifiPerdidoDesde = agora;
    ultimaTentativaWifi = agora;
    return;
  }

  if (agora - wifiPerdidoDesde >= WIFI_RESTART_MS) {
    Serial.println("30 min sem Wi-Fi: reiniciando o ESP32 (o buffer fica guardado na flash).");
    delay(500);
    ESP.restart();
  }

  if (agora - ultimaTentativaWifi >= WIFI_RETRY_MS) {
    ultimaTentativaWifi = agora;
    Serial.println("Ainda sem Wi-Fi: tentando reconectar...");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

/** Liga o cão de guarda (task watchdog) pro loop: se ele não for
 *  "alimentado" por WDT_TIMEOUT_S segundos (travou em alguma biblioteca),
 *  o ESP32 reinicia sozinho. Funciona nas versões 2.x e 3.x do core ESP32. */
void iniciarWatchdog() {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  esp_task_wdt_config_t config = {};
  config.timeout_ms = WDT_TIMEOUT_S * 1000;
  config.idle_core_mask = 0;
  config.trigger_panic = true;
  if (esp_task_wdt_reconfigure(&config) != ESP_OK) {
    esp_task_wdt_init(&config);
  }
#else
  esp_task_wdt_init(WDT_TIMEOUT_S, true);
#endif
  esp_task_wdt_add(NULL);
}

// ============================================================================
// NTP: sincroniza a hora real assim que há internet
// ============================================================================
void syncTime() {
  // O ESP32 continua tentando o NTP sozinho em segundo plano: se não
  // acertar agora (sem internet), acerta quando a rede voltar.
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER_1, NTP_SERVER_2);

  Serial.print("Sincronizando hora via NTP");
  unsigned long inicio = millis();
  while (!horaValida() && WiFi.status() == WL_CONNECTED && millis() - inicio < 10000) {
    esp_task_wdt_reset();
    Serial.print(".");
    delay(500);
  }
  Serial.println();

  if (horaValida()) {
    Serial.println("Hora sincronizada.");
  } else {
    Serial.println("Ainda sem hora certa: as leituras vão pro buffer até o NTP responder.");
  }
}

/** Vale a pena tentar a rede agora? (Wi-Fi conectado e fora da pausa que
 *  vem depois de uma falha de rede, ver PAUSA_REDE_MS) */
bool podeUsarRede() {
  if (redeEmPausa && millis() - redeFalhouEm >= PAUSA_REDE_MS) redeEmPausa = false;
  return WiFi.status() == WL_CONNECTED && !redeEmPausa;
}

/** O relógio já foi acertado pelo NTP? (antes disso ele marca 1970) */
bool horaValida() {
  return time(nullptr) > HORA_MINIMA_VALIDA;
}

/** Timestamp atual em milissegundos desde 1970. Continua contando
 *  mesmo sem internet, a partir da última sincronização NTP bem-sucedida. */
unsigned long long nowUnixMs() {
  time_t now;
  time(&now);
  return (unsigned long long)now * 1000ULL;
}

// ============================================================================
// Leitura do sensor
// ============================================================================
float readPowerWatts() {
  return pzem.power();
}

/** Contador de energia acumulada do PZEM, em kWh (resolução de 1 Wh). */
float readEnergyKwh() {
  return pzem.energy();
}

// ============================================================================
// Firebase: registered / claimed / current / readings
// ============================================================================

/** Faz uma requisição ao Firebase pela conexão reaproveitada.
 *  - Na primeira vez (ou depois de uma falha) chama http.begin(), que abre a
 *    conexão HTTPS; nas seguintes só troca o caminho com http.setURL(), e a
 *    mesma conexão é usada (chamar begin() de novo fecharia a anterior).
 *  - Se a conexão tiver caído (o servidor fecha conexões paradas), fecha,
 *    abre outra e tenta de novo uma vez.
 *  Devolve o código HTTP (ou negativo em erro de rede). "response" pode ser
 *  nullptr quando a resposta não interessa. */
int firebaseRequest(const char* method, const String& path, const String& body, String* response) {
  unsigned long startedAt = millis();
  if (httpReady && millis() - ultimoSucessoEm > CONEXAO_PARADA_MS) {
    http.end();
    secureClient.stop();
    httpReady = false;
  }
  for (int attempt = 0; attempt < 2; attempt++) {
    esp_task_wdt_reset();
    if (!httpReady) {
      httpReady = http.begin(secureClient, String(DATABASE_URL) + path);
      if (!httpReady) {
        secureClient.stop();
        continue;
      }
    } else {
      http.setURL(path); // mesma conexão, só troca o caminho
    }
    http.addHeader("Content-Type", "application/json");
    int httpCode = http.sendRequest(method, body);
    if (httpCode > 0) {
      int size = http.getSize(); // -1 = o servidor não disse o tamanho
      if (httpCode == 204 || size == 0) {
        // sem corpo: nada pra ler, a conexão já está livre
        if (response) *response = "";
      } else if (size > 0 || response) {
        // Lê a resposta inteira, pra conexão ficar livre pra próxima
        String text = http.getString();
        if (response) *response = text;
      } else {
        // Tamanho desconhecido e a resposta não interessa: ler esperaria o
        // servidor fechar a conexão. Fecha logo e a próxima abre outra.
        http.end();
        secureClient.stop();
        httpReady = false;
      }
      lastRequestMs = millis() - startedAt;
      ultimoSucessoEm = millis();
      return httpCode;
    }
    // Conexão caiu: fecha tudo e a próxima tentativa abre uma nova
    http.end();
    secureClient.stop();
    httpReady = false;
  }
  // As duas tentativas falharam: provavelmente sem internet. Pausa a rede
  // por PAUSA_REDE_MS (ver loop).
  redeFalhouEm = millis();
  redeEmPausa = true;
  return -1;
}

/** Escreve uma "prova de vida", só confirma que esse hubId existe.
 *  Devolve true se o Firebase aceitou (aí não precisa repetir até religar). */
bool registerHub() {
  int httpCode = firebaseRequest("PUT", "/hubs/" + hubId + "/registered.json", String(nowUnixMs()), nullptr);
  Serial.print("Registro do hub - HTTP: ");
  Serial.println(httpCode);
  return httpCode == 200 || httpCode == 204;
}

/** Confere no Firebase se esse hub já foi pareado com alguma conta.
 *  Sem Wi-Fi não dá pra confirmar nada agora, então mantém o último
 *  estado conhecido em vez de assumir "não pareado" (o que faria o
 *  dispositivo parar de medir toda vez que a internet oscilasse).
 *  Depois de pareado, só pergunta de novo a cada 60 s. */
bool isClaimed() {
  if (!podeUsarRede()) {
    return cachedClaimed;
  }
  unsigned long now = millis();
  // Depois de pareado, só pergunta de novo a cada 60 s (também quando a
  // última tentativa falhou, pra não travar o loop com a internet fora)
  if (cachedClaimed && lastClaimCheckAt != 0 && now - lastClaimCheckAt < CLAIM_CHECK_INTERVAL_MS) {
    return cachedClaimed;
  }
  lastClaimCheckAt = now == 0 ? 1 : now;

  String response;
  int httpCode = firebaseRequest("GET", "/hubs/" + hubId + "/claimed.json", "", &response);
  response.trim();
  if (httpCode == 200) {
    bool claimed = (response == "true");
    if (claimed != cachedClaimed || !claimCheckedOnce) salvarPareado(claimed);
    cachedClaimed = claimed;
    claimCheckedOnce = true;
  }
  // Erro de rede: mantém o último estado conhecido
  return cachedClaimed;
}

/** Grava (ou apaga) na flash que o hub está pareado. */
void salvarPareado(bool claimed) {
  if (claimed) {
    File f = LittleFS.open(PAREADO_PATH, FILE_WRITE);
    if (f) {
      f.print("1");
      f.close();
    }
  } else if (LittleFS.exists(PAREADO_PATH)) {
    LittleFS.remove(PAREADO_PATH);
  }
}

/** Sobrescreve a leitura "ao vivo", alimenta o medidor em tempo real do Dashboard. */
void sendCurrent(float watts) {
  String payload = "{\"watts\": " + String(watts, 1) + ", \"updatedAt\": " + String(nowUnixMs()) + "}";
  int httpCode = firebaseRequest("PUT", "/hubs/" + hubId + "/current.json", payload, nullptr);

  Serial.print("[/current] HTTP ");
  Serial.print(httpCode);
  Serial.print(" (");
  Serial.print(lastRequestMs);
  Serial.print(" ms) — ");
  Serial.print(watts, 1);
  Serial.println(" W");
}

/** Adiciona um novo registro ao histórico — usado pelo app pra calcular kWh.
 *  SEND_OK       = Firebase confirmou (HTTP 200).
 *  SEND_REJECTED = Firebase recusou de vez (HTTP 4xx): não adianta reenviar.
 *  SEND_FAILED   = falha de rede/servidor: vale guardar no buffer e tentar depois. */
SendResult sendReading(float watts, float energyKwh, unsigned long long timestamp) {
  // POST em vez de PUT: o Firebase gera uma chave única (equivalente ao
  // push() do SDK), então cada leitura vira um novo registro no histórico
  // em vez de sobrescrever a anterior.
  String payload = "{\"watts\": " + String(watts, 1);
  if (!isnan(energyKwh)) {
    payload += ", \"energyKwh\": " + String(energyKwh, 3);
  }
  payload += ", \"timestamp\": " + String(timestamp) + "}";
  int httpCode = firebaseRequest("POST", "/hubs/" + hubId + "/readings.json", payload, nullptr);

  Serial.print("[/readings] HTTP ");
  Serial.print(httpCode);
  Serial.print(" — ");
  Serial.print(watts, 1);
  Serial.print(" W, contador ");
  Serial.print(energyKwh, 3);
  Serial.println(" kWh (histórico)");

  if (httpCode == 200 || httpCode == 204) return SEND_OK;
  if (httpCode >= 400 && httpCode < 500) {
    Serial.println("  -> recusada pelo Firebase (confira as regras do banco). Leitura descartada.");
    return SEND_REJECTED;
  }
  return SEND_FAILED;
}

// ============================================================================
// Buffer offline (LittleFS) guarda leituras que não conseguiram ser
// enviadas, e reenvia quando a conexão volta.
// ============================================================================

/** Grava uma leitura pendente no arquivo de buffer (uma linha "watts,energyKwh,timestamp").
 *  Se o contador não pôde ser lido, o campo do meio fica vazio. */
void bufferReading(float watts, float energyKwh, unsigned long long timestamp) {
  trimBufferIfNeeded();

  File file = LittleFS.open(BUFFER_PATH, FILE_APPEND);
  if (!file) {
    Serial.println("ERRO: não consegui abrir o buffer pra gravar — leitura foi perdida.");
    return;
  }

  file.print(watts, 1);
  file.print(",");
  if (!isnan(energyKwh)) {
    file.print(energyKwh, 3);
  }
  file.print(",");
  if (timestamp == 0) {
    // Sem hora certa: guarda "R<boot>:<millis>" e converte quando o NTP acertar
    file.print("R");
    file.print(String(bootId));
    file.print(":");
    file.println(String(millis()));
  } else {
    file.println(String(timestamp));
  }
  file.close();

  Serial.println("Sem rede — leitura guardada no buffer offline.");
}

/** Se o buffer já tem leituras demais, descarta as mais antigas (as
 *  primeiras linhas do arquivo) pra não encher a flash numa queda longa. */
void trimBufferIfNeeded() {
  if (!LittleFS.exists(BUFFER_PATH)) return;

  File file = LittleFS.open(BUFFER_PATH, FILE_READ);
  if (!file) return;

  int lineCount = 0;
  while (file.available()) {
    if (file.readStringUntil('\n').length() > 0) lineCount++;
  }
  file.close();

  if (lineCount < MAX_BUFFERED_READINGS) return;

  // Reescreve o arquivo mantendo só as últimas (MAX_BUFFERED_READINGS - 1)
  // linhas, pra abrir espaço pra nova leitura que está prestes a entrar.
  File oldFile = LittleFS.open(BUFFER_PATH, FILE_READ);
  int toSkip = lineCount - (MAX_BUFFERED_READINGS - 1);
  int skipped = 0;
  String kept = "";
  while (oldFile.available()) {
    String line = oldFile.readStringUntil('\n');
    if (line.length() == 0) continue;
    if (skipped < toSkip) {
      skipped++;
      continue;
    }
    kept += line + "\n";
  }
  oldFile.close();

  File newFile = LittleFS.open(BUFFER_PATH, FILE_WRITE);
  newFile.print(kept);
  newFile.close();

  Serial.println("Buffer offline cheio — descartei as leituras mais antigas.");
}

/** Tenta reenviar todas as leituras pendentes do buffer, da mais antiga pra
 *  mais nova. Para no primeiro envio que falhar (provável perda de conexão
 *  de novo) e mantém o restante no arquivo pra tentar na próxima vez. */
void flushBuffer() {
  if (!LittleFS.exists(BUFFER_PATH)) return;

  File file = LittleFS.open(BUFFER_PATH, FILE_READ);
  if (!file || file.size() == 0) {
    if (file) file.close();
    return;
  }

  int pendingCount = 0;
  {
    File counter = LittleFS.open(BUFFER_PATH, FILE_READ);
    while (counter.available()) {
      if (counter.readStringUntil('\n').length() > 0) pendingCount++;
    }
    counter.close();
  }
  Serial.print("Reenviando buffer offline (");
  Serial.print(pendingCount);
  Serial.println(" leitura(s) pendente(s))...");

  String remaining = "";
  bool stoppedEarly = false;

  while (file.available()) {
    esp_task_wdt_reset();
    String line = file.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;

    if (stoppedEarly) {
      remaining += line + "\n";
      continue;
    }

    // Formato atual: "watts,energyKwh,timestamp" (energyKwh pode estar vazio).
    // Formato antigo (antes do contador): "watts,timestamp".
    int firstComma = line.indexOf(',');
    if (firstComma < 0) continue; // linha corrompida, descarta
    int secondComma = line.indexOf(',', firstComma + 1);

    float watts = line.substring(0, firstComma).toFloat();
    float energyKwh = NAN;
    String tsField;
    if (secondComma < 0) {
      tsField = line.substring(firstComma + 1);
    } else {
      String energyField = line.substring(firstComma + 1, secondComma);
      if (energyField.length() > 0) energyKwh = energyField.toFloat();
      tsField = line.substring(secondComma + 1);
    }
    unsigned long long ts = 0;
    if (tsField.startsWith("R")) {
      // Leitura feita antes do NTP acertar a hora: "R<boot>:<millis>"
      int doisPontos = tsField.indexOf(':');
      uint32_t boot = strtoul(tsField.substring(1, doisPontos).c_str(), nullptr, 10);
      unsigned long quando = strtoul(tsField.substring(doisPontos + 1).c_str(), nullptr, 10);
      if (doisPontos < 0 || boot != bootId || quando > millis()) {
        Serial.println("  -> leitura sem hora de antes de religar, descartada (o contador do PZEM cobre o consumo).");
        continue;
      }
      ts = nowUnixMs() - (unsigned long long)(millis() - quando);
    } else {
      ts = strtoull(tsField.c_str(), nullptr, 10);
    }

    SendResult result = sendReading(watts, energyKwh, ts);
    if (result == SEND_OK) {
      Serial.println("  -> reenviada com sucesso.");
    } else if (result == SEND_REJECTED) {
      // Já avisado dentro de sendReading; só não volta pro buffer.
    } else {
      Serial.println("  -> falhou, parando por aqui (mantém o resto pra próxima tentativa).");
      remaining += line + "\n";
      stoppedEarly = true;
    }
  }
  file.close();

  // Reescreve o arquivo só com o que não foi enviado (ou apaga, se vazio).
  if (remaining.length() == 0) {
    LittleFS.remove(BUFFER_PATH);
    Serial.println("Buffer offline esvaziado com sucesso.");
  } else {
    File newFile = LittleFS.open(BUFFER_PATH, FILE_WRITE);
    newFile.print(remaining);
    newFile.close();
  }
}
