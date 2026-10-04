import { getDatabase, ref, onValue, set, get } from 'firebase/database';
import { app } from './authIntegration';

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
// Gravamos os dois de uma vez ao parear, pra manter consistente.
// ─────────────────────────────────────────────────────────────────────────

/** Normaliza um ID de hub digitado pelo usuário (aceita com ou sem ":"). */
export function normalizeHubId(rawHubId: string): string {
  return rawHubId.trim().toUpperCase().replace(/[^A-F0-9]/g, '');
}

/** Associa um hubId à conta do usuário logado (pareamento). */
export async function pairHub(uid: string, rawHubId: string): Promise<void> {
  const hubId = normalizeHubId(rawHubId);

  if (hubId.length < 6) {
    throw new Error('ID de dispositivo inválido.');
  }

  const registeredSnapshot = await get(ref(db, `hubs/${hubId}/registered`));
  if (!registeredSnapshot.exists()) {
    throw new Error(
      'Esse dispositivo ainda não foi detectado. Confira se ele está ligado e conectado à internet, e tente de novo em alguns segundos.'
    );
  }

  await Promise.all([
    set(ref(db, `users/${uid}/hubs/${hubId}`), true),
    set(ref(db, `hubs/${hubId}/owners/${uid}`), true),
    set(ref(db, `hubs/${hubId}/claimed`), true),
  ]);
}

/** Remove a associação entre um hub e a conta do usuário. */
export async function unpairHub(uid: string, hubId: string): Promise<void> {
  await Promise.all([
    set(ref(db, `users/${uid}/hubs/${hubId}`), null),
    set(ref(db, `hubs/${hubId}/owners/${uid}`), null),
  ]);

  // Se ninguém mais é dono desse hub, ele volta pro estado "não reivindicado"
  // o ESP32 vai parar de mandar dados de consumo até ser pareado de novo.
  const ownersSnapshot = await get(ref(db, `hubs/${hubId}/owners`));
  if (!ownersSnapshot.exists()) {
    await set(ref(db, `hubs/${hubId}/claimed`), false);
  }
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
