import { getDatabase, ref, onValue, set, get } from 'firebase/database';
import { app } from './authIntegration';

const db = getDatabase(app);

// ─────────────────────────────────────────────────────────────────────────
// Estrutura de dados no Firebase Realtime Database (pareamento):
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

  await Promise.all([
    set(ref(db, `users/${uid}/hubs/${hubId}`), true),
    set(ref(db, `hubs/${hubId}/owners/${uid}`), true),
  ]);
}

/** Remove a associação entre um hub e a conta do usuário. */
export async function unpairHub(uid: string, hubId: string): Promise<void> {
  await Promise.all([
    set(ref(db, `users/${uid}/hubs/${hubId}`), null),
    set(ref(db, `hubs/${hubId}/owners/${uid}`), null),
  ]);
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
