import { getDatabase, ref, onValue, query, orderByChild, startAt, get, set } from 'firebase/database';
import { app } from './authIntegration';

const db = getDatabase(app);

// ─────────────────────────────────────────────────────────────────────────
// Estrutura de dados no Firebase Realtime Database (contrato com o ESP32):
//
// /hub/current
//    { watts: number, updatedAt: number (timestamp em ms) }
//    -> o ESP32 SOBRESCREVE esse valor a cada leitura (ex: a cada 2-5s).
//       É o que alimenta o "Consumo Atual" em tempo real no Dashboard.
//
// /hub/readings/{pushId}
//    { watts: number, timestamp: number (ms) }
//    -> o ESP32 ADICIONA um novo registro periodicamente (ex: a cada 1 min),
//       usando push() do Firebase. É o histórico usado para calcular kWh
//       (energia = integral da potência ao longo do tempo).
//
// /hub/settings/tariff
//    number (R$/kWh)
//    -> definido pelo app (tela de Ajustes), lido tanto pelo app quanto,
//       futuramente, pelo próprio ESP32 se quiser mostrar algo localmente.
// ─────────────────────────────────────────────────────────────────────────

export interface PowerReading {
  watts: number;
  timestamp: number;
}

/** Observa a potência atual (Watts), atualizada em tempo real pelo ESP32. */
export function subscribeToCurrentPower(callback: (watts: number | null) => void) {
  const currentRef = ref(db, 'hub/current');
  return onValue(currentRef, (snapshot) => {
    const data = snapshot.val();
    callback(typeof data?.watts === 'number' ? data.watts : null);
  });
}

/** Observa todas as leituras de histórico a partir de um timestamp (ms). */
export function subscribeToReadingsSince(
  sinceTimestamp: number,
  callback: (readings: PowerReading[]) => void
) {
  const readingsQuery = query(ref(db, 'hub/readings'), orderByChild('timestamp'), startAt(sinceTimestamp));
  return onValue(readingsQuery, (snapshot) => {
    const readings: PowerReading[] = [];
    snapshot.forEach((child) => {
      const value = child.val();
      if (typeof value?.watts === 'number' && typeof value?.timestamp === 'number') {
        readings.push({ watts: value.watts, timestamp: value.timestamp });
      }
    });
    callback(readings);
  });
}

/**
 * Converte uma lista de leituras de potência (W) em energia acumulada (kWh),
 * integrando pelo método trapezoidal (aproxima a curva entre dois pontos
 * consecutivos por uma reta, e soma a área — ou seja, Watts médios × tempo).
 */
export function calculateKwh(readings: PowerReading[]): number {
  if (readings.length < 2) return 0;

  let totalWattHours = 0;
  for (let i = 1; i < readings.length; i++) {
    const prev = readings[i - 1];
    const curr = readings[i];
    const hoursElapsed = (curr.timestamp - prev.timestamp) / (1000 * 60 * 60);
    const avgWatts = (prev.watts + curr.watts) / 2;
    totalWattHours += avgWatts * hoursElapsed;
  }
  return totalWattHours / 1000;
}

/** Início do dia atual (00:00) em milissegundos. */
export function startOfTodayMs(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

/** Início do mês atual (dia 1, 00:00) em milissegundos. */
export function startOfMonthMs(): number {
  const now = new Date();
  now.setDate(1);
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

/** Lê a tarifa atual (R$/kWh) salva no Firebase. */
export async function getTariff(): Promise<number> {
  const snapshot = await get(ref(db, 'hub/settings/tariff'));
  const value = snapshot.val();
  return typeof value === 'number' ? value : 0.85;
}

/** Observa a tarifa em tempo real (útil se quiser refletir mudanças na hora). */
export function subscribeToTariff(callback: (tariff: number) => void) {
  const tariffRef = ref(db, 'hub/settings/tariff');
  return onValue(tariffRef, (snapshot) => {
    const value = snapshot.val();
    callback(typeof value === 'number' ? value : 0.85);
  });
}

/** Salva a tarifa (R$/kWh) no Firebase. */
export async function setTariff(tariff: number): Promise<void> {
  await set(ref(db, 'hub/settings/tariff'), tariff);
}
