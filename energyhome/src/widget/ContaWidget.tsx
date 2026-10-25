import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';
import { ACAO_ATUALIZAR } from './tipos';
import type { EstadoWidget, Situacao } from './tipos';
import { rotuloBandeira } from '../services/contaMes';

// Widget "Conta do mês" da tela inicial do Android. Mesmo visual do card
// "Conta Estimada" do Dashboard. Widgets não podem usar View/Text nem
// hooks: só os componentes da biblioteca react-native-android-widget.

const AZUL = '#0052ff';
const TEXTO = '#ffffff';
const TEXTO_SUAVE = '#dfe3ff';
const TRILHO = '#4d86ff'; // branco 30% sobre o azul

function numero(valor: number): string {
  return valor.toFixed(2).replace('.', ',');
}

function reais(valor: number): string {
  return `R$ ${numero(valor)}`;
}

/** "Atualizado 09:52" / "Atualizando…" / "De 09:19 · falhou 09:52" */
function textoRodape(atualizadoEm: number, situacao?: Situacao): string {
  if (situacao?.tipo === 'atualizando') return 'Atualizando…';
  if (situacao?.tipo === 'falhou') return `De ${hora(atualizadoEm)} · falhou ${hora(situacao.em)}`;
  return `Atualizado ${hora(atualizadoEm)}`;
}

