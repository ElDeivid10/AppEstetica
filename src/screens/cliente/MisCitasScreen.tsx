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

import React, { useState, useMemo, useEffect } from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { PageHeader, SectionTitle, StatusPill, pageStyles as p } from '@/components/SalonUI';
import { useSalon, AppointmentItem, OccupiedSlot, SalonDaySchedule, DEFAULT_SALON_HOURS } from '@/context/SalonContext';
import { theme } from '@/constants/YossTheme';
import MercadoPagoModal from '@/components/MercadoPagoModal';

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
 * con cálculo real de saturación basado exclusivamente en las citas ocupadas en Supabase.
 */
function generar4DiasProximos(
  occupiedSlots: OccupiedSlot[],
  salonHours: SalonDaySchedule[] = DEFAULT_SALON_HOURS
): DiaSaturacion[] {
  const result: DiaSaturacion[] = [];
  const hoy = new Date();
  const d = new Date(hoy);
  const nowMs = Date.now();

  while (result.length < 4) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    const schedule =
      salonHours.find((h) => h.diaSemana === dow) ||
      DEFAULT_SALON_HOURS.find((h) => h.diaSemana === dow);

    if (schedule && !schedule.esCerrado) { // El salón no atiende domingos ni días cerrados
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const iso = `${yyyy}-${mm}-${dd}`;

      // Capacidad total según horario oficial: Sáb = 420m (7h), Lun-Vie = 360m (6h)
      const totalCapacidadMin = dow === 6 ? 420 : 360;

      // Calcular minutos reales de citas activas en esta fecha
      const citasDelDia = occupiedSlots.filter(a => {
        if (a.isoDate !== iso) return false;
        if (a.status === 'No asistió' || a.status === 'Expirada' || a.status === 'Cancelada') return false;
        if (a.status === 'Pendiente anticipo' && a.expiresAt && nowMs > a.expiresAt) return false;
        return true;
      });
      const minutosDeCitas = citasDelDia.reduce((acc, c) => acc + (c.durationMin || 30), 0);

      const totalOcupado = Math.min(totalCapacidadMin, minutosDeCitas);
      const sat = Math.min(100, Math.round((totalOcupado / totalCapacidadMin) * 100));
      const ocupadas = citasDelDia.length;
      const totalCitas = Math.round(totalCapacidadMin / 45);

      let nivel: NivelSaturacion = 'baja';
      let color = '#2E7D32';
      let bg = '#E8F5E9';
      let border = '#A5D6A7';
      let label = 'Disponibilidad alta';
      let descripcion = 'Excelente día para agendar; turnos matutinos y vespertinos disponibles.';

      if (sat >= 75) {
        nivel = 'alta';
        color = '#C62828';
        bg = '#FFEBEE';
        border = '#FFCDD2';
        label = 'Casi lleno (Alta saturación)';
        descripcion = 'Queda muy poco tiempo libre. Solo servicios breves (cortes o perfilado) son posibles.';
      } else if (sat >= 45) {
        nivel = 'media';
        color = '#B45309';
        bg = '#FFFBEB';
        border = '#FDE68A';
        label = 'Disponibilidad moderada';
        descripcion = 'Turnos moderados; te sugerimos agendar con anticipación para asegurar tu espacio.';
      }

      result.push({
        iso,
        dayName: DIAS_ES[dow],
        dayNum: d.getDate(),
        month: MESES_CORTOS[d.getMonth()],
        monthFull: MESES_LARGOS[d.getMonth()],
        saturacion: sat,
        nivel,
        citasOcupadas: ocupadas,
        totalCitas,
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
//  COMPONENTE
// ─────────────────────────────────────────────────────────────────────────────
export default function MisCitasScreen({ onNavigateToAgendar }: Props) {
  const { appointments, occupiedSlots, salonHours, clientProfile, updateAppointmentPayment, switchPaymentToCash } = useSalon();
  const dias = useMemo(() => generar4DiasProximos(occupiedSlots, salonHours), [occupiedSlots, salonHours]);
  const [selectedIso, setSelectedIso] = useState<string>(dias[0]?.iso ?? '');

  // Estado para el modal de Mercado Pago
  const [selectedAptForPayment, setSelectedAptForPayment] = useState<AppointmentItem | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Reloj en tiempo real para el temporizador de 15 minutos en citas pendientes
  const [nowTime, setNowTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const diaActual = dias.find((d) => d.iso === selectedIso) ?? dias[0];

  // Citas reales de la clienta actual (ya filtradas por cliente_id en SalonContext)
  const clientAppointments = appointments;

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
            Solicitar este día
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
          La disponibilidad se calcula en tiempo real con la agenda de Yoss.
        </Text>
      </View>

      {/* ══════════════ SEGUIMIENTO E HISTORIAL ══════════════ */}
      <View>
        <SectionTitle
          title="Seguimiento e historial"
          action={`${clientAppointments.length} registros`}
        />
        <View style={styles.list}>
          {clientAppointments.length === 0 ? (
            <View style={[p.card, { alignItems: 'center', paddingVertical: 28, gap: 6 }]}>
              <Text style={{ fontSize: 28 }}>🗓️</Text>
              <Text style={styles.service}>Aún no tienes citas registradas</Text>
              <Text style={[p.muted, { textAlign: 'center' }]}>
                Selecciona un día arriba o toca "Agendar cita en otra fecha" para reservar tu primera visita.
              </Text>
            </View>
          ) : clientAppointments.map((item, i) => (
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

              {/* ── ALERTA DE ANTICIPO PENDIENTE CON TEMPORIZADOR Y CAMBIO A EFECTIVO ── */}
              {item.status === 'Pendiente anticipo' && (() => {
                const diffSec = item.expiresAt ? Math.max(0, Math.floor((item.expiresAt - nowTime) / 1000)) : null;
                const isExpired = diffSec !== null && diffSec <= 0;
                const min = diffSec !== null ? Math.floor(diffSec / 60) : 0;
                const sec = diffSec !== null ? diffSec % 60 : 0;
                const timeStr = `${min}:${sec < 10 ? '0' : ''}${sec}`;

                if (isExpired) {
                  return (
                    <View style={styles.anticipoExpiredBox}>
                      <Text style={styles.anticipoExpiredIcon}>⏱️</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.anticipoExpiredTitle}>Tiempo de apartado agotado (15 min)</Text>
                        <Text style={styles.anticipoExpiredSub}>
                          El horario ha sido liberado para permitir que otra clienta pueda agendar. Puedes volver a solicitar tu cita en cualquier momento.
                        </Text>
                      </View>
                    </View>
                  );
                }

                return (
                  <View style={styles.anticipoActionBox}>
                    <View style={styles.anticipoActionHeader}>
                      <Text style={styles.anticipoActionIcon}>💳</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.anticipoActionTitle}>Anticipo pendiente con Mercado Pago</Text>
                        <Text style={styles.anticipoActionSub}>
                          Para asegurar tu turno y fórmulas, completa tu anticipo. Tu cita se valida y aprueba automáticamente.
                        </Text>
                      </View>
                    </View>

                    {/* Temporizador de límite de tiempo (15 min) */}
                    {diffSec !== null && (
                      <View style={styles.countdownBadge}>
                        <Text style={styles.countdownIcon}>⏱️</Text>
                        <Text style={styles.countdownText}>
                          Tiempo para asegurar tu lugar:{' '}
                          <Text style={styles.countdownBold}>{timeStr} min</Text>
                        </Text>
                      </View>
                    )}

                    {/* Botón Pagar Mercado Pago */}
                    <TouchableOpacity
                      style={styles.anticipoPagarBtn}
                      onPress={() => {
                        setSelectedAptForPayment(item);
                        setShowPaymentModal(true);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.anticipoPagarBtnIcon}>💙</Text>
                      <Text style={styles.anticipoPagarBtnText}>
                        Pagar anticipo con Mercado Pago (${item.depositAmount || 300} MXN)
                      </Text>
                      <Text style={styles.anticipoPagarBtnArrow}>→</Text>
                    </TouchableOpacity>

                    {/* Opción de cambiar a Efectivo antes de que expire el tiempo */}
                    {item.canSwitchToCash && (
                      <TouchableOpacity
                        style={styles.switchCashBtn}
                        onPress={() => switchPaymentToCash(item.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.switchCashBtnIcon}>💵</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.switchCashBtnTitle}>Cambiar a pago en Efectivo (en salón)</Text>
                          <Text style={styles.switchCashBtnSub}>
                            ¿Te equivocaste de método? Confirma tu cita al instante y paga al acudir al salón
                          </Text>
                        </View>
                        <Text style={styles.switchCashBtnArrow}>✓</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}

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

      {/* ── Modal Oficial de Mercado Pago ── */}
      <MercadoPagoModal
        visible={showPaymentModal && !!selectedAptForPayment}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedAptForPayment(null);
        }}
        servicioNombre={selectedAptForPayment?.service}
        fechaHora={
          selectedAptForPayment
            ? `${selectedAptForPayment.date} · ${selectedAptForPayment.time}`
            : undefined
        }
        montoAnticipo={selectedAptForPayment?.depositAmount || 300}
        clienteNombre={clientProfile.name}
        onConfirmPayment={note => {
          if (selectedAptForPayment) {
            updateAppointmentPayment(selectedAptForPayment.id, note);
          }
          setShowPaymentModal(false);
          setSelectedAptForPayment(null);
        }}
        onPayLater={() => {
          setShowPaymentModal(false);
          setSelectedAptForPayment(null);
        }}
      />
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

  // ── Alerta y Botón de Anticipo Mercado Pago en Mis Citas ──
  anticipoActionBox: {
    backgroundColor: '#F3F8FB',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#B3E5FC',
    padding: 12,
    gap: 10,
  },
  anticipoActionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  anticipoActionIcon: { fontSize: 18, marginTop: 1 },
  anticipoActionTitle: { fontSize: 12, fontWeight: '700', color: '#0277BD' },
  anticipoActionSub: { fontSize: 11, color: colors.ink[700], marginTop: 2, lineHeight: 15 },
  anticipoPagarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#009EE3',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: borderRadius.pill,
    ...shadow.button,
  },
  anticipoPagarBtnIcon: { fontSize: 16 },
  anticipoPagarBtnText: { flex: 1, color: colors.white, fontSize: 12, fontWeight: '800' },
  anticipoPagarBtnArrow: { color: colors.white, fontSize: 16, fontWeight: '800' },

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

  // ── Expiración y cambio a efectivo ──
  anticipoExpiredBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    padding: 12,
  },
  anticipoExpiredIcon: {
    fontSize: 22,
  },
  anticipoExpiredTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  anticipoExpiredSub: {
    fontSize: 11,
    color: '#7F1D1D',
    marginTop: 2,
    lineHeight: 16,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: borderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  countdownIcon: {
    fontSize: 13,
  },
  countdownText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
  },
  countdownBold: {
    fontWeight: '800',
    color: '#B45309',
  },
  switchCashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary[300],
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  switchCashBtnIcon: {
    fontSize: 18,
  },
  switchCashBtnTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary[700],
  },
  switchCashBtnSub: {
    fontSize: 10,
    color: colors.ink[700],
    marginTop: 1,
  },
  switchCashBtnArrow: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary[600],
  },
});
