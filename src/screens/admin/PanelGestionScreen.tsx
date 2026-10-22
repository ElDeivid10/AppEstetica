import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/constants/YossTheme';
import { useAuth } from '@/context/AuthContext';

const { colors, borderRadius, shadow } = theme;

export default function PanelGestionScreen() {
  const { logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>⚙️</Text>
      <Text style={styles.title}>Panel de Gestión</Text>
      <Text style={styles.subtitle}>Anticipos · Métricas · Catálogo</Text>
      <Text style={styles.tag}>— Panel Admin —</Text>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.beige[50],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emoji: { fontSize: 52, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: colors.ink[800] },
  subtitle: { fontSize: 14, color: colors.ink[700] },
  tag: {
    fontSize: 12,
    color: colors.primary[500],
    fontWeight: '700',
    marginTop: 4,
    backgroundColor: colors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
    overflow: 'hidden',
  },
  logoutBtn: {
    marginTop: 32,
    backgroundColor: colors.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: borderRadius.card,
    ...shadow.button,
  },
  logoutText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
