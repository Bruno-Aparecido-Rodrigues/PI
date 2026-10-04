/*
  A.C.D.C / EnergyHome — Teste de comunicação ESP32 <-> PZEM-004T

  Objetivo: só confirmar que o ESP32 consegue "conversar" com o PZEM-004T via
  UART (protocolo Modbus-RTU) e ler tensão/corrente/potência/energia. Não
  manda nada pro Firebase ainda — é só pra validar o sensor isoladamente.

  Biblioteca necessária (instale antes de compilar):
    Sketch > Include Library > Manage Libraries > procure "PZEM004Tv30"
    (autor: Jakub Mandula)

  Fiação (conforme o esquema que você desenhou):
    ESP32 RX2 (GPIO16)  <--  PZEM TX
    ESP32 TX2 (GPIO17)  -->  PZEM RX
    ESP32 GND           <->  PZEM GND
    ESP32 VIN (5V)      -->  PZEM 5V

  Se as leituras vierem erradas ou "nan" (not a number), o mais comum é RX/TX
  invertidos — tenta trocar os dois fios entre si primeiro.
*/

#include <PZEM004Tv30.h>

// Pinos do ESP32 usados pro UART dedicado ao PZEM (Serial2). Esses são os
// pinos DO ESP32 — o RX do ESP32 recebe o que o PZEM transmite (TX do PZEM),
// e o TX do ESP32 manda pro RX do PZEM.
#define ESP_RX_PIN 16
#define ESP_TX_PIN 17

// A biblioteca cuida de inicializar a Serial2 internamente (baud rate,
// formato) — não precisa chamar Serial2.begin() manualmente.
PZEM004Tv30 pzem(Serial2, ESP_RX_PIN, ESP_TX_PIN);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("========================================");
  Serial.println("Teste de comunicação ESP32 <-> PZEM-004T");
  Serial.println("========================================");
}

void loop() {
  float voltage = pzem.voltage();
  float current = pzem.current();
  float power = pzem.power();
  float energy = pzem.energy();
  float frequency = pzem.frequency();
  float pf = pzem.pf();

  if (isnan(voltage)) {
    Serial.println("ERRO: não consegui ler o PZEM.");
    Serial.println("Confira: fiação RX/TX (tente trocar os dois), GND comum, 5V chegando no PZEM, e se a Fase/Neutro do PZEM estão ligados na tomada.");
  } else {
    Serial.print("Tensão:          "); Serial.print(voltage);   Serial.println(" V");
    Serial.print("Corrente:        "); Serial.print(current);   Serial.println(" A");
    Serial.print("Potência:        "); Serial.print(power);     Serial.println(" W");
    Serial.print("Energia total:   "); Serial.print(energy, 3); Serial.println(" kWh");
    Serial.print("Frequência:      "); Serial.print(frequency, 1); Serial.println(" Hz");
    Serial.print("Fator de Potência: "); Serial.println(pf);
  }

  Serial.println("----------------------------------------");
  delay(2000);
}