function hora(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Carteira do card do Dashboard (ícone "account_balance_wallet" do Material
// Icons, o mesmo <MaterialIcons name="account-balance-wallet"> do app)
const CARTEIRA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${TEXTO_SUAVE}" d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`;

// Wi-Fi cortado (ícone "wifi_off" do Material Icons)
const SEM_WIFI = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${TEXTO}" d="M23.64 7c-.45-.34-4.93-4-11.64-4-1.5 0-2.89.19-4.15.48L18.18 13.8 23.64 7zm-6.6 8.22L3.27 1.44 2 2.72l2.05 2.06C1.91 5.76.59 6.82.36 7l11.63 14.49.01.01.01-.01 3.9-4.86 3.32 3.32 1.27-1.27-3.46-3.46z"/></svg>`;

// Tamanho de referência (dp) pras fontes abaixo. O widget calcula uma
// escala pelo tamanho real dele, então o conteúdo cabe em qualquer tamanho
// que a pessoa deixar na tela inicial.
const LARGURA_BASE = 300;
const ALTURA_BASE = 175;
const ALTURA_COMPACTA = 135; // abaixo disso some a linha da tarifa

interface Props {
  estado: EstadoWidget;
  largura?: number; // dp (WidgetInfo.width)
  altura?: number; // dp (WidgetInfo.height)
}

function calcularEscala(largura: number, altura: number, compacto: boolean): number {
  const alturaBase = compacto ? ALTURA_BASE - 30 : ALTURA_BASE;
  const e = Math.min(largura / LARGURA_BASE, altura / alturaBase);
  return Math.max(0.65, Math.min(1.3, e));
}

export function ContaWidget({ estado, largura = 260, altura = ALTURA_BASE }: Props) {
  const compacto = altura < ALTURA_COMPACTA;
  const k = calcularEscala(largura, altura, compacto);
  const t = (n: number) => Math.round(n * k); // tamanho escalado

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: AZUL,
        borderRadius: 16,
        padding: t(14),
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <FlexWidget
        style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <TextWidget text="Conta Estimada" style={{ fontSize: t(16), color: TEXTO_SUAVE }} />
        <SvgWidget svg={CARTEIRA} style={{ width: t(20), height: t(20) }} />
      </FlexWidget>
      {estado.tipo === 'aviso' ? (
        <Aviso mensagem={estado.mensagem} semInternet={estado.semInternet} t={t} />
      ) : (
        <Conta {...estado} t={t} compacto={compacto} />
      )}
    </FlexWidget>
  );
}

function Aviso({
  mensagem,
  semInternet,
  t,
}: {
  mensagem: string;
  semInternet?: boolean;
  t: (n: number) => number;
}) {
  return (
    <FlexWidget style={{ width: 'match_parent', marginTop: t(8), flexDirection: 'row', alignItems: 'center' }}>
      {semInternet ? <SvgWidget svg={SEM_WIFI} style={{ width: t(22), height: t(22), marginRight: t(8) }} /> : null}
      <TextWidget text={mensagem} style={{ fontSize: t(14), color: TEXTO }} />
      {semInternet ? (
        <FlexWidget clickAction={ACAO_ATUALIZAR} style={{ paddingLeft: t(10), paddingVertical: t(2) }}>
          <TextWidget text="↻" style={{ fontSize: t(16), fontWeight: '700', color: TEXTO }} />
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

function Conta({
  estimada,
  projetada,
  tarifa,
  atualizadoEm,
  bandeira,
  situacao,
  t,
  compacto,
}: Extract<EstadoWidget, { tipo: 'conta' }> & { t: (n: number) => number; compacto: boolean }) {
  // Barra: quanto da conta projetada já foi consumido (igual ao Dashboard)
  const pct = projetada !== null && projetada > 0 ? Math.round(Math.min(100, (estimada / projetada) * 100)) : 0;
  // Mesma linha do card do Dashboard: "Tarifa: R$ 1,03/kWh · Bandeira Verde"
  const rotulo = rotuloBandeira(bandeira);
  const linhaTarifa = `Tarifa: ${reais(tarifa)}/kWh` + (rotulo ? ` · ${rotulo}` : '');
  const barra = Math.max(4, t(6));

  return (
    <FlexWidget style={{ width: 'match_parent', flexDirection: 'column' }}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: t(2) }}>
        <TextWidget
          text="R$"
          style={{ fontSize: t(20), fontWeight: '600', color: TEXTO, marginBottom: t(4), marginRight: t(4) }}
        />
        <TextWidget text={numero(estimada)} style={{ fontSize: t(34), fontWeight: '700', color: TEXTO }} />
      </FlexWidget>
      {compacto ? null : <TextWidget text={linhaTarifa} style={{ fontSize: t(14), color: TEXTO_SUAVE }} />}

      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: t(8),
        }}
      >
        <TextWidget text="Projetado" style={{ fontSize: t(14), color: TEXTO_SUAVE }} />
        <TextWidget
          text={projetada !== null ? reais(projetada) : 'após 24h'}
          style={{ fontSize: t(14), fontWeight: '700', color: TEXTO }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          width: 'match_parent',
          height: barra,
          flexDirection: 'row',
          backgroundColor: TRILHO,
          borderRadius: barra / 2,
          marginTop: t(6),
        }}
      >
        {pct > 0 ? (
          <FlexWidget style={{ flex: pct, height: barra, backgroundColor: TEXTO, borderRadius: barra / 2 }} />
        ) : null}
        {pct < 100 ? <FlexWidget style={{ flex: 100 - pct, height: barra }} /> : null}
      </FlexWidget>

      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: t(6),
        }}
      >
        {situacao?.tipo === 'semInternet' ? (
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            <SvgWidget svg={SEM_WIFI} style={{ width: t(16), height: t(16), marginRight: t(6) }} />
            <TextWidget text="Sem conexão com a internet" style={{ fontSize: t(12), fontWeight: '700', color: TEXTO }} />
          </FlexWidget>
        ) : (
          <TextWidget text={textoRodape(atualizadoEm, situacao)} style={{ fontSize: t(12), color: TEXTO_SUAVE }} />
        )}
        {/* Toque aqui atualiza sem abrir o app (o resto do widget abre o app) */}
        <FlexWidget clickAction={ACAO_ATUALIZAR} style={{ paddingLeft: t(10), paddingVertical: t(2) }}>
          <TextWidget
            text={situacao?.tipo === 'semInternet' ? '↻' : '↻ Atualizar'}
            style={{ fontSize: t(12), fontWeight: '700', color: TEXTO }}
          />
        </FlexWidget>
      </FlexWidget>
      {situacao?.tipo === 'falhou' ? (
        <TextWidget text={`Motivo: ${situacao.motivo}`} style={{ fontSize: t(11), color: TEXTO_SUAVE }} />
      ) : null}
    </FlexWidget>
  );
}
