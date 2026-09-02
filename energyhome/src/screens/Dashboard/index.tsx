import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { colors } from '../../constants/colors';
import { AppHeader } from '../../components/AppHeader';
import { PowerUsageCard } from '../../components/PowerUsageCard';
import { BillEstimateCard } from '../../components/BillEstimateCard';
import { StatCard } from '../../components/StatCard';
import { useEnergyData } from '../../hooks/useEnergyData';
import { styles } from './style';

interface DashboardScreenProps {
  navigation: any;
}

export function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { currentWatts, todayKwh, monthKwh, estimatedBill, tariff, peakWatts } = useEnergyData();

  const hasCurrentReading = currentWatts !== null;
  const projectedBill = estimatedBill * 1.3; // estimativa simples até o fim do mês
  const progressPercent = projectedBill > 0 ? Math.min(100, (estimatedBill / projectedBill) * 100) : 0;

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.welcomeRow}>
          <View>
            <Text style={styles.welcomeSubtitle}>Bem-vindo de volta</Text>
            <Text style={styles.welcomeTitle}>Visão Geral</Text>
          </View>
        </View>

        <PowerUsageCard
          watts={hasCurrentReading ? Math.round(currentWatts!) : 0}
          comparisonLabel={hasCurrentReading ? 'Leitura em tempo real do Hub' : 'Aguardando leitura do Hub…'}
          trendDown
        />

        <BillEstimateCard
          currentValue={estimatedBill.toFixed(2).replace('.', ',')}
          projectedValue={`R$ ${projectedBill.toFixed(2).replace('.', ',')}`}
          billingCycleLabel={`Tarifa atual: R$ ${tariff.toFixed(2).replace('.', ',')}/kWh`}
          progressPercent={progressPercent}
          onViewForecast={() => navigation.navigate('Charts')}
        />

        <View style={styles.statsRow}>
          <StatCard
            icon="today"
            iconBackground={colors.secondaryFixed}
            iconColor={colors.onSecondaryFixed}
            label="Hoje"
            value={todayKwh.toFixed(1)}
            unit="kWh"
          />
          <StatCard
            icon="calendar-month"
            iconBackground={colors.primaryFixed}
            iconColor={colors.onPrimaryFixed}
            label="Este Mês"
            value={monthKwh.toFixed(1)}
            unit="kWh"
          />
          <StatCard
            icon="speed"
            iconBackground={colors.surfaceVariant}
            iconColor={colors.primary}
            label="Pico de Demanda"
            value={(peakWatts / 1000).toFixed(2)}
            unit="kW"
          />
        </View>
      </ScrollView>
    </View>
  );
}
