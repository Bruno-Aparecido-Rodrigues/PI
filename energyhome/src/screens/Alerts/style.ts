import { StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 16,
    gap: 20,
    paddingBottom: 32,
  },
  headerRow: {
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.onSurface,
  },
  subtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.onSurface,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    padding: 14,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  summaryValue: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.onSurface,
  },
  summaryNote: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    gap: 12,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
