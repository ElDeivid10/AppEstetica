import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { theme } from '@/constants/YossTheme';

const { colors } = theme;

export function PageHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <View style={ui.header}>
      <Text style={ui.eyebrow}>{eyebrow.toUpperCase()}</Text>
      <Text style={ui.title}>{title}</Text>
      {!!subtitle && <Text style={ui.subtitle}>{subtitle}</Text>}
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={ui.sectionTitleRow}>
      <Text style={ui.sectionTitle}>{title}</Text>
      {!!action && <Text style={ui.sectionAction}>{action}</Text>}
    </View>
  );
}

export function StatusPill({ label, tone = 'olive' }: { label: string; tone?: 'olive' | 'amber' | 'red' | 'gray' }) {
  return <View style={[ui.pill, ui[`pill_${tone}`]]}><Text style={[ui.pillText, ui[`pillText_${tone}`]]}>{label}</Text></View>;
}

export const pageStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.beige[50] },
  scroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 34, gap: 20, maxWidth: 760, width: '100%', alignSelf: 'center' },
  card: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.beige[200], padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  muted: { color: colors.ink[700], fontSize: 13, lineHeight: 19 },
  label: { color: colors.ink[700], fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  button: { backgroundColor: colors.primary[500], borderRadius: 13, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  outlineButton: { borderWidth: 1, borderColor: colors.primary[500], borderRadius: 13, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  outlineButtonText: { color: colors.primary[600], fontSize: 12, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: colors.beige[200], backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.ink[800] },
});

const ui = StyleSheet.create({
  header: { gap: 4, paddingBottom: 2 },
  eyebrow: { color: colors.primary[500], fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  title: { color: colors.ink[800], fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: colors.ink[700], fontSize: 13, lineHeight: 19 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  sectionTitle: { color: colors.ink[800], fontSize: 17, fontWeight: '700' },
  sectionAction: { color: colors.primary[500], fontSize: 12, fontWeight: '700' },
  pill: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  pill_olive: { backgroundColor: colors.primary[50] },
  pill_amber: { backgroundColor: '#FFF4D8' },
  pill_red: { backgroundColor: '#FCE7E7' },
  pill_gray: { backgroundColor: colors.ink[50] },
  pillText: { fontSize: 10, fontWeight: '700' },
  pillText_olive: { color: colors.primary[600] },
  pillText_amber: { color: '#946200' },
  pillText_red: { color: '#A83333' },
  pillText_gray: { color: colors.ink[700] },
});
