import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { criarEstilos } from './style';
import { useCores, useEstilos } from '../../theme/TemaContext';
import { useT } from '../../i18n/IdiomaContext';
import type { Chave } from '../../i18n';

const ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Dashboard: 'dashboard',
  Charts: 'bar-chart',
  Alerts: 'notifications',
  Settings: 'settings',
};

const LABELS: Record<string, Chave> = {
  Dashboard: 'nav.inicio',
  Charts: 'nav.graficos',
  Alerts: 'nav.alertas',
  Settings: 'nav.ajustes',
};

export function BottomNav({ state, navigation }: BottomTabBarProps) {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  const insets = useSafeAreaInsets();
  const t = useT();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]}>
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
              {LABELS[route.name] ? t(LABELS[route.name]) : route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
