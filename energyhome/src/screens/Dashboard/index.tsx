import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppHeader } from '../../components/AppHeader';
import { PowerUsageCard } from '../../components/PowerUsageCard';
import { BillEstimateCard } from '../../components/BillEstimateCard';
import { StatCard } from '../../components/StatCard';
import { useEnergyData } from '../../hooks/useEnergyData';
import { useCurrentHub } from '../../hooks/useCurrentHub';
import { useHubStatus } from '../../hooks/useHubStatus';
import { rotuloBandeira } from '../../services/contaMes';
import { criarEstilos } from './style';
import { useCores, useEstilos } from '../../theme/TemaContext';

interface DashboardScreenProps {
  navigation: any;
}

export function DashboardScreen({ navigation }: DashboardScreenProps) {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  const { hubId, loading: hubLoading } = useCurrentHub();
  const {
    currentWatts,
    wattsHistory,
    todayKwh,
    monthKwh,
    estimatedBill,
    projectedBill,
    tariff,
    bandeira,
    peakWatts,
    trend,
    trendLabel,
  } = useEnergyData(hubId);
  // Hub sem mandar leitura (desligado, sem energia ou sem Wi-Fi): o card ao
  // vivo mostra o aviso em vez do último valor, que já não vale mais.
  const hubStatus = useHubStatus(hubId);
  const hubOffline = hubStatus.loaded && !hubStatus.online;

  if (!hubLoading && !hubId) {
    return (
      <View style={styles.screen}>
        <AppHeader />
        <View style={styles.emptyState}>
          <MaterialIcons name="sensors-off" size={48} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>Nenhum dispositivo pareado</Text>
          <Text style={styles.emptySubtitle}>
            Adicione o seu hub pra começar a ver os dados de consumo aqui.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('AddDevice')}>
            <Text style={styles.emptyButtonText}>Adicionar Dispositivo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const hasCurrentReading = currentWatts !== null;
  // Barra de progresso: quanto da conta projetada do mês já foi consumido.
  const progressPercent =
    projectedBill !== null && projectedBill > 0 ? Math.min(100, (estimatedBill / projectedBill) * 100) : 0;
  const projectedValue =
    projectedBill !== null ? `R$ ${projectedBill.toFixed(2).replace('.', ',')}` : 'após 24h de medição';

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
          comparisonLabel={trendLabel}
          trend={trend}
          history={wattsHistory}
          offline={hubOffline}
          lastUpdatedAt={hubStatus.lastUpdatedAt}
        />

        <BillEstimateCard
          currentValue={estimatedBill.toFixed(2).replace('.', ',')}
          projectedValue={projectedValue}
          billingCycleLabel={
            `Tarifa: R$ ${tariff.toFixed(2).replace('.', ',')}/kWh` +
            (rotuloBandeira(bandeira) ? ` · ${rotuloBandeira(bandeira)}` : '')
          }
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
