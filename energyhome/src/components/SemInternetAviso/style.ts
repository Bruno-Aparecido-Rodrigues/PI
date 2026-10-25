import { StyleSheet } from 'react-native';
import type { AppColors } from '../../constants/colors';

// Recebe as cores do tema atual (claro/escuro). Ver src/theme/TemaContext.tsx
export const criarEstilos = (colors: AppColors) =>
  StyleSheet.create({
    faixa: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.errorContainer,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    textos: {
      flex: 1,
    },
    titulo: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.onErrorContainer,
    },
    texto: {
      fontSize: 12,
      color: colors.onErrorContainer,
    },
  });
