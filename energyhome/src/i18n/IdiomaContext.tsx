import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { getDatabase, ref, set } from 'firebase/database';
import { app, subscribeToAuthChanges } from '../services/authIntegration';
import {
  Idioma,
  EscolhaIdioma,
  Chave,
  t as traduzir,
  idioma as idiomaAtual,
  aplicarIdioma,
  lerEscolhaSalva,
  salvarEscolha,
} from './index';

// Idioma do app pra telas: trocar em Ajustes
// redesenha tudo na hora, sem reiniciar.
//
//   const t = useT();
//   <Text>{t('ajustes.titulo')}</Text>

interface IdiomaValor {
  idioma: Idioma;
  escolha: EscolhaIdioma;
  definirIdioma: (escolha: EscolhaIdioma) => void;
  t: (chave: Chave, vars?: Record<string, string | number>) => string;
}

const IdiomaContext = createContext<IdiomaValor>({
  idioma: idiomaAtual(),
  escolha: 'auto',
  definirIdioma: () => {},
  t: traduzir,
});

export function IdiomaProvider({ children }: { children: React.ReactNode }) {
  const [escolha, setEscolha] = useState<EscolhaIdioma>('auto');
  const [idioma, setIdioma] = useState<Idioma>(idiomaAtual());
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    lerEscolhaSalva()
      .then((e) => {
        setEscolha(e);
        setIdioma(aplicarIdioma(e));
      })
      .finally(() => setCarregado(true));
  }, []);

  // "Automático": se a pessoa mudar o idioma do celular com o app aberto,
  // vale ao voltar pro app
  useEffect(() => {
    if (escolha !== 'auto') return;
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') setIdioma(aplicarIdioma('auto'));
    });
    return () => sub.remove();
  }, [escolha]);

  const definirIdioma = useCallback((nova: EscolhaIdioma) => {
    setEscolha(nova);
    setIdioma(aplicarIdioma(nova));
    salvarEscolha(nova);
  }, []);

  // O t muda de identidade junto com o idioma: quem usa useT() redesenha
  const valor = useMemo<IdiomaValor>(
    () => ({ idioma, escolha, definirIdioma, t: (c, v) => traduzir(c, v) }),
    [idioma, escolha, definirIdioma]
  );

  // Espera ler a escolha salva pra não piscar no idioma errado
  if (!carregado) return null;
  return (
    <IdiomaContext.Provider value={valor}>
      <SincronizarIdioma idioma={idioma} />
      {children}
    </IdiomaContext.Provider>
  );
}

/**
 * Grava o idioma em /users/{uid}/idioma pra o Worker mandar as notificações
 * no mesmo idioma do app. Roda ao entrar na conta e quando o idioma muda.
 */
function SincronizarIdioma({ idioma }: { idioma: Idioma }) {
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToAuthChanges((user) => setUid(user?.emailVerified ? user.uid : null));
  }, []);

  useEffect(() => {
    if (!uid) return;
    set(ref(getDatabase(app), `users/${uid}/idioma`), idioma).catch((erro) =>
      console.warn('Não foi possível salvar o idioma na conta:', erro)
    );
  }, [uid, idioma]);

  return null;
}

export function useIdioma(): IdiomaValor {
  return useContext(IdiomaContext);
}

/** Função de tradução que redesenha o componente quando o idioma muda */
export function useT(): IdiomaValor['t'] {
  return useContext(IdiomaContext).t;
}
