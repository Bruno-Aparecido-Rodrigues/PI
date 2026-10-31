import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { getApp } from 'firebase/app';
import { getDatabase, ref, get, query, orderByChild, startAt } from 'firebase/database';
import type { User } from 'firebase/auth';
import { subscribeToAuthChanges } from '../services/authIntegration';
import { getUserHubs } from '../services/hubPairing';
import { integrateEnergy, PowerReading } from '../services/energyData';
import { configDeSettings } from '../services/tarifa';
import { periodoAtual } from '../services/ciclo';
import { ContaWidget } from './ContaWidget';
import { NOME_WIDGET, ACAO_ATUALIZAR, EstadoWidget } from './tipos';
import { lerCache, salvarCache, estadoDoCache, competenciaDe, CacheConta } from './cacheConta';
import { firebaseConfig } from '../services/firebaseConfig';

// Roda com o app FECHADO: quando o widget é colocado na tela inicial, quando
// é redimensionado e a cada 30 min (updatePeriodMillis no app.json, o mínimo
// que o Android permite). Recalcula a conta do mês com as leituras novas e
// redesenha o widget. Tocar no widget abre o app (clickAction OPEN_APP);
// tocar no "↻ Atualizar" do rodapé busca na hora, sem abrir o app.

const LIMITE_MS = 15000; // sem resposta do Firebase nesse tempo, mostra o último valor

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetInfo.widgetName !== NOME_WIDGET) return;

  const atualizarAgora =
    props.widgetAction === 'WIDGET_ADDED' ||
    props.widgetAction === 'WIDGET_UPDATE' ||
    props.widgetAction === 'WIDGET_RESIZED' ||
    (props.widgetAction === 'WIDGET_CLICK' && props.clickAction === ACAO_ATUALIZAR);
  if (!atualizarAgora) return;

  const desenhar = (estado: EstadoWidget) =>
    props.renderWidget(
      <ContaWidget estado={estado} largura={props.widgetInfo.width} altura={props.widgetInfo.height} />
    );

  // 1) Mostra na hora que está buscando (se o Android interromper a tarefa no
  //    meio, o widget fica em "Atualizando…" e dá pra saber onde parou)
  const cache = await lerCache();
  if (cache) desenhar(estadoDoCache(cache, Date.now(), { tipo: 'atualizando' }));

  // 2) Sem internet: avisa logo (sem esperar o limite da busca)
  if (!(await temInternet())) {
    desenhar(await estadoSemInternet());
    return;
  }

  // 3) Busca e mostra o resultado
  desenhar(await comLimite(calcularEstado(), LIMITE_MS));
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

  // Continua do cache se for do mesmo hub e do mesmo período da conta (ciclo
  // ou mês); senão soma o período todo
  const agora = Date.now();
  const competencia = competenciaDe(agora);
  const periodo = periodoAtual(config.ciclo, agora);
  const cache = await lerCache();
  const base = cache && cache.hubId === hubId && cache.periodoInicio === periodo.inicio ? cache : null;

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
    const doMes = await lerLeiturasDesde(hubId, periodo.inicio);
    const total = integrateEnergy(doMes);
    monthKwh = total.kwh;
    coveredMs = total.coveredMs;
    ultimaLeitura = doMes.length ? doMes[doMes.length - 1] : null;
  }

  const novo: CacheConta = {
    hubId,
    competencia,
    periodoInicio: periodo.inicio,
    periodoFim: periodo.fim,
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

/** Teste rápido de conexão: qualquer resposta do servidor do Firebase (até
 *  "acesso negado") prova que há internet; erro de rede ou demora = sem. */
async function temInternet(): Promise<boolean> {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), 5000);
  try {
    await fetch(`${firebaseConfig.databaseURL}/.json?shallow=true`, { signal: controle.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Celular sem internet: último valor conhecido com o aviso (ou só o aviso). */
async function estadoSemInternet(): Promise<EstadoWidget> {
  const cache = await lerCache();
  return cache
    ? estadoDoCache(cache, Date.now(), { tipo: 'semInternet', em: Date.now() })
    : { tipo: 'aviso', mensagem: 'Sem conexão com a internet', semInternet: true };
}

/** Sem internet, Firebase lento ou erro: último valor conhecido, avisando que falhou. */
async function estadoReserva(motivo: string): Promise<EstadoWidget> {
  const cache = await lerCache();
  return cache
    ? estadoDoCache(cache, Date.now(), { tipo: 'falhou', em: Date.now(), motivo })
    : { tipo: 'aviso', mensagem: 'Sem conexão. Abra o app pra atualizar.' };
}

async function comLimite(tarefa: Promise<EstadoWidget>, ms: number): Promise<EstadoWidget> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tempo = new Promise<'tempo'>((resolve) => {
    timer = setTimeout(() => resolve('tempo'), ms);
  });
  try {
    const r = await Promise.race([tarefa, tempo]);
    return r === 'tempo' ? estadoReserva('sem resposta') : r;
  } catch (erro: any) {
    console.warn('Widget: falha ao atualizar a conta:', erro);
    const texto = String(erro?.code ?? erro?.message ?? 'erro');
    if (/network|offline|unavailable/i.test(texto)) return estadoSemInternet();
    return estadoReserva(texto.slice(0, 24));
  } finally {
    clearTimeout(timer);
  }
}
