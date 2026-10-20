import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { AppHeader } from '../../components/AppHeader';
import { logout, deleteAccount, getCurrentUser } from '../../services/authIntegration';
import { TarifaCard } from '../../components/TarifaCard';
import { unpairHub } from '../../services/hubPairing';
import { useCurrentHub } from '../../hooks/useCurrentHub';
import { styles } from './style';

interface SettingsScreenProps {
  navigation: any;
}

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { hubId, loading: hubLoading } = useCurrentHub();
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [deleteError, setDeleteError] = useState('');

  async function handleLogout() {
    // Ao sair, o AppNavigator volta sozinho pra tela de Login.
    await logout();
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
      setFeedback(
        'Dispositivo desconectado. O histórico fica guardado por 6 meses: se o hub for pareado de novo nesse prazo, os dados continuam; depois disso, são apagados.'
      );
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
    }
    // Se deu certo, a conta deixa de existir e o AppNavigator volta pro Login.
  }

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Ajustes</Text>
        <Text style={styles.subtitle}>Gerencie suas preferências de energia e conexões da conta.</Text>

        {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}

        {/* Tarifa manual ou automática (ANEEL), impostos e iluminação pública */}
        <TarifaCard hubId={hubId} />

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
