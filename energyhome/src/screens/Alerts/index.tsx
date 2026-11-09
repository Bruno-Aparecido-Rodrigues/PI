import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { AlertCard } from '../../components/AlertCard';
import {
  subscribeToAlerts,
  subscribeToAprendizado,
  markAlertAsRead,
  textosDoAlerta,
  Alert,
} from '../../services/alertsData';
import { useCurrentHub } from '../../hooks/useCurrentHub';
import { criarEstilos } from './style';
import { useCores, useEstilos } from '../../theme/TemaContext';
import { useRecarregar } from '../../hooks/useRecarregar';
import { useT } from '../../i18n/IdiomaContext';
import { Chave, diaMesCurto, diaMesLongo, dataCurta, hora } from '../../i18n';

const PERIOD_FILTERS: readonly { id: 'today' | '7d' | '30d' | 'all'; label: Chave }[] = [
  { id: 'today', label: 'comum.hoje' },
  { id: '7d', label: 'alertas.7dias' },
  { id: '30d', label: 'alertas.30dias' },
  { id: 'all', label: 'alertas.tudo' },
];

const STATUS_FILTERS: readonly { id: 'all' | 'unread' | 'read'; label: Chave }[] = [
  { id: 'all', label: 'alertas.todos' },
  { id: 'unread', label: 'alertas.naoLidos' },
  { id: 'read', label: 'alertas.lidos' },
];

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

