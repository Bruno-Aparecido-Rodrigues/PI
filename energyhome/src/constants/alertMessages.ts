// Textos pré-definidos para os alertas de anomalia. Cada registro salvo em
// /hub/alerts guarda apenas o "templateId" (chave aqui embaixo) o texto de
// verdade fica centralizado neste arquivo, tanto pro app quanto pra quem for
// gerar os alertas (ESP32 ou uma Cloud Function) usar o mesmo vocabulário.

export type AlertTemplateId = keyof typeof ALERT_TEMPLATES;

export const ALERT_TEMPLATES = {
  spike: {
    title: 'Pico Anormal Detectado',
    description: 'O consumo ultrapassou significativamente a média registrada nos últimos períodos.',
  },
  sustained_high: {
    title: 'Consumo Elevado Sustentado',
    description: 'O consumo permaneceu acima do normal por um período prolongado.',
  },
  hub_offline: {
    title: 'Hub Desconectado',
    description: 'Não recebemos novas leituras do hub há um tempo. Verifique a conexão do dispositivo.',
  },
  hub_back_online: {
    title: 'Hub Reconectado',
    description: 'O hub voltou a enviar leituras normalmente.',
  },
  high_bill_projection: {
    title: 'Projeção de Conta Elevada',
    description: 'No ritmo atual de consumo, a conta deste mês deve ficar acima do esperado.',
  },
} as const;

export function getAlertTemplate(templateId: string) {
  return (
    ALERT_TEMPLATES[templateId as AlertTemplateId] ?? {
      title: 'Alerta do Sistema',
      description: 'Uma notificação foi registrada pelo hub.',
    }
  );
}
