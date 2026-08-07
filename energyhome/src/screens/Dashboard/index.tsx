import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { colors } from '../../constants/colors';
import { AppHeader } from '../../components/AppHeader';
import { PowerUsageCard } from '../../components/PowerUsageCard';
import { BillEstimateCard } from '../../components/BillEstimateCard';
import { StatCard } from '../../components/StatCard';
import { styles } from './style';

export function DashboardScreen() {
  const [power, setPower] = useState(1920);

  useEffect(() => {
    const interval = setInterval(() => {
      setPower((prev) => prev + (Math.floor(Math.random() * 21) - 10));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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

        <PowerUsageCard watts={power} comparisonLabel="12% menor que ontem" trendDown />

        <BillEstimateCard
          currentValue="142,50"
          projectedValue="R$ 184,00"
          billingCycleLabel="Ciclo atual de faturamento: 1 - 31"
          progressPercent={75}
        />

        <View style={styles.statsRow}>
          <StatCard
            icon="today"
            iconBackground={colors.secondaryFixed}
            iconColor={colors.onSecondaryFixed}
            label="Hoje"
            value="18.4"
            unit="kWh"
          />
          <StatCard
            icon="calendar-month"
            iconBackground={colors.primaryFixed}
            iconColor={colors.onPrimaryFixed}
            label="Este Mês"
            value="452.1"
            unit="kWh"
          />
          <StatCard
            icon="speed"
            iconBackground={colors.surfaceVariant}
            iconColor={colors.primary}
            label="Pico de Demanda"
            value="3.8"
            unit="kW"
          />
        </View>
      </ScrollView>
    </View>
  );
}
