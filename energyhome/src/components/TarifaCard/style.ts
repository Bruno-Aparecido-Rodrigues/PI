import { StyleSheet } from 'react-native';
import type { AppColors } from '../../constants/colors';

// Recebe as cores do tema atual (claro/escuro). Ver src/theme/TemaContext.tsx
export const criarEstilos = (colors: AppColors) =>
  StyleSheet.create({
  card: {
    backgroundColor: `${colors.surfaceContainerLowest}E6`,
    borderRadius: 12,
    padding: 16,
    gap: 14,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  switchTextos: {
    flex: 1,
    gap: 2,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  label: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  hint: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  seletor: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  seletorValor: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
    marginTop: 2,
  },
  caixaAneel: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  linhaCarregando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linhaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  infoRotulo: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    flexShrink: 1,
  },
  infoValor: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  linhaCampos: {
    flexDirection: 'row',
    gap: 12,
  },
  campoMetade: {
    flex: 1,
    gap: 6,
  },
  campo: {
    gap: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.onSurface,
  },
  inputComPrefixo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  prefixo: {
    fontSize: 15,
    color: colors.onSurfaceVariant,
    marginRight: 6,
  },
  inputSemBorda: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.onSurface,
  },
  resultado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: `${colors.outlineVariant}4D`,
  },
  resultadoRotulo: {
    flex: 1,
    fontSize: 14,
    color: colors.onSurface,
  },
  resultadoValor: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  erro: {
    fontSize: 13,
    color: colors.error,
  },
  mensagem: {
    fontSize: 13,
    color: colors.tertiary,
  },
  botao: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botaoTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalCaixa: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 12,
    maxHeight: '75%',
  },
  modalTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLista: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.outlineVariant}4D`,
  },
  itemTexto: {
    fontSize: 15,
    color: colors.onSurface,
  },
  itemSelecionado: {
    fontWeight: '700',
    color: colors.primary,
  },
});
