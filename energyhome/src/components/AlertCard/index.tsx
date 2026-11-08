import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { criarEstilos } from './style';
import { useCores, useEstilos } from '../../theme/TemaContext';

interface AlertCardProps {
  title: string;
  time: string;
  description: string;
  read: boolean;
  /** Ícone do MaterialIcons (padrão: raio) */
  icone?: string;
  onPress?: () => void;
}

export function AlertCard({ title, time, description, read, icone = 'bolt', onPress }: AlertCardProps) {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconCircle, read ? styles.iconCircleRead : styles.iconCircleUnread]}>
        <MaterialIcons name={icone as any} size={20} color={read ? colors.onSurfaceVariant : colors.primary} />
      </View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            {!read && <View style={styles.unreadDot} />}
            <Text style={styles.title}>{title}</Text>
          </View>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.description}>{description}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
}
