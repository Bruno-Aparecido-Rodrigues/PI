import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { styles } from './style';

interface BillEstimateCardProps {
  currentValue: string;
  projectedValue: string;
  billingCycleLabel: string;
  progressPercent: number;
  onViewForecast?: () => void;
}

export function BillEstimateCard({
  currentValue,
  projectedValue,
  billingCycleLabel,
  progressPercent,
  onViewForecast,
}: BillEstimateCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Conta Estimada</Text>
        <MaterialIcons name="account-balance-wallet" size={20} color={colors.onPrimaryContainer} />
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.currencySymbol}>R$</Text>
        <Text style={styles.value}>{currentValue}</Text>
      </View>
      <Text style={styles.cycleLabel}>{billingCycleLabel}</Text>

      <View style={styles.projectedRow}>
        <Text style={styles.projectedLabel}>Projetado</Text>
        <Text style={styles.projectedValue}>{projectedValue}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      <TouchableOpacity style={styles.button} onPress={onViewForecast}>
        <Text style={styles.buttonText}>Ver Previsão Detalhada</Text>
      </TouchableOpacity>
    </View>
  );
}
