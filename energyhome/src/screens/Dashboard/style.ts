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
});
