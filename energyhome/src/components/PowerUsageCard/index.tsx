import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { ChartCurve } from '../ChartCurve';
import { styles } from './style';

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
  const p = (n: number) => String(n).padStart(2, '0');
  const hora = `${p(d.getHours())}:${p(d.getMinutes())}`;
  const hoje = new Date();
  const mesmoDia =
    d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  return mesmoDia ? `às ${hora}` : `em ${p(d.getDate())}/${p(d.getMonth() + 1)} às ${hora}`;
}

const TREND_ICON = {
  up: 'trending-up',
  down: 'trending-down',
  neutral: 'trending-flat',
} as const;

const TREND_COLOR = {
  up: colors.error,
  down: colors.tertiary,
  neutral: colors.onSurfaceVariant,
};

export function PowerUsageCard({
  watts,
  comparisonLabel,
  trend = 'neutral',
  history,
  offline = false,
  lastUpdatedAt = null,
}: PowerUsageCardProps) {
  if (offline) {
    return (
      <View style={styles.container}>
        <View style={[styles.liveBadge, styles.offlineBadge]}>
          <Text style={[styles.liveBadgeText, styles.offlineBadgeText]}>OFFLINE</Text>
        </View>

        <Text style={styles.label}>Consumo Atual</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.value, styles.valueOffline]}>—</Text>
        </View>

        <View style={styles.trendRow}>
          <MaterialIcons name="sensors-off" size={16} color={colors.error} />
          <Text style={[styles.trendText, { color: colors.error }]}>
            {lastUpdatedAt
              ? `Hub desconectado · última leitura ${quandoFoi(lastUpdatedAt)}`
              : 'Aguardando a primeira leitura do hub'}
          </Text>
        </View>

        <View style={styles.offlineBox}>
          <MaterialIcons name="power-off" size={28} color={colors.onSurfaceVariant} />
          <Text style={styles.offlineTitle}>Sem consumo ao vivo</Text>
          <Text style={styles.offlineText}>
            O hub não está enviando leituras. Confira se ele está ligado na tomada e se o Wi-Fi está
            funcionando. O consumo volta a aparecer aqui sozinho quando ele reconectar.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.liveBadge}>
        <Text style={styles.liveBadgeText}>LIVE</Text>
      </View>

      <Text style={styles.label}>Consumo Atual</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{watts}</Text>
        <Text style={styles.unit}>W</Text>
      </View>

      <View style={styles.trendRow}>
        <MaterialIcons name={TREND_ICON[trend]} size={16} color={TREND_COLOR[trend]} />
        <Text style={[styles.trendText, { color: TREND_COLOR[trend] }]}>
          {comparisonLabel}
        </Text>
      </View>

      <ChartCurve height={140} data={history} />
    </View>
  );
}
