// Gera ~35 dias de leituras falsas (a cada 15 min), com uma curva parecida
// com o consumo de uma casa real (baixo de madrugada, picos no almoço e à
// noite, com ruído aleatório), e grava tudo de uma vez em /hub/readings.
//
// Como rodar (na raiz do projeto):
//   node scripts/seedFakeData.mjs
//
// Não precisa instalar nada extra — usa o pacote "firebase" que o app já tem.

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, update } from 'firebase/database';

// Mesmas chaves do seu firebaseConfig.ts — duplicadas aqui só porque este
// script roda fora do bundler do Expo (Node puro), então não importa
// arquivos .ts diretamente.
const firebaseConfig = {
  apiKey: 'AIzaSyAMRmDws9AsB1VGAVeyJikxIrJY7uUeowc',
  authDomain: 'pi-energia-db.firebaseapp.com',
  databaseURL: 'https://pi-energia-db-default-rtdb.firebaseio.com',
  projectId: 'pi-energia-db',
  storageBucket: 'pi-energia-db.firebasestorage.app',
  messagingSenderId: '381830661025',
  appId: '1:381830661025:web:966968477f8d3251a641e0',
};

const DAYS = 35;
const INTERVAL_MINUTES = 15;

function wattsForHour(hour) {
  const base = 150; // consumo de "geladeira ligada, standby, etc"
  const lunchPeak = 400 * Math.exp(-((hour - 12) ** 2) / 8); // pico do almoço
  const eveningPeak = 600 * Math.exp(-((hour - 20) ** 2) / 6); // pico da noite
  const noise = (Math.random() - 0.5) * 60;
  return Math.max(50, base + lunchPeak + eveningPeak + noise);
}

async function seed() {
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  const now = Date.now();
  const totalPoints = Math.floor((DAYS * 24 * 60) / INTERVAL_MINUTES);
  const updates = {};

  for (let i = 0; i < totalPoints; i++) {
    const timestamp =
      now - (totalPoints - i) * INTERVAL_MINUTES * 60 * 1000;

    const hour = new Date(timestamp).getHours();
    const watts = Math.round(wattsForHour(hour));

    updates[`seed_${i}`] = {
      watts,
      timestamp
    };
  }

  await update(
    ref(db, 'hubs/021122334455/readings'),
    updates
  );

  console.log(
    `✅ Gravadas ${totalPoints} leituras em /hubs/021122334455/readings.`
  );

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Erro ao gravar dados falsos:', err);
  process.exit(1);
});
