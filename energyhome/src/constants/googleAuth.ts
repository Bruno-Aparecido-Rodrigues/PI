// Client IDs do login com Google (Google Cloud Console → APIs e serviços →
// Credenciais, projeto pi-energia-db). Usados em src/services/googleSignIn.ts.

// Client ID "Web" gerado automaticamente ao ativar o provedor Google no
// Firebase. É o mais importante: é com ele que o Google devolve o idToken
// que o Firebase Auth aceita.
export const GOOGLE_WEB_CLIENT_ID = '381830661025-g3efm0oriq42g6jooac5c79pbsaqt3n4.apps.googleusercontent.com';

// Client ID "Android": não é passado pro código. O Google reconhece o app
// pelo pacote (com.energyhome.app) + SHA-1 cadastrados NESSE client no
// Google Cloud. Fica aqui só como referência de qual client é o do app.
export const GOOGLE_ANDROID_CLIENT_ID = '381830661025-2o6k0podp71ofe5r1qpqi7ou2mafi560.apps.googleusercontent.com';

// Client ID "iOS": só usado se um dia gerar a versão de iPhone.
export const GOOGLE_IOS_CLIENT_ID = '381830661025-tdh144v1n10s5dadonpbii64d94rdsl0.apps.googleusercontent.com';
