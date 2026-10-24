import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppHeader } from '../../components/AppHeader';
import { BarChart, BarChartDatum } from '../../components/BarChart';
import { useCurrentHub } from '../../hooks/useCurrentHub';
import {
  subscribeToReadingsSince,
  getTariff,
  startOfTodayMs,
  startOfDaysAgoMs,
  startOfMonthMs,
  bucketKwhByDay,
  bucketKwhByHourToday,
  averageWattsByHourOfDay,
  PowerReading,
} from '../../services/energyData';
import { criarEstilos } from './style';
import { useCores, useEstilos } from '../../theme/TemaContext';

const PERIODS = [
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
] as const;

type PeriodId = (typeof PERIODS)[number]['id'];

const WEEKDAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function buildDayList(count: number): Date[] {
  const days: Date[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    days.push(date);
  }
  return days;
}

function daysInCurrentMonthSoFar(): Date[] {
  const now = new Date();
  const days: Date[] = [];
  for (let day = 1; day <= now.getDate(); day++) {
    days.push(new Date(now.getFullYear(), now.getMonth(), day));
  }
  return days;
}

export function ChartsScreen({ navigation }: { navigation: any }) {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  const { hubId, loading: hubLoading } = useCurrentHub();
  const [period, setPeriod] = useState<PeriodId>('week');
  const [readings, setReadings] = useState<PowerReading[]>([]);
  const [profileReadings, setProfileReadings] = useState<PowerReading[]>([]);
  const [tariff, setTariff] = useState(0.85);

  // Janela de leituras usada pelos gráficos de kWh/custo, de acordo com o período escolhido.
  useEffect(() => {
    if (!hubId) return;
    const since =
      period === 'today' ? startOfTodayMs() : period === 'week' ? startOfDaysAgoMs(6) : startOfMonthMs();
    const unsubscribe = subscribeToReadingsSince(hubId, since, setReadings);
    return unsubscribe;
  }, [period, hubId]);

  // Últimos 7 dias, sempre, pro gráfico de "Perfil de Consumo por Horário".
  useEffect(() => {
    if (!hubId) return;
    const unsubscribe = subscribeToReadingsSince(hubId, startOfDaysAgoMs(6), setProfileReadings);
    return unsubscribe;
  }, [hubId]);

  useEffect(() => {
    if (!hubId) return;
    getTariff(hubId).then(setTariff);
  }, [hubId]);

  const kwhData: BarChartDatum[] = useMemo(() => {
    if (period === 'today') {
      const hourly = bucketKwhByHourToday(readings);
      const currentHour = new Date().getHours();
      return hourly.slice(0, currentHour + 1).map((value, hour) => ({
        label: `${hour}h`,
        value,
      }));
    }

    const days = period === 'week' ? buildDayList(7) : daysInCurrentMonthSoFar();
    const values = bucketKwhByDay(readings, days);
    return days.map((day, i) => ({
      label: period === 'week' ? WEEKDAY_LABELS[day.getDay()] : String(day.getDate()),
      value: values[i],
    }));
  }, [readings, period]);

  const costData: BarChartDatum[] = useMemo(
    () => kwhData.map((d) => ({ label: d.label, value: d.value * tariff })),
    [kwhData, tariff]
  );

  const profileData: BarChartDatum[] = useMemo(() => {
    const avgWatts = averageWattsByHourOfDay(profileReadings);
    return avgWatts.map((value, hour) => ({ label: `${hour}h`, value }));
  }, [profileReadings]);

  const totalKwh = kwhData.reduce((sum, d) => sum + d.value, 0);
  const totalCost = costData.reduce((sum, d) => sum + d.value, 0);

  if (!hubLoading && !hubId) {
    return (
      <View style={styles.screen}>
        <AppHeader />
        <View style={styles.emptyState}>
          <MaterialIcons name="sensors-off" size={48} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>Nenhum dispositivo pareado</Text>
          <Text style={styles.emptySubtitle}>Adicione um hub pra ver os gráficos de consumo.</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('AddDevice')}>
            <Text style={styles.emptyButtonText}>Adicionar Dispositivo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Análise de Consumo</Text>
          <Text style={styles.subtitle}>Um mergulho no desempenho energético da sua casa.</Text>
        </View>

        <View style={styles.periodSelector}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => setPeriod(p.id)}
              style={[styles.periodButton, period === p.id && styles.periodButtonActive]}
            >
              <Text style={[styles.periodText, period === p.id && styles.periodTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Consumo de Energia</Text>
            <Text style={styles.sectionValue}>{totalKwh.toFixed(1)} kWh</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            {period === 'today' ? 'Por hora, hoje' : period === 'week' ? 'Por dia, últimos 7 dias' : 'Por dia, este mês'}
          </Text>
          <BarChart data={kwhData} valueFormatter={(v) => v.toFixed(1)} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Custo Estimado</Text>
            <Text style={styles.sectionValue}>R$ {totalCost.toFixed(2).replace('.', ',')}</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Consumo × tarifa atual (R$ {tariff.toFixed(2).replace('.', ',')}/kWh)</Text>
          <BarChart
            data={costData}
            barColor={colors.tertiary}
            valueFormatter={(v) => v.toFixed(1)}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Perfil de Consumo por Horário</Text>
          <Text style={styles.sectionSubtitle}>Potência média em cada hora do dia, últimos 7 dias</Text>
          <BarChart
            data={profileData}
            barColor={colors.secondary}
            valueFormatter={(v) => `${Math.round(v)}W`}
          />
        </View>
      </ScrollView>
    </View>
  );
}
