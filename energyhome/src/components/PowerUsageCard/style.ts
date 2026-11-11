import { StyleSheet } from 'react-native';
import type { AppColors } from '../../constants/colors';

// Recebe as cores do tema atual (claro/escuro). Ver src/theme/TemaContext.tsx
export const criarEstilos = (colors: AppColors) =>
  StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}33`,
    padding: 20,
    shadowColor: colors.primary,
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  liveBadge: {
    alignSelf: 'flex-end',
    backgroundColor: `${colors.primary}1A`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    marginBottom: 8,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    marginBottom: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  value: {
    fontSize: 44,
    fontWeight: '700',
    color: colors.primary,
  },
  unit: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  trendText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  // Hub desconectado
  offlineBadge: {
    backgroundColor: colors.errorContainer,
  },
  offlineBadgeText: {
    color: colors.onErrorContainer,
  },
  // Celular sem internet: situação do hub desconhecida (cinza)
  desconhecidoBadge: {
    backgroundColor: `${colors.outline}26`,
  },
  desconhecidoBadgeText: {
    color: colors.onSurfaceVariant,
  },
  valueOffline: {
    color: colors.outline,
  },
  // Altura mínima (não fixa): com o texto do aviso em 3-4 linhas, ou em
  // inglês, ou com a fonte do celular maior, a caixa cresce em vez de vazar
  offlineBox: {
    minHeight: 140,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 6,
  },
  offlineTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.onSurface,
  },
  offlineText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    color: colors.onSurfaceVariant,
  },
});
