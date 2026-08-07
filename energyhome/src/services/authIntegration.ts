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
  updateProfile,
  deleteUser,
  User,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Preencha com as credenciais do seu projeto Firebase (Console do Firebase >
// Configurações do projeto > Seus apps > Configuração do SDK).
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// No React Native (diferente da Web), o Auth precisa ser inicializado com
// initializeAuth + uma persistência explícita (AsyncStorage), em vez de getAuth().
// O try/catch evita erro em Fast Refresh, quando o app tenta inicializar de novo.
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
    default:
      return 'Não foi possível concluir a operação. Tente novamente.';
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
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
  await firebaseSignOut(auth);
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
    await deleteUser(user);
    return { success: true, user };
  } catch (error: any) {
    if (error?.code === 'auth/requires-recent-login') {
      return {
        success: false,
        message: 'Por segurança, saia e faça login novamente antes de excluir sua conta.',
      };
    }
    return { success: false, message: mapAuthError(error?.code) };
  }
}

export { auth };
