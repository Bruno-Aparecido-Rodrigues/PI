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
#include "time.h"

const char* WIFI_SSID = "MARGARETE2G";
const char* WIFI_PASSWORD = "15220108";
const char* DATABASE_URL = "https://pi-energia-db-default-rtdb.firebaseio.com";


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

// Resultado de um envio de /readings (ver sendReading()).
enum SendResult { SEND_OK, SEND_REJECTED, SEND_FAILED };


// Buffer offline (LittleFS)
const char* BUFFER_PATH = "/buffer.csv";
const int MAX_BUFFERED_READINGS = 500; // ~8h de histórico a 1 leitura/min

void setup() {
  Serial.begin(115200);
  delay(1000);

  if (!LittleFS.begin(true)) { // true = formata automaticamente se não conseguir montar
    Serial.println("AVISO: não consegui montar o LittleFS. Buffer offline ficará desativado.");
  }

  setupWiFiAndHubId();
  syncTime();

  Serial.println("Pronto. Aguardando leituras do PZEM e checando pareamento...");
}

void loop() {
  bool wifiOk = (WiFi.status() == WL_CONNECTED);

  if (wifiOk) {
    registerHub();
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

  // Sempre que há rede, aproveita pra esvaziar o que ficou pendente do
  // buffer antes de mandar a leitura de agora, assim o histórico é
  // reenviado na ordem certa.
  if (wifiOk) {
    flushBuffer();
  }

  unsigned long now = millis();

  if (now - lastCurrentSentAt >= CURRENT_INTERVAL_MS) {
    if (wifiOk) {
      sendCurrent(watts);
    } else {
      Serial.println("Wi-Fi desconectado, pulando /current (não é bufferizado).");
    }
    lastCurrentSentAt = now;
  }

  if (now - lastReadingSentAt >= READING_INTERVAL_MS) {
    unsigned long long ts = nowUnixMs();
    float energyKwh = readEnergyKwh(); // pode vir NaN se a leitura falhar; aí vai só com watts
    SendResult result = wifiOk ? sendReading(watts, energyKwh, ts) : SEND_FAILED;
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

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando ao Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Conectado! IP: ");
  Serial.println(WiFi.localIP());
}

// ============================================================================
// NTP: sincroniza a hora real assim que há internet
// ============================================================================
void syncTime() {
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER_1, NTP_SERVER_2);

  Serial.print("Sincronizando hora via NTP");
  struct tm timeinfo;
  int attempts = 0;
  while (!getLocalTime(&timeinfo) && attempts < 20) {
    Serial.print(".");
    delay(500);
    attempts++;
  }
  Serial.println();

  if (attempts >= 20) {
    Serial.println("AVISO: não consegui sincronizar a hora via NTP. Os timestamps podem ficar errados até reiniciar.");
  } else {
    Serial.print("Hora sincronizada: ");
    Serial.println(&timeinfo, "%d/%m/%Y %H:%M:%S");
  }
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

/** Escreve uma "prova de vida", só confirma que esse hubId existe. */
void registerHub() {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = String(DATABASE_URL) + "/hubs/" + hubId + "/registered.json";
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.PUT(String(nowUnixMs()));
  Serial.print("Registro do hub - HTTP: ");
  Serial.println(httpCode);
  http.end();
}

/** Confere no Firebase se esse hub já foi pareado com alguma conta.
 *  Sem Wi-Fi não dá pra confirmar nada agora, então mantém o último
 *  estado conhecido em vez de assumir "não pareado" (o que faria o
 *  dispositivo parar de medir toda vez que a internet oscilasse). */
bool isClaimed() {
  if (WiFi.status() != WL_CONNECTED) {
    return cachedClaimed;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = String(DATABASE_URL) + "/hubs/" + hubId + "/claimed.json";
  http.begin(client, url);
  int httpCode = http.GET();
  String response = http.getString();
  http.end();

  response.trim();
  cachedClaimed = (httpCode == 200 && response == "true");
  return cachedClaimed;
}

/** Sobrescreve a leitura "ao vivo", alimenta o medidor em tempo real do Dashboard. */
void sendCurrent(float watts) {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = String(DATABASE_URL) + "/hubs/" + hubId + "/current.json";
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"watts\": " + String(watts, 1) + ", \"updatedAt\": " + String(nowUnixMs()) + "}";
  int httpCode = http.PUT(payload);

  Serial.print("[/current] HTTP ");
  Serial.print(httpCode);
  Serial.print(" — ");
  Serial.print(watts, 1);
  Serial.println(" W");

  http.end();
}

/** Adiciona um novo registro ao histórico — usado pelo app pra calcular kWh.
 *  SEND_OK       = Firebase confirmou (HTTP 200).
 *  SEND_REJECTED = Firebase recusou de vez (HTTP 4xx): não adianta reenviar.
 *  SEND_FAILED   = falha de rede/servidor: vale guardar no buffer e tentar depois. */
SendResult sendReading(float watts, float energyKwh, unsigned long long timestamp) {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  // POST em vez de PUT: o Firebase gera uma chave única (equivalente ao
  // push() do SDK), então cada leitura vira um novo registro no histórico
  // em vez de sobrescrever a anterior.
  String url = String(DATABASE_URL) + "/hubs/" + hubId + "/readings.json";
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"watts\": " + String(watts, 1);
  if (!isnan(energyKwh)) {
    payload += ", \"energyKwh\": " + String(energyKwh, 3);
  }
  payload += ", \"timestamp\": " + String(timestamp) + "}";
  int httpCode = http.POST(payload);

  Serial.print("[/readings] HTTP ");
  Serial.print(httpCode);
  Serial.print(" — ");
  Serial.print(watts, 1);
  Serial.print(" W, contador ");
  Serial.print(energyKwh, 3);
  Serial.println(" kWh (histórico)");

  http.end();

  if (httpCode == 200) return SEND_OK;
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
  file.println(String(timestamp));
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
    unsigned long long ts;
    if (secondComma < 0) {
      ts = strtoull(line.substring(firstComma + 1).c_str(), nullptr, 10);
    } else {
      String energyField = line.substring(firstComma + 1, secondComma);
      if (energyField.length() > 0) energyKwh = energyField.toFloat();
      ts = strtoull(line.substring(secondComma + 1).c_str(), nullptr, 10);
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
