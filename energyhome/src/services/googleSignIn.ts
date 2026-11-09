import Constants, { ExecutionEnvironment } from 'expo-constants';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '../constants/googleAuth';
import { t } from '../i18n';

// ─────────────────────────────────────────────────────────────────────────
// Login com Google (biblioteca @react-native-google-signin/google-signin)
//
// Fluxo: o Google mostra o seletor de contas nativo do Android → devolve um
// idToken → esse token vai pro Firebase Auth (loginWithGoogleIdToken, em
// authIntegration.ts), que cria/entra na conta.
//
// Essa biblioteca usa código nativo, então NÃO funciona no Expo Go, só na
// versão de desenvolvimento do app (development build, via EAS). Pra não
// quebrar o app inteiro no Expo Go, o módulo nativo só é carregado na hora
// do clique, e fora do Expo Go.
//
// Configuração necessária no Google Cloud (ver passo a passo do projeto):
//  - um Client ID do tipo "Web" (GOOGLE_WEB_CLIENT_ID): é ele que faz o
//    Google devolver o idToken que o Firebase aceita;
//  - um Client ID do tipo "Android" com o pacote com.energyhome.app e o
//    SHA-1 do certificado que assinou o app. Ele não aparece no código: o
//    Google reconhece o app pelo pacote + SHA-1. Se faltar, o erro é
//    DEVELOPER_ERROR.
// ─────────────────────────────────────────────────────────────────────────

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let googleModule: GoogleSigninModule | null = null;

/** Carrega e configura a biblioteca nativa, ou null se não estiver disponível. */
function loadGoogleSignin(): GoogleSigninModule | null {
  if (isExpoGo) return null;
  if (googleModule) return googleModule;

  try {
    // require (e não import no topo) de propósito: só carrega quando precisa.
    const loaded: GoogleSigninModule = require('@react-native-google-signin/google-signin');
    loaded.GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
    });
    googleModule = loaded;
    return loaded;
  } catch (error) {
    console.warn('Login com Google indisponível nesta build:', error);
    return null;
  }
}

export type GoogleSignInResult =
  | { status: 'success'; idToken: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/** Abre o seletor de contas do Google e devolve o idToken pra entrar no Firebase. */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const google = loadGoogleSignin();
  if (!google) {
    return {
      status: 'error',
      message: isExpoGo
        ? t('google.expoGo')
        : t('google.indisponivel'),
    };
  }

  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = google;

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Sai da sessão anterior do Google (só neste app) pra sempre mostrar o
    // seletor de contas, em vez de entrar direto na última conta usada.
    await GoogleSignin.signOut().catch(() => undefined);

    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      return { status: 'cancelled' };
    }

    const idToken = response.data.idToken;
    if (!idToken) {
      return {
        status: 'error',
        message: t('google.semToken'),
      };
    }

    return { status: 'success', idToken };
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.IN_PROGRESS) {
        return { status: 'cancelled' };
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { status: 'error', message: t('google.playServices') };
      }
      // Código 10 = DEVELOPER_ERROR no Android: falta o SHA-1 do app no
      // Client ID Android do Google Cloud, ou o pacote está diferente.
      if (String(error.code) === '10' || String(error.message).includes('DEVELOPER_ERROR')) {
        console.warn('Google Sign-In DEVELOPER_ERROR:', error);
        return {
          status: 'error',
          message: t('google.config'),
        };
      }
    }
    console.warn('Erro no login com Google:', error);
    return { status: 'error', message: t('google.erro') };
  }
}

/** Encerra a sessão do Google neste app (usado ao sair/excluir a conta). */
export async function signOutFromGoogle(): Promise<void> {
  const google = loadGoogleSignin();
  if (!google) return;
  try {
    await google.GoogleSignin.signOut();
  } catch {
    // Se não havia sessão do Google, não há nada pra encerrar.
  }
}
