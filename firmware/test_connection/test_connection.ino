/*
  A.C.D.C / EnergyHome — Teste de conexão ESP32 -> Firebase

  Não usa nenhum sensor ainda — o objetivo aqui é só validar:
  1. Que o ESP32 conecta no Wi-Fi
  2. Que ele consegue escrever no Firebase Realtime Database
  3. Descobrir o ID desse hub (endereço MAC), pra parear no app

  Fluxo de registro/pareamento:
  - Assim que liga, o ESP32 escreve em /hubs/{hubId}/registered — é só uma
    "prova de vida", sem dado de consumo nenhum. O app usa isso pra
    confirmar que o hubId digitado existe de verdade antes de aceitar o
    pareamento (evita cadastrar um ID inventado).
  - O ESP32 fica checando /hubs/{hubId}/claimed. Enquanto for false (hub
    ainda não pareado com nenhuma conta), ele NÃO manda dado de consumo —
    só continua se registrando. Quando o app pareia, claimed vira true, e
    o ESP32 passa a mandar as leituras de verdade.

  IMPORTANTE: o timestamp usado aqui (millis()) é só um placeholder pra esse
  teste — ele conta o tempo desde que o ESP32 ligou, não a data/hora real.
  Quando for integrar o sensor de verdade, troque por NTP (hora real da
  internet), como já documentamos em arquitetura-conexao-hardware-software.md.

  ALTERAÇÃO:
  - Esta placa não possui um MAC de fábrica válido (vem zerado).
  - Isso também deixava o Wi-Fi instável/sem conectar — por isso definimos
    um MAC customizado ("virtual") antes de iniciar o Wi-Fi, via
    esp_wifi_set_mac(). O hubId é montado a partir desse mesmo MAC virtual,
    sem depender de WiFi.macAddress().
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include "esp_wifi.h"

// >>> PREENCHA AQUI <<<
const char* WIFI_SSID = "SEU_WIFI";
const char* WIFI_PASSWORD = "SUA_SENHA_WIFI";
const char* DATABASE_URL = "https://pi-energia-db-default-rtdb.firebaseio.com";

// ============================================================================
// MAC VIRTUAL
// ============================================================================
// Só é necessário se sua placa não tiver MAC de fábrica (vem zerado). Se sua
// placa tiver MAC normal, pode ignorar isso e usar WiFi.macAddress() direto
// (veja o histórico do arquivo, ou a versão AUTO_HUB_ID original).
//
// Escolha qualquer MAC válido (não precisa ser de um dispositivo real) —
// evite usar o mesmo em duas placas ao mesmo tempo na mesma rede.
uint8_t VIRTUAL_MAC[] = { 0x02, 0xA7, 0x3C, 0x91, 0x5E, 0x48 };

String hubId;

void setup() {
  Serial.begin(115200);
  delay(1000);

  WiFi.mode(WIFI_STA);

  // Configura o MAC virtual ANTES de iniciar o Wi-Fi.
  esp_err_t macResult = esp_wifi_set_mac(WIFI_IF_STA, VIRTUAL_MAC);
  if (macResult == ESP_OK) {
    Serial.println("MAC virtual configurado com sucesso.");
  } else {
    Serial.print("ERRO ao configurar MAC virtual. Codigo: ");
    Serial.println(macResult);
  }

  // Monta o hubId a partir do MAC virtual (já conhecido, sem precisar
  // reler via WiFi.macAddress()).
  char macString[13];
  snprintf(macString, sizeof(macString), "%02X%02X%02X%02X%02X%02X",
           VIRTUAL_MAC[0], VIRTUAL_MAC[1], VIRTUAL_MAC[2],
           VIRTUAL_MAC[3], VIRTUAL_MAC[4], VIRTUAL_MAC[5]);
  hubId = String(macString);

  if (hubId.length() == 0 || hubId == "000000000000") {
    Serial.println("ERRO: hubId veio vazio ou zerado. O MAC virtual não foi usado corretamente.");
    while (true) delay(1000); // trava aqui de propósito, pra não mandar dado errado
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

void loop() {
  registerHub();

  if (isClaimed()) {
    sendTestMessage();
  } else {
    Serial.println("Aguardando pareamento no app (claimed = false)...");
  }

  delay(5000);
}

/** Escreve uma "prova de vida" — não é dado de consumo, só confirma que esse hubId existe. */
void registerHub() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi desconectado, pulando registro.");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = String(DATABASE_URL) + "/hubs/" + hubId + "/registered.json";
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.PUT(String(millis()));
  Serial.print("Registro do hub - HTTP: ");
  Serial.println(httpCode);
  http.end();
}

/** Confere no Firebase se esse hub já foi pareado com alguma conta. */
bool isClaimed() {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
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
  return httpCode == 200 && response == "true";
}

void sendTestMessage() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi desconectado, pulando envio.");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure(); // pula verificação de certificado (ok pra teste/dev)

  HTTPClient http;
  String url = String(DATABASE_URL) + "/hubs/" + hubId + "/current.json";

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  // Valor fixo de teste (123W) — só pra confirmar que a escrita chega no
  // Firebase. Quando o sensor chegar, isso vira a leitura real do PZEM-004T.
  unsigned long now = millis();
  String payload = "{\"watts\": 123, \"updatedAt\": " + String(now) + "}";

  int httpCode = http.PUT(payload);

  Serial.print("Enviado! Código HTTP: ");
  Serial.println(httpCode);
  Serial.println("Resposta: " + http.getString());

  http.end();
}
