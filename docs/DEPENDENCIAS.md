# Controle de dependências

O app (`energyhome/`) depende de pacotes do npm: Expo, React Native, Firebase e
outros. O controle é feito por duas peças que trabalham juntas:

| Peça | Arquivo | O que faz |
|---|---|---|
| **Dependabot** | `.github/dependabot.yml` | Toda segunda procura versões novas e abre um pull request (PR) com a atualização |
| **Workflow "Dependências"** | `.github/workflows/dependencias.yml` | Testa cada PR do Dependabot (e qualquer mudança no `package.json`) antes de ele ser aceito |

```
 segunda 06:00                      PR "deps(app): bump ..."
 Dependabot ──► encontra versão ──► aberto no GitHub ──► Workflow roda ──► ✅ pode aceitar
                nova                                     sozinho        └─► ❌ não aceitar
```

## O que o workflow verifica

1. **`npm ci`**: instala exatamente as versões do `package-lock.json`. Falha se o
   `package.json` e o `package-lock.json` não combinarem.
2. **`npx expo install --check`**: confere se os pacotes do Expo e do React
   Native combinam com a versão do `expo` instalada. Versão errada costuma
   compilar, mas fecha o app no celular. A conferência usa a lista que vem
   dentro do próprio pacote `expo` (`EXPO_OFFLINE=1`).
   - Logo depois, o mesmo comando roda **sem** essa opção só pra avisar quando o
     Expo soltou correções novas (ex.: `expo` 57.0.31 → 57.0.33). Isso **não**
     faz o workflow falhar: aparece como aviso no resumo, e o Dependabot propõe
     a atualização no grupo `expo-sdk` (ou rode `npx expo install --fix`).
3. **`npx tsc --noEmit`**: o código continua compilando com as versões novas. O
   `firebaseConfig.ts` e o `googleAuth.ts` ficam fora do Git, então o workflow
   cria versões falsas desses dois arquivos só pra compilar.
4. **`npm audit`**: procura vulnerabilidades conhecidas nas dependências do app
   (as de desenvolvimento ficam de fora, porque não vão pro celular). **Só
   vulnerabilidade crítica faz o workflow falhar**; as outras aparecem no resumo.

No fim, a página da execução (aba **Actions**) mostra um resumo com as
vulnerabilidades e uma tabela de pacotes desatualizados, dizendo quem atualiza
cada um.

Ele roda em todo PR que mexe no `package.json` ou no `package-lock.json`, em todo
push desses arquivos na `main`, toda segunda às 06:00 (pra pegar vulnerabilidades
descobertas em pacotes que não mudaram) e quando alguém clica em **Run workflow**
na aba Actions.

## O que o Dependabot atualiza (e o que não)

| Tipo | Exemplo | Quem faz |
|---|---|---|
| Correção (patch) de qualquer pacote | `firebase` 10.12.0 → 10.12.5 | Dependabot, agrupado num PR só |
| Versão minor fora do Expo | `firebase` 10.12 → 10.14 | Dependabot |
| Correção do Expo dentro do mesmo SDK | `expo-camera` 57.0.6 → 57.0.7 | Dependabot (grupo `expo-sdk`) |
| **Troca de SDK do Expo** (Expo, React, React Native e os pacotes nativos que o Expo controla) | SDK 57 → 58 | **A equipe, à mão** (ver abaixo) |
| **Versão major** de outros pacotes | `firebase` 10 → 12 | **A equipe, à mão**, lendo o changelog |
| As actions do próprio workflow | `actions/checkout` v4 → v5 | Dependabot, uma vez por mês |

Por que deixar React, React Native e afins de fora: no Expo, essas versões são
definidas pelo SDK. Atualizar um deles sozinho deixa o app incompatível com o
resto, e o passo 2 do workflow acusaria o erro.

## Como lidar com um PR do Dependabot

