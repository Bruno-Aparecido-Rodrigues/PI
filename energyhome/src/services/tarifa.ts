import { getDatabase, ref, onValue, update } from 'firebase/database';
import { app } from './authIntegration';
import { CicloConfig, cicloDeSettings } from './ciclo';

const db = getDatabase(app);

// ─────────────────────────────────────────────────────────────────────────
// Tarifa de energia: manual ou automática (dados abertos da ANEEL)
//
// Fonte: Portal de Dados Abertos da ANEEL (CKAN), gratuito e sem cadastro.
//  - Tarifas de aplicação das distribuidoras (atualizado toda semana):
//    TE (tarifa de energia) + TUSD (uso do sistema de distribuição), em R$/MWh,
//    SEM impostos. Pra residência comum: subgrupo B1, classe Residencial,
//    modalidade Convencional, "Tarifa de Aplicação".
//  - Bandeiras tarifárias (atualizado todo mês): bandeira do mês e o
//    adicional dela (R$/MWh).
//
// Impostos (ICMS e PIS/COFINS) não vêm da ANEEL: a pessoa copia uma vez os
// percentuais do quadro de tributos da conta de luz. Eles são cobrados "por
// dentro", então o preço final é:
//    preço final do kWh = (tarifa ANEEL + adicional da bandeira) ÷ (1 − impostos)
// A taxa de iluminação pública (CIP/COSIP) é um valor fixo por mês, somado
// à conta inteira (não ao kWh).
//
// Tudo fica salvo em /hubs/{hubId}/settings. O campo "tariff" continua
// sendo o preço do kWh usado em todos os cálculos do app (já com bandeira e
// impostos, no modo automático).
// ─────────────────────────────────────────────────────────────────────────

// Consulta comum do CKAN (o portal novo da ANEEL, de 2026, não aceita mais a
// consulta em SQL "datastore_search_sql": ela responde erro 400).
const ANEEL_API_URL = 'https://dadosabertos.aneel.gov.br/api/action/datastore_search';
const RECURSO_TARIFAS = 'fcf2906c-7c32-4b9b-a637-054e7a5234f4';
const RECURSO_BANDEIRAS = '0591b8f6-fe54-437b-b72b-1aa2efd46e42';

export const TARIFA_PADRAO = 0.85;

/** Atualiza os dados da ANEEL no máximo uma vez por dia (a tarifa muda pouco). */
export const VALIDADE_DADOS_ANEEL_MS = 24 * 60 * 60 * 1000;

export type ModoTarifa = 'manual' | 'aneel';

export interface DadosAneel {
  tarifaKwh: number;            // TE + TUSD, R$/kWh, sem impostos
  te: number;                   // R$/kWh
  tusd: number;                 // R$/kWh
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  bandeira: string | null;      // ex: "Bandeira amarela"
  bandeiraAdicionalKwh: number; // R$/kWh, sem impostos
  bandeiraCompetencia: string | null; // "2026-10"
  atualizadoEm: number;         // ms
}

export interface ConfigTarifa {
  tariff: number;               // preço final do kWh usado nos cálculos
  modo: ModoTarifa;
  distribuidora: string | null; // SigAgente da ANEEL
  icms: number;                 // %
  pisCofins: number;            // % (PIS + COFINS somados)
  cip: number;                  // R$/mês (iluminação pública)
  aneel: DadosAneel | null;
  ciclo: CicloConfig | null;    // datas de leitura da conta (ver services/ciclo.ts)
}

// ─── Firebase ────────────────────────────────────────────────────────────

function lerNumero(v: unknown, padrao: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : padrao;
}

export function configDeSettings(s: any): ConfigTarifa {
  const a = s?.aneel;
  return {
    tariff: lerNumero(s?.tariff, TARIFA_PADRAO),
    modo: s?.tarifaModo === 'aneel' ? 'aneel' : 'manual',
    distribuidora: typeof s?.distribuidora === 'string' ? s.distribuidora : null,
    icms: lerNumero(s?.icms, 0),
    pisCofins: lerNumero(s?.pisCofins, 0),
    cip: lerNumero(s?.cip, 0),
    aneel:
      a && typeof a.tarifaKwh === 'number'
        ? {
            tarifaKwh: a.tarifaKwh,
            te: lerNumero(a.te, 0),
            tusd: lerNumero(a.tusd, 0),
            vigenciaInicio: a.vigenciaInicio ?? null,
            vigenciaFim: a.vigenciaFim ?? null,
            bandeira: a.bandeira ?? null,
            bandeiraAdicionalKwh: lerNumero(a.bandeiraAdicionalKwh, 0),
            bandeiraCompetencia: a.bandeiraCompetencia ?? null,
            atualizadoEm: lerNumero(a.atualizadoEm, 0),
          }
        : null,
    ciclo: cicloDeSettings(s?.ciclo),
  };
}

