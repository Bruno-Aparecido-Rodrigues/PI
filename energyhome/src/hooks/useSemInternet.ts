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
let jaConectou = false;
/** Quando a conexão voltou depois de cair (0 = nunca caiu) */
let reconectadoEm = 0;
let iniciado = false;
const ouvintes = new Set<(c: boolean) => void>();

function iniciar() {
  if (iniciado) return;
  iniciado = true;
  onValue(ref(getDatabase(app), '.info/connected'), (snap) => {
    const agora = snap.val() === true;
    if (agora && !conectado && jaConectou) reconectadoEm = Date.now();
    if (agora) jaConectou = true;
    conectado = agora;
    ouvintes.forEach((f) => f(conectado));
  });
}

export interface ConexaoDoCelular {
  /** O app está ligado ao Firebase agora (sem a espera do aviso) */
  conectado: boolean;
  /** Quando a conexão voltou depois de uma queda (0 = não caiu desde que o app abriu) */
  reconectadoEm: number;
}

/**
 * Conexão do celular com o banco, na hora, sem esperar. Usado pelo status do
 * hub: sem internet no celular, não dá pra saber se o hub está ligado.
 */
export function useConexaoDoCelular(): ConexaoDoCelular {
  const [estado, setEstado] = useState<ConexaoDoCelular>({ conectado, reconectadoEm });

  useEffect(() => {
    iniciar();
    const avaliar = () => setEstado({ conectado, reconectadoEm });
    avaliar();
    ouvintes.add(avaliar);
    return () => {
      ouvintes.delete(avaliar);
    };
  }, []);

  return estado;
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
