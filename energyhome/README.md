## Estrutura de pastas

```
src/
  constants/
    colors.ts        -> paleta de cores centralizada
    typography.ts     -> tamanhos de fonte, espaçamentos e raios
  services/
    authIntegration.ts -> autenticação isolada (Firebase Auth)
    pushNotifications.ts -> registro de token pra notificações push
  hooks/
    useCurrentUser.ts  -> observa o usuário autenticado
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

1. `cd energyhome npm install` (se for a primeira vez)
3. `npx expo start` (Expo)
3. aperta s para switch to expo go  (o google usa o developer kit e isso baixa o app para usar o login do google, mas n usaremos por enquanto)

### Configurando o Login com Google

O Google não aceita mais o fluxo simples (usando só o Client ID "Web") para
apps mobile — por isso o login usa o `Google.useAuthRequest`, do próprio
`expo-auth-session`, que já sabe lidar com o fluxo de código + PKCE exigido.

1. Instale as dependências (sem versão fixa no `package.json` de propósito, pra garantir a certa pro seu SDK):
   ```bash
   npx expo install expo-auth-session expo-web-browser expo-crypto
   ```
2. No Firebase Console, em **Authentication > Sign-in method**, ative o provedor **Google** (isso gera automaticamente um **Web client ID** — copie e cole em `GOOGLE_WEB_CLIENT_ID`, em `src/constants/googleAuth.ts`)
3. No [Google Cloud Console](https://console.cloud.google.com) do mesmo projeto, vá em **APIs e Serviços > Credenciais > Criar credenciais > ID do cliente OAuth** e crie:
   - Um client **Android**: nome do pacote `com.energyhome.app` (já configurado em `app.json`) + a impressão digital SHA-1 do seu build (dev client/EAS Build — não existe SHA-1 fixo no Expo Go)
   - Um client **iOS**: Bundle Identifier `com.energyhome.app`
4. Cole os dois em `GOOGLE_ANDROID_CLIENT_ID` e `GOOGLE_IOS_CLIENT_ID`, em `src/constants/googleAuth.ts`

**Importante:** esse fluxo com Client ID nativo **não funciona no Expo Go** —
só em um build de desenvolvimento (`expo-dev-client`) ou build final (EAS
Build), porque depende do pacote/assinatura reais do seu app baterem com o
que está cadastrado no Google Cloud.

### Gerando o Dev Client (necessário pro login com Google)

O dev client é um app próprio seu, instalado uma vez no celular, que substitui
o Expo Go — depois disso você continua usando `npx expo start` normalmente
pra ter hot reload.

1. Instale a CLI da EAS e faça login (crie uma conta gratuita em [expo.dev](https://expo.dev) se ainda não tiver):
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Instale o pacote do dev client no projeto:
   ```bash
   npx expo install expo-dev-client
   ```
3. Vincule o projeto à sua conta EAS (só precisa fazer uma vez):
   ```bash
   eas init
   ```
4. Gere o build de desenvolvimento (fica pronto em alguns minutos, na nuvem da Expo — não precisa de Android Studio instalado):
   ```bash
   eas build --profile development --platform android
   ```
5. Ao terminar, o terminal mostra um **link/QR code pra baixar o `.apk`** — baixe e instale no celular (pode precisar permitir "instalar apps de fontes desconhecidas")
6. Pegue o **SHA-1** do seu build (necessário pra criar o Client ID Android no Google Cloud, do passo anterior):
   ```bash
   eas credentials
   ```
   Selecione **Android → seu perfil (development) → Keystore**, e o SHA-1 aparece na tela.
7. Depois de instalado o app no celular, rode:
   ```bash
   npx expo start --dev-client
   ```
   e escaneie o QR code — abre dentro do seu app (não mais no Expo Go)

Repetir o `eas build` só é necessário se você mudar alguma configuração nativa
(plugins, permissões, etc.) — pra mudanças normais de código, o `expo start
--dev-client` já cobre com hot reload.

Ao logar com Google, a foto de perfil do usuário aparece automaticamente no
canto superior esquerdo do cabeçalho (componente `AppHeader`), puxada do
`photoURL` do Firebase Auth.

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


### Configurando o app

1. Instale o pacote nativo:
   ```bash
   npx expo install expo-notifications
   ```
2. Como é um pacote nativo novo, **precisa gerar o dev client de novo**:
   ```bash
   eas build --profile development --platform android --clear-cache
   ```

## Alertas

A tela `Alerts` também já está conectada ao Firebase Realtime Database, via
`src/services/alertsData.ts`. Os textos que aparecem em cada alerta **não**
ficam salvos no banco, só um `templateId`, que aponta pra um texto
centralizado em `src/constants/alertMessages.ts`. Isso facilita manter os
textos consistentes e traduzidos num só lugar, e economiza espaço no banco.

### Estrutura de dados esperada

```
/hub/alerts/{pushId}
   {
     templateId: string,   // uma das chaves de alertMessages.ts (ex: "spike")
     timestamp: number,    // ms desde 1970
     read: boolean         // controlado pelo app quando o usuário abre o alerta
   }
```

### Templates disponíveis até o momento(`src/constants/alertMessages.ts`)

- `spike` — pico anormal de consumo
- `sustained_high` — consumo elevado sustentado
- `hub_offline` / `hub_back_online` — hub parou/voltou a enviar leituras
- `high_bill_projection` — projeção de conta acima do esperado

### Próximos passos

- Codar o firmware do ESP32 seguindo o contrato acima.
- Alertas automáticos: comparar leituras recentes com a média histórica e gerar um registro em `/hub/alerts` quando houver um pico anormal.
