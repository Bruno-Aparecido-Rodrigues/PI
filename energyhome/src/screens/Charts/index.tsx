import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { AppHeader } from '../../components/AppHeader';
import { ChartCurve } from '../../components/ChartCurve';
import { styles } from './style';

const PERIODS = ['Hora', 'Dia', 'Mês'] as const;

const BREAKDOWN = [
  { label: 'Ar-condicionado', value: 45, color: colors.primary },
  { label: 'Cozinha', value: 22, color: colors.secondaryContainer },
  { label: 'Entretenimento', value: 18, color: colors.tertiaryContainer },
];

export function ChartsScreen() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('Mês');

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Análise de Consumo</Text>
            <Text style={styles.subtitle}>Um mergulho profundo no desempenho energético da sua casa.</Text>
          </View>
        </View>

        <View style={styles.periodSelector}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={[styles.periodButton, period === p && styles.periodButtonActive]}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.energyFlowCard}>
          <View style={styles.energyFlowHeader}>
            <Text style={styles.sectionTitle}>Fluxo de Energia</Text>
            <Text style={styles.sectionSubtitle}>Consumo vs. Período Anterior (kWh)</Text>
          </View>
          <ChartCurve height={180} path="M0,190 Q100,140 200,160 T400,110 T600,140 T800,100" />
          <View style={styles.axisRow}>
            {['00:00', '06:00', '12:00', '18:00', '23:59'].map((t) => (
              <Text key={t} style={styles.axisLabel}>{t}</Text>
            ))}
          </View>
        </View>

        <View style={styles.peakCard}>
          <Text style={styles.sectionTitle}>Pico de Uso</Text>
          <View style={styles.peakValueRow}>
            <Text style={styles.peakValue}>4.8</Text>
            <Text style={styles.peakUnit}>kWh</Text>
          </View>
          <View style={styles.peakTrendRow}>
            <MaterialIcons name="trending-up" size={16} color={colors.error} />
            <Text style={styles.peakTrendText}>12% a mais que ontem</Text>
          </View>

          <View style={styles.breakdownList}>
            {BREAKDOWN.map((item) => (
              <View key={item.label} style={styles.breakdownItem}>
                <View style={styles.breakdownLabelRow}>
                  <Text style={styles.breakdownLabel}>{item.label}</Text>
                  <Text style={styles.breakdownValue}>{item.value}%</Text>
                </View>
                <View style={styles.breakdownTrack}>
                  <View
                    style={[
                      styles.breakdownFill,
                      { width: `${item.value}%`, backgroundColor: item.color },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
