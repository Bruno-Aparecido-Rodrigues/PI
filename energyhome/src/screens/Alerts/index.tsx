import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { AppHeader } from '../../components/AppHeader';
import { AlertCard } from '../../components/AlertCard';
import { subscribeToAlerts, markAlertAsRead, Alert } from '../../services/alertsData';
import { useCurrentHub } from '../../hooks/useCurrentHub';
import { styles } from './style';

const PERIOD_FILTERS = [
  { id: 'today', label: 'Hoje' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'all', label: 'Tudo' },
] as const;

const STATUS_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'unread', label: 'Não lidos' },
  { id: 'read', label: 'Lidos' },
] as const;

type PeriodFilterId = (typeof PERIOD_FILTERS)[number]['id'];
type StatusFilterId = (typeof STATUS_FILTERS)[number]['id'];

function filterByDate(alerts: Alert[], filter: PeriodFilterId): Alert[] {
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

function filterByStatus(alerts: Alert[], filter: StatusFilterId): Alert[] {
  if (filter === 'all') return alerts;
  if (filter === 'unread') return alerts.filter((a) => !a.read);
  return alerts.filter((a) => a.read);
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

export function AlertsScreen({ navigation }: { navigation: any }) {
  const { hubId, loading: hubLoading } = useCurrentHub();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterId>('7d');
  const [statusFilter, setStatusFilter] = useState<StatusFilterId>('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  React.useEffect(() => {
    if (!hubId) return;
    const unsubscribe = subscribeToAlerts(hubId, setAlerts);
    return unsubscribe;
  }, [hubId]);

  const filteredAlerts = useMemo(() => {
    const byDate = filterByDate(alerts, periodFilter);
    return filterByStatus(byDate, statusFilter);
  }, [alerts, periodFilter, statusFilter]);

  const groups = useMemo(() => groupByDay(filteredAlerts), [filteredAlerts]);

  const unreadCount = filteredAlerts.filter((a) => !a.read).length;
  const readCount = filteredAlerts.length - unreadCount;

  const periodLabel = PERIOD_FILTERS.find((f) => f.id === periodFilter)?.label;
  const statusLabel = STATUS_FILTERS.find((f) => f.id === statusFilter)?.label;
  const filterSummary = statusFilter === 'all' ? periodLabel : `${periodLabel} · ${statusLabel}`;

  if (!hubLoading && !hubId) {
    return (
      <View style={styles.screen}>
        <AppHeader />
        <View style={styles.emptyStateFull}>
          <MaterialIcons name="sensors-off" size={48} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>Nenhum dispositivo pareado</Text>
          <Text style={styles.emptySubtitle}>Adicione um hub pra começar a receber alertas.</Text>
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Histórico de Alertas</Text>
          <Text style={styles.subtitle}>Revise cronologicamente as anomalias de energia e notificações do sistema.</Text>
        </View>

        <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
          <MaterialIcons name="filter-list" size={18} color={colors.onSurface} />
          <Text style={styles.filterButtonText}>{filterSummary}</Text>
          <MaterialIcons name="expand-more" size={18} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

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
                  onPress={() => !alert.read && hubId && markAlertAsRead(hubId, alert.id)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Filtrar alertas</Text>

            <Text style={styles.modalSectionLabel}>Período</Text>
            <View style={styles.modalChipRow}>
              {PERIOD_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setPeriodFilter(f.id)}
                  style={[styles.filterChip, periodFilter === f.id && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, periodFilter === f.id && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalSectionLabel}>Status</Text>
            <View style={styles.modalChipRow}>
              {STATUS_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setStatusFilter(f.id)}
                  style={[styles.filterChip, statusFilter === f.id && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, statusFilter === f.id && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setFilterModalVisible(false)}>
              <Text style={styles.modalCloseButtonText}>Aplicar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
