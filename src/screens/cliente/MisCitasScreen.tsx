/**
 * MisCitasScreen.tsx
 *
 * Pantalla principal de citas del cliente:
 * 1. Widget "Solicitar una cita":
 *    - 4 días próximos en fila con visualización de saturación de citas (Baja, Media, Alta).
 *    - Al presionar "Solicitar este día", abre AgendarCitaScreen con esa fecha ya seleccionada
 *      (el usuario solo elige el servicio y el horario disponible).
 *    - Botón secundario "Agendar cita en otra fecha" para elegir cualquier otra fecha.
 * 2. Historial y seguimiento de citas previas.
 * 3. Aviso de la regla de penalización por cancelaciones.
 */

import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { PageHeader, SectionTitle, StatusPill, pageStyles as p } from '@/components/SalonUI';
import { useSalon } from '@/context/SalonContext';
import { theme } from '@/constants/YossTheme';

const { colors, borderRadius, shadow, spacing } = theme;

// ─────────────────────────────────────────────────────────────────────────────
//  TIPOS
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  onNavigateToAgendar?: (fechaPreseleccionada?: string) => void;
}

type Appointment = {
  service: string;
  date: string;
  time: string;
  status: string;
  tone: 'olive' | 'amber' | 'red' | 'gray';
  detail: string;
};

type NivelSaturacion = 'baja' | 'media' | 'alta';

