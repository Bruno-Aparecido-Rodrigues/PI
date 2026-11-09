import React, { useRef } from 'react';
import { View, Text, Pressable, ToastAndroid, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrentHub } from '../../hooks/useCurrentHub';
import { useHubStatus } from '../../hooks/useHubStatus';
import { SemInternetAviso } from '../SemInternetAviso';
import { alternarAprendizado } from '../../services/alertsData';
import { criarEstilos } from './style';
import { useCores, useEstilos } from '../../theme/TemaContext';
import { useT } from '../../i18n/IdiomaContext';

export function AppHeader() {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { hubId } = useCurrentHub();
  const { online } = useHubStatus(hubId);

  // Atalho escondido pra apresentação: 7 toques seguidos no "A.C.D.C" ligam
  // ou desligam o período de aprendizado dos alertas (ver alertsData.ts).
  // Nada no visual indica que dá pra tocar aí.
  const toques = useRef({ n: 0, ultimo: 0 });
  async function tocarNaMarca() {
    const agora = Date.now();
    const t = toques.current;
    t.n = agora - t.ultimo < 1500 ? t.n + 1 : 1;
    t.ultimo = agora;
    if (t.n < 7 || !hubId) return;
    t.n = 0;
    try {
      const r = await alternarAprendizado(hubId);
      avisar(
        r === 'encerrado' ? t('topo.testeAtivado') : t('topo.aprendizadoReiniciado')
      );
    } catch {
      avisar(t('topo.erroTeste'));
    }
  }

  return (
    <View>
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <Pressable style={styles.left} onPress={tocarNaMarca}>
        <MaterialIcons name="bolt" size={22} color={colors.primary} />
        <Text style={styles.brandText}>A.C.D.C</Text>
      </Pressable>

      <View style={styles.right}>
        {hubId && (
          <View style={[styles.statusPill, online ? styles.statusPillOnline : styles.statusPillOffline]}>
            <View style={[styles.statusDot, online ? styles.statusDotOnline : styles.statusDotOffline]} />
            <Text style={[styles.statusText, online ? styles.statusTextOnline : styles.statusTextOffline]}>
              {online ? t('topo.hubConectado') : t('topo.hubDesconectado')}
            </Text>
          </View>
        )}
      </View>
    </View>
    <SemInternetAviso />
    </View>
  );
}

function avisar(texto: string) {
  if (Platform.OS === 'android') ToastAndroid.show(texto, ToastAndroid.LONG);
}
