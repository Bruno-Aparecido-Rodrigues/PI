import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
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
import { colors } from '../constants/colors';

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
        temHub = (await getUserHubs(user.uid)).length > 0;
      } catch {
        // Sem internet, por exemplo: abre no Dashboard, que lida com a falta de hub.
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
  const auth = useAuthState();

  if (auth.status === 'carregando') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