interface DiaSaturacion {
  iso: string;            // YYYY-MM-DD
  dayName: string;        // Lun, Mar...
  dayNum: number;         // 27, 28...
  month: string;          // Oct, Nov...
  monthFull: string;
  saturacion: number;     // Porcentaje: 30, 60, 85...
  nivel: NivelSaturacion;
  citasOcupadas: number;
  totalCitas: number;
  color: string;
  bg: string;
  border: string;
  label: string;
  descripcion: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  UTILIDADES
// ─────────────────────────────────────────────────────────────────────────────
const DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/**
 * Genera los próximos 4 días laborables del salón (excluyendo domingos)
 * con datos simulados de saturación de citas (DB-ready).
 */
function generar4DiasProximos(): DiaSaturacion[] {
  const result: DiaSaturacion[] = [];
  const hoy = new Date();
  const d = new Date(hoy);

  // Mocks de saturación predefinidos para dar dinamismo
  const saturacionesMock = [
    { sat: 30, ocupadas: 3, total: 10, nivel: 'baja' as NivelSaturacion },
    { sat: 60, ocupadas: 6, total: 10, nivel: 'media' as NivelSaturacion },
    { sat: 40, ocupadas: 4, total: 10, nivel: 'baja' as NivelSaturacion },
    { sat: 85, ocupadas: 8, total: 10, nivel: 'alta' as NivelSaturacion },
  ];

  while (result.length < 4) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0) { // El salón no atiende domingos
      const idx = result.length;
      const config = saturacionesMock[idx];
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');

      let color = '#2E7D32';
      let bg = '#E8F5E9';
      let border = '#A5D6A7';
      let label = 'Disponibilidad alta';
      let descripcion = 'Excelente día para agendar; muchos turnos disponibles.';

      if (config.nivel === 'media') {
        color = '#B45309';
        bg = '#FFFBEB';
        border = '#FDE68A';
        label = 'Disponibilidad media';
        descripcion = 'Turnos moderados; te sugerimos agendar con tiempo.';
      } else if (config.nivel === 'alta') {
        color = '#C62828';
        bg = '#FFEBEE';
        border = '#FFCDD2';
        label = 'Casi lleno';
        descripcion = 'Alta demanda; quedan muy pocos horarios libres.';
      }

      result.push({
        iso: `${yyyy}-${mm}-${dd}`,
        dayName: DIAS_ES[dow],
        dayNum: d.getDate(),
        month: MESES_CORTOS[d.getMonth()],
        monthFull: MESES_LARGOS[d.getMonth()],
        saturacion: config.sat,
        nivel: config.nivel,
        citasOcupadas: config.ocupadas,
        totalCitas: config.total,
        color,
        bg,
        border,
        label,
        descripcion,
      });
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
//  HISTORIAL MOCK
// ─────────────────────────────────────────────────────────────────────────────
const HISTORIAL_MOCK: Appointment[] = [
  {
    service: 'Retoque de raíz',
    date: 'Mié, 22 oct',
    time: '11:00',
    status: 'Aceptada',
    tone: 'olive',
    detail: 'Confirmada por Yoss Beauty Salon',
  },
  {
    service: 'Tratamiento hidratante',
    date: 'Vie, 17 oct',
    time: '16:00',
    status: 'Finalizada',
    tone: 'gray',
    detail: 'Atendida por Yoss — hace 4 días',
  },
  {
    service: 'Baño de color',
    date: 'Lun, 13 oct',
    time: '12:30',
    status: 'No asistió',
    tone: 'red',
    detail: 'La cita quedó registrada como inasistencia',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENTE
// ─────────────────────────────────────────────────────────────────────────────
export default function MisCitasScreen({ onNavigateToAgendar }: Props) {
  const { appointments, clientProfile } = useSalon();
  const dias = useMemo(() => generar4DiasProximos(), []);
  const [selectedIso, setSelectedIso] = useState<string>(dias[0]?.iso ?? '');

  const diaActual = dias.find((d) => d.iso === selectedIso) ?? dias[0];

  // Citas de la clienta actual
  const clientAppointments = appointments.filter(a => a.client === clientProfile.name);

  function handleSolicitarEsteDia() {
    if (!diaActual) return;
    // Pasa la fecha ISO pre-seleccionada al formulario
    onNavigateToAgendar?.(diaActual.iso);
  }

  return (
    <ScrollView
      style={p.page}
      contentContainerStyle={p.scroll}
      showsVerticalScrollIndicator={false}
    >
      <PageHeader
        eyebrow="Tu agenda"
        title="Mis citas"
        subtitle="Solicita un día y sigue el estado de cada visita."
      />

      {/* ══════════════ RECUADRO "SOLICITAR UNA CITA" ══════════════ */}
      <View style={[p.card, styles.widgetCard]}>
        <View>
          <Text style={styles.formTitle}>Solicitar una cita</Text>
          <Text style={p.muted}>
            Elige el día que te gustaría venir. El horario se confirma después.
          </Text>
        </View>

        {/* ── Fila de 4 días con indicador de saturación ── */}
        <View style={styles.dateRail}>
          {dias.map((item) => {
            const isSelected = selectedIso === item.iso;
            return (
              <TouchableOpacity
                key={item.iso}
                onPress={() => setSelectedIso(item.iso)}
                style={[styles.dateOption, isSelected && styles.dateOptionActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.dateLabel, isSelected && styles.activeText]}>
                  {item.dayName}
                </Text>
                <Text style={[styles.dateNumber, isSelected && styles.activeText]}>
                  {item.dayNum}
                </Text>
                <Text style={[styles.dateLabel, isSelected && styles.activeText]}>
                  {item.month}
                </Text>

                {/* Badge de saturación */}
                <View
                  style={[
                    styles.satBadge,
                    isSelected ? styles.satBadgeSelected : { backgroundColor: item.bg },
                  ]}
                >
                  <View
                    style={[
                      styles.satDot,
                      { backgroundColor: isSelected ? colors.white : item.color },
                    ]}
                  />
                  <Text
                    style={[
                      styles.satText,
                      { color: isSelected ? colors.white : item.color },
                    ]}
                  >
                    {item.saturacion}%
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Tarjeta de información de saturación del día seleccionado ── */}
        {diaActual && (
          <View style={[styles.satBanner, { backgroundColor: diaActual.bg, borderColor: diaActual.border }]}>
            <View style={[styles.satIconDot, { backgroundColor: diaActual.color }]} />
            <View style={{ flex: 1 }}>
              <View style={styles.satBannerTitleRow}>
                <Text style={[styles.satBannerTitle, { color: diaActual.color }]}>
                  {diaActual.label}
                </Text>
                <Text style={[styles.satBannerCount, { color: diaActual.color }]}>
                  {diaActual.citasOcupadas}/{diaActual.totalCitas} citas
                </Text>
              </View>
              <Text style={styles.satBannerSub}>
                {diaActual.descripcion}
              </Text>
            </View>
          </View>
        )}

        {/* ── Botón Principal: "Solicitar este día" ── */}
        <TouchableOpacity
          style={p.button}
          onPress={handleSolicitarEsteDia}
          activeOpacity={0.88}
        >
          <Text style={p.buttonText}>
            Solicitar este día ({diaActual ? `${diaActual.dayName} ${diaActual.dayNum}` : ''})
          </Text>
        </TouchableOpacity>

        {/* ── Botón Secundario: "Agendar cita en otra fecha" ── */}
        <TouchableOpacity
          style={styles.btnOtraFecha}
          onPress={() => onNavigateToAgendar?.()}
          activeOpacity={0.8}
        >
          <Text style={styles.btnOtraFechaText}>📅  Agendar cita en otra fecha</Text>
        </TouchableOpacity>

        <Text style={styles.helper}>
          Los datos son una demostración; todavía no se envían al salón.
        </Text>
      </View>

      {/* ══════════════ SEGUIMIENTO E HISTORIAL ══════════════ */}
      <View>
        <SectionTitle
          title="Seguimiento e historial"
          action={`${clientAppointments.length} registros`}
        />
        <View style={styles.list}>
          {clientAppointments.map((item, i) => (
            <View key={`${item.id}-${i}`} style={[p.card, styles.appointmentCard]}>
              <View style={p.row}>
                <View style={styles.serviceBadge}>
                  <Text style={styles.serviceBadgeIcon}>
                    {item.status === 'Finalizada' ? '✓' : item.status === 'No asistió' ? '!' : '📅'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.service}>{item.service}</Text>
                  <Text style={p.muted}>
                    {item.date} · {item.time}
                  </Text>
                </View>
                <StatusPill label={item.status} tone={item.tone} />
              </View>

              <Text style={styles.detail}>{item.detail}</Text>

              {item.status === 'En proceso' && (
                <View style={styles.progress}>
                  <View style={styles.progressTrack}>
                    <View style={styles.progressFill} />
                  </View>
                  <Text style={styles.progressText}>
                    Solicitud recibida · esperando confirmación
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* ── Aviso regla de negocio: cancelaciones ── */}
      <View style={styles.cancelNote}>
        <Text style={styles.cancelNoteText}>
          ⚠️  Acumular 3 cancelaciones suspende temporalmente tu cuenta. Si necesitas cancelar, hazlo con al menos 24 h de anticipación.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ESTILOS
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  widgetCard: {
    gap: 14,
    marginBottom: spacing.md,
  },
  formTitle: {
    color: colors.ink[800],
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },

  // ── Rail de 4 días ──
  dateRail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateOption: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 16,
    backgroundColor: colors.beige[100],
    borderWidth: 1.5,
    borderColor: colors.beige[100],
  },
  dateOptionActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
    ...shadow.card,
  },
  dateLabel: {
    fontSize: 10,
    color: colors.ink[700],
    fontWeight: '600',
  },
  dateNumber: {
    fontSize: 22,
    color: colors.ink[800],
    fontWeight: '700',
    marginVertical: 1,
  },
  activeText: {
    color: colors.white,
  },

  // ── Badge de saturación en cada día ──
  satBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    marginTop: 4,
  },
  satBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  satDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  satText: {
    fontSize: 9,
    fontWeight: '700',
  },

  // ── Banner explicativo de saturación ──
  satBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: 12,
  },
  satIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  satBannerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  satBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  satBannerCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  satBannerSub: {
    fontSize: 11,
    color: colors.ink[700],
    marginTop: 2,
    lineHeight: 16,
  },

  // ── Botón "Agendar en otra fecha" ──
  btnOtraFecha: {
    borderWidth: 1.5,
    borderColor: colors.primary[500],
    borderRadius: borderRadius.button,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: colors.transparent,
  },
  btnOtraFechaText: {
    color: colors.primary[500],
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.2,
  },

  helper: {
    color: colors.beige[500],
    fontSize: 10,
    textAlign: 'center',
  },

  // ── Historial ──
  list: { gap: 10 },
  appointmentCard: { gap: 12 },
  serviceBadge: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.primary[50],
  },
  serviceBadgeIcon: { fontSize: 16 },
  service: { color: colors.ink[800], fontSize: 13, fontWeight: '700' },
  detail: {
    borderTopWidth: 1,
    borderTopColor: colors.beige[100],
    paddingTop: 10,
    color: colors.ink[700],
    fontSize: 11,
  },
  progress: { gap: 6 },
  progressTrack: { height: 4, backgroundColor: colors.beige[100], borderRadius: 4 },
  progressFill: {
    height: 4,
    width: '42%',
    backgroundColor: '#D5A541',
    borderRadius: 4,
  },
  progressText: { color: '#946200', fontSize: 10, fontWeight: '600' },

  // ── Regla de cancelaciones ──
  cancelNote: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: borderRadius.sm,
    padding: 12,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  cancelNoteText: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 17,
  },
});
