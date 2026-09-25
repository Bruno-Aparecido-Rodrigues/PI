import { useEffect, useState } from 'react';
import { subscribeToAuthChanges } from '../services/authIntegration';
import { subscribeToUserHubs } from '../services/hubPairing';

export interface CurrentHubState {
  hubId: string | null;
  loading: boolean;
}

/**
 * Descobre o hub pareado com a conta logada. Por enquanto, cada conta usa
 * só um hub, se houver mais de um pareado, usamos o primeiro. Enquanto não
 * há nenhum hub pareado, hubId vem como null (as telas devem mostrar um
 * convite pra parear um dispositivo nesse caso).
 */
export function useCurrentHub(): CurrentHubState {
  const [hubId, setHubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeHubs: (() => void) | undefined;

    const unsubscribeAuth = subscribeToAuthChanges((user) => {
      unsubscribeHubs?.();

      if (!user) {
        setHubId(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      unsubscribeHubs = subscribeToUserHubs(user.uid, (hubIds) => {
        setHubId(hubIds[0] ?? null);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeHubs?.();
    };
  }, []);

  return { hubId, loading };
}