function groupByDay(alerts: Alert[], t: (c: Chave) => string): { label: string; alerts: Alert[] }[] {
  const groups: { label: string; alerts: Alert[] }[] = [];
  const todayLabel = new Date().toDateString();
  const yesterdayLabel = new Date(Date.now() - 86400000).toDateString();

  for (const alert of alerts) {
    const date = new Date(alert.timestamp);
    const dateLabel = date.toDateString();
    let label: string;
    if (dateLabel === todayLabel) {
      label = t('comum.hoje');
    } else if (dateLabel === yesterdayLabel) {
      label = t('comum.ontem');
    } else {
      label = diaMesLongo(alert.timestamp);
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

function AlertsConteudo({
  navigation,
  refreshControl,
}: { navigation: any } & { refreshControl: React.ReactElement<any> }) {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  const t = useT();
  // Margem dos botões/gestos do Android, pra o "Entendi" e o "Aplicar" não
  // ficarem embaixo da barra de navegação do celular
  const insets = useSafeAreaInsets();
  const margemBaixo = { paddingBottom: 20 + insets.bottom };
  const { hubId, loading: hubLoading } = useCurrentHub();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterId>('7d');
  const [statusFilter, setStatusFilter] = useState<StatusFilterId>('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  // Alerta aberto em detalhe (tocar no card abre e marca como visto)
  const [aberto, setAberto] = useState<Alert | null>(null);

  React.useEffect(() => {
    if (!hubId) return;
    const unsubscribe = subscribeToAlerts(hubId, setAlerts);
    return unsubscribe;
  }, [hubId]);

  // Período de aprendizado (30 dias): sem alertas de consumo até essa data
  const [aprendizadoAte, setAprendizadoAte] = useState<number | null>(null);
  React.useEffect(() => {
    if (!hubId) return;
    return subscribeToAprendizado(hubId, setAprendizadoAte);
  }, [hubId]);
  const aprendendo = aprendizadoAte !== null && Date.now() < aprendizadoAte;

  const doPeriodo = useMemo(() => filterByDate(alerts, periodFilter), [alerts, periodFilter]);
  const filteredAlerts = useMemo(() => filterByStatus(doPeriodo, statusFilter), [doPeriodo, statusFilter]);

  const groups = useMemo(() => groupByDay(filteredAlerts, t), [filteredAlerts, t]);

  // Contagem do período inteiro (não muda ao filtrar por status, senão um dos
  // cards sempre mostraria 0)
  const unreadCount = doPeriodo.filter((a) => !a.read).length;
  const readCount = doPeriodo.length - unreadCount;

  // Tocar num card de resumo filtra por ele; tocar de novo volta pra "Todos"
  const alternarStatus = (status: StatusFilterId) => setStatusFilter((atual) => (atual === status ? 'all' : status));

  const abrirAlerta = (alert: Alert) => {
    setAberto(alert);
    if (!alert.read && hubId) markAlertAsRead(hubId, alert.id);
  };

  const periodLabel = t(PERIOD_FILTERS.find((f) => f.id === periodFilter)!.label);
  const statusLabel = t(STATUS_FILTERS.find((f) => f.id === statusFilter)!.label);
  const filterSummary = statusFilter === 'all' ? periodLabel : `${periodLabel} · ${statusLabel}`;

  if (!hubLoading && !hubId) {
    return (
      <View style={styles.screen}>
        <AppHeader />
        <View style={styles.emptyStateFull}>
          <MaterialIcons name="sensors-off" size={48} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>{t('comum.semHubTitulo')}</Text>
          <Text style={styles.emptySubtitle}>{t('alertas.semHubTexto')}</Text>
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
          <Text style={styles.title}>{t('alertas.titulo')}</Text>
          <Text style={styles.subtitle}>{t('alertas.subtitulo')}</Text>
        </View>

        {aprendendo ? (
          <View style={styles.aprendizadoCard}>
            <MaterialIcons name="school" size={20} color={colors.primary} />
            <View style={styles.aprendizadoTextos}>
              <Text style={styles.aprendizadoTitulo}>
                {t('alertas.aprendendoAte', { data: diaMesCurto(aprendizadoAte!) })}
              </Text>
              <Text style={styles.aprendizadoTexto}>{t('alertas.aprendendoTexto')}</Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
          <MaterialIcons name="filter-list" size={18} color={colors.onSurface} />
          <Text style={styles.filterButtonText}>{filterSummary}</Text>
          <MaterialIcons name="expand-more" size={18} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        <View style={styles.summaryRow}>
          <TouchableOpacity
            style={[styles.summaryCard, statusFilter === 'unread' && styles.summaryCardActive]}
            onPress={() => alternarStatus('unread')}
            activeOpacity={0.7}
          >
            <View style={styles.summaryHeader}>
              <MaterialIcons name="mark-email-unread" size={18} color={colors.primary} />
              <Text style={styles.summaryLabel}>{t('alertas.naoVisualizados')}</Text>
            </View>
            <Text style={styles.summaryValue}>{unreadCount}</Text>
            {statusFilter === 'unread' ? <Text style={styles.summaryFiltro}>{t('alertas.filtrando')}</Text> : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.summaryCard, statusFilter === 'read' && styles.summaryCardActive]}
            onPress={() => alternarStatus('read')}
            activeOpacity={0.7}
          >
            <View style={styles.summaryHeader}>
              <MaterialIcons name="mark-email-read" size={18} color={colors.onSurfaceVariant} />
              <Text style={styles.summaryLabel}>{t('alertas.visualizados')}</Text>
            </View>
            <Text style={[styles.summaryValue, styles.summaryValueMuted]}>{readCount}</Text>
            {statusFilter === 'read' ? <Text style={styles.summaryFiltro}>{t('alertas.filtrando')}</Text> : null}
          </TouchableOpacity>
        </View>

        {groups.length === 0 ? (
          <Text style={styles.emptyText}>{t('alertas.nenhum')}</Text>
        ) : (
          groups.map((group) => (
            <View key={group.label} style={styles.section}>
              <Text style={styles.dayLabel}>{group.label}</Text>
              {group.alerts.map((alert) => {
                const textos = textosDoAlerta(alert);
                return (
                  <AlertCard
                    key={alert.id}
                    title={textos.title}
                    description={textos.description}
                    time={hora(alert.timestamp)}
                    read={alert.read}
                    icone={textos.icone}
                    onPress={() => abrirAlerta(alert)}
                  />
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Detalhe do alerta: o mesmo texto da notificação + o que fazer */}
      <Modal visible={aberto !== null} transparent animationType="fade" onRequestClose={() => setAberto(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAberto(null)}>
          <Pressable style={[styles.modalCard, margemBaixo]} onPress={(e) => e.stopPropagation()}>
            {aberto ? (() => {
              const textos = textosDoAlerta(aberto);
              return (
              <>
                <View style={styles.detalheTopo}>
                  <View style={styles.detalheIcone}>
                    <MaterialIcons name={textos.icone as any} size={24} color={colors.primary} />
                  </View>
                  <View style={styles.detalheTitulos}>
                    <Text style={[styles.modalTitle, { marginBottom: 0 }]}>{textos.title}</Text>
                    <Text style={styles.detalheData}>
                      {t('comum.dataHora', { data: dataCurta(aberto.timestamp), hora: hora(aberto.timestamp) })}
                    </Text>
                  </View>
                </View>

                <Text style={styles.modalSectionLabel}>{t('alertas.oQueAconteceu')}</Text>
                <Text style={styles.detalheTexto}>{textos.detalhe}</Text>

                <Text style={styles.modalSectionLabel}>{t('alertas.oQueFazer')}</Text>
                <Text style={styles.detalheTexto}>{textos.oQueFazer}</Text>

                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setAberto(null)}>
                  <Text style={styles.modalCloseButtonText}>{t('alertas.entendi')}</Text>
                </TouchableOpacity>
              </>
              );
            })() : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterModalVisible(false)}>
          <Pressable style={[styles.modalCard, margemBaixo]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('alertas.filtrar')}</Text>

            <Text style={styles.modalSectionLabel}>{t('alertas.periodo')}</Text>
            <View style={styles.modalChipRow}>
              {PERIOD_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setPeriodFilter(f.id)}
                  style={[styles.filterChip, periodFilter === f.id && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, periodFilter === f.id && styles.filterChipTextActive]}>
                    {t(f.label)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalSectionLabel}>{t('alertas.status')}</Text>
            <View style={styles.modalChipRow}>
              {STATUS_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setStatusFilter(f.id)}
                  style={[styles.filterChip, statusFilter === f.id && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, statusFilter === f.id && styles.filterChipTextActive]}>
                    {t(f.label)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setFilterModalVisible(false)}>
              <Text style={styles.modalCloseButtonText}>{t('alertas.aplicar')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// Arrastar pra baixo no topo da tela recarrega (ver hooks/useRecarregar)
export function AlertsScreen(props: { navigation: any }) {
  const { chave, refreshControl } = useRecarregar();
  return <AlertsConteudo key={chave} {...props} refreshControl={refreshControl} />;
}
