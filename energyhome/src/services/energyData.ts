import { getDatabase, ref, onValue, query, orderByChild, startAt, get, set } from 'firebase/database';
import { app } from './authIntegration';

const db = getDatabase(app);

// ─────────────────────────────────────────────────────────────────────────
// Estrutura de dados no Firebase Realtime Database (contrato com o ESP32):
//
// /hubs/{hubId}/current
//    { watts: number, updatedAt: number (timestamp em ms) }
//    -> o ESP32 SOBRESCREVE esse valor a cada leitura (ex: a cada 2-5s).
//       É o que alimenta o "Consumo Atual" em tempo real no Dashboard.
//
// /hubs/{hubId}/readings/{pushId}
//    { watts: number, timestamp: number (ms) }
//    -> o ESP32 ADICIONA um novo registro periodicamente (ex: a cada 1 min),
//       usando push() do Firebase. É o histórico usado para calcular kWh
//       (energia = integral da potência ao longo do tempo).
//
// /hubs/{hubId}/settings/tariff
//    number (R$/kWh)
//    -> definido pelo app (tela de Ajustes), lido tanto pelo app quanto,
//       futuramente, pelo próprio ESP32 se quiser mostrar algo localmente.
//
// {hubId} é o endereço MAC do ESP32 (sanitizado, sem ":"), único por
// dispositivo. Ver src/services/hubPairing.ts pra como ele é associado à
// conta do usuário.
// ─────────────────────────────────────────────────────────────────────────

export interface PowerReading {
  watts: number;
  timestamp: number;
}

/** Observa a potência atual (Watts) de um hub, atualizada em tempo real pelo ESP32. */
export function subscribeToCurrentPower(hubId: string, callback: (watts: number | null) => void) {
  const currentRef = ref(db, `hubs/${hubId}/current`);
  return onValue(currentRef, (snapshot) => {
    const data = snapshot.val();
    callback(typeof data?.watts === 'number' ? data.watts : null);
  });
}

export interface CurrentReading {
  watts: number;
  updatedAt: number;
}

/** Observa a leitura atual completa (watts + updatedAt), usada pra saber se o hub está online. */
export function subscribeToCurrentReading(hubId: string, callback: (reading: CurrentReading | null) => void) {
  const currentRef = ref(db, `hubs/${hubId}/current`);
  return onValue(currentRef, (snapshot) => {
    const data = snapshot.val();
    if (typeof data?.watts === 'number' && typeof data?.updatedAt === 'number') {
      callback({ watts: data.watts, updatedAt: data.updatedAt });
    } else {
      callback(null);
    }
  });
}

/** Observa todas as leituras de histórico de um hub a partir de um timestamp (ms). */
export function subscribeToReadingsSince(
  hubId: string,
  sinceTimestamp: number,
  callback: (readings: PowerReading[]) => void
) {
  const readingsQuery = query(
    ref(db, `hubs/${hubId}/readings`),
    orderByChild('timestamp'),
    startAt(sinceTimestamp)
  );
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

/** Meia-noite de N dias atrás (contando hoje como dia 0). */
export function startOfDaysAgoMs(daysAgo: number): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() - daysAgo);
  return now.getTime();
}

/** Início do mês atual (dia 1, 00:00) em milissegundos. */
export function startOfMonthMs(): number {
  const now = new Date();
  now.setDate(1);
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

const MAX_GAP_HOURS = 3; // ignora buracos grandes (hub offline) pra não inflar o cálculo

function dayKeyOf(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function hourKeyOf(timestamp: number): number {
  return new Date(timestamp).getHours();
}

/**
 * Agrupa as leituras em energia (kWh) por dia, para uma lista de dias
 * (cada item é a meia-noite daquele dia). Usado pelos gráficos de
 * "Semana"/"Mês".
 */
export function bucketKwhByDay(readings: PowerReading[], days: Date[]): number[] {
  const buckets = new Map<string, number>();

  for (let i = 1; i < readings.length; i++) {
    const prev = readings[i - 1];
    const curr = readings[i];
    const hoursElapsed = (curr.timestamp - prev.timestamp) / (1000 * 60 * 60);
    if (hoursElapsed <= 0 || hoursElapsed > MAX_GAP_HOURS) continue;

    const avgWatts = (prev.watts + curr.watts) / 2;
    const kwh = (avgWatts * hoursElapsed) / 1000;
    const key = dayKeyOf(curr.timestamp);
    buckets.set(key, (buckets.get(key) ?? 0) + kwh);
  }

  return days.map((day) => buckets.get(dayKeyOf(day.getTime())) ?? 0);
}

/**
 * Agrupa as leituras em energia (kWh) por hora do dia (0-23), só para o dia
 * de hoje. Usado pelo gráfico de "Hoje".
 */
export function bucketKwhByHourToday(readings: PowerReading[]): number[] {
  const buckets = new Array(24).fill(0);

  for (let i = 1; i < readings.length; i++) {
    const prev = readings[i - 1];
    const curr = readings[i];
    const hoursElapsed = (curr.timestamp - prev.timestamp) / (1000 * 60 * 60);
    if (hoursElapsed <= 0 || hoursElapsed > MAX_GAP_HOURS) continue;

    const avgWatts = (prev.watts + curr.watts) / 2;
    const kwh = (avgWatts * hoursElapsed) / 1000;
    buckets[hourKeyOf(curr.timestamp)] += kwh;
  }

  return buckets;
}

/**
 * Calcula a potência média (W) por hora do dia (0-23), considerando todas as
 * leituras passadas (normalmente os últimos N dias), dá o "perfil" de
 * consumo ao longo de um dia típico. Serve de base pra futuramente comparar
 * com o consumo atual (ex: detecção de anomalia por padrão de horário).
 */
export function averageWattsByHourOfDay(readings: PowerReading[]): number[] {
  const sums = new Array(24).fill(0);
  const counts = new Array(24).fill(0);

  for (const reading of readings) {
    const hour = hourKeyOf(reading.timestamp);
    sums[hour] += reading.watts;
    counts[hour] += 1;
  }

  return sums.map((sum, hour) => (counts[hour] > 0 ? sum / counts[hour] : 0));
}

/** Lê a tarifa atual (R$/kWh) salva no Firebase, pra um hub específico. */
export async function getTariff(hubId: string): Promise<number> {
  const snapshot = await get(ref(db, `hubs/${hubId}/settings/tariff`));
  const value = snapshot.val();
  return typeof value === 'number' ? value : 0.85;
}

/** Observa a tarifa em tempo real (útil se quiser refletir mudanças na hora). */
export function subscribeToTariff(hubId: string, callback: (tariff: number) => void) {
  const tariffRef = ref(db, `hubs/${hubId}/settings/tariff`);
  return onValue(tariffRef, (snapshot) => {
    const value = snapshot.val();
    callback(typeof value === 'number' ? value : 0.85);
  });
}

/** Salva a tarifa (R$/kWh) no Firebase, pra um hub específico. */
export async function setTariff(hubId: string, tariff: number): Promise<void> {
  await set(ref(db, `hubs/${hubId}/settings/tariff`), tariff);
}