1. Abra o PR na aba **Pull requests**.
2. Veja o resultado do check **Dependências / App (Expo)**:
   - ✅ **Passou:** pode aceitar (**Merge**). Se o PR mexe em pacote nativo
     (`expo-*`, `react-native-*`, `@react-native-google-signin/*`), gere um build
     novo (`eas build --profile development`) antes de testar no celular.
   - ❌ **Falhou:** clique em **Details** pra ver o passo que falhou:
     - `Pacotes compatíveis com o expo instalado`: a versão nova não combina com
       o SDK. Feche o PR.
     - `tsc`: a versão nova mudou alguma coisa que o código usa. Corrija o código
       no próprio branch do PR ou feche o PR.
     - `npm audit` (crítica): veja a tabela no resumo da execução.
3. Pra o Dependabot não oferecer de novo uma versão que não serve, comente no PR:
   `@dependabot ignore this minor version` (ou `... this major version`).

## Vulnerabilidade crítica

1. Abra o resumo da execução (aba **Actions** → execução com ❌ → **Summary**).
2. A tabela mostra o pacote e a correção:
   - **`npm audit fix`**: rode na pasta `energyhome` e faça commit do
     `package-lock.json`.
   - **"atualizar X para Y"**: atualize esse pacote (`npm install X@Y`).
   - **"sem correção ainda"**: não há versão segura. Se o pacote só é usado na
     hora do build (não vai pro celular), registre isso no PR e siga; se vai
     pro celular, avalie trocar o pacote.
3. **Não use `npm audit fix --force`**: ele sobe versões major sem perguntar e
   pode quebrar o Expo.

## Vulnerabilidades conhecidas e aceitas

| Pacotes | Gravidade | Por que não afeta o app | Quando resolver |
|---|---|---|---|
| `@firebase/firestore`, `@firebase/firestore-compat`, `@grpc/grpc-js`, `undici` (todos dentro do `firebase` 10) | Alta | O pacote `firebase` instala todos os módulos, mas o app só importa `firebase/app`, `firebase/auth` e `firebase/database`. O Metro só coloca no APK o que é importado: o Firestore não entra, e o `grpc-js` e o `undici` são da versão Node (no celular o Firebase usa o `fetch` do React Native) | Ao atualizar o `firebase` para a versão major nova (12 ou 13), à mão e com teste completo de login, leituras ao vivo, alertas e widget |

O `npm audit` sugere **voltar** o `firebase` para a 9.14.0. **Não façam isso:** é
uma versão mais velha, e o resumo do workflow avisa quando a sugestão é voltar
versão. Se o app passar a usar o Firestore algum dia, essa tabela deixa de valer
e a atualização vira prioridade.

## Troca de SDK do Expo (à mão, uma vez por ano mais ou menos)

```bash
cd energyhome
npx expo install expo@^58      # o número do SDK novo
npx expo install --fix         # alinha React, React Native e os pacotes nativos
npx tsc --noEmit
eas build --profile development
```

Teste o app inteiro no celular (login, pareamento, gráficos, alertas, widget)
antes de abrir o PR. Leia antes as notas da versão em <https://expo.dev/changelog>.

## Configuração no GitHub (uma vez)

1. **Settings → Code security**: ligue **Dependabot alerts** e **Dependabot
   security updates** (o segundo abre PR na hora quando sai um alerta de
   segurança, sem esperar a segunda-feira).
2. **Settings → Actions → General**: deixe as Actions permitidas.
3. *(Opcional)* **Settings → Branches → Add rule** para a `main`: marque
   **Require status checks to pass** e escolha **App (Expo)**. Assim nenhum PR
   que mexe nas dependências entra sem passar no workflow.

## O que fica de fora

- **Firmware (ESP32):** as bibliotecas do Arduino não têm suporte no Dependabot.
  Elas são atualizadas pela própria Arduino IDE (Ferramentas → Gerenciar
  Bibliotecas), e cada atualização deve ser testada gravando o hub.
- **Worker de alertas (`alertas-worker/`):** não está no repositório. Se for
  adicionado, acrescente no `dependabot.yml` um bloco igual ao do app com
  `directory: /alertas-worker`.
- **`energyhome/functions/`:** Cloud Functions antigas, sem uso (o plano gratuito
  do Firebase não roda Functions). Por isso não estão no controle.
