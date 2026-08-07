import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { ChartCurve } from '../ChartCurve';
import { styles } from './style';

interface PowerUsageCardProps {
  watts: number;
  comparisonLabel: string;
  trendDown?: boolean;
}

export function PowerUsageCard({ watts, comparisonLabel, trendDown = true }: PowerUsageCardProps) {
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
        <MaterialIcons
          name={trendDown ? 'trending-down' : 'trending-up'}
          size={16}
          color={trendDown ? colors.tertiary : colors.error}
        />
        <Text style={[styles.trendText, { color: trendDown ? colors.tertiary : colors.error }]}>
          {comparisonLabel}
        </Text>
      </View>

      <ChartCurve height={140} />
    </View>
  );
}
