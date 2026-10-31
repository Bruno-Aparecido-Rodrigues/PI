import { getDatabase, ref, onValue, onChildAdded, query, orderByChild, startAt, get, set } from 'firebase/database';
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
//    { watts: number, energyKwh?: number, timestamp: number (ms) }
//    -> o ESP32 ADICIONA um novo registro periodicamente (ex: a cada 1 min),
//       usando push() do Firebase. É o histórico usado para calcular kWh.
//       energyKwh é o contador de energia acumulada do próprio PZEM (como o
//       relógio de luz): o consumo entre duas leituras é a DIFERENÇA entre
//       os contadores. Leituras antigas (de antes do firmware mandar o
//       contador) não têm esse campo, e aí o kWh é estimado pelos Watts.
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
  /** Contador de energia acumulada do PZEM (kWh). Ausente em leituras antigas. */
  energyKwh?: number;
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

// ─────────────────────────────────────────────────────────────────────────
// Histórico de leituras (Dashboard e Gráficos)
//
// No fim do mês são ~44 mil leituras. Com onValue, o Firebase entregava a
// lista INTEIRA de novo a cada leitura nova (1 por minuto), em cada tela que
// assinava, e o app travava. Agora:
//  - baixa o histórico uma vez (onValue com onlyOnce);
//  - depois só recebe as leituras novas (onChildAdded), uma a uma;
//  - telas que pedem o mesmo período dividem a mesma assinatura (o
//    Dashboard e os Gráficos baixam o histórico uma vez só).
// O onChildAdded começa 8 h antes da última leitura baixada: se o hub ficou
// sem Wi-Fi, ele reenvia o buffer (até ~8 h) com horários antigos, e essas
// leituras também entram. As repetidas são ignoradas pela chave.
// ─────────────────────────────────────────────────────────────────────────

const JANELA_ATRASADAS_MS = 8 * 60 * 60 * 1000;
const ESPERA_AVISO_MS = 300; // junta várias leituras chegando de uma vez num aviso só

type OuvinteLeituras = (readings: PowerReading[]) => void;

interface FonteLeituras {
  leituras: PowerReading[];
  carregado: boolean;
  ouvintes: Set<OuvinteLeituras>;
  parar: () => void;
}

const fontes = new Map<string, FonteLeituras>();

function lerLeitura(value: any): PowerReading | null {
  if (typeof value?.watts !== 'number' || typeof value?.timestamp !== 'number') return null;
  return {
    watts: value.watts,
    timestamp: value.timestamp,
    energyKwh: typeof value?.energyKwh === 'number' ? value.energyKwh : undefined,
  };
}

function criarFonte(hubId: string, sinceTimestamp: number): FonteLeituras {
  const fonte: FonteLeituras = { leituras: [], carregado: false, ouvintes: new Set(), parar: () => {} };
  const base = ref(db, `hubs/${hubId}/readings`);
  const chaves = new Set<string>();
  let lista: PowerReading[] = [];
  let parado = false;
  let pararNovas: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const avisar = () => {
    // Cópia nova a cada aviso: o React só redesenha se a referência mudar
    fonte.leituras = lista.slice();
    fonte.ouvintes.forEach((ouvinte) => ouvinte(fonte.leituras));
  };

  const pararInicial = onValue(
    query(base, orderByChild('timestamp'), startAt(sinceTimestamp)),
    (snapshot) => {
      if (parado) return;
      const dados: PowerReading[] = [];
      snapshot.forEach((child) => {
        const r = lerLeitura(child.val());
        if (r && child.key) {
          chaves.add(child.key);
          dados.push(r);
        }
      });
      lista = dados.sort((a, b) => a.timestamp - b.timestamp);
      fonte.carregado = true;
      avisar();

      const ultima = lista.length > 0 ? lista[lista.length - 1].timestamp : sinceTimestamp;
      const desde = Math.max(sinceTimestamp, ultima - JANELA_ATRASADAS_MS);
      pararNovas = onChildAdded(query(base, orderByChild('timestamp'), startAt(desde)), (child) => {
        if (!child.key || chaves.has(child.key)) return;
        const r = lerLeitura(child.val());
        if (!r) return;
        chaves.add(child.key);
        if (lista.length === 0 || r.timestamp >= lista[lista.length - 1].timestamp) {
          lista.push(r);
        } else {
          // Leitura atrasada (buffer do hub): entra no lugar certo
          lista.push(r);
          lista.sort((a, b) => a.timestamp - b.timestamp);
        }
        if (!timer) {
          timer = setTimeout(() => {
            timer = null;
            if (!parado) avisar();
          }, ESPERA_AVISO_MS);
        }
      });
    },
    (erro) => console.warn('Não foi possível ler o histórico de leituras:', erro),
    { onlyOnce: true }
  );

  fonte.parar = () => {
    parado = true;
    pararInicial();
    pararNovas?.();
    if (timer) clearTimeout(timer);
  };
  return fonte;
}

