import { StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    padding: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  description: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  tagNeutral: {
    backgroundColor: colors.surfaceContainerLow,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tagTextNeutral: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
});
