import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { AppHeader } from '../../components/AppHeader';
import { AlertCard } from '../../components/AlertCard';
import { styles } from './style';

const SUMMARY = [
  { icon: 'error' as const, iconColor: colors.error, label: 'Alertas Críticos', value: '02', note: 'Requer atenção imediata', noteColor: colors.error },
  { icon: 'warning' as const, iconColor: colors.secondary, label: 'Avisos', value: '14', note: 'Otimização do sistema sugerida', noteColor: colors.onSurfaceVariant },
  { icon: 'check-circle' as const, iconColor: colors.tertiary, label: 'Resolvidos', value: '128', note: 'Histórico dos últimos 30 dias', noteColor: colors.onSurfaceVariant },
];

export function AlertsScreen() {
  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Histórico de Alertas</Text>
            <Text style={styles.subtitle}>Revise cronologicamente as anomalias de energia e notificações do sistema.</Text>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="filter-list" size={16} color={colors.onSurface} />
              <Text style={styles.actionText}>Filtrar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="download" size={16} color={colors.onSurface} />
              <Text style={styles.actionText}>Exportar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.summaryRow}>
          {SUMMARY.map((item) => (
            <View key={item.label} style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <MaterialIcons name={item.icon} size={18} color={item.iconColor} />
                <Text style={styles.summaryLabel}>{item.label}</Text>
              </View>
              <Text style={styles.summaryValue}>{item.value}</Text>
              <Text style={[styles.summaryNote, { color: item.noteColor }]}>{item.note}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.dayLabel}>Hoje</Text>
          <AlertCard
            title="Pico Anormal Detectado"
            time="14:20"
            description="O consumo do ar-condicionado saltou para 4.2kW, excedendo a média em 45%."
            severity="Critical"
            tag="Ar-condicionado"
          />
        </View>
      </ScrollView>
    </View>
  );
}
