import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { criarEstilos } from './style';
import { useCores, useEstilos } from '../../theme/TemaContext';
import { useT } from '../../i18n/IdiomaContext';

export interface BarChartDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartDatum[];
  barColor?: string;
  valueFormatter?: (value: number) => string;
  emptyLabel?: string;
}

const CHART_HEIGHT = 140;
const BAR_WIDTH = 40;

export function BarChart({
  data,
  barColor: barColorProp,
  valueFormatter = (v) => v.toFixed(1),
  emptyLabel,
}: BarChartProps) {
  const styles = useEstilos(criarEstilos);
  const t = useT();
  const colors = useCores();
  const barColor = barColorProp ?? colors.primary;
  const maxValue = Math.max(...data.map((d) => d.value), 0);

  if (maxValue === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyLabel ?? t('comum.semDados')}</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {data.map((datum, index) => {
        const barHeight = Math.max(4, (datum.value / maxValue) * CHART_HEIGHT);
        return (
          <View key={`${datum.label}-${index}`} style={[styles.barColumn, { width: BAR_WIDTH }]}>
            <Text style={styles.valueLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {datum.value > 0 ? valueFormatter(datum.value) : ''}
            </Text>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { height: barHeight, backgroundColor: barColor }]} />
            </View>
            <Text style={styles.axisLabel} numberOfLines={1}>
              {datum.label}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
