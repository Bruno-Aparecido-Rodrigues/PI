import { StyleSheet } from 'react-native';
import type { AppColors } from '../../constants/colors';

// Recebe as cores do tema atual (claro/escuro). Ver src/theme/TemaContext.tsx
export const criarEstilos = (colors: AppColors) =>
  StyleSheet.create({
  scrollContent: {
    alignItems: 'flex-end',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  barColumn: {
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginBottom: 4,
    height: 14,
  },
  barTrack: {
    height: 140,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 16,
    borderRadius: 6,
  },
  axisLabel: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 6,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
});
