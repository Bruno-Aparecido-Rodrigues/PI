import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { criarEstilos } from './style';
import { useCores, useEstilos } from '../../theme/TemaContext';
import { useT } from '../../i18n/IdiomaContext';

interface BillEstimateCardProps {
  currentValue: string;
  projectedValue: string;
  billingCycleLabel: string;
  /** Ex.: "Projetado até 23/11" (padrão: "Projetado" / "Projected") */
  projectedLabel?: string;
  progressPercent: number;
  onViewForecast?: () => void;
}

export function BillEstimateCard({
  currentValue,
  projectedValue,
  billingCycleLabel,
  projectedLabel,
  progressPercent,
  onViewForecast,
}: BillEstimateCardProps) {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  const t = useT();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{t('conta.estimada')}</Text>
        <MaterialIcons name="account-balance-wallet" size={20} color={colors.onPrimaryContainer} />
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.currencySymbol}>R$</Text>
        <Text style={styles.value}>{currentValue}</Text>
      </View>
      <Text style={styles.cycleLabel}>{billingCycleLabel}</Text>

      <View style={styles.projectedRow}>
        <Text style={styles.projectedLabel}>{projectedLabel ?? t('inicio.projetado')}</Text>
        <Text style={styles.projectedValue}>{projectedValue}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      <TouchableOpacity style={styles.button} onPress={onViewForecast}>
        <Text style={styles.buttonText}>{t('conta.verPrevisao')}</Text>
      </TouchableOpacity>
    </View>
  );
}
