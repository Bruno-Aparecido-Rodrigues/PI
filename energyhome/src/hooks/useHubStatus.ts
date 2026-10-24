import { useEffect, useState } from 'react';
import { subscribeToCurrentReading } from '../services/energyData';

// Se o hub não manda uma leitura nova em 10 segundos, consideramos ele
// offline. O firmware manda /current a cada 3s, então 10s já dá uma boa
// margem sem acusar "desconectado" por causa de um único envio atrasado
const OFFLINE_THRESHOLD_MS = 10000;

export interface HubStatus {
  online: boolean;
  lastUpdatedAt: number | null;
  /** true depois que o Firebase respondeu pela primeira vez (evita mostrar
   *  "desconectado" por um instante enquanto o app ainda está carregando) */
  loaded: boolean;
}

export function useHubStatus(hubId: string | null): HubStatus {
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Relógio que avança a cada 2s: o hub pode ficar "quieto" sem nenhum
  // evento novo disparar o onValue, então o status precisa ser reavaliado.
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    setLoaded(false);
    setLastUpdatedAt(null);
    if (!hubId) return;

    const unsubscribe = subscribeToCurrentReading(hubId, (reading) => {
      setLastUpdatedAt(reading?.updatedAt ?? null);
      setLoaded(true);
    });

    return unsubscribe;
  }, [hubId]);

  useEffect(() => {
    const interval = setInterval(() => setAgora(Date.now()), 2000);
    return () => clearInterval(interval);
  }, []);

  // Calculado na hora (não num efeito separado): assim, quando a primeira
  // leitura chega, o app já sabe que está online, sem piscar "desconectado".
  const online =
    !!hubId && lastUpdatedAt !== null && Math.max(agora, Date.now()) - lastUpdatedAt < OFFLINE_THRESHOLD_MS;

  return { online, lastUpdatedAt, loaded: !!hubId && loaded };
}
