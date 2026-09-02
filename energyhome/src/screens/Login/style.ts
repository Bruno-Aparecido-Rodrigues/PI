import { StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}4D`,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.onBackground,
  },
  subtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  field: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurface,
  },
  link: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}80`,
    borderRadius: 8,
    fontSize: 15,
    color: colors.onSurface,
  },
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
  },
  infoText: {
    fontSize: 13,
    color: colors.tertiary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: `${colors.outlineVariant}80`,
  },
  dividerText: {
    fontSize: 12,
    color: colors.outline,
    textTransform: 'uppercase',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    paddingVertical: 12,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: `${colors.outlineVariant}4D`,
  },
  footerText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
