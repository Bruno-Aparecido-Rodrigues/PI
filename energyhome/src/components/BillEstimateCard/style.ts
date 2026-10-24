import { StyleSheet } from 'react-native';
import type { AppColors } from '../../constants/colors';

// Recebe as cores do tema atual (claro/escuro). Ver src/theme/TemaContext.tsx
export const criarEstilos = (colors: AppColors) =>
  StyleSheet.create({
  container: {
    backgroundColor: colors.primaryContainer,
    borderRadius: 12,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: colors.onPrimaryContainer,
    opacity: 0.8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.onPrimaryContainer,
    opacity: 0.8,
  },
  value: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.onPrimaryContainer,
  },
  cycleLabel: {
    fontSize: 12,
    color: colors.onPrimaryContainer,
    opacity: 0.7,
    marginTop: 4,
  },
  projectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  projectedLabel: {
    fontSize: 14,
    color: colors.onPrimaryContainer,
  },
  projectedValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimaryContainer,
  },
  progressTrack: {
    height: 8,
    borderRadius: 9999,
    backgroundColor: `${colors.onPrimaryContainer}33`,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 9999,
    backgroundColor: '#ffffff',
  },
  button: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryContainer, // azul da marca (#0052ff) nos dois temas
  },
});
