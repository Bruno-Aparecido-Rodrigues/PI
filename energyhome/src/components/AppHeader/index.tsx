import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { styles } from './style';

interface AppHeaderProps {
  hubOnline?: boolean;
  onAvatarPress?: () => void;
}

export function AppHeader({ hubOnline = true, onAvatarPress }: AppHeaderProps) {
  const currentUser = useCurrentUser();

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <TouchableOpacity onPress={onAvatarPress} style={styles.avatar}>
          {currentUser?.photoURL ? (
            <Image source={{ uri: currentUser.photoURL }} style={styles.avatarImage} />
          ) : (
            <MaterialIcons name="person" size={18} color={colors.onSurfaceVariant} />
          )}
        </TouchableOpacity>
        <MaterialIcons name="bolt" size={22} color={colors.primary} />
        <Text style={styles.brandText}>EnergyHome</Text>
      </View>

      <View style={styles.right}>
        {hubOnline && (
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Hub Conectado</Text>
          </View>
        )}
      </View>
    </View>
  );
}
