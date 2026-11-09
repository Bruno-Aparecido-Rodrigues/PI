import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppHeader } from '../../components/AppHeader';
import { logout, deleteAccount, getCurrentUser } from '../../services/authIntegration';
import { TarifaCard } from '../../components/TarifaCard';
import { CicloCard } from '../../components/CicloCard';
import { unpairHub } from '../../services/hubPairing';
import { useCurrentHub } from '../../hooks/useCurrentHub';
import { criarEstilos } from './style';
import { useCores, useEstilos, useTema } from '../../theme/TemaContext';
import { useIdioma } from '../../i18n/IdiomaContext';
import type { EscolhaIdioma } from '../../i18n';

interface SettingsScreenProps {
  navigation: any;
}

// Cada idioma aparece escrito nele mesmo (quem não lê português acha o "English")
const OPCOES_IDIOMA: { id: EscolhaIdioma; nome: string | null }[] = [
  { id: 'auto', nome: null }, // "Automático" / "Automatic"
  { id: 'pt', nome: 'Português' },
  { id: 'en', nome: 'English' },
];

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const styles = useEstilos(criarEstilos);
  const { escuro, definirEscuro } = useTema();
  const colors = useCores();
  const { t, escolha: escolhaIdioma, definirIdioma } = useIdioma();
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
      setFeedback(t('ajustes.desconectado'));
    } catch {
      setFeedback(t('ajustes.erroDesconectar'));
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
        <Text style={styles.title}>{t('ajustes.titulo')}</Text>
        <Text style={styles.subtitle}>{t('ajustes.subtitulo')}</Text>

        {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}

        {/* Aparência: tema claro ou escuro (vale na hora, fica salvo no celular) */}
        <View style={styles.card}>
          <View style={styles.temaRow}>
            <View style={styles.cardHeader}>
              <MaterialIcons name={escuro ? 'dark-mode' : 'light-mode'} size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>{t('ajustes.temaEscuro')}</Text>
            </View>
            <Switch
              value={escuro}
              onValueChange={definirEscuro}
              trackColor={{ false: colors.outlineVariant, true: colors.primary }}
              thumbColor={escuro ? colors.onPrimary : colors.surfaceContainerLowest}
            />
          </View>
        </View>

        {/* Idioma do app (e dos alertas/notificações). Vale na hora, fica salvo no celular */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="translate" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>{t('ajustes.idioma')}</Text>
          </View>
          <View style={styles.idiomaOpcoes}>
            {OPCOES_IDIOMA.map((opcao) => {
              const ativo = escolhaIdioma === opcao.id;
              return (
                <TouchableOpacity
                  key={opcao.id}
                  style={[styles.idiomaChip, ativo && styles.idiomaChipAtivo]}
                  onPress={() => definirIdioma(opcao.id)}
                  accessibilityState={{ selected: ativo }}
                >
                  <Text style={[styles.idiomaChipTexto, ativo && styles.idiomaChipTextoAtivo]}>
                    {opcao.nome ?? t('ajustes.idiomaAuto')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.idiomaDica}>{t('ajustes.idiomaDica')}</Text>
        </View>

        {/* Datas de leitura da conta de luz (ciclo de faturamento) */}
        <CicloCard hubId={hubId} />

        {/* Tarifa manual ou automática (ANEEL), impostos e iluminação pública */}
        <TarifaCard hubId={hubId} />

        <View style={styles.card}>
          <View style={styles.deviceHeaderRow}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="router" size={20} color={colors.secondary} />
              <Text style={styles.cardTitle}>{t('ajustes.dispositivos')}</Text>
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>{hubId ? t('ajustes.umAtivo') : t('ajustes.zeroAtivos')}</Text>
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
                    <Text style={styles.deviceLabel}>{t('ajustes.hub')}</Text>
                    <Text style={styles.deviceId}>{t('ajustes.id', { id: hubId })}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleDisconnect}>
                  <Text style={styles.disconnectText}>
                    {confirmingDisconnect ? t('ajustes.confirmar') : t('ajustes.desconectar')}
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
                <Text style={styles.addDeviceText}>{t('comum.adicionarDispositivo')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.card, styles.dangerCard]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="warning" size={20} color={colors.error} />
            <Text style={[styles.cardTitle, { color: colors.error }]}>{t('ajustes.perigo')}</Text>
          </View>
          <Text style={styles.dangerText}>{t('ajustes.perigoTexto')}</Text>
          {deleteError ? <Text style={styles.dangerErrorText}>{deleteError}</Text> : null}
          <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount}>
            <Text style={styles.dangerButtonText}>
              {confirmingDelete ? t('ajustes.confirmarExclusao') : t('ajustes.excluir')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={18} color={colors.onSurfaceVariant} />
          <Text style={styles.logoutText}>{t('ajustes.sair')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
