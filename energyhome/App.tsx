import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { subscribeToAuthChanges } from './src/services/authIntegration';
import { registerForPushNotifications } from './src/services/pushNotifications';
import { TemaProvider, useTema } from './src/theme/TemaContext';

// Ícones da barra de status do Android: escuros no tema claro e vice-versa
function BarraDeStatus() {
  const { escuro } = useTema();
  return <StatusBar style={escuro ? 'light' : 'dark'} />;
}

export default function App() {
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      // Só conta logada de verdade (e-mail confirmado) recebe alertas
      if (user?.emailVerified) {
        registerForPushNotifications(user.uid);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <SafeAreaProvider>
      <TemaProvider>
        <BarraDeStatus />
        <AppNavigator />
      </TemaProvider>
    </SafeAreaProvider>
  );
}
