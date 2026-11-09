import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getCurrentUser, logout } from '../../services/authIntegration';
import { pairHub, parseHubQrCode } from '../../services/hubPairing';
import { criarEstilos } from './style';
import { useCores, useEstilos } from '../../theme/TemaContext';
import { useT } from '../../i18n/IdiomaContext';

interface AddDeviceScreenProps {
  navigation: any;
  /** scannedData/scannedAt chegam da tela ScanHub depois de ler um QR Code. */
  route: { params?: { scannedData?: string; scannedAt?: number } };
}

/** Mostra o ID no formato de MAC (02:A7:3C:91:5E:48), mais fácil de conferir. */
function formatAsMac(hubId: string): string {
  return hubId.match(/.{1,2}/g)?.join(':') ?? hubId;
}

export function AddDeviceScreen({ navigation, route }: AddDeviceScreenProps) {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  const t = useT();
  const [hubId, setHubId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Quando a tela de leitura (ScanHub) volta com um QR lido, processa uma vez
  // e limpa o parâmetro (pra não reprocessar se a tela renderizar de novo).
  const scannedAt = route.params?.scannedAt;
  useEffect(() => {
    const scannedData = route.params?.scannedData;
    if (!scannedAt || scannedData === undefined) return;
    navigation.setParams({ scannedData: undefined, scannedAt: undefined });
    handleQrScanned(scannedData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannedAt]);

  async function pair(rawHubId: string) {
    setErrorMessage('');
    const user = getCurrentUser();

    if (!user) {
      setErrorMessage(t('parear.sessaoExpirada'));
      return;
    }

    if (!rawHubId.trim()) {
      setErrorMessage(t('parear.digiteId'));
      return;
    }

    setLoading(true);
    try {
      await pairHub(user.uid, rawHubId);
      navigation.replace('MainTabs');
    } catch (error: any) {
      setErrorMessage(error?.message ?? t('parear.erro'));
    } finally {
      setLoading(false);
    }
  }

  function handleQrScanned(data: string) {
    const scannedHubId = parseHubQrCode(data);
    if (!scannedHubId) {
      setErrorMessage(t('parear.qrInvalido'));
      return;
    }

    // Preenche o campo (pra pessoa ver qual ID foi lido) e já pareia direto.
    setHubId(formatAsMac(scannedHubId));
    pair(scannedHubId);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <MaterialIcons name="sensors" size={26} color={colors.onPrimary} />
          </View>
          <Text style={styles.title}>{t('parear.titulo')}</Text>
          <Text style={styles.subtitle}>{t('parear.subtitulo')}</Text>
        </View>

        <View style={styles.form}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => {
              setErrorMessage('');
              navigation.navigate('ScanHub');
            }}
            disabled={loading}
          >
            <MaterialIcons name="qr-code-scanner" size={22} color={colors.onPrimary} />
            <Text style={styles.scanButtonText}>{t('parear.escanear')}</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('parear.ouDigite')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('parear.idLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('parear.idPlaceholder')}
              placeholderTextColor={colors.outline}
              autoCapitalize="characters"
              value={hubId}
              onChangeText={(text) => setHubId(text)}
            />
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <TouchableOpacity style={styles.submitButton} onPress={() => pair(hubId)} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.submitButtonText}>{t('parear.parear')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('parear.rodape')}</Text>
        </View>

        {/* Esta tela pode ser a primeira do app (conta ainda sem hub), então
            precisa de uma saída: pular pro Dashboard ou sair da conta. */}
        <View style={styles.labelRow}>
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.replace('MainTabs'))}
            disabled={loading}
          >
            <Text style={styles.link}>{navigation.canGoBack() ? t('parear.voltar') : t('parear.pular')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => logout()} disabled={loading}>
            <Text style={styles.link}>{t('parear.sair')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
