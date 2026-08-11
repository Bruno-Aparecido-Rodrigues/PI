import { getDatabase, ref, onValue, update } from 'firebase/database';
import { app } from './authIntegration';
import { getAlertTemplate } from '../constants/alertMessages';

const db = getDatabase(app);

// ─────────────────────────────────────────────────────────────────────────
// Estrutura de dados no Firebase Realtime Database:
//
// /hub/alerts/{pushId}
//    {
//      templateId: string,   // chave de src/constants/alertMessages.ts
//      timestamp: number,    // ms desde 1970
//      read: boolean         // se o usuário já visualizou
//    }
//
// Quem grava aqui é o ESP32 (ou uma Cloud Function que analisa as leituras)
// ao detectar uma anomalia — sempre usando um templateId válido.
// ─────────────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  templateId: string;
  title: string;
  description: string;
  timestamp: number;
  read: boolean;
}

/** Observa todos os alertas em tempo real, do mais recente pro mais antigo. */
export function subscribeToAlerts(callback: (alerts: Alert[]) => void) {
  const alertsRef = ref(db, 'hub/alerts');
  return onValue(alertsRef, (snapshot) => {
    const alerts: Alert[] = [];
    snapshot.forEach((child) => {
      const value = child.val();
      if (typeof value?.templateId === 'string' && typeof value?.timestamp === 'number') {
        const template = getAlertTemplate(value.templateId);
        alerts.push({
          id: child.key as string,
          templateId: value.templateId,
          title: template.title,
          description: template.description,
          timestamp: value.timestamp,
          read: Boolean(value.read),
        });
      }
    });
    alerts.sort((a, b) => b.timestamp - a.timestamp);
    callback(alerts);
  });
}

/** Marca um alerta como visualizado. */
export async function markAlertAsRead(alertId: string): Promise<void> {
  await update(ref(db, `hub/alerts/${alertId}`), { read: true });
}
