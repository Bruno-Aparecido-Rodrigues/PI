// Client ID "Web" gerado automaticamente ao ativar o provedor Google:
export const GOOGLE_WEB_CLIENT_ID = '381830661025-g3efm0oriq42g6jooac5c79pbsaqt3n4.apps.googleusercontent.com';

// Client IDs "nativos" (sem client secret), criados manualmente no Google
// Cloud Console > APIs e Serviços > Credenciais > Criar credenciais > ID do
// cliente OAuth. É o método que o Google exige/aceita para apps mobile
// (o tipo "Web application" sozinho não é aceito nesse contexto).
//
// - Tipo "Android": exige o nome do pacote (app.json > android.package,
//   hoje "com.energyhome.app") e a impressão digital SHA-1 do certificado
//   de assinatura do seu build (dev client / EAS Build).
// - Tipo "iOS": exige o Bundle Identifier (app.json > ios.bundleIdentifier,
//   hoje "com.energyhome.app").
export const GOOGLE_ANDROID_CLIENT_ID = '381830661025-2o6k0podp71ofe5r1qpqi7ou2mafi560.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID = '381830661025-tdh144v1n10s5dadonpbii64d94rdsl0.apps.googleusercontent.com';
