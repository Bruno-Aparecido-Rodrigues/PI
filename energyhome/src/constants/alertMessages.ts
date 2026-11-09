// Textos pré-definidos para os alertas de anomalia. Cada registro salvo em
// /hub/alerts guarda apenas o "templateId" (chave aqui embaixo); o texto de
// verdade fica em src/i18n/textos.ts ("alerta.<templateId>.titulo" etc.), em
// português e em inglês. O Worker (alertas-worker) usa o mesmo vocabulário
// nas notificações.

import { t, Chave } from '../i18n';

/** Ícone do MaterialIcons de cada tipo de alerta */
const ICONES = {
  spike: 'trending-up',
  sustained_high: 'timer',
  hub_offline: 'wifi-off',
  hub_back_online: 'wifi',
  high_bill_projection: 'receipt-long',
  sensor_zero: 'sensors-off',
} as const;

export type AlertTemplateId = keyof typeof ICONES;

export interface AlertTemplate {
  title: string;
  description: string;
  icone: string;
  oQueFazer: string;
}

/** Textos do alerta no idioma atual (chame na hora de desenhar a tela). */
export function getAlertTemplate(templateId: string): AlertTemplate {
  const conhecido = templateId in ICONES;
  const id = conhecido ? templateId : 'outro';
  return {
    title: t(`alerta.${id}.titulo` as Chave),
    description: t(`alerta.${id}.descricao` as Chave),
    oQueFazer: t(`alerta.${id}.oQueFazer` as Chave),
    icone: conhecido ? ICONES[templateId as AlertTemplateId] : 'notifications',
  };
}
