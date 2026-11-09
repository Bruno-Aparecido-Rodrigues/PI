import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { login, loginWithGoogleIdToken } from '../../services/authIntegration';
import { signInWithGoogle } from '../../services/googleSignIn';
import { criarEstilos } from './style';
import { useCores, useEstilos, useTema } from '../../theme/TemaContext';
import { useT } from '../../i18n/IdiomaContext';

interface LoginScreenProps {
  navigation: any;
}

export function LoginScreen({ navigation }: LoginScreenProps) {
  const styles = useEstilos(criarEstilos);
  const { escuro } = useTema();
  const colors = useCores();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Depois de entrar, não precisa navegar: o AppNavigator percebe a sessão
  // nova e troca sozinho pras telas do app (Dashboard, ou Adicionar
  // Dispositivo se a conta ainda não tiver hub).

  async function handleGoogleLogin() {
    setErrorMessage('');
    setInfoMessage('');
    setGoogleLoading(true);

    try {
      // 1) Seletor de contas do Google → idToken
      const google = await signInWithGoogle();
      if (google.status === 'cancelled') return;
      if (google.status === 'error') {
        setErrorMessage(google.message);
        return;
      }

      // 2) idToken → conta no Firebase (cria na primeira vez, entra nas próximas)
      const result = await loginWithGoogleIdToken(google.idToken);
      if (!result.success) {
        setErrorMessage(result.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleLogin() {
    setErrorMessage('');
    setInfoMessage('');

    if (!email || !password) {
      setErrorMessage(t('login.preencha'));
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.message);
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
            <MaterialIcons name="bolt" size={26} color={colors.onPrimary} />
          </View>
          <Text style={styles.title}>A.C.D.C</Text>
          <Text style={styles.subtitle}>{t('login.subtitulo')}</Text>
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
            />
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{t('comum.senha')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.link}>{t('login.esqueceu')}</Text>
              </TouchableOpacity>
            </View>
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

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {infoMessage ? <Text style={styles.infoText}>{infoMessage}</Text> : null}

          <TouchableOpacity style={styles.submitButton} onPress={handleLogin} disabled={loading || googleLoading}>
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.submitButtonText}>{t('login.entrar')}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('login.ou')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, escuro && styles.googleButtonEscuro]}
            onPress={handleGoogleLogin}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.onSurfaceVariant} />
            ) : (
              <>
                {/* Logo oficial do Google (recortado do pacote de marca do Google, signin-assets.zip) */}
                <Image source={require('../../../assets/google-g.png')} style={styles.googleLogo} />
                <Text style={[styles.googleButtonText, escuro && styles.googleButtonTextEscuro]}>{t('login.google')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('login.semConta')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>{t('login.criarConta')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
