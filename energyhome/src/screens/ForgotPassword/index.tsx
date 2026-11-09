import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { resetPassword } from '../../services/authIntegration';
import { criarEstilos } from './style';
import { useCores, useEstilos } from '../../theme/TemaContext';
import { useT } from '../../i18n/IdiomaContext';

interface ForgotPasswordScreenProps {
  navigation: any;
}

export function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  const t = useT();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  async function handleSendReset() {
    setErrorMessage('');
    setInfoMessage('');

    if (!email) {
      setErrorMessage(t('senha.digiteEmail'));
      return;
    }

    setLoading(true);
    const result = await resetPassword(email);
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.message);
      return;
    }

    setInfoMessage(t('senha.enviado'));
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <MaterialIcons name="lock-reset" size={26} color={colors.onPrimary} />
          </View>
          <Text style={styles.title}>{t('senha.titulo')}</Text>
          <Text style={styles.subtitle}>{t('senha.subtitulo')}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>{t('comum.email')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('comum.emailPlaceholder')}
              placeholderTextColor={colors.outline}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!infoMessage}
            />
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {infoMessage ? <Text style={styles.infoText}>{infoMessage}</Text> : null}

          {!infoMessage && (
            <TouchableOpacity style={styles.submitButton} onPress={handleSendReset} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.submitButtonText}>{t('senha.enviar')}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.footerLink}>{t('senha.voltar')}</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
