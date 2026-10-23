import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';
import type { EstadoWidget } from './tipos';
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

function hora(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Carteira do card do Dashboard (ícone "account_balance_wallet" do Material
// Icons, o mesmo <MaterialIcons name="account-balance-wallet"> do app)
const CARTEIRA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${TEXTO_SUAVE}" d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`;

export function ContaWidget({ estado }: { estado: EstadoWidget }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: AZUL,
        borderRadius: 16,
        padding: 14,
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <FlexWidget
        style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <TextWidget text="Conta Estimada" style={{ fontSize: 16, color: TEXTO_SUAVE }} />
        <SvgWidget svg={CARTEIRA} style={{ width: 18, height: 18 }} />
      </FlexWidget>
      {estado.tipo === 'aviso' ? <Aviso mensagem={estado.mensagem} /> : <Conta {...estado} />}
    </FlexWidget>
  );
}

function Aviso({ mensagem }: { mensagem: string }) {
  return (
    <FlexWidget style={{ width: 'match_parent', marginTop: 8 }}>
      <TextWidget text={mensagem} style={{ fontSize: 14, color: TEXTO }} />
    </FlexWidget>
  );
}

function Conta({ estimada, projetada, tarifa, atualizadoEm, bandeira }: Extract<EstadoWidget, { tipo: 'conta' }>) {
  // Barra: quanto da conta projetada já foi consumido (igual ao Dashboard)
  const pct = projetada !== null && projetada > 0 ? Math.round(Math.min(100, (estimada / projetada) * 100)) : 0;
  // Mesma linha do card do Dashboard: "Tarifa: R$ 1,03/kWh · Bandeira Verde"
  const rotulo = rotuloBandeira(bandeira);
  const linhaTarifa = `Tarifa: ${reais(tarifa)}/kWh` + (rotulo ? ` · ${rotulo}` : '');

  return (
    <FlexWidget style={{ width: 'match_parent', flexDirection: 'column' }}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 }}>
        <TextWidget text="R$" style={{ fontSize: 20, fontWeight: '600', color: TEXTO, marginBottom: 3, marginRight: 4 }} />
        <TextWidget text={numero(estimada)} style={{ fontSize: 34, fontWeight: '700', color: TEXTO }} />
      </FlexWidget>
      <TextWidget text={linhaTarifa} style={{ fontSize: 14, color: TEXTO_SUAVE }} />

      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 8,
        }}
      >
        <TextWidget text="Projetado" style={{ fontSize: 13, color: TEXTO_SUAVE }} />
        <TextWidget
          text={projetada !== null ? reais(projetada) : 'após 24h'}
          style={{ fontSize: 13, fontWeight: '700', color: TEXTO }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          width: 'match_parent',
          height: 6,
          flexDirection: 'row',
          backgroundColor: TRILHO,
          borderRadius: 3,
          marginTop: 6,
        }}
      >
        {pct > 0 ? <FlexWidget style={{ flex: pct, height: 6, backgroundColor: TEXTO, borderRadius: 3 }} /> : null}
        {pct < 100 ? <FlexWidget style={{ flex: 100 - pct, height: 6 }} /> : null}
      </FlexWidget>

      <TextWidget text={`Atualizado ${hora(atualizadoEm)}`} style={{ fontSize: 12, color: TEXTO_SUAVE, marginTop: 6 }} />
    </FlexWidget>
  );
}
