import React, { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';
import { getDatabase, goOffline, goOnline } from 'firebase/database';
import { app } from '../services/authIntegration';
import { useCores } from '../theme/TemaContext';

// "Puxar pra recarregar": arrastar a tela pra baixo no topo recarrega tudo.
// Remonta o conteúdo da tela (as assinaturas do Firebase são refeitas) e
// força o Firebase a reconectar, o que ajuda logo depois que a internet volta.
//
// Uso na tela:
//   const { chave, refreshControl } = useRecarregar();
//   <Conteudo key={chave} refreshControl={refreshControl} />
//   ...e no ScrollView do conteúdo: refreshControl={refreshControl}
export function useRecarregar() {
  const colors = useCores();
  const [chave, setChave] = useState(0);
  const [recarregando, setRecarregando] = useState(false);

  const recarregar = useCallback(() => {
    setRecarregando(true);
    const db = getDatabase(app);
    goOffline(db);
    goOnline(db);
    setChave((k) => k + 1);
    // Os dados chegam em tempo real; o indicador só mostra que recarregou
    setTimeout(() => setRecarregando(false), 900);
  }, []);

  const refreshControl = (
    <RefreshControl
      refreshing={recarregando}
      onRefresh={recarregar}
      colors={[colors.primary]}
      tintColor={colors.primary}
      progressBackgroundColor={colors.surfaceContainerLowest}
    />
  );

  return { chave, refreshControl };
}
