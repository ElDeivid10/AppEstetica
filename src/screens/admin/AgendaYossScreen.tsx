import React, { useState } from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { PageHeader, SectionTitle, StatusPill, pageStyles as p } from '@/components/SalonUI';
import { theme } from '@/constants/YossTheme';

const { colors } = theme;
const appointments = [
  { date: '2026-10-21', time: '09:30', client: 'Mariana Torres', service: 'Corte y peinado', status: 'Aceptada', tone: 'olive' as const, initials: 'MT', paid: 'Anticipo $300' },
  { date: '2026-10-21', time: '12:00', client: 'Lucía Ramírez', service: 'Coloración completa', status: 'Aceptada', tone: 'olive' as const, initials: 'LR', paid: 'Anticipo $500' },
  { date: '2026-10-22', time: '11:00', client: 'Ana López', service: 'Retoque de raíz', status: 'Solicitud', tone: 'amber' as const, initials: 'AL', paid: 'Sin anticipo' },
  { date: '2026-10-23', time: '15:30', client: 'Sofía Morales', service: 'Tratamiento hidratante', status: 'Aceptada', tone: 'olive' as const, initials: 'SM', paid: 'Anticipo $250' },
  { date: '2026-10-27', time: '10:00', client: 'Valeria Cruz', service: 'Balayage', status: 'Solicitud', tone: 'amber' as const, initials: 'VC', paid: 'Por confirmar' },
  { date: '2026-10-29', time: '13:00', client: 'Camila Reyes', service: 'Diseño de ceja', status: 'Aceptada', tone: 'olive' as const, initials: 'CR', paid: 'Anticipo $150' },
  { date: '2026-10-31', time: '16:00', client: 'Daniela Vega', service: 'Baño de color', status: 'Aceptada', tone: 'olive' as const, initials: 'DV', paid: 'Sin anticipo' },
];
const dayLabels: Record<string, string> = { '2026-10-21': 'MIÉRCOLES, 21 OCTUBRE', '2026-10-22': 'JUEVES, 22 OCTUBRE', '2026-10-23': 'VIERNES, 23 OCTUBRE', '2026-10-27': 'MARTES, 27 OCTUBRE', '2026-10-29': 'JUEVES, 29 OCTUBRE', '2026-10-31': 'SÁBADO, 31 OCTUBRE' };

export default function AgendaYossScreen() {
  const [range, setRange] = useState<'Semana' | 'Mes'>('Semana');
  const [showFilter, setShowFilter] = useState(false);
  const filtered = appointments.filter(item => range === 'Mes' || item.date <= '2026-10-27');
  const grouped = filtered.reduce<Record<string, typeof appointments>>((result, item) => { (result[item.date] ||= []).push(item); return result; }, {});
  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}><View style={{ flex: 1 }}><PageHeader eyebrow="Panel administrador" title="Agenda" subtitle="Todas las citas, ordenadas por fecha y hora." /></View><TouchableOpacity style={styles.filterButton} onPress={() => setShowFilter(!showFilter)}><Text style={styles.filterIcon}>☷</Text><Text style={styles.filterText}>Filtrar</Text></TouchableOpacity></View>
      {showFilter && <View style={styles.filterMenu}><Text style={styles.filterLabel}>MOSTRAR POR</Text>{(['Semana', 'Mes'] as const).map(option => <TouchableOpacity key={option} onPress={() => { setRange(option); setShowFilter(false); }} style={[styles.filterOption, range === option && styles.filterOptionActive]}><Text style={[styles.filterOptionText, range === option && styles.filterOptionTextActive]}>{option === 'Semana' ? 'Esta semana · 21–27 oct' : 'Este mes · octubre'}</Text>{range === option && <Text style={styles.check}>✓</Text>}</TouchableOpacity>)}</View>}
      <View style={[p.card, styles.summary]}><View><Text style={styles.summaryLabel}>CITAS EN {range.toUpperCase()}</Text><Text style={styles.summaryNumber}>{filtered.length}</Text><Text style={styles.summaryCaption}>registros en agenda</Text></View><View style={styles.summaryIcon}><Text style={{ fontSize: 23 }}>🗓️</Text></View></View>
      {Object.entries(grouped).map(([date, items]) => <View key={date}><SectionTitle title={dayLabels[date] ?? date} action={`${items.length} ${items.length === 1 ? 'cita' : 'citas'}`} /><View style={styles.dayList}>{items.map(item => <View key={`${item.time}-${item.client}`} style={[p.card, styles.appointment]}>
        <View style={styles.timeCol}><Text style={styles.time}>{item.time}</Text><View style={styles.timeline} /></View><View style={styles.avatar}><Text style={styles.initials}>{item.initials}</Text></View><View style={{ flex: 1, gap: 4 }}><Text style={styles.client}>{item.client}</Text><Text style={p.muted}>{item.service}</Text><Text style={styles.payment}>{item.paid}</Text></View><StatusPill label={item.status} tone={item.tone} />
      </View>)}</View></View>)}
      <Text style={styles.demoNote}>Agenda de ejemplo · octubre 2026</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, filterButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.beige[200], backgroundColor: colors.white, borderRadius: 12, marginTop: 25 }, filterIcon: { color: colors.primary[500], fontSize: 16 }, filterText: { color: colors.ink[800], fontSize: 11, fontWeight: '700' },
  filterMenu: { padding: 12, borderRadius: 14, backgroundColor: colors.white, borderColor: colors.beige[200], borderWidth: 1, gap: 5 }, filterLabel: { color: colors.beige[500], fontWeight: '700', letterSpacing: 1, fontSize: 9, marginBottom: 4 }, filterOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderRadius: 10 }, filterOptionActive: { backgroundColor: colors.primary[50] }, filterOptionText: { color: colors.ink[700], fontSize: 12 }, filterOptionTextActive: { color: colors.primary[600], fontWeight: '700' }, check: { color: colors.primary[600], fontWeight: '700' },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.ink[800], borderColor: colors.ink[800] }, summaryLabel: { color: colors.primary[200], fontWeight: '700', letterSpacing: 1.2, fontSize: 9 }, summaryNumber: { color: colors.white, fontSize: 30, fontWeight: '700' }, summaryCaption: { color: '#D2D2C8', fontSize: 10 }, summaryIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#FFFFFF20', alignItems: 'center', justifyContent: 'center' },
  dayList: { gap: 8, marginTop: -3 }, appointment: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }, timeCol: { alignItems: 'center', width: 43 }, time: { color: colors.ink[800], fontWeight: '700', fontSize: 11 }, timeline: { width: 1, height: 28, backgroundColor: colors.beige[200], marginTop: 5 }, avatar: { height: 36, width: 36, borderRadius: 13, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' }, initials: { fontSize: 10, fontWeight: '700', color: colors.primary[600] }, client: { fontSize: 12, fontWeight: '700', color: colors.ink[800] }, payment: { color: colors.primary[500], fontSize: 9, fontWeight: '600' }, demoNote: { color: colors.beige[500], textAlign: 'center', fontSize: 10 },
});
