# A.C.D.C - Sistema Inteligente Para Monitoramento De Energia Elétrica

Este projeto é um sistema de Internet das Coisas (IoT) voltado ao monitoramento residencial de consumo de energia elétrica em tempo real, integrado a um aplicativo mobile com painel de acompanhamento, previsão de fatura e alertas de consumo elevado.

Desenvolvido por **André Oliveira Paim**, **Bruno Aparecido Vivencio Rodrigues** e **Igor Nogueira Pessoa** (FATEC ZL - 2ª ADS AMS).

## Problema

Este projeto visa preencher a lacuna de **soluções residenciais de baixo custo** que integrem, de forma nativa:

* Monitoramento em tempo real via IoT
* Cálculo dinâmico da fatura conforme a realidade tributária nacional
* Suporte às **bandeiras tarifárias da ANEEL**

A proposta está alinhada ao **ODS 7** da ONU (energia acessível e limpa), especificamente à meta 7.3 de melhoria da eficiência energética.

## Funcionalidades

* Leitura em tempo real de tensão, corrente e potência elétrica da residência
* Cálculo e exibição do consumo instantâneo em watts (W)
* Acúmulo diário e mensal de consumo em quilowatts-hora (kWh)
* Estimativa da fatura com base na tarifa vigente cadastrada pelo usuário
* Autenticação de conta (e-mail/senha e Google) e pareamento de múltiplos dispositivos (hubs) por conta
* Detecção de hub online/offline em tempo real
* Alertas de consumo, com notificação push mesmo com o app fechado
* Painel (dashboard) com gráficos e histórico de consumo

### Diagrama de Casos de Uso

![Diagrama de Casos de Uso](docs/DiagramaCSU.jpeg)

## Arquitetura

O sistema é organizado em três camadas, que **nunca se conectam diretamente entre si** — toda comunicação passa pelo Firebase:

**Camada de Hardware**
O microcontrolador ESP32 lê o sensor de energia PZEM-004T (tensão, corrente, potência) via UART, e transmite a potência instantânea (Watts) ao Firebase via Wi-Fi em intervalos regulares (a cada poucos segundos). O ESP32 guarda localmente (buffer em flash) as leituras que não conseguiu enviar durante uma queda de internet, e reenvia automaticamente assim que a conexão volta.

**Camada de Dados**
O Firebase Realtime Database armazena os registros por dispositivo (hub), provendo autenticação de usuário via Firebase Authentication e sincronização automática com o aplicativo. Uma Cloud Function dispara notificações push quando um novo alerta é registrado. Cada hub só é associado a uma conta depois de um processo de pareamento (o usuário cadastra o ID do dispositivo no app), o que impede que um hub inexistente seja cadastrado por engano.

**Camada de Apresentação**
O aplicativo mobile consome os dados do Firebase em tempo real e os exibe ao usuário por meio de dashboards, gráficos e alertas. É quem calcula a energia acumulada (kWh) a partir das leituras de potência (Watts) do ESP32, e a estimativa de fatura a partir da tarifa cadastrada.

## Tecnologias Utilizadas

### Hardware
* ESP32 DevKit - Microcontrolador com Wi-Fi e Bluetooth integrados
* PZEM-004T-100A-D-P - Sensor de energia (tensão, corrente, potência, energia, frequência e fator de potência), lido via protocolo Modbus-RTU/UART
* Fonte 5V - Alimentação dedicada do dispositivo (ESP32 e sensor)

### Software
* Arduino IDE / C++ - Firmware do ESP32
* PZEM004Tv30 (Jakub Mandula) - Biblioteca de comunicação com o sensor PZEM-004T
* NTP - Sincronização de hora real no ESP32, usada para registrar o horário correto de cada leitura
* Firebase Realtime Database - Banco de dados em nuvem com sincronização em tempo real
* Firebase Authentication - Autenticação de usuários (e-mail/senha e Google)
* Firebase Cloud Functions - Disparo de notificações push quando um alerta é criado
* React Native + Expo (TypeScript) - Aplicativo mobile (Android/iOS)

## Estado atual do projeto

O protótipo já está **funcional de ponta a ponta**: o ESP32 lê o sensor de verdade, envia os dados pelo Firebase, e o app mostra consumo em tempo real, histórico (gráficos), estimativa de fatura e indicador de hub online/offline — tudo com dado real, sem mock.

Ainda em aberto (planejado, não implementado):
* **Bandeiras tarifárias da ANEEL** — hoje a tarifa é um valor fixo (R$/kWh) cadastrado manualmente pelo usuário, sem diferenciação por bandeira.
* **Modelo de Inteligência Artificial** para detectar consumo anômalo e gerar alertas automaticamente a partir do padrão de uso de cada casa — está desenhado (ver `energyhome/arquitetura-conexao-hardware-software.md`), mas ainda não implementado. Hoje nada no sistema gera um alerta sozinho.
* Login com Google e pareamento por QR Code (lendo o MAC do ESP32 direto da câmera) — ver detalhes e lista completa de pendências em `energyhome/HANDOFF.md`.

## Resultados Esperados

Ao fim do desenvolvimento, foi entregue um **protótipo funcional** para medição e acompanhamento do consumo de energia elétrica residencial, com potencial de escalabilidade (arquitetura já preparada para múltiplos hubs por conta). A viabilidade de um **modelo de Inteligência Artificial** para otimizar a análise dos resultados de consumo e a geração automática de alertas segue em avaliação como próxima etapa.
