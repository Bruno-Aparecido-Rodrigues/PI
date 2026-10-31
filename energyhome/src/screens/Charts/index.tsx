import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppHeader } from '../../components/AppHeader';
import { BarChart, BarChartDatum } from '../../components/BarChart';
import { useCurrentHub } from '../../hooks/useCurrentHub';
import {
  subscribeToReadingsSince,
  startOfDaysAgoMs,
  inicioDoHistorico,
  bucketKwhByDay,
  bucketKwhByHourToday,
  averageWattsByHourOfDay,
  PowerReading,
} from '../../services/energyData';
import { ConfigTarifa, subscribeToConfigTarifa, TARIFA_PADRAO } from '../../services/tarifa';
import { periodoAtual, diaMes } from '../../services/ciclo';
import { criarEstilos } from './style';
import { useCores, useEstilos } from '../../theme/TemaContext';
import { useRecarregar } from '../../hooks/useRecarregar';

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

/** Dias do período da conta (ciclo ou mês) até hoje. */
function daysSince(inicio: number): Date[] {
  const days: Date[] = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const d = new Date(inicio);
  d.setHours(0, 0, 0, 0);
  while (d.getTime() <= hoje.getTime()) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function ChartsConteudo({
  navigation,
  refreshControl,
}: { navigation: any } & { refreshControl: React.ReactElement<any> }) {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  const { hubId, loading: hubLoading } = useCurrentHub();
  const [period, setPeriod] = useState<PeriodId>('week');
  const [readings, setReadings] = useState<PowerReading[]>([]);
  const [config, setConfig] = useState<ConfigTarifa | null>(null);

  // Tarifa final e ciclo da conta (os mesmos do Dashboard)
  useEffect(() => {
    if (!hubId) return;
    return subscribeToConfigTarifa(hubId, setConfig);
  }, [hubId]);

  const tariff = config?.tariff ?? TARIFA_PADRAO;
  const periodo = periodoAtual(config?.ciclo ?? null);
  const ciclo = periodo.tipo === 'ciclo';

  // Uma assinatura só, do mesmo período do Dashboard (dividem o download):
  // cobre o ciclo/mês e os últimos 7 dias. Trocar de aba não baixa de novo,
  // só filtra o que já está no celular.
  // (memorizado: não muda à meia-noite, só quando o período muda)
  const temConfig = config !== null;
  const desde = useMemo(
    () => (temConfig ? inicioDoHistorico(periodo.inicio) : null),
    [temConfig, periodo.inicio]
  );
  useEffect(() => {
    if (!hubId || desde === null) return;
    return subscribeToReadingsSince(hubId, desde, setReadings);
  }, [hubId, desde]);

  const profileReadings = useMemo(() => {
    const inicio = startOfDaysAgoMs(6);
    return readings.filter((r) => r.timestamp >= inicio);
  }, [readings]);

  const kwhData: BarChartDatum[] = useMemo(() => {
    if (period === 'today') {
      const hourly = bucketKwhByHourToday(readings);
      const currentHour = new Date().getHours();
      return hourly.slice(0, currentHour + 1).map((value, hour) => ({
        label: `${hour}h`,
        value,
      }));
    }

    const days = period === 'week' ? buildDayList(7) : daysSince(periodo.inicio);
    const values = bucketKwhByDay(readings, days);
    return days.map((day, i) => ({
      label: period === 'week' ? WEEKDAY_LABELS[day.getDay()] : String(day.getDate()),
      value: values[i],
    }));
  }, [readings, period, periodo.inicio]);

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
      <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
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
              <Text style={[styles.periodText, period === p.id && styles.periodTextActive]}>
                {p.id === 'month' && ciclo ? 'Ciclo' : p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Consumo de Energia</Text>
            <Text style={styles.sectionValue}>{totalKwh.toFixed(1)} kWh</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            {period === 'today'
              ? 'Por hora, hoje'
              : period === 'week'
                ? 'Por dia, últimos 7 dias'
                : ciclo
                  ? `Por dia, ciclo de ${diaMes(periodo.inicio)} a ${diaMes(periodo.fim)}`
                  : 'Por dia, este mês'}
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

// Arrastar pra baixo no topo da tela recarrega (ver hooks/useRecarregar)
export function ChartsScreen(props: { navigation: any }) {
  const { chave, refreshControl } = useRecarregar();
  return <ChartsConteudo key={chave} {...props} refreshControl={refreshControl} />;
}
