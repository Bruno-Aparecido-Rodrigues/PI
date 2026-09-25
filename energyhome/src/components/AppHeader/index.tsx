import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { useCurrentHub } from '../../hooks/useCurrentHub';
import { useHubStatus } from '../../hooks/useHubStatus';
import { styles } from './style';

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const { hubId } = useCurrentHub();
  const { online } = useHubStatus(hubId);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.left}>
        <MaterialIcons name="bolt" size={22} color={colors.primary} />
        <Text style={styles.brandText}>A.C.D.C</Text>
      </View>

      <View style={styles.right}>
        {hubId && (
          <View style={[styles.statusPill, online ? styles.statusPillOnline : styles.statusPillOffline]}>
            <View style={[styles.statusDot, online ? styles.statusDotOnline : styles.statusDotOffline]} />
            <Text style={[styles.statusText, online ? styles.statusTextOnline : styles.statusTextOffline]}>
              {online ? 'Hub Conectado' : 'Hub Desconectado'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
