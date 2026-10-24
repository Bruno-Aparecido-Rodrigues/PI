import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as coresClaras, colorsEscuro, AppColors } from '../constants/colors';

// Tema claro/escuro do app. A escolha fica salva no celular (AsyncStorage) e
// vale pra todas as telas na hora, sem reiniciar.
//
// Como usar num componente:
//   const styles = useEstilos(criarEstilos);   // style.ts exporta criarEstilos(colors)
//   const colors = useCores();                 // cores do tema atual

const CHAVE = 'tema:v1';

interface TemaValor {
  escuro: boolean;
  cores: AppColors;
  definirEscuro: (escuro: boolean) => void;
}

const TemaContext = createContext<TemaValor>({
  escuro: false,
  cores: coresClaras,
  definirEscuro: () => {},
});

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const [escuro, setEscuro] = useState(false);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then((v) => setEscuro(v === 'escuro'))
      .catch(() => {})
      .finally(() => setCarregado(true));
  }, []);

  const valor = useMemo<TemaValor>(
    () => ({
      escuro,
      cores: escuro ? colorsEscuro : coresClaras,
      definirEscuro: (v: boolean) => {
        setEscuro(v);
        AsyncStorage.setItem(CHAVE, v ? 'escuro' : 'claro').catch(() => {});
      },
    }),
    [escuro]
  );

  // Espera ler a escolha salva (alguns milissegundos) pra não piscar o tema errado
  if (!carregado) return null;
  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export function useTema(): TemaValor {
  return useContext(TemaContext);
}

export function useCores(): AppColors {
  return useContext(TemaContext).cores;
}

// Folhas de estilo já montadas pra cada tema (a mesma função de estilo é
// usada por várias instâncias do mesmo componente)
const cacheEstilos = new WeakMap<Function, { claro?: unknown; escuro?: unknown }>();

export function useEstilos<T>(criar: (cores: AppColors) => T): T {
  const { escuro, cores } = useContext(TemaContext);
  return useMemo(() => {
    const porTema = cacheEstilos.get(criar) ?? {};
    const chave = escuro ? 'escuro' : 'claro';
    if (!porTema[chave]) {
      porTema[chave] = criar(cores);
      cacheEstilos.set(criar, porTema);
    }
    return porTema[chave] as T;
  }, [criar, escuro, cores]);
}
