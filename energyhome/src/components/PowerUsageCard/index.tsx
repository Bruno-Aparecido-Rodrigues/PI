import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ChartCurve } from '../ChartCurve';
import { criarEstilos } from './style';
import type { AppColors } from '../../constants/colors';
import { useCores, useEstilos } from '../../theme/TemaContext';
import { useT } from '../../i18n/IdiomaContext';
import { t as traduzir, diaMesCurto, hora as horaDe } from '../../i18n';
import type { SituacaoDoHub } from '../../hooks/useHubStatus';

interface PowerUsageCardProps {
  watts: number;
  comparisonLabel: string;
  /** Consumo de agora comparado ao normal desse horário: acima (up), abaixo
   *  (down) ou dentro do normal / sem base de comparação (neutral). */
  trend?: 'up' | 'down' | 'neutral';
  /** Leituras recentes de Watts (mais antiga primeiro), pra desenhar a curva
   *  "ao vivo" com o dado real em vez de um traço decorativo fixo. */
  history?: number[];
  /**
   * online: mostra o valor e a curva ao vivo
   * offline: o hub parou de mandar leituras (aviso vermelho)
   * desconhecido: o celular está sem internet, então não dá pra saber como o
   *   hub está (aviso cinza, sem culpar o hub)
   */
  situacao?: SituacaoDoHub;
  /** Só no "desconhecido": true = a internet do celular acabou de voltar */
  celularConectado?: boolean;
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
  situacao = 'online',
  celularConectado = false,
  lastUpdatedAt = null,
}: PowerUsageCardProps) {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  const t = useT();

  if (situacao !== 'online') {
    // Hub caiu (vermelho) ou celular sem internet (cinza)
    const hubCaiu = situacao === 'offline';
    const verificando = !hubCaiu && celularConectado;
    const cor = hubCaiu ? colors.error : colors.onSurfaceVariant;

    let linha: string;
    if (hubCaiu) {
      linha = lastUpdatedAt
        ? t('aoVivo.desconectado', { quando: quandoFoi(lastUpdatedAt) })
        : t('aoVivo.aguardandoPrimeira');
    } else if (verificando) {
      linha = t('aoVivo.verificandoTitulo');
    } else {
      linha = lastUpdatedAt
        ? t('aoVivo.celularSemInternet', { quando: quandoFoi(lastUpdatedAt) })
        : t('aoVivo.celularSemInternetCurto');
    }

    return (
      <View style={styles.container}>
        <View style={[styles.liveBadge, hubCaiu ? styles.offlineBadge : styles.desconhecidoBadge]}>
          <Text style={[styles.liveBadgeText, hubCaiu ? styles.offlineBadgeText : styles.desconhecidoBadgeText]}>
            {hubCaiu ? 'OFFLINE' : verificando ? '…' : t('aoVivo.badgeSemInternet')}
          </Text>
        </View>

        <Text style={styles.label}>{t('aoVivo.consumoAtual')}</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.value, styles.valueOffline]}>—</Text>
        </View>

        <View style={styles.trendRow}>
          <MaterialIcons name={hubCaiu ? 'sensors-off' : verificando ? 'sync' : 'wifi-off'} size={16} color={cor} />
          <Text style={[styles.trendText, { color: cor }]}>{linha}</Text>
        </View>

        <View style={styles.offlineBox}>
          <MaterialIcons
            name={hubCaiu ? 'power-off' : verificando ? 'sync' : 'cloud-off'}
            size={28}
            color={colors.onSurfaceVariant}
          />
          <Text style={styles.offlineTitle}>
            {hubCaiu
              ? t('aoVivo.semConsumo')
              : verificando
                ? t('aoVivo.verificandoTitulo')
                : t('aoVivo.desconhecidoTitulo')}
          </Text>
          <Text style={styles.offlineText}>
            {hubCaiu
              ? t('aoVivo.offlineTexto')
              : verificando
                ? t('aoVivo.verificandoTexto')
                : t('aoVivo.desconhecidoTexto')}
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
