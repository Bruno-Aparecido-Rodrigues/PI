import { StyleSheet } from 'react-native';
import type { AppColors } from '../../constants/colors';

// Recebe as cores do tema atual (claro/escuro). Ver src/theme/TemaContext.tsx
export const criarEstilos = (colors: AppColors) =>
  StyleSheet.create({
  container: {
    minHeight: 84,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusPillOnline: {
    backgroundColor: `${colors.tertiary}1A`,
  },
  statusPillOffline: {
    backgroundColor: `${colors.error}1A`,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotOnline: {
    backgroundColor: colors.tertiary,
  },
  statusDotOffline: {
    backgroundColor: colors.error,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextOnline: {
    color: colors.tertiary,
  },
  statusTextOffline: {
    color: colors.error,
  },
  // Celular sem internet: não dá pra saber como o hub está
  statusPillDesconhecido: {
    backgroundColor: `${colors.outline}26`,
  },
  statusDotDesconhecido: {
    backgroundColor: colors.outline,
  },
  statusTextDesconhecido: {
    color: colors.onSurfaceVariant,
  },
});
