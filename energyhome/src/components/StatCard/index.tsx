import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { criarEstilos } from './style';
import { useCores, useEstilos } from '../../theme/TemaContext';

interface StatCardProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBackground: string;
  iconColor: string;
  label: string;
  value: string;
  unit: string;
}

export function StatCard({ icon, iconBackground, iconColor, label, value, unit }: StatCardProps) {
  const styles = useEstilos(criarEstilos);
  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: iconBackground }]}>
        <MaterialIcons name={icon} size={20} color={iconColor} />
      </View>
      <View>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.unit}>{unit}</Text>
        </View>
      </View>
    </View>
  );
}
