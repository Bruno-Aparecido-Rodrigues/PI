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

## Próximos passos a fazer

- Conectar o ESP32/SCT-013 via Firebase Realtime Database ou Firestore, substituindo os dados mockados de `Dashboard` e `Charts` por leituras reais.
- Persistir preferências de tarifa e notificações.
