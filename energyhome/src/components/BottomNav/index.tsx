import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '../../constants/colors';
import { styles } from './style';

const ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Dashboard: 'dashboard',
  Charts: 'bar-chart',
  Alerts: 'notifications',
  Settings: 'settings',
};

const LABELS: Record<string, string> = {
  Dashboard: 'Início',
  Charts: 'Gráficos',
  Alerts: 'Alertas',
  Settings: 'Ajustes',
};

export function BottomNav({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const icon = ICONS[route.name] ?? 'circle';

        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={[styles.item, isFocused && styles.itemActive]}
          >
            <MaterialIcons
              name={icon}
              size={22}
              color={isFocused ? colors.onSecondaryFixed : colors.onSurfaceVariant}
            />
            <Text style={[styles.label, isFocused && styles.labelActive]}>
              {LABELS[route.name] ?? route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
