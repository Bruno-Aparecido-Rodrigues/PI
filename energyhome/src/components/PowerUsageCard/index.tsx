import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ChartCurve } from '../ChartCurve';
import { criarEstilos } from './style';
import type { AppColors } from '../../constants/colors';
import { useCores, useEstilos } from '../../theme/TemaContext';
import { useT } from '../../i18n/IdiomaContext';
import { t as traduzir, diaMesCurto, hora as horaDe } from '../../i18n';

interface PowerUsageCardProps {
  watts: number;
  comparisonLabel: string;
  /** Consumo de agora comparado ao normal desse horário: acima (up), abaixo
   *  (down) ou dentro do normal / sem base de comparação (neutral). */
  trend?: 'up' | 'down' | 'neutral';
  /** Leituras recentes de Watts (mais antiga primeiro), pra desenhar a curva
   *  "ao vivo" com o dado real em vez de um traço decorativo fixo. */
  history?: number[];
  /** Hub sem mandar leitura: esconde o valor e a curva ao vivo */
  offline?: boolean;
  /** Quando chegou a última leitura (ms), pra mostrar no aviso */
  lastUpdatedAt?: number | null;
}

function quandoFoi(ms: number): string {
  const d = new Date(ms);
  const hora = horaDe(ms);
  const hoje = new Date();
  const mesmoDia =
    d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  return mesmoDia ? traduzir('aoVivo.as', { hora }) : traduzir('aoVivo.em', { data: diaMesCurto(ms), hora });
}

const TREND_ICON = {
  up: 'trending-up',
  down: 'trending-down',
  neutral: 'trending-flat',
} as const;

// Cor da seta/texto da tendência (depende do tema)
function corDaTendencia(colors: AppColors) {
  return { up: colors.error, down: colors.tertiary, neutral: colors.onSurfaceVariant };
}

export function PowerUsageCard({
  watts,
  comparisonLabel,
  trend = 'neutral',
  history,
  offline = false,
  lastUpdatedAt = null,
}: PowerUsageCardProps) {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  const t = useT();
  if (offline) {
    return (
      <View style={styles.container}>
        <View style={[styles.liveBadge, styles.offlineBadge]}>
          <Text style={[styles.liveBadgeText, styles.offlineBadgeText]}>OFFLINE</Text>
        </View>

        <Text style={styles.label}>{t('aoVivo.consumoAtual')}</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.value, styles.valueOffline]}>—</Text>
        </View>

        <View style={styles.trendRow}>
          <MaterialIcons name="sensors-off" size={16} color={colors.error} />
          <Text style={[styles.trendText, { color: colors.error }]}>
            {lastUpdatedAt
              ? t('aoVivo.desconectado', { quando: quandoFoi(lastUpdatedAt) })
              : t('aoVivo.aguardandoPrimeira')}
          </Text>
        </View>

        <View style={styles.offlineBox}>
          <MaterialIcons name="power-off" size={28} color={colors.onSurfaceVariant} />
          <Text style={styles.offlineTitle}>{t('aoVivo.semConsumo')}</Text>
          <Text style={styles.offlineText}>{t('aoVivo.offlineTexto')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.liveBadge}>
        <Text style={styles.liveBadgeText}>LIVE</Text>
      </View>

      <Text style={styles.label}>{t('aoVivo.consumoAtual')}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{watts}</Text>
        <Text style={styles.unit}>W</Text>
      </View>

      <View style={styles.trendRow}>
        <MaterialIcons name={TREND_ICON[trend]} size={16} color={corDaTendencia(colors)[trend]} />
        <Text style={[styles.trendText, { color: corDaTendencia(colors)[trend] }]}>
          {comparisonLabel}
        </Text>
      </View>

      <ChartCurve height={140} data={history} />
    </View>
  );
}
