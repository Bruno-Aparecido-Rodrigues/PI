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
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.onSurface,
  },
  subtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: -8,
  },
  feedbackText: {
    fontSize: 13,
    color: colors.tertiary,
  },
  card: {
    backgroundColor: `${colors.surfaceContainerLowest}E6`,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  temaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
  },
  deviceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeBadge: {
    backgroundColor: colors.tertiaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onTertiaryFixed,
  },
  deviceList: {
    gap: 4,
  },
  addDeviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  addDeviceText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: `${colors.outlineVariant}4D`,
  },
  deviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  deviceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceLabel: {
    fontSize: 14,
    color: colors.onSurface,
  },
  deviceId: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  disconnectText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: `${colors.error}33`,
  },
  dangerText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  dangerErrorText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  dangerButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.error,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onError,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
});
