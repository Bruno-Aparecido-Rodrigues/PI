import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { AppHeader } from '../../components/AppHeader';
import { AlertCard } from '../../components/AlertCard';
import { subscribeToAlerts, markAlertAsRead, Alert } from '../../services/alertsData';
import { styles } from './style';

const FILTERS = [
  { id: 'today', label: 'Hoje' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'all', label: 'Tudo' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

function filterByDate(alerts: Alert[], filter: FilterId): Alert[] {
  if (filter === 'all') return alerts;

  const now = new Date();
  const cutoff = new Date();

  if (filter === 'today') {
    cutoff.setHours(0, 0, 0, 0);
  } else if (filter === '7d') {
    cutoff.setDate(now.getDate() - 7);
  } else {
    cutoff.setDate(now.getDate() - 30);
  }

  return alerts.filter((alert) => alert.timestamp >= cutoff.getTime());
}

function groupByDay(alerts: Alert[]): { label: string; alerts: Alert[] }[] {
  const groups: { label: string; alerts: Alert[] }[] = [];
  const todayLabel = new Date().toDateString();
  const yesterdayLabel = new Date(Date.now() - 86400000).toDateString();

  for (const alert of alerts) {
    const date = new Date(alert.timestamp);
    const dateLabel = date.toDateString();
    let label: string;
    if (dateLabel === todayLabel) {
      label = 'Hoje';
    } else if (dateLabel === yesterdayLabel) {
      label = 'Ontem';
    } else {
      label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    }

    const existingGroup = groups.find((g) => g.label === label);
    if (existingGroup) {
      existingGroup.alerts.push(alert);
    } else {
      groups.push({ label, alerts: [alert] });
    }
  }

  return groups;
}

export function AlertsScreen() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<FilterId>('7d');

  React.useEffect(() => {
    const unsubscribe = subscribeToAlerts(setAlerts);
    return unsubscribe;
  }, []);

  const filteredAlerts = useMemo(() => filterByDate(alerts, filter), [alerts, filter]);
  const groups = useMemo(() => groupByDay(filteredAlerts), [filteredAlerts]);

  const unreadCount = filteredAlerts.filter((a) => !a.read).length;
  const readCount = filteredAlerts.length - unreadCount;

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Histórico de Alertas</Text>
          <Text style={styles.subtitle}>Revise cronologicamente as anomalias de energia e notificações do sistema.</Text>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filter === f.id && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <MaterialIcons name="mark-email-unread" size={18} color={colors.primary} />
              <Text style={styles.summaryLabel}>Não Visualizados</Text>
            </View>
            <Text style={styles.summaryValue}>{unreadCount}</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <MaterialIcons name="mark-email-read" size={18} color={colors.onSurfaceVariant} />
              <Text style={styles.summaryLabel}>Visualizados</Text>
            </View>
            <Text style={[styles.summaryValue, styles.summaryValueMuted]}>{readCount}</Text>
          </View>
        </View>

        {groups.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum alerta neste período.</Text>
        ) : (
          groups.map((group) => (
            <View key={group.label} style={styles.section}>
              <Text style={styles.dayLabel}>{group.label}</Text>
              {group.alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  title={alert.title}
                  description={alert.description}
                  time={new Date(alert.timestamp).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  read={alert.read}
                  onPress={() => !alert.read && markAlertAsRead(alert.id)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
