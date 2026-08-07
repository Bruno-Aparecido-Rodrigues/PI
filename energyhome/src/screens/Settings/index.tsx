import React, { useState } from 'react';
import { View, Text, TextInput, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { AppHeader } from '../../components/AppHeader';
import { logout, deleteAccount } from '../../services/authIntegration';
import { styles } from './style';

const DEVICES = [
  { icon: 'sensors' as const, label: 'Hub', id: 'EH-2024-X9' },
];

interface SettingsScreenProps {
  navigation: any;
}

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const [tariff, setTariff] = useState('0.85');
  const [offPeakDiscount, setOffPeakDiscount] = useState(true);
  const [confirmingDeviceId, setConfirmingDeviceId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [deleteError, setDeleteError] = useState('');

  async function handleLogout() {
    await logout();
    navigation.replace('Login');
  }

  function handleDisconnect(deviceId: string) {
    if (confirmingDeviceId !== deviceId) {
      setConfirmingDeviceId(deviceId);
      return;
    }
    setFeedback(`Dispositivo ${deviceId} desconectado.`);
    setConfirmingDeviceId(null);
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
              />
            </View>
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
              <Text style={styles.activeBadgeText}>
                {DEVICES.length} {DEVICES.length === 1 ? 'Ativo' : 'Ativos'}
              </Text>
            </View>
          </View>

          <View style={styles.deviceList}>
            {DEVICES.map((device) => (
              <View key={device.id} style={styles.deviceRow}>
                <View style={styles.deviceLeft}>
                  <View style={styles.deviceIconBox}>
                    <MaterialIcons name={device.icon} size={20} color={colors.onSurfaceVariant} />
                  </View>
                  <View>
                    <Text style={styles.deviceLabel}>{device.label}</Text>
                    <Text style={styles.deviceId}>ID: {device.id}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleDisconnect(device.id)}>
                  <Text style={styles.disconnectText}>
                    {confirmingDeviceId === device.id ? 'Confirmar?' : 'Desconectar'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
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
