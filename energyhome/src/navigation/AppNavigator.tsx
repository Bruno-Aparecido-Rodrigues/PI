import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSemInternet } from '../hooks/useSemInternet';
import { NavigationContainer, useNavigationContainerRef, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { User } from 'firebase/auth';

import { LoginScreen } from '../screens/Login';
import { RegisterScreen } from '../screens/Register';
import { ForgotPasswordScreen } from '../screens/ForgotPassword';
import { AddDeviceScreen } from '../screens/AddDevice';
import { ScanHubScreen } from '../screens/ScanHub';
import { DashboardScreen } from '../screens/Dashboard';
import { ChartsScreen } from '../screens/Charts';
import { AlertsScreen } from '../screens/Alerts';
import { SettingsScreen } from '../screens/Settings';
import { BottomNav } from '../components/BottomNav';
import { subscribeToAuthChanges } from '../services/authIntegration';
import { getUserHubs } from '../services/hubPairing';
import { aoTocarNotificacao } from '../services/pushNotifications';
import { useCores, useTema } from '../theme/TemaContext';
import { useT } from '../i18n/IdiomaContext';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomNav {...props} />}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Charts" component={ChartsScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Checagem de login ("auth gate")
//
// O app tem dois conjuntos de telas e mostra só um deles por vez:
//  - sem sessão: Login, Cadastro, Esqueci a senha;
//  - com sessão: as abas do app, Adicionar Dispositivo e o leitor de QR.
// Quando a pessoa entra ou sai da conta, o Firebase avisa
// (subscribeToAuthChanges) e o app troca de conjunto sozinho — as telas não
// precisam navegar pra "Login" ou "MainTabs" manualmente.
//
// Só conta como logado quem tem o e-mail verificado: o login com e-mail e
// senha entra na conta e sai na hora se o e-mail não foi confirmado (e o
// cadastro também entra rapidinho pra mandar o e-mail de confirmação). Sem
// esse filtro, a tela piscaria pro app e voltaria pro Login, perdendo a
// mensagem de erro. Contas do Google já vêm com o e-mail verificado.
// ─────────────────────────────────────────────────────────────────────────

type AuthState =
  | { status: 'carregando' }
  | { status: 'deslogado' }
  | { status: 'logado'; uid: string; temHub: boolean };

function contaValida(user: User | null): user is User {
  return !!user && user.emailVerified;
}

function useAuthState(): AuthState {
  const [estado, setEstado] = useState<AuthState>({ status: 'carregando' });

  useEffect(() => {
    let cancelado = false;
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      if (!contaValida(user)) {
        if (!cancelado) setEstado({ status: 'deslogado' });
        return;
      }
      // Abre direto em "Adicionar Dispositivo" se a conta ainda não tem hub.
      setEstado({ status: 'carregando' });
      let temHub = true;
      try {
        // Sem internet o Firebase não responde nem dá erro: espera no máximo
        // 6 s e abre no Dashboard, que mostra o aviso de "sem conexão".
        const hubs = await Promise.race([
          getUserHubs(user.uid),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
        ]);
        if (hubs) temHub = hubs.length > 0;
      } catch {
        // erro de rede: segue pro Dashboard
      }
      if (!cancelado) setEstado({ status: 'logado', uid: user.uid, temHub });
    });
    return () => {
      cancelado = true;
      unsubscribe();
    };
  }, []);

  return estado;
}

export function AppNavigator() {
  const colors = useCores();
  const { escuro } = useTema();
  const t = useT();
  const semInternet = useSemInternet();
  // Fundo das telas e das transições no tema atual (sem piscar branco no escuro)
  const base = escuro ? DarkTheme : DefaultTheme;
  const temaNavegacao = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.onSurface,
      border: colors.outlineVariant,
    },
  };
  const auth = useAuthState();
  const navigationRef = useNavigationContainerRef<any>();
  const [navegacaoPronta, setNavegacaoPronta] = useState(false);
  const logado = auth.status === 'logado';

  // A tela de carregamento desmonta a navegação; o onReady avisa de novo
  useEffect(() => {
    if (auth.status === 'carregando') setNavegacaoPronta(false);
  }, [auth.status]);

  // Tocar numa notificação de alerta abre a aba Alertas (também quando a
  // notificação é que abriu o app). Só com a conta logada e a navegação
  // montada.
  useEffect(() => {
    if (!logado || !navegacaoPronta) return;
    return aoTocarNotificacao(() => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('MainTabs', { screen: 'Alerts' });
      }
    });
  }, [logado, navegacaoPronta, navigationRef]);

  if (auth.status === 'carregando') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.primary} />
        {semInternet ? (
          <View style={{ alignItems: 'center', marginTop: 20, paddingHorizontal: 32, gap: 6 }}>
            <MaterialIcons name="wifi-off" size={28} color={colors.error} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.onSurface }}>{t('comum.semInternet')}</Text>
            <Text style={{ fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'center' }}>
              {t('comum.semInternetTentando')}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={temaNavegacao} onReady={() => setNavegacaoPronta(true)}>
      {auth.status === 'deslogado' ? (
        <RootStack.Navigator key="deslogado" screenOptions={{ headerShown: false }} initialRouteName="Login">
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen name="Register" component={RegisterScreen} />
          <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </RootStack.Navigator>
      ) : (
        <RootStack.Navigator
          // key com o uid: trocar de conta recomeça a navegação do zero
          key={`logado-${auth.uid}`}
          screenOptions={{ headerShown: false }}
          initialRouteName={auth.temHub ? 'MainTabs' : 'AddDevice'}
        >
          <RootStack.Screen name="MainTabs" component={MainTabs} />
          <RootStack.Screen name="AddDevice" component={AddDeviceScreen} />
          <RootStack.Screen
            name="ScanHub"
            component={ScanHubScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
        </RootStack.Navigator>
      )}
    </NavigationContainer>
  );
}
