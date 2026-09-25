import { useEffect, useState } from 'react';
import { subscribeToCurrentReading } from '../services/energyData';

// Se o hub não manda uma leitura nova em 30 segundos, consideramos ele
// offline. O firmware de teste manda a cada 5s, e o ESP32 "de produção"
// (com o sensor) deve manter esse ritmo também, ajuste esse valor se a
// frequência real de envio mudar.
const OFFLINE_THRESHOLD_MS = 30000;

export interface HubStatus {
  online: boolean;
  lastUpdatedAt: number | null;
}

export function useHubStatus(hubId: string | null): HubStatus {
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!hubId) {
      setLastUpdatedAt(null);
      setOnline(false);
      return;
    }

    const unsubscribe = subscribeToCurrentReading(hubId, (reading) => {
      setLastUpdatedAt(reading?.updatedAt ?? null);
    });

    return unsubscribe;
  }, [hubId]);

  // Reavalia periodicamente (não só quando chega leitura nova), porque o
  // hub pode ficar "quieto" sem nenhum evento novo disparar o onValue.
  useEffect(() => {
    function check() {
      setOnline(lastUpdatedAt !== null && Date.now() - lastUpdatedAt < OFFLINE_THRESHOLD_MS);
    }
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [lastUpdatedAt]);

  return { online, lastUpdatedAt };
}
