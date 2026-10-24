import { StyleSheet } from 'react-native';
import type { AppColors } from '../../constants/colors';

// Recebe as cores do tema atual (claro/escuro). Ver src/theme/TemaContext.tsx
export const criarEstilos = (colors: AppColors) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  welcomeRow: {
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
