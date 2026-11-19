import { getDatabase, ref, onValue, update } from 'firebase/database';
import { app } from './authIntegration';
import { integrateEnergy, lerLeiturasDoPeriodo, primeiraLeitura } from './energyData';
import { periodosFechados } from './ciclo';
import type { ConfigTarifa } from './tarifa';

const db = getDatabase(app);

// ─────────────────────────────────────────────────────────────────────────
// Histórico de contas (área "Contas por ciclo" dos Gráficos)
//
// Quando um ciclo da conta termina, o app calcula a conta final dele uma vez
// e guarda o resultado em /hubs/{hubId}/ciclos/{inicio}:
//   { inicio, fim, kwh, coberturaMs, tarifa, cip, valor, fechadoEm,
//     datasEstimadas, simulado }
// (valor = kWh do ciclo × tarifa + iluminação pública)
//
// Por que guardar em vez de recalcular sempre:
//  - a tarifa e a bandeira mudam: a conta de um ciclo antigo tem que ficar
//    com a tarifa da época, não com a de hoje;
//  - recalcular baixaria o histórico inteiro (~44 mil leituras por ciclo)
//    toda vez que a tela abre.
//
// Quem fecha: a tela de Gráficos, ao abrir. Ela espera 12 h depois do fim do
// ciclo (o hub reenvia até ~8 h de leituras guardadas quando volta pro
// Wi-Fi). Ciclos antigos, de antes desta função existir, são fechados na
// primeira vez com a tarifa atual.
// ─────────────────────────────────────────────────────────────────────────

const MARGEM_FECHAMENTO_MS = 12 * 60 * 60 * 1000;

export interface CicloFechado {
  inicio: number;
  fim: number;
  kwh: number;
  /** Tempo do ciclo que tem medição de fato (ms) */
  coberturaMs: number;
  /** Preço final do kWh no dia em que o ciclo fechou (R$) */
  tarifa: number;
  /** Iluminação pública (R$) */
  cip: number;
  /** Conta final estimada (R$) */
  valor: number;
  fechadoEm: number;
  /** Alguma das datas do ciclo foi estimada (não veio de uma conta) */
  datasEstimadas: boolean;
  /** A maior parte das leituras veio do script de teste */
  simulado: boolean;
}

function lerCiclo(v: any): CicloFechado | null {
  const numeros = ['inicio', 'fim', 'kwh', 'tarifa', 'cip', 'valor', 'fechadoEm'] as const;
  if (!v || numeros.some((k) => typeof v[k] !== 'number')) return null;
  return {
    inicio: v.inicio,
    fim: v.fim,
    kwh: v.kwh,
    coberturaMs: typeof v.coberturaMs === 'number' ? v.coberturaMs : v.fim - v.inicio,
    tarifa: v.tarifa,
    cip: v.cip,
    valor: v.valor,
    fechadoEm: v.fechadoEm,
    datasEstimadas: v.datasEstimadas === true,
    simulado: v.simulado === true,
  };
}

/** Observa os ciclos já fechados, do mais recente pro mais antigo. */
export function subscribeToCiclosFechados(hubId: string, callback: (ciclos: CicloFechado[]) => void) {
  return onValue(ref(db, `hubs/${hubId}/ciclos`), (snapshot) => {
    const lista: CicloFechado[] = [];
    snapshot.forEach((child) => {
      const c = lerCiclo(child.val());
      if (c) lista.push(c);
    });
    callback(lista.sort((a, b) => b.inicio - a.inicio));
  });
}

const sobrepoe = (a: { inicio: number; fim: number }, b: { inicio: number; fim: number }) =>
  a.inicio < b.fim && b.inicio < a.fim;

const arredondar = (v: number, casas: number) => Math.round(v * 10 ** casas) / 10 ** casas;

// Evita duas execuções ao mesmo tempo pro mesmo hub (ex.: puxar pra
// recarregar): quem chama durante uma execução espera a que já está rodando.
const emAndamento = new Map<string, Promise<number>>();

/**
 * Calcula e guarda a conta final dos ciclos que já terminaram e ainda não
 * estão no histórico. Devolve quantos ciclos foram fechados agora.
 */
export function fecharCiclosPendentes(
  hubId: string,
  config: ConfigTarifa,
  existentes: CicloFechado[],
  agora: number = Date.now()
): Promise<number> {
  const rodando = emAndamento.get(hubId);
  if (rodando) return rodando;
  const execucao = fechar(hubId, config, existentes, agora).finally(() => emAndamento.delete(hubId));
  emAndamento.set(hubId, execucao);
  return execucao;
}

async function fechar(
  hubId: string,
  config: ConfigTarifa,
  existentes: CicloFechado[],
  agora: number
): Promise<number> {
  // Ciclo salvo antes desta função existir: a data da última leitura ainda
  // não está em settings/leituras. Guarda agora, pra quando a pessoa trocar
  // pro ciclo seguinte o app ainda saber onde este começou.
  let datasLeitura = config.leituras;
  if (config.ciclo && !datasLeitura.includes(config.ciclo.ultimaLeitura)) {
    await update(ref(db, `hubs/${hubId}/settings/leituras`), { [config.ciclo.ultimaLeitura]: true });
    datasLeitura = [...datasLeitura, config.ciclo.ultimaLeitura];
  }

  const periodos = periodosFechados(config.ciclo, datasLeitura, agora).filter(
    (p) => agora >= p.fim + MARGEM_FECHAMENTO_MS
  );
  if (periodos.length === 0) return 0;

  const primeira = await primeiraLeitura(hubId);
  if (primeira === null) return 0;

  let fechados = 0;
  for (const p of periodos) {
    if (p.fim <= primeira) break; // daqui pra trás não há medição

    const mesmo = existentes.find((c) => c.inicio === p.inicio && c.fim === p.fim);
    if (mesmo) {
      // A previsão da conta acertou o dia: as datas deixam de ser estimadas
      if (mesmo.datasEstimadas && !p.datasEstimadas) {
        await update(ref(db, `hubs/${hubId}/ciclos/${p.inicio}`), { datasEstimadas: false });
      }
      continue;
    }

    // Um ciclo já fechado com datas reais tem prioridade: não sobrepõe
    const exatoSobreposto = existentes.find((c) => !c.datasEstimadas && sobrepoe(c, p));
    if (exatoSobreposto) continue;

    // Ciclos fechados antes com datas estimadas que agora têm datas certas
    // (a pessoa informou a leitura real depois): saem e dão lugar ao novo
    const alteracoes: Record<string, unknown> = {};
    for (const c of existentes) {
      if (c.datasEstimadas && sobrepoe(c, p)) alteracoes[String(c.inicio)] = null;
    }

    const { leituras, simuladas } = await lerLeiturasDoPeriodo(hubId, p.inicio, p.fim);
    const { kwh, coveredMs } = integrateEnergy(leituras);
    if (coveredMs > 0) {
      alteracoes[String(p.inicio)] = {
        inicio: p.inicio,
        fim: p.fim,
        kwh: arredondar(kwh, 3),
        coberturaMs: coveredMs,
        tarifa: config.tariff,
        cip: config.cip,
        valor: arredondar(kwh * config.tariff + config.cip, 2),
        fechadoEm: agora,
        datasEstimadas: p.datasEstimadas,
        simulado: simuladas > leituras.length / 2,
      };
      fechados++;
    }
    if (Object.keys(alteracoes).length > 0) {
      await update(ref(db, `hubs/${hubId}/ciclos`), alteracoes);
    }
  }
  return fechados;
}
