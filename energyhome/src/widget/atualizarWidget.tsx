import React from 'react';
import { Platform } from 'react-native';
import type { PowerReading } from '../services/energyData';
import { NOME_WIDGET, EstadoWidget } from './tipos';
import { CacheConta, competenciaDe, salvarCache, apagarCache, estadoDoCache } from './cacheConta';
import { t } from '../i18n';

// Ponte entre o app aberto e o widget: atualiza o widget na hora e guarda o
// cache que ele usa com o app fechado. Só Android; no Expo Go (sem a parte
// nativa do widget) não faz nada.

function desenhar(estado: EstadoWidget) {
  if (Platform.OS !== 'android') return;
  try {
    // require aqui dentro: no Expo Go a parte nativa não existe
    const { requestWidgetUpdate } = require('react-native-android-widget');
    const { ContaWidget } = require('./ContaWidget');
    Promise.resolve(
      requestWidgetUpdate({
        widgetName: NOME_WIDGET,
        renderWidget: (info: { width: number; height: number }) => (
          <ContaWidget estado={estado} largura={info?.width} altura={info?.height} />
        ),
        widgetNotFound: () => {}, // nenhum widget na tela inicial: tudo bem
      })
    ).catch(() => {});
  } catch {
    // biblioteca nativa ausente (Expo Go)
  }
}

export function atualizarWidgetConta(dados: {
  hubId: string;
  monthKwh: number;
  coveredMs: number;
  ultimaLeitura: PowerReading | null;
  tariff: number;
  cip: number;
  bandeira: string | null;
  periodoInicio: number;
  periodoFim: number;
}) {
  if (Platform.OS !== 'android') return;
  const agora = Date.now();
  const cache: CacheConta = { ...dados, competencia: competenciaDe(agora), atualizadoEm: agora };
  salvarCache(cache);
  desenhar(estadoDoCache(cache, agora));
}

/** Ao sair da conta: esquece os números e pede pra entrar de novo. */
export async function limparWidgetConta() {
  if (Platform.OS !== 'android') return;
  await apagarCache();
  desenhar({ tipo: 'aviso', mensagem: t('widget.entre') });
}
