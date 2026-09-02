import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getDatabase, ref, set } from 'firebase/database';
import { app } from './authIntegration';

const db = getDatabase(app);

// Enquanto o app está ABERTO (primeiro/segundo plano), isso garante que a
// notificação apareça normalmente mesmo assim (por padrão o Expo suprime
// notificações quando o app já está em foco).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Pede permissão de notificação, gera o token push do Expo pra este
 * aparelho, e salva em /pushTokens/{uid} no Firebase — é esse token que a
 * Cloud Function usa pra saber pra quem mandar a notificação.
 */
export async function registerForPushNotifications(uid: string): Promise<void> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    await set(ref(db, `pushTokens/${uid}`), tokenResponse.data);
  } catch (error) {
    // Não trava o app se, por algum motivo, não conseguir registrar (ex:
    // emulador sem Google Play Services). O app continua funcionando
    // normalmente, só sem notificações push nesse caso.
    console.warn('Não foi possível registrar notificações push:', error);
  }
}
