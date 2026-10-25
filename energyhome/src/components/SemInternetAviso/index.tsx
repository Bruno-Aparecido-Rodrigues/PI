import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSemInternet } from '../../hooks/useSemInternet';
import { criarEstilos } from './style';
import { useCores, useEstilos } from '../../theme/TemaContext';

/** Faixa "Sem conexão com a internet" (só aparece quando o celular está offline). */
export function SemInternetAviso() {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  const semInternet = useSemInternet();
  if (!semInternet) return null;

  return (
    <View style={styles.faixa}>
      <MaterialIcons name="wifi-off" size={20} color={colors.onErrorContainer} />
      <View style={styles.textos}>
        <Text style={styles.titulo}>Sem conexão com a internet</Text>
        <Text style={styles.texto}>Os dados voltam a aparecer sozinhos quando a conexão voltar.</Text>
      </View>
    </View>
  );
}
