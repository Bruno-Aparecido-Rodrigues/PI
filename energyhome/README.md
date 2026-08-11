## Estrutura de pastas

```
src/
  constants/
    colors.ts        -> paleta de cores centralizada
    typography.ts     -> tamanhos de fonte, espaçamentos e raios
  services/
    authIntegration.ts -> autenticação isolada (Firebase Auth)
  hooks/
    useCurrentUser.ts  -> observa o usuário autenticado (nome/foto do Google)
  components/
    <ComponentName>/
      index.tsx        -> lógica e JSX do componente
      style.ts          -> StyleSheet do componente
  screens/
    <ScreenName>/
      index.tsx
      style.ts
  navigation/
    AppNavigator.tsx    -> stack de auth + tabs principais
```

Cada componente/tela segue o padrão pasta própria com `index.tsx` + `style.ts`

## Telas implementadas

- **Login** — autenticação com e-mail/senha (Firebase)
- **Register (Cadastro)** — criação de conta com nome, e-mail e senha
- **Dashboard** — consumo em tempo real, estimativa de conta, consumo por aparelho
- **Charts** — analytics de consumo por período (hora/dia/mês) e por aparelho
- **Alerts** — histórico de alertas com resumo (críticos/avisos/resolvidos)
- **Settings** — tarifa de energia, dispositivos conectados, exclusão de conta

## Antes de rodar

1. `npm install` (se for a primeira vez)
3. `npm expo start` (Expo)
3. aperta s para switch to expo go  (o google usa o developer kit e isso baixa o app para usar o login do google, mas n usaremos por enquanto)

### Exclusão de conta e recuperação de senha

Ambos já usam Firebase de verdade (`deleteUser` e `sendPasswordResetEmail`).
Um detalhe do Firebase: se a sessão do usuário for antiga, `deleteUser` pode
pedir login recente (`auth/requires-recent-login`) — nesse caso, a tela mostra
uma mensagem pedindo para sair e entrar de novo antes de excluir.

## Dados de energia (Dashboard) e contrato com o ESP32

O `Dashboard` já usa dados reais do **Firebase Realtime Database**, via
`src/services/energyData.ts` e `src/hooks/useEnergyData.ts` — não é mais
mockado. O cálculo é dividido assim:

- **ESP32**: lê o SCT-013, calcula RMS da corrente, multiplica pela tensão
  (127V/220V) e obtém a **potência instantânea em Watts**. É só isso que ele
  manda pro Firebase — nada de kWh ou conta, isso é conta do app.
- **App**: pega essas leituras de Watts e **integra ao longo do tempo** pra
  virar energia (kWh), soma consumo de hoje/do mês, multiplica pela tarifa
  pra estimar a conta.

### Estrutura de dados esperada no Realtime Database

```
/hub/current
   { watts: number, updatedAt: number }   // sobrescrito a cada leitura (ex: a cada 2-5s)
   -> alimenta o "Consumo Atual" em tempo real

/hub/readings/{pushId}
   { watts: number, timestamp: number }   // um novo registro por leitura periódica (ex: a cada 1 min)
   -> histórico usado para calcular kWh (hoje/mês) e o pico de demanda

/hub/settings/tariff
   number                                  // R$/kWh, editado na tela de Ajustes
```

`timestamp`/`updatedAt` devem ser milissegundos desde 1970 (`Date.now()` em
JS, ou millis() sincronizado via NTP no ESP32 — não usar `millis()` puro do
ESP32 sozinho, ele conta desde o boot, não a data real).

### Exemplo de como o ESP32 escreveria (pseudocódigo, biblioteca Firebase-ESP-Client)

```cpp
// A cada leitura do sensor:
FirebaseJson currentJson;
currentJson.set("watts", potenciaCalculada);
currentJson.set("updatedAt", getUnixTimeMs()); // NTP sincronizado
Firebase.RTDB.setJSON(&fbdo, "/hub/current", &currentJson);

// A cada ~1 minuto, além do current:
FirebaseJson readingJson;
readingJson.set("watts", potenciaCalculada);
readingJson.set("timestamp", getUnixTimeMs());
Firebase.RTDB.pushJSON(&fbdo, "/hub/readings", &readingJson);
```

### Antes de funcionar

1. No Firebase Console, vá em **Build > Realtime Database > Criar banco de dados**
2. Copie a URL gerada (algo como `https://seu-projeto-default-rtdb.firebaseio.com`) e cole em `databaseURL`, no `firebaseConfig` de `src/services/authIntegration.ts`
3. Configure as **regras** do Realtime Database — para desenvolvimento, algo simples como:
   ```json
   {
     "rules": {
       "hub": {
         ".read": "auth != null",
         ".write": "auth != null"
       }
     }
   }
   ```
   (isso exige que quem lê/escreve esteja autenticado — o ESP32 precisaria
   autenticar com uma conta de serviço ou usuário fixo; ajuste as regras
   depois com mais rigor antes de ir pra produção)

## Alertas

A tela `Alerts` também já está conectada ao Firebase Realtime Database, via
`src/services/alertsData.ts`. Os textos que aparecem em cada alerta **não**
ficam salvos no banco — só um `templateId`, que aponta pra um texto
centralizado em `src/constants/alertMessages.ts`. Isso facilita manter os
textos consistentes

### Templates disponíveis (`src/constants/alertMessages.ts`)

- `spike` — pico anormal de consumo
- `sustained_high` — consumo elevado sustentado
- `hub_offline` / `hub_back_online` — hub parou/voltou a enviar leituras
- `high_bill_projection` — projeção de conta acima do esperado

### Próximos passos sugeridos

- Codar o firmware do ESP32 seguindo o contrato acima.
- Conectar o gráfico de "Energy Flow" da tela `Charts` às leituras reais também (hoje ainda usa uma curva mockada).
- Alertas automáticos: comparar leituras recentes com a média histórica e gerar um registro em `/hub/alerts` quando houver um pico anormal.
