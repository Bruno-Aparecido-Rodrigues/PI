import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { login, loginWithGoogleIdToken } from '../../services/authIntegration';
import { signInWithGoogle } from '../../services/googleSignIn';
import { getUserHubs } from '../../services/hubPairing';
import { styles } from './style';

interface LoginScreenProps {
  navigation: any;
}

export function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  async function goToAppOrPairing(uid: string) {
    const hubs = await getUserHubs(uid);
    navigation.replace(hubs.length > 0 ? 'MainTabs' : 'AddDevice');
  }

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
        return;
      }

      await goToAppOrPairing(result.user.uid);
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleLogin() {
    setErrorMessage('');
    setInfoMessage('');

    if (!email || !password) {
      setErrorMessage('Preencha e-mail e senha para continuar.');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.message);
      return;
    }

    await goToAppOrPairing(result.user.uid);
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
          <Text style={styles.subtitle}>Monitoramento de precisão para sua casa</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="nome@empresa.com"
              placeholderTextColor={colors.outline}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Senha</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.link}>Esqueceu a senha?</Text>
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
              <Text style={styles.submitButtonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.onSurfaceVariant} />
            ) : (
              <>
                <MaterialCommunityIcons name="google" size={18} color="#EA4335" />
                <Text style={styles.googleButtonText}>Entrar com Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Não tem uma conta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Criar Conta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
