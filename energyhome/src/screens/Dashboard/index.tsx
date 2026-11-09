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
import { useRecarregar } from '../../hooks/useRecarregar';
import { useT } from '../../i18n/IdiomaContext';
import { diaMesCurto, num, reais } from '../../i18n';

interface DashboardScreenProps {
  navigation: any;
}

function DashboardConteudo({
  navigation,
  refreshControl,
}: DashboardScreenProps & { refreshControl: React.ReactElement<any> }) {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  const t = useT();
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
    periodo,
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
          <Text style={styles.emptyTitle}>{t('comum.semHubTitulo')}</Text>
          <Text style={styles.emptySubtitle}>{t('inicio.semHubTexto')}</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('AddDevice')}>
            <Text style={styles.emptyButtonText}>{t('comum.adicionarDispositivo')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const hasCurrentReading = currentWatts !== null;
  // Barra de progresso: quanto da conta projetada do mês já foi consumido.
  const progressPercent =
    projectedBill !== null && projectedBill > 0 ? Math.min(100, (estimatedBill / projectedBill) * 100) : 0;
  const projectedValue = projectedBill !== null ? reais(projectedBill) : t('inicio.apos24h');
  // Com o ciclo da conta informado em Ajustes, a conta vai da última leitura
  // até a próxima; senão, é o mês do calendário.
  const ciclo = periodo.tipo === 'ciclo';
  const cicloLabel = ciclo ? t('inicio.ciclo', { inicio: diaMesCurto(periodo.inicio), fim: diaMesCurto(periodo.fim) }) : '';
  const projectedLabel = ciclo
    ? t('inicio.projetadoAte', { data: diaMesCurto(periodo.fim) }) + (periodo.estimado ? t('inicio.estimado') : '')
    : t('inicio.projetado');

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
        <View style={styles.welcomeRow}>
          <View>
            <Text style={styles.welcomeSubtitle}>{t('inicio.bemVindo')}</Text>
            <Text style={styles.welcomeTitle}>{t('inicio.visaoGeral')}</Text>
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
          currentValue={num(estimatedBill)}
          projectedValue={projectedValue}
          billingCycleLabel={
            cicloLabel +
            t('inicio.tarifa', { valor: reais(tariff) }) +
            (rotuloBandeira(bandeira) ? ` · ${rotuloBandeira(bandeira)}` : '')
          }
          projectedLabel={projectedLabel}
          progressPercent={progressPercent}
          onViewForecast={() => navigation.navigate('Charts')}
        />

        <View style={styles.statsRow}>
          <StatCard
            icon="today"
            iconBackground={colors.secondaryFixed}
            iconColor={colors.onSecondaryFixed}
            label={t('comum.hoje')}
            value={num(todayKwh, 1)}
            unit="kWh"
          />
          <StatCard
            icon="calendar-month"
            iconBackground={colors.primaryFixed}
            iconColor={colors.onPrimaryFixed}
            label={t(ciclo ? 'inicio.esteCiclo' : 'inicio.esteMes')}
            value={num(monthKwh, 1)}
            unit="kWh"
          />
          <StatCard
            icon="speed"
            iconBackground={colors.surfaceVariant}
            iconColor={colors.primary}
            label={t('inicio.pico')}
            value={num(peakWatts / 1000)}
            unit="kW"
          />
        </View>
      </ScrollView>
    </View>
  );
}

// Arrastar pra baixo no topo da tela recarrega (ver hooks/useRecarregar)
export function DashboardScreen(props: DashboardScreenProps) {
  const { chave, refreshControl } = useRecarregar();
  return <DashboardConteudo key={chave} {...props} refreshControl={refreshControl} />;
}
