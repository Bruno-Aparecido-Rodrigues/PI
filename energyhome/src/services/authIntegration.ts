import { initializeApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  deleteUser,
  User,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from './firebaseConfig';
import { signOutFromGoogle } from './googleSignIn';
import { esquecerTokenPush, registerForPushNotifications } from './pushNotifications';
import { limparWidgetConta } from '../widget/atualizarWidget';
import { t, idioma } from '../i18n';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch {
  auth = getAuth(app);
}

export type AuthResult =
  | { success: true; user: User }
  | { success: false; message: string };

function mapAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return t('auth.emailInvalido');
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return t('auth.credenciais');
    case 'auth/email-already-in-use':
      return t('auth.emailEmUso');
    case 'auth/weak-password':
      return t('auth.senhaFraca');
    case 'auth/account-exists-with-different-credential':
      return t('auth.outraCredencial');
    case 'auth/network-request-failed':
      return t('auth.semInternet');
    default:
      return t('auth.generico');
  }
}

/**
 * E-mails do Firebase (confirmação e redefinição de senha) no idioma do app.
 * null = idioma padrão do projeto no Console do Firebase (português).
 */
function idiomaDosEmails() {
  auth.languageCode = idioma() === 'en' ? 'en' : null;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);

    if (!credential.user.emailVerified) {
      await firebaseSignOut(auth);
      return {
        success: false,
        message: t('auth.confirmeEmail'),
      };
    }

    return { success: true, user: credential.user };
  } catch (error: any) {
    return { success: false, message: mapAuthError(error?.code) };
  }
}

export async function register(email: string, password: string, name?: string): Promise<AuthResult> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(credential.user, { displayName: name });
    }

    idiomaDosEmails();
    await sendEmailVerification(credential.user);

    // Não deixa a pessoa entrar direto sem confirmar o e-mail — desloga
    // logo após criar a conta. O login só é permitido depois da verificação.
    await firebaseSignOut(auth);

    return { success: true, user: credential.user };
  } catch (error: any) {
    return { success: false, message: mapAuthError(error?.code) };
  }
}

export async function loginWithGoogleIdToken(idToken: string): Promise<AuthResult> {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, message: mapAuthError(error?.code) };
  }
}

export async function logout(): Promise<void> {
  // Antes de sair (depois não tem mais permissão): este celular para de
  // receber os alertas da conta.
  const uid = auth.currentUser?.uid;
  if (uid) await esquecerTokenPush(uid);
  await firebaseSignOut(auth);
  // O widget da tela inicial deixa de mostrar a conta de quem saiu
  await limparWidgetConta();
  // Se entrou com Google, encerra também a sessão do Google neste app, pra
  // próxima pessoa poder escolher outra conta.
  await signOutFromGoogle();
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export async function resetPassword(email: string): Promise<AuthResult> {
  try {
    idiomaDosEmails();
    await sendPasswordResetEmail(auth, email);
    return { success: true, user: { uid: '', email } as User };
  } catch (error: any) {
    return { success: false, message: mapAuthError(error?.code) };
  }
}

export async function deleteAccount(): Promise<AuthResult> {
  const user = auth.currentUser;
  if (!user) {
    return { success: false, message: t('auth.semUsuario') };
  }

  try {
    await esquecerTokenPush(user.uid);
    await deleteUser(user);
    await signOutFromGoogle();
    return { success: true, user };
  } catch (error: any) {
    // Não excluiu: volta a receber notificações neste celular
    registerForPushNotifications(user.uid);
    if (error?.code === 'auth/requires-recent-login') {
      return {
        success: false,
        message: t('auth.loginRecente'),
      };
    }
    return { success: false, message: mapAuthError(error?.code) };
  }
}

export { auth, app };
