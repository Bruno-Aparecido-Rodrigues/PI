import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { getCurrentUser } from '../../services/authIntegration';
import { pairHub, normalizeHubId } from '../../services/hubPairing';
import { styles } from './style';

interface AddDeviceScreenProps {
  navigation: any;
}

export function AddDeviceScreen({ navigation }: AddDeviceScreenProps) {
  const [hubId, setHubId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handlePair() {
    setErrorMessage('');
    const user = getCurrentUser();

    if (!user) {
      setErrorMessage('Sessão expirada. Faça login novamente.');
      return;
    }

    if (!hubId.trim()) {
      setErrorMessage('Digite o ID do dispositivo (endereço MAC do ESP32).');
      return;
    }

    setLoading(true);
    try {
      await pairHub(user.uid, hubId);
      navigation.replace('MainTabs');
    } catch (error: any) {
      setErrorMessage(error?.message ?? 'Não foi possível parear o dispositivo. Tente novamente.');
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.title}>Adicionar Dispositivo</Text>
          <Text style={styles.subtitle}>
            Digite o ID do seu hub (o endereço MAC do ESP32) pra vincular à sua conta.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>ID do Dispositivo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: A4:CF:12:3B:9E:01"
              placeholderTextColor={colors.outline}
              autoCapitalize="characters"
              value={hubId}
              onChangeText={(text) => setHubId(text)}
            />
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <TouchableOpacity style={styles.submitButton} onPress={handlePair} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.submitButtonText}>Parear Dispositivo</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            O ID fica visível no Serial Monitor do Arduino IDE na primeira vez que o ESP32 liga.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
