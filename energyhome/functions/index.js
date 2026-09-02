const { onValueCreated } = require('firebase-functions/v2/database');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();

// IMPORTANTE: esses textos são uma cópia dos mesmos templates de
// src/constants/alertMessages.ts no app. As Cloud Functions rodam num
// ambiente Node.js separado do app React Native, então não dá pra importar
// o arquivo diretamente — se adicionar um novo templateId lá, replique aqui
// também.
const ALERT_TEMPLATES = {
  spike: {
    title: 'Pico Anormal Detectado',
    description: 'O consumo ultrapassou significativamente a média registrada.',
  },
  sustained_high: {
    title: 'Consumo Elevado Sustentado',
    description: 'O consumo permaneceu acima do normal por um período prolongado.',
  },
  hub_offline: {
    title: 'Hub Desconectado',
    description: 'Não recebemos novas leituras do hub há um tempo.',
  },
  hub_back_online: {
    title: 'Hub Reconectado',
    description: 'O hub voltou a enviar leituras normalmente.',
  },
  high_bill_projection: {
    title: 'Projeção de Conta Elevada',
    description: 'No ritmo atual, a conta deste mês deve ficar acima do esperado.',
  },
};

// Dispara toda vez que um novo registro é criado em /hub/alerts/{alertId}.
exports.onNewAlert = onValueCreated('/hub/alerts/{alertId}', async (event) => {
  const alert = event.data.val();
  const template = ALERT_TEMPLATES[alert?.templateId] ?? {
    title: 'Alerta do Sistema',
    description: 'Uma notificação foi registrada pelo hub.',
  };

  const tokensSnapshot = await admin.database().ref('pushTokens').once('value');
  const tokensByUser = tokensSnapshot.val() ?? {};
  const tokens = Object.values(tokensByUser).filter(Boolean);

  if (tokens.length === 0) {
    console.log('Nenhum token registrado — ninguém pra notificar.');
    return;
  }

  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title: template.title,
    body: template.description,
    data: { templateId: alert?.templateId },
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });

  const result = await response.json();
  console.log('Resposta do serviço de push do Expo:', JSON.stringify(result));
});
