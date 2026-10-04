import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  update,
} from "firebase/database";

// ===============================
// CONFIGURAÇÃO DO FIREBASE
// ===============================

const firebaseConfig = {
  apiKey: 'AIzaSyAMRmDws9AsB1VGAVeyJikxIrJY7uUeowc',
  authDomain: 'pi-energia-db.firebaseapp.com',
  databaseURL: 'https://pi-energia-db-default-rtdb.firebaseio.com',
  projectId: 'pi-energia-db',
  storageBucket: 'pi-energia-db.firebasestorage.app',
  messagingSenderId: '381830661025',
  appId: '1:381830661025:web:966968477f8d3251a641e0',
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ===============================
// HUB
// ===============================

const hubId = "021122334455";

// ===============================
// FUNÇÃO PARA CRIAR DATA
// ===============================

const diasAtras = (dias) => {
  const data = new Date();
  data.setDate(data.getDate() - dias);

  // Horário aleatório durante o dia
  data.setHours(
    Math.floor(Math.random() * 24),
    Math.floor(Math.random() * 60),
    Math.floor(Math.random() * 60),
    0
  );

  return data.getTime();
};

// ===============================
// ALERTAS
// ===============================

const alerts = {
  alert_01: {
    read: false,
    templateId: "spike",
    timestamp: diasAtras(0),
  },

  alert_02: {
    read: true,
    templateId: "hub_back_online",
    timestamp: diasAtras(1),
  },

  alert_03: {
    read: false,
    templateId: "sustained_high",
    timestamp: diasAtras(3),
  },

  alert_04: {
    read: true,
    templateId: "high_bill_projection",
    timestamp: diasAtras(5),
  },

  alert_05: {
    read: false,
    templateId: "hub_offline",
    timestamp: diasAtras(7),
  },

  alert_06: {
    read: true,
    templateId: "spike",
    timestamp: diasAtras(10),
  },

  alert_07: {
    read: false,
    templateId: "sustained_high",
    timestamp: diasAtras(13),
  },

  alert_08: {
    read: true,
    templateId: "hub_back_online",
    timestamp: diasAtras(16),
  },

  alert_09: {
    read: false,
    templateId: "high_bill_projection",
    timestamp: diasAtras(20),
  },

  alert_10: {
    read: true,
    templateId: "spike",
    timestamp: diasAtras(24),
  },

  alert_11: {
    read: false,
    templateId: "hub_offline",
    timestamp: diasAtras(28),
  },
};

// ===============================
// ENVIA PARA O FIREBASE
// ===============================

const alertsRef = ref(db, `hubs/${hubId}/alerts`);

try {
  await update(alertsRef, alerts);

  console.log("✅ Alertas adicionados com sucesso!");
  console.log(`📡 Hub: ${hubId}`);
  console.log(`🔔 Quantidade de alertas: ${Object.keys(alerts).length}`);
} catch (error) {
  console.error("❌ Erro ao adicionar alertas:");
  console.error(error);
}