/** Observa em tempo real a configuração de tarifa de um hub. */
export function subscribeToConfigTarifa(hubId: string, callback: (config: ConfigTarifa) => void) {
  return onValue(ref(db, `hubs/${hubId}/settings`), (snapshot) => {
    callback(configDeSettings(snapshot.val()));
  });
}

/** Grava (ou apaga, com null) as datas de leitura da conta. */
export async function salvarCiclo(hubId: string, ciclo: CicloConfig | null): Promise<void> {
  await update(ref(db, `hubs/${hubId}/settings`), { ciclo });
}

/** Grava campos da configuração (só o que for passado). */
export async function salvarConfigTarifa(
  hubId: string,
  campos: Partial<{
    tariff: number;
    tarifaModo: ModoTarifa;
    distribuidora: string;
    icms: number;
    pisCofins: number;
    cip: number;
    aneel: DadosAneel;
  }>
): Promise<void> {
  await update(ref(db, `hubs/${hubId}/settings`), campos);
}

// ─── Cálculos (funções puras) ────────────────────────────────────────────

/** Preço final do kWh com bandeira e impostos (cobrados "por dentro"). */
export function calcularTarifaFinal(
  tarifaKwh: number,
  bandeiraAdicionalKwh: number,
  icms: number,
  pisCofins: number
): number {
  const impostos = (icms + pisCofins) / 100;
  if (impostos < 0 || impostos >= 0.9) {
    throw new Error('Percentual de impostos inválido.');
  }
  return (tarifaKwh + bandeiraAdicionalKwh) / (1 - impostos);
}

// Os nomes das colunas da ANEEL variam um pouco entre o dicionário de dados
// e o arquivo publicado (ex: "DscSubGrupo" x "DscSubgrupo", "VlrTUSD" x
// "VlrTusd"). Por isso tudo é lido sem diferenciar maiúsculas/minúsculas e
// com nomes alternativos.
function campo(registro: Record<string, any>, ...nomes: string[]): any {
  for (const nome of nomes) {
    if (registro[nome] !== undefined) return registro[nome];
  }
  const alvo = nomes.map((n) => n.toLowerCase());
  const chave = Object.keys(registro).find((k) => alvo.includes(k.toLowerCase()));
  return chave ? registro[chave] : undefined;
}

