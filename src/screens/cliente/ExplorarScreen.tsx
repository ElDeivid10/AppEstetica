import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/YossTheme';

const { colors } = theme;

export default function ExplorarScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🌿</Text>
      <Text style={styles.title}>Explorar</Text>
      <Text style={styles.subtitle}>Catálogo de Servicios y Productos</Text>
      <Text style={styles.tag}>— Próximamente —</Text>
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
  tag: { fontSize: 12, color: colors.beige[400], marginTop: 4 },
});