/** Observa as leituras de histórico de um hub a partir de um timestamp (ms). */
export function subscribeToReadingsSince(
  hubId: string,
  sinceTimestamp: number,
  callback: (readings: PowerReading[]) => void
) {
  const id = `${hubId}|${sinceTimestamp}`;
  let fonte = fontes.get(id);
  if (!fonte) {
    fonte = criarFonte(hubId, sinceTimestamp);
    fontes.set(id, fonte);
  }
  const atual = fonte;
  atual.ouvintes.add(callback);
  if (atual.carregado) callback(atual.leituras);

  return () => {
    atual.ouvintes.delete(callback);
    if (atual.ouvintes.size === 0) {
      atual.parar();
      if (fontes.get(id) === atual) fontes.delete(id);
    }
  };
}

/**
 * Desde quando baixar o histórico: o período da conta (ciclo ou mês) e os
 * últimos 7 dias (perfil por horário e "normal" do horário). Dashboard e
 * Gráficos usam o mesmo valor pra dividir a mesma assinatura.
 */
export function inicioDoHistorico(inicioDoPeriodo: number): number {
  return Math.min(inicioDoPeriodo, startOfDaysAgoMs(7));
}

// Só vale pro cálculo ANTIGO (por Watts, sem contador): se duas leituras
// consecutivas estão mais distantes que isso, o hub ficou desligado/sem dado
// nesse meio-tempo e o intervalo é IGNORADO (não sabemos o que foi consumido),
// em vez de "esticar" a média das duas pontas por horas e inflar o total.
// Com o contador do PZEM isso não é problema: a diferença é exata mesmo
// depois de horas sem leitura, porque o PZEM continua contando sozinho.
const MAX_GAP_MS = 3 * 60 * 60 * 1000;

// O PZEM-004T mede até 100 A; em 220 V isso dá 22 kW. Se a diferença do
// contador implicar uma potência média acima disso, o dado é impossível
// (ex: o PZEM foi trocado por outro com contador diferente) e é descartado.
const MAX_PLAUSIBLE_WATTS = 25000;

const MS_PER_HOUR = 60 * 60 * 1000;

/** Energia (kWh) entre duas leituras pela diferença do contador do PZEM, ou
 *  null se não der pra usar o contador nesse intervalo. */
function energyFromCounter(prev: PowerReading, curr: PowerReading, durationMs: number): number | null {
  if (prev.energyKwh === undefined || curr.energyKwh === undefined) return null;

  const delta = curr.energyKwh - prev.energyKwh;
  // Diferença negativa = contador foi zerado no meio do caminho.
  if (delta < 0) return null;

  const impliedWatts = (delta * 1000) / (durationMs / MS_PER_HOUR);
  if (impliedWatts > MAX_PLAUSIBLE_WATTS) return null;

  return delta;
}

/** Energia (kWh) entre duas leituras pelo método antigo: Watts médios × tempo
 *  (trapezoidal), ou null se o intervalo for grande demais pra estimar. */
function energyFromWatts(prev: PowerReading, curr: PowerReading, durationMs: number): number | null {
  if (durationMs > MAX_GAP_MS) return null;
  const avgWatts = (prev.watts + curr.watts) / 2;
  return (avgWatts * (durationMs / MS_PER_HOUR)) / 1000;
}

/**
 * Percorre cada par de leituras consecutivas e entrega a energia (kWh) daquele
 * intervalo. Usa o contador do PZEM quando as duas leituras têm ele (exato);
 * senão, cai na estimativa por Watts (leituras antigas, ou contador zerado).
 * É a base de todos os cálculos de energia do app (Dashboard e Gráficos),
 * pra que os números batam entre as telas.
 */