/** "283,41" / "1.234,56" / "283.41" / 283.41 -> número. */
export function numeroAneel(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string' || v.trim() === '') return null;
  let s = v.trim();
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Texto comparável: minúsculo, sem acento, sem espaços nas pontas. */
function normalizar(v: unknown): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** "2026-07-04", "2026-07-04T00:00:00", "04/07/2026" -> "2026-07-04" (ou null). */
export function dataAneel(v: unknown): string | null {
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function hojeISO(agora: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}`;
}

function paraKwh(valor: number, unidade: unknown): number {
  const u = normalizar(unidade);
  if (u.includes('kwh') && !u.includes('mwh')) return valor;
  return valor / 1000; // padrão da ANEEL: R$/MWh
}

/**
 * Escolhe, entre os registros de tarifa de uma distribuidora, a tarifa
 * residencial comum (B1, Residencial, Convencional, tarifa de aplicação)
 * vigente hoje. Se nenhuma cobrir hoje, usa a mais recente que já começou.
 */
export function escolherTarifaResidencial(
  registros: Record<string, any>[],
  agora: Date = new Date()
): Omit<DadosAneel, 'bandeira' | 'bandeiraAdicionalKwh' | 'bandeiraCompetencia' | 'atualizadoEm'> | null {
  const hoje = hojeISO(agora);
  const candidatos = registros
    .filter((r) => normalizar(campo(r, 'DscBaseTarifaria', 'DscBaseTarifa')) === 'tarifa de aplicacao')
    .filter((r) => normalizar(campo(r, 'DscSubGrupo', 'DscSubgrupo')) === 'b1')
    .filter((r) => normalizar(campo(r, 'DscClasse')) === 'residencial')
    .filter((r) => normalizar(campo(r, 'DscModalidadeTarifaria')) === 'convencional')
    .filter((r) => {
      // residencial comum (não "baixa renda" nem outras subclasses)
      const sub = normalizar(campo(r, 'DscSubClasse', 'DscSubclasse'));
      return sub === 'residencial' || sub === '' || sub === 'nao se aplica';
    })
    .map((r) => ({
      r,
      inicio: dataAneel(campo(r, 'DatInicioVigencia')),
      fim: dataAneel(campo(r, 'DatFimVigencia')),
      detalhe: normalizar(campo(r, 'DscDetalhe')),
    }))
    .filter((c) => c.inicio !== null && c.inicio <= hoje);

  if (candidatos.length === 0) return null;

  // Preferência: vigente hoje > começou mais recentemente > detalhe "não se aplica"
  candidatos.sort((a, b) => {
    const aVig = a.fim === null || a.fim >= hoje ? 1 : 0;
    const bVig = b.fim === null || b.fim >= hoje ? 1 : 0;
    if (aVig !== bVig) return bVig - aVig;
    if (a.inicio !== b.inicio) return (b.inicio ?? '').localeCompare(a.inicio ?? '');
    const aDet = a.detalhe === 'nao se aplica' ? 1 : 0;
    const bDet = b.detalhe === 'nao se aplica' ? 1 : 0;
    return bDet - aDet;
  });

  const escolhido = candidatos[0];
  const unidade = campo(escolhido.r, 'DscUnidadeTerciaria', 'DscUnidade');
  const te = numeroAneel(campo(escolhido.r, 'VlrTE', 'VlrTe'));
  const tusd = numeroAneel(campo(escolhido.r, 'VlrTUSD', 'VlrTusd'));
  if (te === null || tusd === null) return null;

  const teKwh = paraKwh(te, unidade);
  const tusdKwh = paraKwh(tusd, unidade);
  return {
    tarifaKwh: teKwh + tusdKwh,
    te: teKwh,
    tusd: tusdKwh,
    vigenciaInicio: escolhido.inicio,
    vigenciaFim: escolhido.fim,
  };
}

/** Bandeira do mês atual; se a ANEEL ainda não publicou, a mais recente. */
export function escolherBandeira(
  registros: Record<string, any>[],
  agora: Date = new Date()
): { bandeira: string; bandeiraAdicionalKwh: number; bandeiraCompetencia: string } | null {
  const mesAtual = hojeISO(agora).slice(0, 7);
  const lista = registros
    .map((r) => ({
      competencia: (dataAneel(campo(r, 'DatCompetencia')) ?? '').slice(0, 7),
      nome: String(campo(r, 'NomBandeiraAcionada') ?? '').trim(),
      adicional: numeroAneel(campo(r, 'VlrAdicionalBandeira')),
    }))
    .filter((b) => b.competencia !== '' && b.competencia <= mesAtual && b.nome !== '')
    .sort((a, b) => b.competencia.localeCompare(a.competencia));
  if (lista.length === 0) return null;
  const b = lista[0];
  return {
    bandeira: b.nome,
    bandeiraAdicionalKwh: (b.adicional ?? 0) / 1000, // R$/MWh -> R$/kWh
    bandeiraCompetencia: b.competencia,
  };
}

// ─── Consultas à ANEEL ───────────────────────────────────────────────────

/**
 * Consulta um recurso da ANEEL (datastore_search do CKAN, via POST/JSON).
 * Parâmetros usados: filters (igualdade exata), sort ("Campo desc"),
 * limit, fields + distinct.
 */
async function consultarAneel(parametros: Record<string, unknown>): Promise<Record<string, any>[]> {
  const controle = new AbortController();
  const tempo = setTimeout(() => controle.abort(), 20000);
  try {
    const resposta = await fetch(ANEEL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(parametros),
      signal: controle.signal,
    });
    if (!resposta.ok) throw new Error(`A ANEEL respondeu com erro ${resposta.status}.`);
    const json = await resposta.json();
    if (!json?.success) throw new Error('A consulta à ANEEL não deu certo.');
    return json.result?.records ?? [];
  } catch (erro: any) {
    if (erro?.name === 'AbortError') throw new Error('A ANEEL demorou demais pra responder.');
    throw erro;
  } finally {
    clearTimeout(tempo);
  }
}

/** Lista as distribuidoras (siglas da ANEEL), em ordem alfabética. */
export async function listarDistribuidoras(): Promise<string[]> {
  const registros = await consultarAneel({
    resource_id: RECURSO_TARIFAS,
    fields: ['SigAgente'],
    distinct: true,
    sort: 'SigAgente',
    limit: 1000,
  });
  const siglas = registros
    .map((r) => String(campo(r, 'SigAgente') ?? '').trim())
    .filter((s) => s !== '');
  return Array.from(new Set(siglas)).sort((a, b) => a.localeCompare(b));
}

/** Tenta achar a Enel São Paulo na lista (padrão do projeto). */
export function sugerirDistribuidora(lista: string[]): string | null {
  const achar = (re: RegExp) => lista.find((s) => re.test(normalizar(s)));
  return (
    achar(/^enel\s*-?\s*sp$/) ??
    achar(/enel.*(sp|sao paulo)/) ??
    achar(/eletropaulo/) ??
    null
  );
}

async function buscarTarifa(distribuidora: string): Promise<ReturnType<typeof escolherTarifaResidencial>> {
  // Primeiro já filtra no servidor (resposta pequena, só residencial B1
  // convencional). Se não vier nada (valor escrito diferente) ou der erro,
  // busca as tarifas mais recentes da distribuidora e filtra aqui no app.
  try {
    const filtrados = await consultarAneel({
      resource_id: RECURSO_TARIFAS,
      filters: {
        SigAgente: distribuidora,
        DscSubGrupo: 'B1',
        DscClasse: 'Residencial',
        DscModalidadeTarifaria: 'Convencional',
      },
      sort: 'DatInicioVigencia desc',
      limit: 200,
    });
    const tarifa = escolherTarifaResidencial(filtrados);
    if (tarifa) return tarifa;
  } catch {
    // segue pra consulta ampla
  }
  const recentes = await consultarAneel({
    resource_id: RECURSO_TARIFAS,
    filters: { SigAgente: distribuidora },
    sort: 'DatInicioVigencia desc',
    limit: 3000,
  });
  return escolherTarifaResidencial(recentes);
}

async function buscarBandeira(): Promise<ReturnType<typeof escolherBandeira>> {
  const registros = await consultarAneel({
    resource_id: RECURSO_BANDEIRAS,
    sort: 'DatCompetencia desc',
    limit: 6,
  });
  return escolherBandeira(registros);
}

/**
 * Busca tarifa + bandeira na ANEEL, calcula o preço final com os impostos
 * já salvos e grava tudo em /hubs/{hubId}/settings.
 */
export async function atualizarTarifaAneel(hubId: string, config: ConfigTarifa): Promise<ConfigTarifa> {
  if (!config.distribuidora) throw new Error('Escolha a distribuidora primeiro.');

  const [tarifa, bandeira] = await Promise.all([
    buscarTarifa(config.distribuidora),
    buscarBandeira().catch(() => null), // sem bandeira, segue com a última conhecida
  ]);
  if (!tarifa) {
    throw new Error('Não encontrei a tarifa residencial dessa distribuidora na ANEEL.');
  }

  const aneel: DadosAneel = {
    ...tarifa,
    bandeira: bandeira?.bandeira ?? config.aneel?.bandeira ?? null,
    bandeiraAdicionalKwh: bandeira?.bandeiraAdicionalKwh ?? config.aneel?.bandeiraAdicionalKwh ?? 0,
    bandeiraCompetencia: bandeira?.bandeiraCompetencia ?? config.aneel?.bandeiraCompetencia ?? null,
    atualizadoEm: Date.now(),
  };
  const tariff = calcularTarifaFinal(aneel.tarifaKwh, aneel.bandeiraAdicionalKwh, config.icms, config.pisCofins);

  await salvarConfigTarifa(hubId, { aneel, tariff });
  return { ...config, aneel, tariff };
}

/** Precisa buscar de novo? (modo automático e dados com mais de 1 dia ou de outro mês) */
export function dadosAneelVencidos(config: ConfigTarifa, agora: Date = new Date()): boolean {
  if (config.modo !== 'aneel' || !config.distribuidora) return false;
  if (!config.aneel) return true;
  const idade = agora.getTime() - config.aneel.atualizadoEm;
  const mesAtual = hojeISO(agora).slice(0, 7);
  // Virou o mês e a bandeira ainda é do mês passado: tenta de novo, mas no
  // máximo a cada 6 h (a ANEEL às vezes demora pra publicar a bandeira nova).
  const bandeiraAtrasada = config.aneel.bandeiraCompetencia !== mesAtual && idade > 6 * 60 * 60 * 1000;
  return idade > VALIDADE_DADOS_ANEEL_MS || bandeiraAtrasada;
}
