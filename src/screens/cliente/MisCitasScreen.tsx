import React, { useState } from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { PageHeader, SectionTitle, StatusPill, pageStyles as p } from '@/components/SalonUI';
import { theme } from '@/constants/YossTheme';

const { colors } = theme;
const dates = [
  { day: 'Lun', date: '27', month: 'Oct' }, { day: 'Mar', date: '28', month: 'Oct' },
  { day: 'Mié', date: '29', month: 'Oct' }, { day: 'Jue', date: '30', month: 'Oct' },
];
type Appointment = { service: string; date: string; time: string; status: string; tone: 'olive' | 'amber' | 'red' | 'gray'; detail: string };
const initial: Appointment[] = [
  { service: 'Retoque de raíz', date: 'Mié, 22 oct', time: '11:00', status: 'Aceptada', tone: 'olive', detail: 'Confirmada por Yoss Beauty Salon' },
  { service: 'Tratamiento hidratante', date: 'Vie, 17 oct', time: '16:00', status: 'Finalizada', tone: 'gray', detail: 'Atendida por Yoss · hace 4 días' },
  { service: 'Baño de color', date: 'Lun, 13 oct', time: '12:30', status: 'No asistió', tone: 'red', detail: 'La cita quedó registrada como inasistencia' },
];

export default function MisCitasScreen() {
  const [selectedDate, setSelectedDate] = useState('27');
  const [appointments, setAppointments] = useState(initial);
  const [requested, setRequested] = useState(false);
  const requestDate = () => {
    if (requested) return;
    const picked = dates.find(d => d.date === selectedDate)!;
    setAppointments([{ service: 'Solicitud de cita', date: `${picked.day}, ${picked.date} ${picked.month}`, time: 'Horario por confirmar', status: 'En proceso', tone: 'amber', detail: 'Tu solicitud está pendiente de revisión' }, ...appointments]);
    setRequested(true);
  };
  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <PageHeader eyebrow="Tu agenda" title="Mis citas" subtitle="Solicita un día y sigue el estado de cada visita." />
      <View style={[p.card, { gap: 13 }]}>
        <View><Text style={styles.formTitle}>Solicitar una cita</Text><Text style={p.muted}>Elige el día que te gustaría venir. El horario se confirma después.</Text></View>
        <View style={styles.dateRail}>{dates.map(item => <TouchableOpacity key={item.date} onPress={() => setSelectedDate(item.date)} style={[styles.dateOption, selectedDate === item.date && styles.dateOptionActive]}>
          <Text style={[styles.dateLabel, selectedDate === item.date && styles.activeText]}>{item.day}</Text><Text style={[styles.dateNumber, selectedDate === item.date && styles.activeText]}>{item.date}</Text><Text style={[styles.dateLabel, selectedDate === item.date && styles.activeText]}>{item.month}</Text>
        </TouchableOpacity>)}</View>
        <TouchableOpacity style={[p.button, requested && { backgroundColor: colors.primary[300] }]} onPress={requestDate}><Text style={p.buttonText}>{requested ? 'Solicitud enviada ✓' : 'Solicitar este día'}</Text></TouchableOpacity>
        <Text style={styles.helper}>Los datos son una demostración; todavía no se envían al salón.</Text>
      </View>
      <View>
        <SectionTitle title="Seguimiento e historial" action={`${appointments.length} registros`} />
        <View style={styles.list}>{appointments.map((item, i) => <View key={`${item.date}-${i}`} style={[p.card, styles.appointmentCard]}>
          <View style={p.row}><View style={styles.serviceBadge}>{item.status === 'Finalizada' ? '✓' : item.status === 'No asistió' ? '!' : '✦'}</View><View style={{ flex: 1 }}><Text style={styles.service}>{item.service}</Text><Text style={p.muted}>{item.date} · {item.time}</Text></View><StatusPill label={item.status} tone={item.tone} /></View>
          <Text style={styles.detail}>{item.detail}</Text>
          {item.status === 'En proceso' && <View style={styles.progress}><View style={styles.progressTrack}><View style={styles.progressFill} /></View><Text style={styles.progressText}>Solicitud recibida · esperando confirmación</Text></View>}
        </View>)}</View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  formTitle: { color: colors.ink[800], fontWeight: '700', fontSize: 16, marginBottom: 4 },
  dateRail: { flexDirection: 'row', justifyContent: 'space-between', gap: 7 },
  dateOption: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.beige[100], borderWidth: 1, borderColor: colors.beige[100] },
  dateOptionActive: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] }, dateLabel: { fontSize: 9, color: colors.ink[700] }, dateNumber: { fontSize: 18, color: colors.ink[800], fontWeight: '700' }, activeText: { color: colors.white },
  helper: { color: colors.beige[500], fontSize: 10, textAlign: 'center' }, list: { gap: 10 }, appointmentCard: { gap: 12 },
  serviceBadge: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.primary[50], color: colors.primary[600], fontWeight: '700' },
  service: { color: colors.ink[800], fontSize: 13, fontWeight: '700' }, detail: { borderTopWidth: 1, borderTopColor: colors.beige[100], paddingTop: 10, color: colors.ink[700], fontSize: 11 },
  progress: { gap: 6 }, progressTrack: { height: 4, backgroundColor: colors.beige[100], borderRadius: 4 }, progressFill: { height: 4, width: '42%', backgroundColor: '#D5A541', borderRadius: 4 }, progressText: { color: '#946200', fontSize: 10, fontWeight: '600' },
});
