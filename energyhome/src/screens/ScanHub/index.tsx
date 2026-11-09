import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { criarEstilos } from './style';
import { useCores, useEstilos } from '../../theme/TemaContext';
import { useT } from '../../i18n/IdiomaContext';

interface ScanHubScreenProps {
  navigation: any;
}

/**
 * Tela cheia com a câmera traseira lendo o QR Code da etiqueta do hub.
 *
 * É uma tela própria (e não um Modal) de propósito: no Android, a câmera
 * dentro de um Modal fica com a imagem preta (o preview é desenhado atrás
 * da janela do Modal), mesmo continuando a ler o QR.
 *
 * Ao ler, volta pra tela "Adicionar Dispositivo" levando o texto lido nos
 * parâmetros da navegação (scannedData); quem interpreta é a AddDevice.
 */
export function ScanHubScreen({ navigation }: ScanHubScreenProps) {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  const t = useT();
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();

  // A câmera dispara onBarcodeScanned várias vezes por segundo enquanto o
  // QR está na frente dela. Essa trava garante que só a primeira leitura conta.
  const alreadyScanned = useRef(false);

  useEffect(() => {
    if (isFocused) alreadyScanned.current = false;
  }, [isFocused]);

  // Pede a permissão automaticamente na primeira vez que a tela abre.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted]);

  function handleBarcodeScanned({ data }: BarcodeScanningResult) {
    if (alreadyScanned.current) return;
    alreadyScanned.current = true;

    const params = { scannedData: data, scannedAt: Date.now() };
    if (typeof navigation.popTo === 'function') {
      navigation.popTo('AddDevice', params);
    } else {
      navigation.navigate({ name: 'AddDevice', params, merge: true });
    }
  }

  function renderContent() {
    if (!permission) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.onPrimary} />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.centered}>
          <MaterialIcons name="photo-camera" size={48} color={colors.onPrimary} />
          <Text style={styles.permissionTitle}>{t('qr.permTitulo')}</Text>
          <Text style={styles.permissionText}>{t('qr.permTexto')}</Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
          >
            <Text style={styles.permissionButtonText}>
              {permission.canAskAgain ? t('qr.permitir') : t('qr.abrirConfig')}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        {/* Só liga a câmera enquanto esta tela está visível. */}
        {isFocused ? (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
        ) : null}
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.frame} />
          <Text style={styles.hint}>{t('qr.dica')}</Text>
        </View>
      </>
    );
  }

  return (
    <View style={styles.screen}>
      {renderContent()}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
        accessibilityLabel={t('qr.fechar')}
      >
        <MaterialIcons name="close" size={26} color={colors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}
