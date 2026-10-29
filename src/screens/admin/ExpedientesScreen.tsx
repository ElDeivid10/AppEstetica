import React, { useState } from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { PageHeader, SectionTitle, StatusPill, pageStyles as p } from '@/components/SalonUI';
import { theme } from '@/constants/YossTheme';

const { colors } = theme;
const records = [
  { client: 'Lucía Ramírez', initials: 'LR', service: 'Coloración completa + tratamiento', date: '21 oct 2026', stylist: 'Yoss', hair: 'Ondulado · castaño oscuro · teñido', allergies: 'Sensibilidad a fragancias fuertes', plan: 'Coloración sin amoniaco cada 6–8 semanas. Mascarilla hidratante en casa.' },
  { client: 'Mariana Torres', initials: 'MT', service: 'Corte en capas y brushing', date: '20 oct 2026', stylist: 'Yoss', hair: 'Lacio · fino · natural', allergies: 'Ninguna registrada', plan: 'Tratamiento de volumen cada mes. Evitar calor alto en casa.' },
  { client: 'Sofía Morales', initials: 'SM', service: 'Keratina y sellado', date: '18 oct 2026', stylist: 'Yoss', hair: 'Rizado · grueso · con mechas', allergies: 'Alergia conocida a látex', plan: 'Mantenimiento hidratante en 4 semanas. Shampoo sin sulfatos.' },
  { client: 'Ana López', initials: 'AL', service: 'Tratamiento hidratante profundo', date: '17 oct 2026', stylist: 'Yoss', hair: 'Ondulado · teñido · puntas secas', allergies: 'Ninguna registrada', plan: 'Retoque de raíz programado. Protección de color y acondicionador semanal.' },
];

export default function ExpedientesScreen() {
  const [selected, setSelected] = useState('Lucía Ramírez');
  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <PageHeader eyebrow="Panel administrador" title="Expedientes" subtitle="Últimas citas realizadas y perfiles clínicos de clientas." />
      <View style={[p.card, styles.secureNote]}><Text style={styles.secureIcon}>✧</Text><Text style={[p.muted, { flex: 1 }]}>Registro demostrativo · la información clínica debe revisarse en cada visita.</Text></View>
      <View><SectionTitle title="Citas recientes" action="Últimas 4" /><View style={styles.recordList}>{records.map(record => <TouchableOpacity key={record.client} activeOpacity={0.85} onPress={() => setSelected(selected === record.client ? '' : record.client)} style={[p.card, styles.record, selected === record.client && styles.recordSelected]}>
        <View style={p.row}><View style={styles.avatar}><Text style={styles.initials}>{record.initials}</Text></View><View style={{ flex: 1 }}><Text style={styles.client}>{record.client}</Text><Text style={p.muted}>{record.date} · {record.stylist}</Text></View><Text style={styles.expand}>{selected === record.client ? '−' : '+'}</Text></View>
        <View style={styles.serviceBox}><Text style={styles.serviceLabel}>SERVICIO APLICADO</Text><Text style={styles.service}>{record.service}</Text></View>
        {selected === record.client && <View style={styles.clinical}><View style={p.row}><Text style={styles.clinicalTitle}>Perfil clínico</Text><StatusPill label="Actualizado" tone="olive" /></View><Clinical label="Cabello" value={record.hair} /><Clinical label="Alergias" value={record.allergies} /><Clinical label="Tratamiento / seguimiento" value={record.plan} /></View>}
      </TouchableOpacity>)}</View></View>
      <Text style={styles.footnote}>Selecciona una cita para ver los detalles de su perfil.</Text>
    </ScrollView>
  );
}

function Clinical({ label, value }: { label: string; value: string }) { return <View style={styles.clinicalRow}><Text style={styles.clinicalLabel}>{label}</Text><Text style={styles.clinicalValue}>{value}</Text></View>; }
const styles = StyleSheet.create({
  secureNote: { backgroundColor: colors.beige[100], flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }, secureIcon: { fontSize: 20, color: colors.primary[500] }, recordList: { gap: 10 }, record: { gap: 12, padding: 14 }, recordSelected: { borderColor: colors.primary[300] }, avatar: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' }, initials: { color: colors.primary[600], fontSize: 11, fontWeight: '700' }, client: { color: colors.ink[800], fontSize: 13, fontWeight: '700' }, expand: { color: colors.primary[500], fontSize: 23, fontWeight: '300' },
  serviceBox: { padding: 10, backgroundColor: colors.beige[50], borderRadius: 11 }, serviceLabel: { color: colors.beige[500], fontSize: 8, fontWeight: '700', letterSpacing: 1 }, service: { color: colors.ink[800], fontSize: 12, fontWeight: '700', marginTop: 4 }, clinical: { paddingTop: 4, gap: 8 }, clinicalTitle: { color: colors.ink[800], fontWeight: '700', fontSize: 13 }, clinicalRow: { paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.beige[100], gap: 3 }, clinicalLabel: { color: colors.beige[500], fontWeight: '700', fontSize: 9, letterSpacing: 0.6 }, clinicalValue: { color: colors.ink[700], fontSize: 11, lineHeight: 16 }, footnote: { color: colors.beige[500], textAlign: 'center', fontSize: 10 },
});
