import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { ChartCurve } from '../ChartCurve';
import { styles } from './style';

interface PowerUsageCardProps {
  watts: number;
  comparisonLabel: string;
  /** Consumo de agora comparado ao normal desse horário: acima (up), abaixo
   *  (down) ou dentro do normal / sem base de comparação (neutral). */
  trend?: 'up' | 'down' | 'neutral';
  /** Leituras recentes de Watts (mais antiga primeiro), pra desenhar a curva
   *  "ao vivo" com o dado real em vez de um traço decorativo fixo. */
  history?: number[];
}

const TREND_ICON = {
  up: 'trending-up',
  down: 'trending-down',
  neutral: 'trending-flat',
} as const;

const TREND_COLOR = {
  up: colors.error,
  down: colors.tertiary,
  neutral: colors.onSurfaceVariant,
};

export function PowerUsageCard({ watts, comparisonLabel, trend = 'neutral', history }: PowerUsageCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.liveBadge}>
        <Text style={styles.liveBadgeText}>LIVE</Text>
      </View>

      <Text style={styles.label}>Consumo Atual</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{watts}</Text>
        <Text style={styles.unit}>W</Text>
      </View>

      <View style={styles.trendRow}>
        <MaterialIcons name={TREND_ICON[trend]} size={16} color={TREND_COLOR[trend]} />
        <Text style={[styles.trendText, { color: TREND_COLOR[trend] }]}>
          {comparisonLabel}
        </Text>
      </View>

      <ChartCurve height={140} data={history} />
    </View>
  );
}
