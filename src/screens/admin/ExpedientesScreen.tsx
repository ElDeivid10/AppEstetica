import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/YossTheme';

const { colors } = theme;

export default function ExpedientesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📋</Text>
      <Text style={styles.title}>Expedientes</Text>
      <Text style={styles.subtitle}>Perfiles clínicos de clientas</Text>
      <Text style={styles.tag}>— Panel Admin —</Text>
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
});
