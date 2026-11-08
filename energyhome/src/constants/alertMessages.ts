// Textos pré-definidos para os alertas de anomalia. Cada registro salvo em
// /hub/alerts guarda apenas o "templateId" (chave aqui embaixo) o texto de
// verdade fica centralizado neste arquivo, tanto pro app quanto pra quem for
// gerar os alertas (ESP32 ou uma Cloud Function) usar o mesmo vocabulário.

export type AlertTemplateId = keyof typeof ALERT_TEMPLATES;

export const ALERT_TEMPLATES = {
  spike: {
    title: 'Pico Anormal Detectado',
    description: 'O consumo ultrapassou significativamente a média registrada nos últimos períodos.',
    icone: 'trending-up',
    oQueFazer:
      'Veja quais aparelhos de alta potência estão ligados agora (chuveiro, forno elétrico, ferro, aquecedor). Se nenhum deles estiver em uso, pode ser um aparelho com defeito: desligue os suspeitos e acompanhe o consumo ao vivo no Início.',
  },
  sustained_high: {
    title: 'Consumo Elevado Sustentado',
    description: 'O consumo permaneceu acima do normal por um período prolongado.',
    icone: 'timer',
    oQueFazer:
      'Confira se algum aparelho ficou ligado sem necessidade, como o chuveiro, um aquecedor ou o ferro de passar. Consumo alto por muito tempo é o que mais pesa na conta.',
  },
  hub_offline: {
    title: 'Hub Desconectado',
    description: 'Não recebemos novas leituras do hub há um tempo. Verifique a conexão do dispositivo.',
    icone: 'wifi-off',
    oQueFazer:
      'Confira se o hub está ligado na tomada e se o Wi-Fi da casa está funcionando. Enquanto estiver sem internet, o hub guarda as leituras e envia quando a conexão voltar.',
  },
  hub_back_online: {
    title: 'Hub Reconectado',
    description: 'O hub voltou a enviar leituras normalmente.',
    icone: 'wifi',
    oQueFazer: 'Nada a fazer: as leituras guardadas durante a queda já foram enviadas.',
  },
  high_bill_projection: {
    title: 'Projeção de Conta Elevada',
    description: 'No ritmo atual de consumo, a conta deste mês deve ficar acima do esperado.',
    icone: 'receipt-long',
    oQueFazer:
      'Abra os Gráficos pra ver em quais dias e horários o consumo subiu. Reduzir o tempo de banho e desligar aparelhos em standby são as formas mais rápidas de baixar a conta.',
  },
  sensor_zero: {
    title: 'Sensor sem Leitura',
    description: 'O hub está conectado, mas o consumo está zerado há mais de 30 minutos. Verifique o sensor (CT) no quadro de luz.',
    icone: 'sensors-off',
    oQueFazer:
      'Uma casa nunca fica em 0 W. Com o disjuntor geral desligado, confira se o sensor (CT) está fechado em volta dos fios e se o cabinho dele está bem conectado ao hub.',
  },
} as const;

export function getAlertTemplate(templateId: string) {
  return (
    ALERT_TEMPLATES[templateId as AlertTemplateId] ?? {
      title: 'Alerta do Sistema',
      description: 'Uma notificação foi registrada pelo hub.',
      icone: 'notifications',
      oQueFazer: 'Acompanhe o consumo ao vivo no Início.',
    }
  );
}
