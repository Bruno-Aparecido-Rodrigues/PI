import { StyleSheet } from 'react-native';
import type { AppColors } from '../../constants/colors';

// Recebe as cores do tema atual (claro/escuro). Ver src/theme/TemaContext.tsx
export const criarEstilos = (colors: AppColors) =>
  StyleSheet.create({
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
  // Botão no padrão "claro" das regras de marca do Google: fundo branco,
  // borda #747775 de 1px, texto #1F1F1F e o G sempre colorido.
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#747775',
    borderRadius: 8,
    paddingVertical: 12,
  },
  googleLogo: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F1F1F',
  },
  // Tema escuro: padrão "dark" das regras de marca do Google
  googleButtonEscuro: {
    backgroundColor: '#131314',
    borderColor: '#8E918F',
  },
  googleButtonTextEscuro: {
    color: '#E3E3E3',
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
