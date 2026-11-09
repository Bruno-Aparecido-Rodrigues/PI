import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApp } from 'firebase/app';
import { getDatabase, ref, set, get, remove } from 'firebase/database';
import { t } from '../i18n';

// Quem gera os alertas e manda as notificações é o Worker da Cloudflare
// (pasta alertas-worker). O app só registra o "endereço" de notificação
// deste celular em /pushTokens/{uid}, e o Worker manda pra ele.

// Canal do Android usado pelo Worker (channelId: 'alertas')
const CANAL_ALERTAS = 'alertas';

// getApp() em vez de importar authIntegration: evita import circular (o
// logout de authIntegration usa este arquivo).
function banco() {
  return getDatabase(getApp());
}

// Com o app aberto, mostra a notificação mesmo assim (por padrão o Expo
// esconde notificação que chega com o app em primeiro plano).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Token deste celular (pra no logout apagar só se ainda for o dele)
let tokenDesteCelular: string | null = null;

/**
 * Pede permissão de notificação, gera o token push do Expo pra este
 * celular e salva em /pushTokens/{uid}.
 */
export async function registerForPushNotifications(uid: string): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      // Criar o canal antes de pedir permissão: no Android 13+ é isso que
      // faz aparecer o pedido de permissão.
      await Notifications.setNotificationChannelAsync(CANAL_ALERTAS, {
        name: t('alertas.canal'),
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0052ff',
      });
    }

    const { status: atual } = await Notifications.getPermissionsAsync();
    let status = atual;
    if (atual !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('Notificações: falta o extra.eas.projectId no app.json.');
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    tokenDesteCelular = token;
    await set(ref(banco(), `pushTokens/${uid}`), token);
  } catch (error) {
    // Sem notificação (Expo Go, emulador sem Google Play…) o app segue normal
    console.warn('Não foi possível registrar notificações push:', error);
  }
}

/**
 * Chamado antes de sair da conta: apaga o token pra este celular parar de
 * receber os alertas da conta. Se a conta já registrou outro celular depois,
 * não mexe.
 */
export async function esquecerTokenPush(uid: string): Promise<void> {
  if (!tokenDesteCelular) return;
  try {
    const caminho = ref(banco(), `pushTokens/${uid}`);
    const salvo = await get(caminho);
    if (salvo.val() === tokenDesteCelular) await remove(caminho);
  } catch (error) {
    console.warn('Não foi possível remover o token de notificação:', error);
  } finally {
    tokenDesteCelular = null;
  }
}

/**
 * Avisa quando a pessoa toca numa notificação de alerta, inclusive a que
 * abriu o app do zero. Devolve a função pra parar de ouvir.
 */
export function aoTocarNotificacao(callback: () => void): () => void {
  let ativo = true;
  const ultima = Notifications.getLastNotificationResponse();
  if (ultima) {
    // Abriu o app pela notificação: espera a navegação montar
    setTimeout(() => ativo && callback(), 0);
    Notifications.clearLastNotificationResponse();
  }
  const assinatura = Notifications.addNotificationResponseReceivedListener(() => callback());
  return () => {
    ativo = false;
    assinatura.remove();
  };
}
