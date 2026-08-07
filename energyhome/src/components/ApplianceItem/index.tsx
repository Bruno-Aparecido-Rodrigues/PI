import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { styles } from './style';

interface ApplianceItemProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  subtitle: string;
  usage: string;
  status: string;
  statusColor: string;
}

export function ApplianceItem({ icon, label, subtitle, usage, status, statusColor }: ApplianceItemProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.iconBox}>
          <MaterialIcons name={icon} size={20} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.usage}>{usage}</Text>
        <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
      </View>
    </View>
  );
}
