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
import { periodoAtual } from '../../services/ciclo';
import { criarEstilos } from './style';
import { useCores, useEstilos } from '../../theme/TemaContext';
import { useRecarregar } from '../../hooks/useRecarregar';
import { useT } from '../../i18n/IdiomaContext';
import { Chave, diaMesCurto, num, reais } from '../../i18n';

type PeriodId = 'today' | 'week' | 'month';

const PERIODS: readonly { id: PeriodId; label: Chave }[] = [
  { id: 'today', label: 'graf.hoje' },
  { id: 'week', label: 'graf.semana' },
  { id: 'month', label: 'graf.mes' },
];

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
  const t = useT();
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
        label: t('graf.hora', { h: hour }),
        value,
      }));
    }

    const days = period === 'week' ? buildDayList(7) : daysSince(periodo.inicio);
    const values = bucketKwhByDay(readings, days);
    const diasDaSemana = t('graf.diasSemana').split(',');
    return days.map((day, i) => ({
      label: period === 'week' ? diasDaSemana[day.getDay()] : String(day.getDate()),
      value: values[i],
    }));
  }, [readings, period, periodo.inicio, t]);

  const costData: BarChartDatum[] = useMemo(
    () => kwhData.map((d) => ({ label: d.label, value: d.value * tariff })),
    [kwhData, tariff]
  );

  const profileData: BarChartDatum[] = useMemo(() => {
    const avgWatts = averageWattsByHourOfDay(profileReadings);
    return avgWatts.map((value, hour) => ({ label: t('graf.hora', { h: hour }), value }));
  }, [profileReadings, t]);

  const totalKwh = kwhData.reduce((sum, d) => sum + d.value, 0);
  const totalCost = costData.reduce((sum, d) => sum + d.value, 0);

  if (!hubLoading && !hubId) {
    return (
      <View style={styles.screen}>
        <AppHeader />
        <View style={styles.emptyState}>
          <MaterialIcons name="sensors-off" size={48} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>{t('comum.semHubTitulo')}</Text>
          <Text style={styles.emptySubtitle}>{t('graf.semHubTexto')}</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('AddDevice')}>
            <Text style={styles.emptyButtonText}>{t('comum.adicionarDispositivo')}</Text>
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
          <Text style={styles.title}>{t('graf.titulo')}</Text>
          <Text style={styles.subtitle}>{t('graf.subtitulo')}</Text>
        </View>

        <View style={styles.periodSelector}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => setPeriod(p.id)}
              style={[styles.periodButton, period === p.id && styles.periodButtonActive]}
            >
              <Text style={[styles.periodText, period === p.id && styles.periodTextActive]}>
                {t(p.id === 'month' && ciclo ? 'graf.ciclo' : p.label)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>{t('graf.consumo')}</Text>
            <Text style={styles.sectionValue}>{num(totalKwh, 1)} kWh</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            {period === 'today'
              ? t('graf.porHora')
              : period === 'week'
                ? t('graf.ultimos7')
                : ciclo
                  ? t('graf.porCiclo', { inicio: diaMesCurto(periodo.inicio), fim: diaMesCurto(periodo.fim) })
                  : t('graf.porMes')}
          </Text>
          <BarChart data={kwhData} valueFormatter={(v) => num(v, 1)} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>{t('graf.custo')}</Text>
            <Text style={styles.sectionValue}>{reais(totalCost)}</Text>
          </View>
          <Text style={styles.sectionSubtitle}>{t('graf.custoSub', { valor: reais(tariff) })}</Text>
          <BarChart
            data={costData}
            barColor={colors.tertiary}
            valueFormatter={(v) => `R$${num(v, v < 10 ? 2 : 1)}`}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('graf.perfil')}</Text>
          <Text style={styles.sectionSubtitle}>{t('graf.perfilSub')}</Text>
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
