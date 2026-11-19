import { StyleSheet } from 'react-native';
import type { AppColors } from '../../constants/colors';

// Mesmo visual dos outros cards da tela de Gráficos
export const criarEstilos = (colors: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: `${colors.outlineVariant}4D`,
      padding: 20,
      gap: 12,
    },
    titulo: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.onSurface,
    },
    subtitulo: {
      fontSize: 13,
      color: colors.onSurfaceVariant,
      marginTop: -10,
    },
    atual: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: 10,
      padding: 14,
    },
    atualRotulo: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.primary,
    },
    linha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: `${colors.outlineVariant}66`,
    },
    linhaEsquerda: {
      flex: 1,
      gap: 2,
    },
    linhaDireita: {
      alignItems: 'flex-end',
    },
    periodo: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.onSurface,
    },
    detalhe: {
      fontSize: 12,
      color: colors.onSurfaceVariant,
    },
    valor: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.onSurface,
    },
    valorAtual: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
    },
    avisos: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    aviso: {
      flexShrink: 1,
      fontSize: 11,
      color: colors.onSurfaceVariant,
    },
    carregando: {
      paddingVertical: 12,
    },
    calculando: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    vazio: {
      fontSize: 13,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
      paddingVertical: 8,
    },
    nota: {
      fontSize: 11,
      color: colors.onSurfaceVariant,
      fontStyle: 'italic',
    },
  });
