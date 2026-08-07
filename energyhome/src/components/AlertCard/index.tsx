import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { styles } from './style';

interface AlertCardProps {
  title: string;
  time: string;
  description: string;
  severity: 'Critical' | 'Warning' | 'Resolved';
  tag: string;
  onPress?: () => void;
}

const SEVERITY_STYLES = {
  Critical: { bg: colors.errorContainer, text: colors.error, icon: colors.error, label: 'Crítico' },
  Warning: { bg: `${colors.secondary}1A`, text: colors.secondary, icon: colors.secondary, label: 'Aviso' },
  Resolved: { bg: `${colors.tertiary}1A`, text: colors.tertiary, icon: colors.tertiary, label: 'Resolvido' },
} as const;

export function AlertCard({ title, time, description, severity, tag, onPress }: AlertCardProps) {
  const severityStyle = SEVERITY_STYLES[severity];

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconCircle, { backgroundColor: severityStyle.bg }]}>
        <MaterialIcons name="bolt" size={20} color={severityStyle.icon} />
      </View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.tagsRow}>
          <View style={[styles.tag, { backgroundColor: severityStyle.bg }]}>
            <Text style={[styles.tagText, { color: severityStyle.text }]}>{severityStyle.label}</Text>
          </View>
          <View style={[styles.tag, styles.tagNeutral]}>
            <Text style={styles.tagTextNeutral}>{tag}</Text>
          </View>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
}
