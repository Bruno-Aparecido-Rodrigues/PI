import { getDatabase, ref, onValue, set, get, update, serverTimestamp } from 'firebase/database';
import { app } from './authIntegration';
import { t } from '../i18n';

const db = getDatabase(app);

// ─────────────────────────────────────────────────────────────────────────
// Estrutura de dados no Firebase Realtime Database (pareamento):
//
// /hubs/{hubId}/registered: <timestamp>
//    -> o próprio ESP32 escreve isso sozinho, assim que liga e conecta na
//       internet — é a "prova de vida" de que aquele hubId existe de
//       verdade. O app confere isso antes de aceitar um pareamento, pra não
//       deixar cadastrar um ID inventado.
//
// /hubs/{hubId}/claimed: true | false
//    -> vira true quando o app pareia esse hub com uma conta. O ESP32 fica
//       de olho nisso e só começa a mandar dados de consumo de verdade
//       depois que virar true (antes disso, só manda o "registered").
//
// /users/{uid}/hubs/{hubId}: true
//    -> quais hub(s) essa conta pode ver. É por aqui que o app descobre
//       qual hubId escutar depois do login.
//
// /hubs/{hubId}/owners/{uid}: true
//    -> o "inverso" da relação acima, guardado também do lado do hub. Serve
//       pra Cloud Function saber pra quem notificar um alerta desse hub,
//       sem precisar varrer todos os usuários procurando.
//
// Gravamos tudo numa única escrita atômica (update multi-caminho), por dois
// motivos: (1) nunca fica um estado pela metade (ex: dono gravado mas
// claimed ainda false); (2) as regras de segurança (database.rules.json)
// avaliam o resultado final da escrita inteira — só deixam marcar
// claimed = true se, no mesmo envio, o usuário estiver virando dono.
//
// Regra importante: um hub só aceita um dono novo se ainda NÃO tiver
// nenhum. Se outra conta já pareou, o Firebase recusa (PERMISSION_DENIED).
// ─────────────────────────────────────────────────────────────────────────

function isPermissionDenied(error: any): boolean {
  return (
    error?.code === 'PERMISSION_DENIED' ||
    String(error?.message ?? '').toUpperCase().includes('PERMISSION_DENIED')
  );
}

/** Normaliza um ID de hub digitado pelo usuário (aceita com ou sem ":"). */
export function normalizeHubId(rawHubId: string): string {
  return rawHubId.trim().toUpperCase().replace(/[^A-F0-9]/g, '');
}

// ─────────────────────────────────────────────────────────────────────────
// QR Code de pareamento
//
// Como o ESP32 não tem tela, o QR fica numa etiqueta colada no hub. O
// conteúdo é um link no formato:
//
//    energyhome://pair?hub=02A73C915E48
//
// Usar o "scheme" do app (energyhome://, definido no app.json) em vez do ID
// puro evita aceitar qualquer QR aleatório como se fosse um hub, e deixa
// pronto pra, no futuro, a câmera do próprio celular abrir o app direto na
// tela de pareamento. Por robustez, também aceitamos um QR só com o ID.
// ─────────────────────────────────────────────────────────────────────────

const HUB_ID_LENGTH = 12; // MAC do ESP32 em hexadecimal, sem ":"

/** Conteúdo que vai no QR Code da etiqueta de um hub. */
export function buildHubQrContent(hubId: string): string {
  return `energyhome://pair?hub=${normalizeHubId(hubId)}`;
}

/** Extrai o hubId de um QR Code lido pela câmera, ou null se não for de um hub. */
export function parseHubQrCode(data: string): string | null {
  const text = data.trim();

  const fromLink = text.match(/^energyhome:\/\/pair\?(?:.*&)?hub=([0-9A-Fa-f:\-]+)/);
  const candidate = fromLink ? fromLink[1] : text;

  // Sem o link, só aceita se o texto inteiro for um MAC (com ou sem ":" / "-").
  if (!fromLink && !/^[0-9A-Fa-f]{2}([:\-]?[0-9A-Fa-f]{2}){5}$/.test(candidate)) {
    return null;
  }

  const hubId = normalizeHubId(candidate);
  return hubId.length === HUB_ID_LENGTH ? hubId : null;
}

// ─────────────────────────────────────────────────────────────────────────
// Histórico de um hub sem dono
//
// Quando o ÚLTIMO dono desconecta o hub, gravamos /hubs/{hubId}/unclaimedAt
// (horário do servidor). O histórico (leituras, alertas, tarifa, leitura
// atual) fica guardado:
//  - se alguém parear de novo em até 6 meses, os dados continuam;
//  - se passar de 6 meses, o histórico é apagado no momento do novo
//    pareamento (e, a Cloud Function
//    limparHubsAbandonados apaga sozinha mesmo sem ninguém parear).
// Quem garante o prazo são as regras do banco (database.rules.json), usando
// o relógio do servidor: ninguém consegue apagar antes dos 6 meses.
// ─────────────────────────────────────────────────────────────────────────

