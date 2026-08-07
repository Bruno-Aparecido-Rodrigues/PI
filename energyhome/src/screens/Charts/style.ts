import { StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  headerRow: {
    gap: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.onSurface,
  },
  subtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 4,
    alignSelf: 'flex-start',
  },
  periodButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  periodTextActive: {
    color: colors.primary,
  },
  energyFlowCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}4D`,
    padding: 20,
  },
  energyFlowHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  axisLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  peakCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}4D`,
    padding: 20,
  },
  peakValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
  },
  peakValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
  },
  peakUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  peakTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  peakTrendText: {
    fontSize: 13,
    color: colors.error,
  },
  breakdownList: {
    gap: 14,
    marginTop: 24,
  },
  breakdownItem: {
    gap: 6,
  },
  breakdownLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontSize: 14,
    color: colors.onSurface,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  breakdownTrack: {
    height: 8,
    borderRadius: 9999,
    backgroundColor: colors.surfaceContainerLow,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 9999,
  },
});
