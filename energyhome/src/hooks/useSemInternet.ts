import { useEffect, useState } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';
import { app } from '../services/authIntegration';

// Conexão com a internet, pelo sinal do próprio Firebase (".info/connected"):
// true quando o app está ligado ao banco. Não precisa de pacote nativo.
//
// Só avisa "sem internet" depois de alguns segundos desconectado, pra não
// piscar o aviso enquanto o app ainda está abrindo a conexão.
const ESPERA_MS = 3000;

let conectado = false;
let iniciado = false;
const ouvintes = new Set<(c: boolean) => void>();

function iniciar() {
  if (iniciado) return;
  iniciado = true;
  onValue(ref(getDatabase(app), '.info/connected'), (snap) => {
    conectado = snap.val() === true;
    ouvintes.forEach((f) => f(conectado));
  });
}

export function useSemInternet(): boolean {
  const [semInternet, setSemInternet] = useState(false);

  useEffect(() => {
    iniciar();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const avaliar = (c: boolean) => {
      clearTimeout(timer);
      if (c) setSemInternet(false);
      else timer = setTimeout(() => setSemInternet(true), ESPERA_MS);
    };
    avaliar(conectado);
    ouvintes.add(avaliar);
    return () => {
      ouvintes.delete(avaliar);
      clearTimeout(timer);
    };
  }, []);

  return semInternet;
}
