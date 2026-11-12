# A.C.D.C - Sistema Inteligente Para Monitoramento De Energia Elétrica

Este projeto é um sistema de Internet das Coisas (IoT) voltado ao monitoramento residencial de consumo de energia elétrica em tempo real, integrado a um aplicativo mobile com painel de acompanhamento, previsão de fatura com a tarifa oficial da ANEEL e alertas de consumo com notificação no celular.

Desenvolvido por **André Oliveira Paim**, **Bruno Aparecido Vivencio Rodrigues** e **Igor Nogueira Pessoa** (FATEC ZL - 2ª ADS AMS).

## Problema

Este projeto visa preencher a lacuna de **soluções residenciais de baixo custo** que integrem, de forma nativa:

* Monitoramento em tempo real via IoT
* Cálculo dinâmico da fatura conforme a realidade tributária nacional
* Suporte às **bandeiras tarifárias da ANEEL**

A proposta está alinhada ao **ODS 7** da ONU (energia acessível e limpa), especificamente à meta 7.3 de melhoria da eficiência energética.

## Funcionalidades

* Leitura em tempo real da potência elétrica da residência (sensor PZEM-004T)
* Consumo em kWh do dia e do mês, calculado pelo contador de energia do próprio sensor (o mesmo princípio do relógio de luz)
* Gráficos de consumo e custo por hora (hoje), por dia (semana) e por dia do mês
* **Tarifa automática pela ANEEL**: tarifa da distribuidora (TE + TUSD) e bandeira do mês buscadas nos dados abertos da ANEEL, com ICMS, PIS/COFINS e iluminação pública informados pelo usuário. Também aceita tarifa manual
* Estimativa da conta do mês e projeção até o fim do mês (a partir de 24 h de medição)
* Comparação do consumo atual com o normal daquele horário (últimos 7 dias)
* **Alertas com notificação no celular**, mesmo com o app fechado: pico anormal, consumo alto prolongado, projeção de conta alta, hub desconectado e reconectado
* Conta com e-mail e senha (com confirmação de e-mail) ou com Google
* Pareamento do hub pelo **QR Code** da etiqueta ou digitando o código do dispositivo
* Indicador de hub conectado/desconectado em tempo real
* Buffer offline no hub: leituras feitas sem internet são reenviadas quando a conexão volta
* Privacidade: o histórico de um hub desconectado fica guardado por 6 meses e depois é apagado; ao excluir a conta, os dados dela são apagados
* Case impressa em 3D, com encaixe para pendurar na parede e espaço para a etiqueta do QR Code
* Widget da projeção de conta

### Diagrama de Casos de Uso

![Diagrama de Casos de Uso](docs/DiagramaCSU.jpeg)

## Arquitetura

O sistema é organizado em camadas que **nunca se conectam diretamente entre si**: toda comunicação passa pelo Firebase.

```
 ESP32 + PZEM-004T ──► Firebase Realtime Database ◄──► App (React Native)
   (hub na casa)        + Firebase Authentication          │
                                 ▲                          │ tarifa e bandeira
                                 │                          ▼
                     Worker de alertas (Cloudflare)    API de dados abertos
                                 │                        da ANEEL
                                 ▼
                      Serviço de push do Expo ──► notificação no celular
```

**Camada de Hardware**
O ESP32 lê o sensor PZEM-004T via UART e envia ao Firebase, pelo Wi-Fi, a potência instantânea a cada 3 s e uma leitura de histórico por minuto (potência + contador de energia em kWh + horário real via NTP). Leituras que não puderam ser enviadas ficam num buffer na memória flash (até ~8 h) e são reenviadas quando a internet volta. O hub só começa a medir depois de pareado a uma conta.

**Camada de Dados**
O Firebase Realtime Database guarda os dados de cada hub (leitura atual, histórico, alertas, configuração da tarifa) e o Firebase Authentication cuida das contas. As regras de segurança garantem que cada hub tenha um único dono, que só o dono leia os dados e que o histórico não possa ser alterado.

**Serviço de Alertas**
Um Worker na Cloudflare roda a cada 5 minutos: aprende o consumo normal de cada horário, detecta anomalias, grava os alertas no banco e envia as notificações pelo serviço de push do Expo. De hora em hora ele também faz a limpeza de dados de contas excluídas e de hubs abandonados há mais de 6 meses. Ele substitui as Cloud Functions, que exigiriam o plano pago do Firebase.

