// ─────────────────────────────────────────────────────────────────────────
// Ciclo da conta de luz
//
// A distribuidora não cobra o mês do calendário: cobra o consumo entre duas
// leituras do relógio (ex.: 26/10 a 23/11), e cada ciclo tem de 27 a 33
// dias. Se a pessoa informar em Ajustes as datas da última e da próxima
// leitura (vêm impressas na conta), a conta estimada, a projeção, o widget e
// o gráfico "Ciclo" usam esse período. Sem as datas, vale o mês do
// calendário, como antes.
//
// Fica salvo em /hubs/{hubId}/settings/ciclo:
//   { ultimaLeitura: number, proximaLeitura: number } (meia-noite, em ms)
//
// Funções puras (sem Firebase): usadas pelo app e pelo widget.
// ─────────────────────────────────────────────────────────────────────────

import { t } from '../i18n';

const DIA_MS = 24 * 60 * 60 * 1000;
export const MIN_DIAS_CICLO = 15;
export const MAX_DIAS_CICLO = 45;

export interface CicloConfig {
  ultimaLeitura: number;
  proximaLeitura: number;
}

export interface Periodo {
  /** Início do período (ms, meia-noite) */
  inicio: number;
  /** Fim do período (ms, meia-noite do dia da próxima leitura) */
  fim: number;
  /** 'ciclo' = datas da conta; 'mes' = mês do calendário (sem datas informadas) */
  tipo: 'ciclo' | 'mes';
  /** true quando a próxima leitura informada já passou e o app estimou o ciclo seguinte */
  estimado: boolean;
}

/** Lê o ciclo salvo no Firebase (ou null se não houver / for inválido). */
export function cicloDeSettings(c: any): CicloConfig | null {
  if (typeof c?.ultimaLeitura !== 'number' || typeof c?.proximaLeitura !== 'number') return null;
  const dias = Math.round((c.proximaLeitura - c.ultimaLeitura) / DIA_MS);
  if (dias < MIN_DIAS_CICLO || dias > MAX_DIAS_CICLO) return null;
  return { ultimaLeitura: c.ultimaLeitura, proximaLeitura: c.proximaLeitura };
}

function somarDias(ms: number, dias: number): number {
  const d = new Date(ms);
  d.setDate(d.getDate() + dias);
  return d.getTime();
}

function mesDoCalendario(agora: number): Periodo {
  const d = new Date(agora);
  return {
    inicio: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
    fim: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(),
    tipo: 'mes',
    estimado: false,
  };
}

/**
 * Período da conta que está correndo agora. Se a próxima leitura informada já
 * passou, estima os ciclos seguintes com a mesma duração do último (a
 * distribuidora costuma repetir o intervalo) até a pessoa atualizar as datas.
 */
export function periodoAtual(ciclo: CicloConfig | null, agora: number = Date.now()): Periodo {
  if (!ciclo || agora < ciclo.ultimaLeitura) return mesDoCalendario(agora);
  const dias = Math.round((ciclo.proximaLeitura - ciclo.ultimaLeitura) / DIA_MS);
  let inicio = ciclo.ultimaLeitura;
  let fim = ciclo.proximaLeitura;
  let estimado = false;
  while (agora >= fim) {
    inicio = fim;
    fim = somarDias(inicio, dias);
    estimado = true;
  }
  return { inicio, fim, tipo: 'ciclo', estimado };
}

/** "26/10" */
export function diaMes(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** "26/10/2026" */
export function dataCompleta(ms: number): string {
  return `${diaMes(ms)}/${new Date(ms).getFullYear()}`;
}

/** "26/10/2026" -> meia-noite desse dia (ms), ou null se a data não existir. */
export function lerData(texto: string): number | null {
  const m = texto.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [dia, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(ano, mes - 1, dia);
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return d.getTime();
}

/** Coloca as barras enquanto a pessoa digita: "2610" -> "26/10", "26102026" -> "26/10/2026". */
export function mascaraData(texto: string): string {
  const n = texto.replace(/\D/g, '').slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}

/** Confere as duas datas digitadas. Devolve o ciclo ou a mensagem de erro. */
export function validarCiclo(ultimaTexto: string, proximaTexto: string): CicloConfig | string {
  const ultima = lerData(ultimaTexto);
  const proxima = lerData(proximaTexto);
  if (ultima === null || proxima === null) return t('ciclo.erroFormato');
  const dias = Math.round((proxima - ultima) / DIA_MS);
  if (dias <= 0) return t('ciclo.erroOrdem');
  if (dias < MIN_DIAS_CICLO || dias > MAX_DIAS_CICLO) {
    return t('ciclo.erroDias', { dias });
  }
  return { ultimaLeitura: ultima, proximaLeitura: proxima };
}
