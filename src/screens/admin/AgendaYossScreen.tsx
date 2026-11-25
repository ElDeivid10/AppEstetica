import React, { useState, useMemo } from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { PageHeader, SectionTitle, StatusPill, pageStyles as p } from '@/components/SalonUI';
import { useSalon, AppointmentItem } from '@/context/SalonContext';
import { theme } from '@/constants/YossTheme';

const { colors } = theme;

const DIAS_LARGO = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
const MESES_LARGO = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

function formatDaySectionHeader(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  return `${DIAS_LARGO[dt.getDay()]}, ${d} ${MESES_LARGO[m - 1]} ${y}`;
}

export default function AgendaYossScreen() {
  const { appointments, clientsList, updateAppointmentStatus } = useSalon();
  const [range, setRange] = useState<'Todas' | 'Semana' | 'Mes'>('Todas');
  const [showFilter, setShowFilter] = useState(false);

  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const dd = String(hoy.getDate()).padStart(2, '0');
  const todayIso = `${yyyy}-${mm}-${dd}`;
  const weekLimitDate = new Date(hoy);
  weekLimitDate.setDate(hoy.getDate() + 7);
  const weekLimitIso = `${weekLimitDate.getFullYear()}-${String(weekLimitDate.getMonth() + 1).padStart(2, '0')}-${String(weekLimitDate.getDate()).padStart(2, '0')}`;
  const monthPrefix = `${yyyy}-${mm}`;

  const filtered = useMemo(() => {
    return appointments.filter((item) => {
      if (range === 'Semana') return item.isoDate >= todayIso && item.isoDate <= weekLimitIso;
      if (range === 'Mes') return item.isoDate.startsWith(monthPrefix);
      return true;
    });
  }, [appointments, range, todayIso, weekLimitIso, monthPrefix]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, AppointmentItem[]>>((result, item) => {
      (result[item.isoDate] ||= []).push(item);
      return result;
    }, {});
  }, [filtered]);

  const clientPhotoById = useMemo(() => {
    const map = new Map<string, string | undefined>();
    clientsList.forEach((c) => map.set(c.id, c.avatarUri));
    return map;
  }, [clientsList]);

  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <PageHeader eyebrow="Panel administrador" title="Agenda" subtitle="Todas las citas en tiempo real, ordenadas por fecha y hora." />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilter(!showFilter)}>
          <Text style={styles.filterIcon}>☷</Text>
          <Text style={styles.filterText}>Filtrar</Text>
        </TouchableOpacity>
      </View>

      {showFilter && (
        <View style={styles.filterMenu}>
          <Text style={styles.filterLabel}>MOSTRAR POR</Text>
          {(['Todas', 'Semana', 'Mes'] as const).map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => {
                setRange(option);
                setShowFilter(false);
              }}
              style={[styles.filterOption, range === option && styles.filterOptionActive]}
            >
              <Text style={[styles.filterOptionText, range === option && styles.filterOptionTextActive]}>
                {option === 'Todas' ? 'Todas las citas' : option === 'Semana' ? 'Próximos 7 días' : 'Este mes'}
              </Text>
              {range === option && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={[p.card, styles.summary]}>
        <View>
          <Text style={styles.summaryLabel}>CITAS ({range.toUpperCase()})</Text>
          <Text style={styles.summaryNumber}>{filtered.length}</Text>
          <Text style={styles.summaryCaption}>registros en agenda</Text>
        </View>
        <View style={styles.summaryIcon}>
          <Text style={{ fontSize: 23 }}>🗓️</Text>
        </View>
      </View>

      {filtered.length === 0 ? (
        <View style={[p.card, styles.emptyCard]}>
          <Text style={{ fontSize: 32 }}>🗓️</Text>
          <Text style={styles.emptyTitle}>Sin citas registradas</Text>
          <Text style={[p.muted, { textAlign: 'center' }]}>
            Cuando tus clientas agenden citas desde la aplicación, aparecerán aquí automáticamente en tiempo real.
          </Text>
        </View>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <View key={date}>
            <SectionTitle
              title={formatDaySectionHeader(date)}
              action={`${items.length} ${items.length === 1 ? 'cita' : 'citas'}`}
            />
            <View style={styles.dayList}>
              {items.map((item) => {
                const initials =
                  item.client
                    .trim()
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() || 'CL';
                const photo = item.clientId ? clientPhotoById.get(item.clientId) : undefined;
                const canFinalize = item.status === 'Aceptada' || item.status === 'En proceso' || item.status === 'Solicitud';

                return (
                  <View key={item.id} style={[p.card, styles.appointmentCard]}>
                    <View style={styles.appointment}>
                      <View style={styles.timeCol}>
                        <Text style={styles.time}>{item.time}</Text>
                        <View style={styles.timeline} />
                      </View>
                      {photo ? (
                        <Image source={{ uri: photo }} style={styles.avatarPhoto} contentFit="cover" />
                      ) : (
                        <View style={styles.avatar}>
                          <Text style={styles.initials}>{initials}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.client}>{item.client}</Text>
                        <Text style={p.muted}>{item.service}</Text>
                        <Text style={styles.payment}>{item.paid || item.detail}</Text>
                      </View>
                      <StatusPill label={item.status} tone={item.tone} />
                    </View>

                    {canFinalize && (
                      <View style={styles.actionRow}>
                        {item.status !== 'Aceptada' && (
                          <TouchableOpacity
                            style={styles.actionAccept}
                            onPress={() => updateAppointmentStatus(item.id, 'Aceptada')}
                          >
                            <Text style={styles.actionAcceptText}>✓ Aceptar</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.actionDone}
                          onPress={() => updateAppointmentStatus(item.id, 'Finalizada')}
                        >
                          <Text style={styles.actionDoneText}>★ Finalizar visita</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionNoShow}
                          onPress={() => updateAppointmentStatus(item.id, 'No asistió')}
                        >
                          <Text style={styles.actionNoShowText}>No asistió</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  filterButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.beige[200], backgroundColor: colors.white, borderRadius: 12, marginTop: 25 },
  filterIcon: { color: colors.primary[500], fontSize: 16 },
  filterText: { color: colors.ink[800], fontSize: 11, fontWeight: '700' },
  filterMenu: { padding: 12, borderRadius: 14, backgroundColor: colors.white, borderColor: colors.beige[200], borderWidth: 1, gap: 5 },
  filterLabel: { color: colors.beige[500], fontWeight: '700', letterSpacing: 1, fontSize: 9, marginBottom: 4 },
  filterOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderRadius: 10 },
  filterOptionActive: { backgroundColor: colors.primary[50] },
  filterOptionText: { color: colors.ink[700], fontSize: 12 },
  filterOptionTextActive: { color: colors.primary[600], fontWeight: '700' },
  check: { color: colors.primary[600], fontWeight: '700' },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.ink[800], borderColor: colors.ink[800] },
  summaryLabel: { color: colors.primary[200], fontWeight: '700', letterSpacing: 1.2, fontSize: 9 },
  summaryNumber: { color: colors.white, fontSize: 30, fontWeight: '700' },
  summaryCaption: { color: '#D2D2C8', fontSize: 10 },
  summaryIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#FFFFFF20', alignItems: 'center', justifyContent: 'center' },
  emptyCard: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.ink[800] },
  dayList: { gap: 8, marginTop: -3 },
  appointmentCard: { padding: 12, gap: 10 },
  appointment: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeCol: { alignItems: 'center', width: 43 },
  time: { color: colors.ink[800], fontWeight: '700', fontSize: 11 },
  timeline: { width: 1, height: 28, backgroundColor: colors.beige[200], marginTop: 5 },
  avatar: { height: 36, width: 36, borderRadius: 13, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  avatarPhoto: { height: 36, width: 36, borderRadius: 13, borderWidth: 1, borderColor: colors.primary[400] },
  initials: { fontSize: 10, fontWeight: '700', color: colors.primary[600] },
  client: { fontSize: 12, fontWeight: '700', color: colors.ink[800] },
  payment: { color: colors.primary[500], fontSize: 9, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.beige[100], paddingTop: 8 },
  actionAccept: { backgroundColor: colors.primary[50], borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.primary[200] },
  actionAcceptText: { color: colors.primary[700], fontSize: 10, fontWeight: '700' },
  actionDone: { backgroundColor: colors.primary[500], borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionDoneText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  actionNoShow: { backgroundColor: '#FCE7E7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionNoShowText: { color: '#A83333', fontSize: 10, fontWeight: '700' },
});
