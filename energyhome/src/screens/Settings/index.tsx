import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Switch, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { AppHeader } from '../../components/AppHeader';
import { logout, deleteAccount, getCurrentUser } from '../../services/authIntegration';
import { getTariff, setTariff as saveTariff } from '../../services/energyData';
import { unpairHub } from '../../services/hubPairing';
import { useCurrentHub } from '../../hooks/useCurrentHub';
import { styles } from './style';

interface SettingsScreenProps {
  navigation: any;
}

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { hubId, loading: hubLoading } = useCurrentHub();
  const [tariff, setTariff] = useState('0.85');
  const [savingTariff, setSavingTariff] = useState(false);
  const [offPeakDiscount, setOffPeakDiscount] = useState(true);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [tariffFeedback, setTariffFeedback] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!hubId) return;
    getTariff(hubId).then((value) => setTariff(String(value)));
  }, [hubId]);

  async function handleSaveTariff() {
    if (!hubId) return;
    const parsed = Number(tariff.replace(',', '.'));
    if (Number.isNaN(parsed) || parsed <= 0) {
      setTariffFeedback('Digite um valor de tarifa válido.');
      return;
    }
    setSavingTariff(true);
    try {
      await saveTariff(hubId, parsed);
      setTariffFeedback('Tarifa registrada.');
    } catch {
      setTariffFeedback('Não foi possível salvar a tarifa. Tente novamente.');
    } finally {
      setSavingTariff(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigation.replace('Login');
  }

  async function handleDisconnect() {
    if (!hubId) return;

    if (!confirmingDisconnect) {
      setConfirmingDisconnect(true);
      return;
    }

    const user = getCurrentUser();
    if (!user) return;

    try {
      await unpairHub(user.uid, hubId);
      setFeedback('Dispositivo desconectado.');
    } catch {
      setFeedback('Não foi possível desconectar o dispositivo. Tente novamente.');
    } finally {
      setConfirmingDisconnect(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    setDeleteError('');
    const result = await deleteAccount();

    if (!result.success) {
      setDeleteError(result.message);
      setConfirmingDelete(false);
      return;
    }

    navigation.replace('Login');
  }

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Ajustes</Text>
        <Text style={styles.subtitle}>Gerencie suas preferências de energia e conexões da conta.</Text>

        {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="payments" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Preferências Financeiras</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Tarifa de Energia (R$/kWh)</Text>
            <View style={styles.tariffInputWrapper}>
              <Text style={styles.currencyPrefix}>R$</Text>
              <TextInput
                style={styles.tariffInput}
                keyboardType="decimal-pad"
                value={tariff}
                onChangeText={setTariff}
                editable={!!hubId}
              />
            </View>
            <TouchableOpacity
              style={styles.saveTariffButton}
              onPress={handleSaveTariff}
              disabled={savingTariff || !hubId}
            >
              {savingTariff ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={styles.saveTariffButtonText}>Salvar Tarifa</Text>
              )}
            </TouchableOpacity>
            {tariffFeedback ? <Text style={styles.feedbackText}>{tariffFeedback}</Text> : null}
            <Text style={styles.fieldHint}>Usado para calcular a economia mensal.</Text>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Desconto de Horário Fora de Pico</Text>
            <Switch
              value={offPeakDiscount}
              onValueChange={setOffPeakDiscount}
              trackColor={{ false: colors.outlineVariant, true: colors.primary }}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.deviceHeaderRow}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="router" size={20} color={colors.secondary} />
              <Text style={styles.cardTitle}>Dispositivos Conectados</Text>
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>{hubId ? '1 Ativo' : '0 Ativos'}</Text>
            </View>
          </View>

          <View style={styles.deviceList}>
            {hubId ? (
              <View style={styles.deviceRow}>
                <View style={styles.deviceLeft}>
                  <View style={styles.deviceIconBox}>
                    <MaterialIcons name="sensors" size={20} color={colors.onSurfaceVariant} />
                  </View>
                  <View>
                    <Text style={styles.deviceLabel}>Hub</Text>
                    <Text style={styles.deviceId}>ID: {hubId}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleDisconnect}>
                  <Text style={styles.disconnectText}>
                    {confirmingDisconnect ? 'Confirmar?' : 'Desconectar'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addDeviceRow}
                onPress={() => navigation.navigate('AddDevice')}
                disabled={hubLoading}
              >
                <MaterialIcons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.addDeviceText}>Adicionar Dispositivo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.card, styles.dangerCard]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="warning" size={20} color={colors.error} />
            <Text style={[styles.cardTitle, { color: colors.error }]}>Zona de Perigo</Text>
          </View>
          <Text style={styles.dangerText}>
            Remover sua conta apagará permanentemente todo o histórico de dados.
          </Text>
          {deleteError ? <Text style={styles.dangerErrorText}>{deleteError}</Text> : null}
          <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount}>
            <Text style={styles.dangerButtonText}>
              {confirmingDelete ? 'Confirmar exclusão' : 'Excluir Conta'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={18} color={colors.onSurfaceVariant} />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
