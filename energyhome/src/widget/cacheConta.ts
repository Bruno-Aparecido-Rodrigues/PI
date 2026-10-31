import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PowerReading } from '../services/energyData';
import { calcularContaDoMes } from '../services/contaMes';
import type { EstadoWidget, Situacao } from './tipos';

// Último estado da conta do período (ciclo da conta ou mês, ver
// services/ciclo.ts), guardado no celular. O app grava enquanto
// está aberto; com o app fechado, o widget parte daqui e só busca no
// Firebase as leituras que chegaram depois de `ultimaLeitura` (poucos KB, em
// vez do mês inteiro a cada atualização).

const CHAVE = 'widgetConta:v1';

export interface CacheConta {
  hubId: string;
  competencia: string; // "2026-10" (mês das leituras somadas; caches antigos)
  /** Período da conta das leituras somadas (ciclo ou mês). Ausente em caches antigos. */
  periodoInicio?: number;
  periodoFim?: number;
  monthKwh: number;
  coveredMs: number;
  ultimaLeitura: PowerReading | null;
  tariff: number;
  cip: number;
  bandeira: string | null;
  atualizadoEm: number;
}

/** "2026-10" no horário do celular (mesmo critério do startOfMonthMs). */
export function competenciaDe(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function lerCache(): Promise<CacheConta | null> {
  try {
    const texto = await AsyncStorage.getItem(CHAVE);
    return texto ? (JSON.parse(texto) as CacheConta) : null;
  } catch {
    return null;
  }
}

export async function salvarCache(cache: CacheConta): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAVE, JSON.stringify(cache));
  } catch {
    // sem cache o widget só busca o mês inteiro na próxima vez
  }
}

export async function apagarCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHAVE);
  } catch {}
}

/** O que o widget mostra a partir do cache. */
export function estadoDoCache(
  cache: CacheConta,
  agora: number = Date.now(),
  situacao: Situacao = { tipo: 'ok' }
): EstadoWidget {
  const venceu =
    typeof cache.periodoFim === 'number' ? agora >= cache.periodoFim : cache.competencia !== competenciaDe(agora);
  if (venceu) {
    return { tipo: 'aviso', mensagem: 'Abra o app pra atualizar a conta do mês.' };
  }
  const conta = calcularContaDoMes(cache.monthKwh, cache.coveredMs, cache.tariff, cache.cip, agora, cache.periodoFim);
  return {
    tipo: 'conta',
    estimada: conta.estimada,
    projetada: conta.projetada,
    tarifa: cache.tariff,
    atualizadoEm: cache.atualizadoEm,
    bandeira: cache.bandeira,
    situacao,
  };
}
