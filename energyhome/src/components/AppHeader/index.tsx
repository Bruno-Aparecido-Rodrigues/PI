import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { styles } from './style';

interface AppHeaderProps {
  hubOnline?: boolean;
}

export function AppHeader({ hubOnline = true }: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.left}>
        <MaterialIcons name="bolt" size={22} color={colors.primary} />
        <Text style={styles.brandText}>A.C.D.C</Text>
      </View>

      <View style={styles.right}>
        {hubOnline && (
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Hub Conectado</Text>
          </View>
        )}
      </View>
    </View>
  );
}

