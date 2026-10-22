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
      return 'E-mail inválido.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos.';
    case 'auth/email-already-in-use':
      return 'Já existe uma conta com esse e-mail.';
    case 'auth/weak-password':
      return 'A senha precisa ter pelo menos 6 caracteres.';
    case 'auth/account-exists-with-different-credential':
      return 'Já existe uma conta com esse e-mail. Entre com e-mail e senha.';
    case 'auth/network-request-failed':
      return 'Sem conexão com a internet. Tente novamente.';
    default:
      return 'Não foi possível concluir a operação. Tente novamente.';
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);

    if (!credential.user.emailVerified) {
      await firebaseSignOut(auth);
      return {
        success: false,
        message: 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada (e o spam).',
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
    await sendPasswordResetEmail(auth, email);
    return { success: true, user: { uid: '', email } as User };
  } catch (error: any) {
    return { success: false, message: mapAuthError(error?.code) };
  }
}

export async function deleteAccount(): Promise<AuthResult> {
  const user = auth.currentUser;
  if (!user) {
    return { success: false, message: 'Nenhum usuário autenticado.' };
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
        message: 'Por segurança, saia e faça login novamente antes de excluir sua conta.',
      };
    }
    return { success: false, message: mapAuthError(error?.code) };
  }
}

export { auth, app };
