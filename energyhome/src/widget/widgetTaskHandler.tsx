import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { getApp } from 'firebase/app';
import { getDatabase, ref, get, query, orderByChild, startAt } from 'firebase/database';
import type { User } from 'firebase/auth';
import { subscribeToAuthChanges } from '../services/authIntegration';
import { getUserHubs } from '../services/hubPairing';
import { integrateEnergy, startOfMonthMs, PowerReading } from '../services/energyData';
import { configDeSettings } from '../services/tarifa';
import { ContaWidget } from './ContaWidget';
import { NOME_WIDGET, EstadoWidget } from './tipos';
import { lerCache, salvarCache, estadoDoCache, competenciaDe, CacheConta } from './cacheConta';

// Roda com o app FECHADO: quando o widget é colocado na tela inicial, quando
// é redimensionado e a cada 30 min (updatePeriodMillis no app.json, o mínimo
// que o Android permite). Recalcula a conta do mês com as leituras novas e
// redesenha o widget. Tocar no widget abre o app (clickAction OPEN_APP).

const LIMITE_MS = 20000; // sem resposta do Firebase nesse tempo, mostra o último valor

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetInfo.widgetName !== NOME_WIDGET) return;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const estado = await comLimite(calcularEstado(), LIMITE_MS, estadoReserva);
      props.renderWidget(<ContaWidget estado={estado} />);
      break;
    }
    default:
      break;
  }
}

/** Espera a sessão salva no celular ser restaurada (o Firebase faz isso sozinho). */
function usuarioLogado(): Promise<User | null> {
  return new Promise((resolve) => {
    let parar: (() => void) | null = null;
    let feito = false;
    parar = subscribeToAuthChanges((user) => {
      if (feito) return;
      feito = true;
      resolve(user);
      setTimeout(() => parar?.(), 0);
    });
  });
}

async function lerLeiturasDesde(hubId: string, desde: number): Promise<PowerReading[]> {
  const db = getDatabase(getApp());
  const snapshot = await get(query(ref(db, `hubs/${hubId}/readings`), orderByChild('timestamp'), startAt(desde)));
  const lista: PowerReading[] = [];
  snapshot.forEach((child) => {
    const v = child.val();
    if (typeof v?.watts === 'number' && typeof v?.timestamp === 'number') {
      lista.push({
        watts: v.watts,
        timestamp: v.timestamp,
        energyKwh: typeof v?.energyKwh === 'number' ? v.energyKwh : undefined,
      });
    }
  });
  return lista.sort((a, b) => a.timestamp - b.timestamp);
}

async function calcularEstado(): Promise<EstadoWidget> {
  const user = await usuarioLogado();
  if (!user || !user.emailVerified) {
    return { tipo: 'aviso', mensagem: 'Entre no app A.C.D.C pra ver sua conta.' };
  }

  const hubId = (await getUserHubs(user.uid))[0];
  if (!hubId) return { tipo: 'aviso', mensagem: 'Pareie seu hub no app pra ver a conta.' };

  const db = getDatabase(getApp());
  const config = configDeSettings((await get(ref(db, `hubs/${hubId}/settings`))).val());

  // Continua do cache se for do mesmo hub e do mesmo mês; senão soma o mês todo
  const agora = Date.now();
  const competencia = competenciaDe(agora);
  const cache = await lerCache();
  const base = cache && cache.hubId === hubId && cache.competencia === competencia ? cache : null;

  let monthKwh = 0;
  let coveredMs = 0;
  let ultimaLeitura: PowerReading | null = null;
  if (base?.ultimaLeitura) {
    const ponto = base.ultimaLeitura;
    const novas = (await lerLeiturasDesde(hubId, ponto.timestamp)).filter((r) => r.timestamp > ponto.timestamp);
    const parcial = integrateEnergy([ponto, ...novas]);
    monthKwh = base.monthKwh + parcial.kwh;
    coveredMs = base.coveredMs + parcial.coveredMs;
    ultimaLeitura = novas.length ? novas[novas.length - 1] : ponto;
  } else {
    const doMes = await lerLeiturasDesde(hubId, startOfMonthMs());
    const total = integrateEnergy(doMes);
    monthKwh = total.kwh;
    coveredMs = total.coveredMs;
    ultimaLeitura = doMes.length ? doMes[doMes.length - 1] : null;
  }

  const novo: CacheConta = {
    hubId,
    competencia,
    monthKwh,
    coveredMs,
    ultimaLeitura,
    tariff: config.tariff,
    cip: config.cip,
    bandeira: config.modo === 'aneel' ? config.aneel?.bandeira ?? null : null,
    atualizadoEm: agora,
  };
  await salvarCache(novo);
  return estadoDoCache(novo, agora);
}

/** Sem internet ou Firebase lento: último valor conhecido (com a hora dele). */
async function estadoReserva(): Promise<EstadoWidget> {
  const cache = await lerCache();
  return cache ? estadoDoCache(cache) : { tipo: 'aviso', mensagem: 'Sem conexão. Abra o app pra atualizar.' };
}

async function comLimite(
  tarefa: Promise<EstadoWidget>,
  ms: number,
  reserva: () => Promise<EstadoWidget>
): Promise<EstadoWidget> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tempo = new Promise<'tempo'>((resolve) => {
    timer = setTimeout(() => resolve('tempo'), ms);
  });
  try {
    const r = await Promise.race([tarefa, tempo]);
    return r === 'tempo' ? reserva() : r;
  } catch {
    return reserva();
  } finally {
    clearTimeout(timer);
  }
}
