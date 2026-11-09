import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { register } from '../../services/authIntegration';
import { criarEstilos } from './style';
import { useCores, useEstilos } from '../../theme/TemaContext';
import { useT } from '../../i18n/IdiomaContext';

interface RegisterScreenProps {
  navigation: any;
}

export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  const t = useT();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [registered, setRegistered] = useState(false);

  async function handleRegister() {
    setErrorMessage('');

    if (!name || !email || !password || !confirmPassword) {
      setErrorMessage(t('cadastro.preencha'));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t('cadastro.senhasDiferentes'));
      return;
    }

    setLoading(true);
    const result = await register(email, password, name);
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.message);
      return;
    }

    setRegistered(true);
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
            <MaterialIcons name="bolt" size={26} color={colors.onPrimary} />
          </View>
          <Text style={styles.title}>{t('cadastro.titulo')}</Text>
          <Text style={styles.subtitle}>{t('cadastro.subtitulo')}</Text>
        </View>

        {registered ? ( // tela de email de confirmação
          <View style={styles.form}>
            <Text style={styles.infoText}>{t('cadastro.emailEnviado', { email })}</Text>
            <TouchableOpacity style={styles.submitButton} onPress={() => navigation.replace('Login')}>
              <Text style={styles.submitButtonText}>{t('cadastro.irLogin')}</Text>
            </TouchableOpacity>
          </View>
        ) : ( //formulário de registro
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>{t('cadastro.nome')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('cadastro.nomePlaceholder')}
                placeholderTextColor={colors.outline}
                value={name}
                onChangeText={setName}
              />
            </View>

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
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('comum.senha')}</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.outline}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color={colors.outline}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('cadastro.confirmarSenha')}</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.outline}
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <TouchableOpacity style={styles.submitButton} onPress={handleRegister} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.submitButtonText}>{t('cadastro.titulo')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('cadastro.jaTem')}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.footerLink}>{t('cadastro.fazerLogin')}</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
