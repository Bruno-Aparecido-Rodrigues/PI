import { StyleSheet } from 'react-native';
import type { AppColors } from '../../constants/colors';

const FRAME_SIZE = 240;

// Ocupa a tela inteira. Escrito por extenso de propósito: o atalho
// StyleSheet.absoluteFillObject foi REMOVIDO no React Native 0.85 (vira
// undefined), o que deixava a câmera com tamanho zero = tela preta.
const fillScreen = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

// Recebe as cores do tema atual (claro/escuro). Ver src/theme/TemaContext.tsx
export const criarEstilos = (colors: AppColors) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    ...fillScreen,
  },
  overlay: {
    ...fillScreen,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.onPrimary,
  },
  hint: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onPrimary,
    textAlign: 'center',
    paddingHorizontal: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowRadius: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onPrimary,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: colors.onPrimaryContainer,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  permissionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
