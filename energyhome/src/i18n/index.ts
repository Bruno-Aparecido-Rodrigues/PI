import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { pt, en, Chave } from './textos';

// ─────────────────────────────────────────────────────────────────────────
// Idioma do app (português ou inglês)
//
// A escolha fica salva no celular (AsyncStorage):
//   'auto' (padrão) = segue o idioma do celular: inglês se o celular estiver
//                     em inglês, português em qualquer outro caso
//   'pt' / 'en'     = escolhido em Ajustes
//
// Nas telas, use o hook useT() (i18n/IdiomaContext), que redesenha a tela
// quando o idioma muda. Fora de componentes (serviços, widget), use t().
// O widget roda com o app fechado: chame carregarIdioma() antes de desenhar.
// ─────────────────────────────────────────────────────────────────────────

export type Idioma = 'pt' | 'en';
export type EscolhaIdioma = Idioma | 'auto';
export type { Chave };

const CHAVE = 'idioma:v1';
const TEXTOS: Record<Idioma, Record<Chave, string>> = { pt, en };

export function idiomaDoCelular(): Idioma {
  try {
    return getLocales()[0]?.languageCode === 'en' ? 'en' : 'pt';
  } catch {
    return 'pt';
  }
}

let atual: Idioma = idiomaDoCelular();

/** Idioma em uso agora */
export function idioma(): Idioma {
  return atual;
}

/** Usado pelo IdiomaProvider ao trocar o idioma */
export function aplicarIdioma(escolha: EscolhaIdioma): Idioma {
  atual = escolha === 'auto' ? idiomaDoCelular() : escolha;
  return atual;
}

export async function lerEscolhaSalva(): Promise<EscolhaIdioma> {
  try {
    const v = await AsyncStorage.getItem(CHAVE);
    return v === 'pt' || v === 'en' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export async function salvarEscolha(escolha: EscolhaIdioma): Promise<void> {
  try {
    if (escolha === 'auto') await AsyncStorage.removeItem(CHAVE);
    else await AsyncStorage.setItem(CHAVE, escolha);
  } catch {}
}

/** Lê a escolha salva e aplica (widget com o app fechado). */
export async function carregarIdioma(): Promise<Idioma> {
  return aplicarIdioma(await lerEscolhaSalva());
}

/** Texto no idioma atual. {nome} no texto vira vars.nome */
export function t(chave: Chave, vars?: Record<string, string | number>): string {
  let texto = TEXTOS[atual][chave] ?? pt[chave] ?? chave;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) texto = texto.split(`{${k}}`).join(String(v));
  }
  return texto;
}

// ─── Números e datas ────────────────────────────────────────────────────

/** 12.5 -> "12,5" (pt) / "12.5" (en) */
export function num(valor: number, casas = 2): string {
  const s = valor.toFixed(casas);
  return atual === 'pt' ? s.replace('.', ',') : s;
}

/** "R$ 12,34" / "R$ 12.34" (a conta é em reais nos dois idiomas) */
export function reais(valor: number, casas = 2): string {
  return `R$ ${num(valor, casas)}`;
}

const p2 = (n: number) => String(n).padStart(2, '0');

/** "26/10" (pt) / "Oct 26" (en) */
export function diaMesCurto(ms: number): string {
  const d = new Date(ms);
  if (atual === 'pt') return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`;
  return `${t('tarifa.meses').split(',')[d.getMonth()]} ${d.getDate()}`;
}

/** "26/10/2026" (pt) / "Oct 26, 2026" (en) */
export function dataCurta(ms: number): string {
  return atual === 'pt' ? `${diaMesCurto(ms)}/${new Date(ms).getFullYear()}` : `${diaMesCurto(ms)}, ${new Date(ms).getFullYear()}`;
}

/** "14:05" (24 h nos dois idiomas, como no resto do app) */
export function hora(ms: number): string {
  const d = new Date(ms);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

/** "26 de outubro" (pt) / "October 26" (en) */
export function diaMesLongo(ms: number): string {
  return new Date(ms).toLocaleDateString(atual === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'long' });
}

/** "out/2026" (pt) / "Oct 2026" (en), a partir de "2026-10" */
export function mesAno(competencia: string | null): string {
  if (!competencia) return '—';
  const [a, m] = competencia.split('-');
  const nome = t('tarifa.meses').split(',')[Number(m) - 1] ?? m;
  return atual === 'pt' ? `${nome}/${a}` : `${nome} ${a}`;
}

// ─── Bandeira tarifária ─────────────────────────────────────────────────

const CORES_EN: Record<string, string> = {
  verde: 'Green',
  amarela: 'Yellow',
  vermelha: 'Red',
  patamar: 'Level',
  escassez: 'Scarcity',
  hídrica: 'Water',
  hidrica: 'Water',
};

/** "bandeira amarela" -> "Amarela" (pt) / "Yellow" (en) */
export function nomeBandeira(bandeira: string | null | undefined): string | null {
  if (!bandeira) return null;
  const nome = bandeira.trim().replace(/^bandeira\s+/i, '');
  if (!nome) return null;
  if (atual === 'pt') return nome.charAt(0).toUpperCase() + nome.slice(1);
  const palavras = nome.split(/\s+/).map((p) => CORES_EN[p.toLowerCase()] ?? p);
  // "Escassez Hídrica" -> "Water Scarcity"
  if (palavras[0] === 'Scarcity' && palavras[1] === 'Water') return 'Water Scarcity';
  return palavras.join(' ');
}