**Camada de Apresentação**
O aplicativo mobile mostra os dados em tempo real, calcula o consumo em kWh pela diferença do contador de energia entre leituras, busca a tarifa da distribuidora e a bandeira do mês na ANEEL e estima a conta com os impostos.

## Tecnologias Utilizadas

### Hardware
* ESP32 DevKit - Microcontrolador com Wi-Fi integrado
* PZEM-004T-100A-D-P - Sensor de energia (tensão, corrente, potência, energia, frequência e fator de potência), lido via protocolo Modbus-RTU/UART
* Fonte 5V - Alimentação dedicada do dispositivo (ESP32 e sensor)
* Case impressa em 3D (ABS), modelada por script no Fusion 360

### Software
* Arduino IDE / C++ - Firmware do ESP32 (LittleFS para o buffer offline, NTP para o horário real)
* PZEM004Tv30 (Jakub Mandula) - Biblioteca de comunicação com o sensor PZEM-004T
* Firebase Realtime Database - Banco de dados em nuvem com sincronização em tempo real
* Firebase Authentication - Autenticação de usuários (e-mail/senha e Google)
* React Native + Expo SDK 57 (TypeScript) - Aplicativo mobile, com build pela EAS
* Cloudflare Workers - Geração de alertas, notificações e limpeza de dados agendadas
* Expo Push Notifications + Firebase Cloud Messaging - Entrega das notificações no Android
* API de Dados Abertos da ANEEL - Tarifas homologadas das distribuidoras e bandeiras tarifárias

## Estrutura do repositório

```
energyhome/       aplicativo (React Native + Expo) e regras do banco (database.rules.json)
firmware/         firmware do ESP32 (energyhome_hub/energyhome_hub.ino)
alertas-worker/   serviço de alertas e limpeza (Cloudflare Worker)
case/             case 3D: script do Fusion 360 e arquivos STL
schematic/        esquemático elétrico
docs/             diagramas e guias (DEPENDENCIAS.md: controle de dependências)
.github/          Dependabot e workflow que testa as atualizações de dependências
scripts/          scripts de dados de teste (não vão para o GitHub)
HANDOFF.md        documentação técnica completa: como configurar, rodar e manter
```

## Controle de dependências

O Dependabot procura versões novas das dependências do app toda segunda e abre um pull request para cada grupo de atualizações. Cada PR passa pelo workflow **Dependências** (GitHub Actions), que confere se as versões batem com o SDK do Expo, se o código continua compilando e se não há vulnerabilidade crítica. Troca de SDK do Expo e versões major ficam com a equipe. Detalhes em [docs/DEPENDENCIAS.md](docs/DEPENDENCIAS.md).

## Estado atual do projeto

O protótipo está **funcional de ponta a ponta** e testado com o hardware real:

* O ESP32 mede com o sensor e envia os dados; o app mostra consumo em tempo real, histórico, gráficos e estimativa de conta
* Tarifa automática testada com a Enel SP: tarifa da ANEEL, bandeira do mês e impostos calculados corretamente
* Pareamento por QR Code, login com Google e confirmação de e-mail funcionando
* Notificações chegando no celular com o app fechado (alertas de hub desconectado e reconectado testados)
* Regra dos 6 meses e limpeza de dados testadas

Próximas etapas:
* Testar os alertas de consumo (pico e consumo prolongado) depois do período de aprendizado do Worker
* Medir uma semana com o hub instalado no quadro de luz e comparar com a conta da Enel
* **Modelo de linguagem (SLM)** para analisar o consumo e gerar alertas e dicas em linguagem natural, integrado ao Worker
* Imprimir a case completa

## Resultados Esperados

Ao fim do desenvolvimento, é entregue um **protótipo funcional** para medição e acompanhamento do consumo de energia elétrica residencial, com fatura calculada pela tarifa oficial e alertas automáticos, e com potencial de escalabilidade (arquitetura já preparada para vários hubs). A integração de um **modelo de Inteligência Artificial** para analisar o padrão de consumo de cada casa e explicar os alertas segue como próxima etapa.
