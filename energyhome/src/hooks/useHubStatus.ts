import { useEffect, useState } from 'react';
import { subscribeToCurrentReading } from '../services/energyData';
import { useConexaoDoCelular } from './useSemInternet';

// Se o hub não manda uma leitura nova em 10 segundos, consideramos ele
// offline. O firmware manda /current a cada 3s, então 10s já dá uma boa
// margem sem acusar "desconectado" por causa de um único envio atrasado
const OFFLINE_THRESHOLD_MS = 10000;

// Depois que o celular volta pra internet, o Firebase leva um instante pra
// entregar a leitura nova do hub. Nesse meio-tempo a última leitura que o app
// tem é a de antes da queda, e o hub pareceria desconectado sem estar.
const CARENCIA_RECONEXAO_MS = OFFLINE_THRESHOLD_MS;

/**
 * - online: o hub mandou leitura há pouco
 * - offline: o celular está conectado e o hub parou de mandar leituras
 * - desconhecido: o celular está sem internet (ou acabou de voltar), então
 *   não dá pra saber como o hub está
 */
export type SituacaoDoHub = 'online' | 'offline' | 'desconhecido';

export interface HubStatus {
  online: boolean;
  situacao: SituacaoDoHub;
  /** false = o problema é a internet do celular, não o hub */
  celularConectado: boolean;
  lastUpdatedAt: number | null;
  /** true depois que o Firebase respondeu pela primeira vez (evita mostrar
   *  "desconectado" por um instante enquanto o app ainda está carregando) */
  loaded: boolean;
}

export function useHubStatus(hubId: string | null): HubStatus {
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { conectado, reconectadoEm } = useConexaoDoCelular();
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
  const instante = Math.max(agora, Date.now());
  const online = !!hubId && lastUpdatedAt !== null && instante - lastUpdatedAt < OFFLINE_THRESHOLD_MS;
  const acabouDeVoltar = reconectadoEm > 0 && instante - reconectadoEm < CARENCIA_RECONEXAO_MS;

  let situacao: SituacaoDoHub;
  if (online) situacao = 'online';
  else if (!conectado || acabouDeVoltar) situacao = 'desconhecido';
  else situacao = 'offline';

  return { online, situacao, celularConectado: conectado, lastUpdatedAt, loaded: !!hubId && loaded };
}
