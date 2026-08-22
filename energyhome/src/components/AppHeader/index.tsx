import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { styles } from './style';

interface AppHeaderProps {
  hubOnline?: boolean;
}

export function AppHeader({ hubOnline = true }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <MaterialIcons name="bolt" size={22} color={colors.primary} />
        <Text style={styles.brandText}>EnergyHome</Text>
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