function forEachEnergyInterval(
  readings: PowerReading[],
  callback: (kwh: number, startTimestamp: number, endTimestamp: number) => void
) {
  for (let i = 1; i < readings.length; i++) {
    const prev = readings[i - 1];
    const curr = readings[i];
    const durationMs = curr.timestamp - prev.timestamp;
    if (durationMs <= 0) continue;

    const kwh = energyFromCounter(prev, curr, durationMs) ?? energyFromWatts(prev, curr, durationMs);
    if (kwh === null) continue;

    callback(kwh, prev.timestamp, curr.timestamp);
  }
}

/**
 * Distribui a energia de um intervalo pelas horas que ele atravessa,
 * proporcionalmente ao tempo em cada uma. Num intervalo normal (1 min) é tudo
 * na mesma hora; mas se o hub ficou 5h sem mandar e o contador mostra 3 kWh
 * nesse período, os gráficos espalham esses 3 kWh pelas 5h em vez de
 * mostrar um pico falso na hora em que ele voltou.
 */
function spreadByHour(
  kwh: number,
  startTimestamp: number,
  endTimestamp: number,
  add: (hourStartTimestamp: number, kwh: number) => void
) {
  const totalMs = endTimestamp - startTimestamp;
  let t = startTimestamp;
  while (t < endTimestamp) {
    const nextHour = new Date(t);
    nextHour.setMinutes(60, 0, 0);
    const segmentEnd = Math.min(endTimestamp, nextHour.getTime());
    add(t, (kwh * (segmentEnd - t)) / totalMs);
    t = segmentEnd;
  }
}

export interface EnergyTotal {
  /** Energia acumulada no período (kWh). */
  kwh: number;
  /** Quanto tempo do período tem medição de fato (ms), sem contar os buracos
   *  que não puderam ser calculados. */
  coveredMs: number;
}

/** Soma a energia (kWh) de uma lista de leituras e quanto tempo ela cobre. */
export function integrateEnergy(readings: PowerReading[]): EnergyTotal {
  let kwh = 0;
  let coveredMs = 0;
  forEachEnergyInterval(readings, (intervalKwh, startTimestamp, endTimestamp) => {
    kwh += intervalKwh;
    coveredMs += endTimestamp - startTimestamp;
  });
  return { kwh, coveredMs };
}

/** Converte uma lista de leituras de potência (W) em energia acumulada (kWh). */
export function calculateKwh(readings: PowerReading[]): number {
  return integrateEnergy(readings).kwh;
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

/** Início do mês que vem (dia 1, 00:00) em milissegundos, ou seja, o fim do mês atual. */
export function startOfNextMonthMs(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
}

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
  forEachEnergyInterval(readings, (kwh, startTimestamp, endTimestamp) => {
    spreadByHour(kwh, startTimestamp, endTimestamp, (hourStart, part) => {
      const key = dayKeyOf(hourStart);
      buckets.set(key, (buckets.get(key) ?? 0) + part);
    });
  });
  return days.map((day) => buckets.get(dayKeyOf(day.getTime())) ?? 0);
}

/**
 * Agrupa as leituras em energia (kWh) por hora do dia (0-23), só para o dia
 * de hoje. Usado pelo gráfico de "Hoje".
 */
export function bucketKwhByHourToday(readings: PowerReading[]): number[] {
  const buckets = new Array(24).fill(0);
  const todayStart = startOfTodayMs();
  forEachEnergyInterval(readings, (kwh, startTimestamp, endTimestamp) => {
    spreadByHour(kwh, startTimestamp, endTimestamp, (hourStart, part) => {
      if (hourStart >= todayStart) buckets[hourKeyOf(hourStart)] += part;
    });
  });
  return buckets;
}

/**
 * Potência média (W) registrada numa hora específica do dia (0-23), nas
 * leituras informadas. Retorna null se não houver nenhuma leitura naquela
 * hora (diferente de "consumo zero").
 */
export function averageWattsAtHour(readings: PowerReading[], hour: number): number | null {
  let sum = 0;
  let count = 0;
  for (const reading of readings) {
    if (hourKeyOf(reading.timestamp) === hour) {
      sum += reading.watts;
      count += 1;
    }
  }
  return count > 0 ? sum / count : null;
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
