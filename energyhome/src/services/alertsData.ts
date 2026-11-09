import { getDatabase, ref, onValue, update, get, set } from 'firebase/database';
import { app } from './authIntegration';
import { getAlertTemplate, AlertTemplate } from '../constants/alertMessages';
import { idioma } from '../i18n';

const db = getDatabase(app);

// ─────────────────────────────────────────────────────────────────────────
// Estrutura de dados no Firebase Realtime Database:
//
// /hubs/{hubId}/alerts/{pushId}
//    {
//      templateId: string,   // chave de src/constants/alertMessages.ts
//      timestamp: number,    // ms desde 1970
//      read: boolean,        // se o usuário já visualizou
//      detalhe?: string      // texto da notificação, com os números do momento
//      detalheEn?: string    // o mesmo texto em inglês
//    }
//
// Quem grava aqui é o ESP32 (ou uma Cloud Function que analisa as leituras)
// ao detectar uma anomalia, sempre usando um templateId válido.
// ─────────────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  templateId: string;
  timestamp: number;
  read: boolean;
  /** Texto da notificação (com os números do momento). Alertas antigos não têm. */
  detalhe: string | null;
  /** O mesmo texto em inglês. Alertas de antes da versão em inglês não têm. */
  detalheEn: string | null;
}

/**
 * Título, descrição, ícone e "o que fazer" do alerta no idioma atual, mais o
 * detalhe com os números do momento (ou a descrição padrão, se não houver).
 * Chame na hora de desenhar, pra trocar junto com o idioma do app.
 */
export function textosDoAlerta(alert: Alert): AlertTemplate & { detalhe: string } {
  const template = getAlertTemplate(alert.templateId);
  const detalhe = idioma() === 'en' ? alert.detalheEn : alert.detalhe;
  return { ...template, detalhe: detalhe ?? template.description };
}

function texto(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null;
}

/** Observa todos os alertas de um hub em tempo real, do mais recente pro mais antigo. */
export function subscribeToAlerts(hubId: string, callback: (alerts: Alert[]) => void) {
  const alertsRef = ref(db, `hubs/${hubId}/alerts`);
  return onValue(alertsRef, (snapshot) => {
    const alerts: Alert[] = [];
    snapshot.forEach((child) => {
      const value = child.val();
      if (typeof value?.templateId === 'string' && typeof value?.timestamp === 'number') {
        alerts.push({
          id: child.key as string,
          templateId: value.templateId,
          timestamp: value.timestamp,
          read: Boolean(value.read),
          detalhe: texto(value.detalhe),
          detalheEn: texto(value.detalheEn),
        });
      }
    });
    alerts.sort((a, b) => b.timestamp - a.timestamp);
    callback(alerts);
  });
}

/**
 * Fim do período de aprendizado dos alertas de consumo (ms), gravado pelo
 * Worker em /hubs/{hubId}/aprendizadoAte. Nos primeiros 30 dias do hub ele só
 * aprende o consumo da casa e não manda alertas de pico/prolongado/projeção.
 * null = o Worker ainda não rodou pra esse hub.
 */
export function subscribeToAprendizado(hubId: string, callback: (ate: number | null) => void) {
  return onValue(ref(db, `hubs/${hubId}/aprendizadoAte`), (snapshot) => {
    const v = snapshot.val();
    callback(typeof v === 'number' ? v : null);
  });
}

const APRENDIZADO_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Atalho escondido (7 toques no "A.C.D.C" do topo, ver AppHeader): encerra o
 * período de aprendizado na hora, pra testar/demonstrar os alertas de
 * consumo. Se já tiver encerrado, começa um novo período de 30 dias.
 */
export async function alternarAprendizado(hubId: string): Promise<'encerrado' | 'reiniciado'> {
  const caminho = ref(db, `hubs/${hubId}/aprendizadoAte`);
  const ate = (await get(caminho)).val();
  const agora = Date.now();
  if (typeof ate === 'number' && ate > agora) {
    await set(caminho, agora);
    return 'encerrado';
  }
  await set(caminho, agora + APRENDIZADO_MS);
  return 'reiniciado';
}

/** Marca um alerta como visualizado. */
export async function markAlertAsRead(hubId: string, alertId: string): Promise<void> {
  await update(ref(db, `hubs/${hubId}/alerts/${alertId}`), { read: true });
}