/** 6 meses (180 dias), em ms. Tem que bater com o valor em database.rules.json. */
export const PRAZO_HISTORICO_MS = 180 * 24 * 60 * 60 * 1000;

/** Associa um hubId à conta do usuário logado (pareamento). */
export async function pairHub(uid: string, rawHubId: string): Promise<void> {
  const hubId = normalizeHubId(rawHubId);

  if (hubId.length < 6) {
    throw new Error(t('parear.idInvalido'));
  }

  const registeredSnapshot = await get(ref(db, `hubs/${hubId}/registered`));
  if (!registeredSnapshot.exists()) {
    throw new Error(t('parear.naoDetectado'));
  }

  // O hub ficou sem dono por mais de 6 meses? Então o histórico antigo é
  // apagado junto com o pareamento (mesma escrita).
  const unclaimedSnapshot = await get(ref(db, `hubs/${hubId}/unclaimedAt`));
  const unclaimedAt = unclaimedSnapshot.val();
  const historicoExpirado =
    typeof unclaimedAt === 'number' && Date.now() - unclaimedAt > PRAZO_HISTORICO_MS;

  const pareamento: Record<string, unknown> = {
    [`users/${uid}/hubs/${hubId}`]: true,
    [`hubs/${hubId}/owners/${uid}`]: true,
    [`hubs/${hubId}/claimed`]: true,
    [`hubs/${hubId}/unclaimedAt`]: null,
  };
  const limpeza: Record<string, unknown> = {
    [`hubs/${hubId}/readings`]: null,
    [`hubs/${hubId}/alerts`]: null,
    [`hubs/${hubId}/settings`]: null,
    [`hubs/${hubId}/current`]: null,
  };

  try {
    await update(ref(db), historicoExpirado ? { ...pareamento, ...limpeza } : pareamento);
  } catch (error: any) {
    if (!isPermissionDenied(error)) throw error;

    // Se o relógio do celular estiver adiantado, o app pode achar que já
    // passou 6 meses quando o servidor ainda não acha: tenta parear sem apagar.
    if (historicoExpirado) {
      try {
        await update(ref(db), pareamento);
        return;
      } catch (segundoErro: any) {
        if (!isPermissionDenied(segundoErro)) throw segundoErro;
      }
    }
    throw new Error(t('parear.jaPareado'));
  }
}

/** Remove a associação entre um hub e a conta do usuário. */
export async function unpairHub(uid: string, hubId: string): Promise<void> {
  // Lê os donos ANTES de sair: depois de removido, o usuário perde a
  // permissão de leitura desse hub.
  let otherOwnersRemain: boolean;
  try {
    const ownersSnapshot = await get(ref(db, `hubs/${hubId}/owners`));
    const owners = ownersSnapshot.val() ?? {};
    otherOwnersRemain = Object.keys(owners).some((ownerUid) => ownerUid !== uid);
  } catch (error: any) {
    if (!isPermissionDenied(error)) throw error;
    // Estado inconsistente: o hub está na lista do usuário, mas ele não é
    // mais dono dele. Só limpa a lista do próprio usuário.
    await set(ref(db, `users/${uid}/hubs/${hubId}`), null);
    return;
  }

  const updates: Record<string, unknown> = {
    [`users/${uid}/hubs/${hubId}`]: null,
    [`hubs/${hubId}/owners/${uid}`]: null,
  };

  // Se ninguém mais é dono desse hub, ele volta pro estado "não reivindicado"
  // o ESP32 vai parar de mandar dados de consumo até ser pareado de novo.
  // E começa a contar o prazo de 6 meses do histórico (ver PRAZO_HISTORICO_MS).
  if (!otherOwnersRemain) {
    updates[`hubs/${hubId}/claimed`] = false;
    updates[`hubs/${hubId}/unclaimedAt`] = serverTimestamp();
  }

  await update(ref(db), updates);
}

/** Lê, uma vez, os hubs pareados com essa conta. */
export async function getUserHubs(uid: string): Promise<string[]> {
  const snapshot = await get(ref(db, `users/${uid}/hubs`));
  const value = snapshot.val();
  return value ? Object.keys(value) : [];
}

/** Observa em tempo real os hubs pareados com essa conta. */
export function subscribeToUserHubs(uid: string, callback: (hubIds: string[]) => void) {
  const hubsRef = ref(db, `users/${uid}/hubs`);
  return onValue(hubsRef, (snapshot) => {
    const value = snapshot.val();
    callback(value ? Object.keys(value) : []);
  });
}
