/**
 * AgendarCitaScreen.tsx
 * Formulario completo para solicitar una cita en Yoss Beauty Salon.
 *
 * Props:
 *   onNavigateBack       — vuelve a la pantalla previa
 *   fechaInicial?        — ISO YYYY-MM-DD pre-cargado desde el widget de Mis Citas
 *   servicioInicialId?   — ID de servicio pre-seleccionado desde Explorar, Catálogo o Recompensas
 *   isRecompensa?        — si la cita proviene de un canje de recompensa (100% gratis)
 *   recompensaNombre?    — nombre de la recompensa canjeada
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { PageHeader, StatusPill, pageStyles as p } from '@/components/SalonUI';
import {
  useSalon,
  AppointmentItem,
  ServiceCatalogItem,
  OccupiedSlot,
  SalonDaySchedule,
  DEFAULT_SALON_HOURS,
} from '@/context/SalonContext';
import { theme } from '@/constants/YossTheme';
import MercadoPagoModal from '@/components/MercadoPagoModal';

const { colors, borderRadius, shadow, spacing } = theme;

type Servicio = ServiceCatalogItem;

// ─────────────────────────────────────────────────────────────────────────────
//  UTILIDADES DE FECHA
// ─────────────────────────────────────────────────────────────────────────────
const DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export interface DiaDisponible {
  iso: string;
  dayName: string;
  dayNum: number;
  month: string;
  monthFull: string;
  year: number;
  isDisabled: boolean;
}

export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dateToIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function buildDia(d: Date): DiaDisponible {
  const dow = d.getDay();
  return {
    iso: dateToIso(d),
    dayName: DIAS_ES[dow],
    dayNum: d.getDate(),
    month: MESES_CORTOS[d.getMonth()],
    monthFull: MESES_LARGOS[d.getMonth()],
    year: d.getFullYear(),
    isDisabled: dow === 0, // Domingo cerrado
  };
}

function generarSemanaCompleta(): DiaDisponible[] {
  const result: DiaDisponible[] = [];
  const hoy = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    result.push(buildDia(d));
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
//  CALENDARIO MENSUAL COMPLETO
// ─────────────────────────────────────────────────────────────────────────────
interface CalendarioMes {
  year: number;
  month: number;
  semanas: (DiaDisponible | null)[][];
}

function generarCalendario(year: number, month: number): CalendarioMes {
  const primerDia = new Date(year, month, 1);
  const ultimoDia = new Date(year, month + 1, 0);
  const startDow = (primerDia.getDay() + 6) % 7;

  const totalDias = ultimoDia.getDate();
  const celdas: (DiaDisponible | null)[] = [];

  for (let i = 0; i < startDow; i++) celdas.push(null);
  for (let d = 1; d <= totalDias; d++) {
    celdas.push(buildDia(new Date(year, month, d)));
  }
  while (celdas.length % 7 !== 0) celdas.push(null);

  const semanas: (DiaDisponible | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) {
    semanas.push(celdas.slice(i, i + 7));
  }
  return { year, month, semanas };
}

// ─────────────────────────────────────────────────────────────────────────────
//  HORARIOS (SLOTS) CON HORARIOS REALES DEL SALÓN Y EVALUACIÓN DE CAPACIDAD HUMANA
// ─────────────────────────────────────────────────────────────────────────────
export interface TurnoSlot {
  hora: string;          // '11:00'
  minutosDesde0: number; // 660
  turno: 'manana' | 'tarde' | 'sabado';
  finTurnoMin: number;   // 840, 1140, 1080
}

export function timeStringToMinutes(t: string): number {
  const parts = t.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

export function minutesToTimeString(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Genera los slots según el horario oficial del salón (horarios_salon de Supabase):
 * - Lun-Vie: 11:00 am - 2:00 pm y 4:00 pm - 7:00 pm
 * - Sábados: 11:00 am - 6:00 pm (horario corrido)
 * - Domingos: Cerrado
 */
export function obtenerSlotsPorDia(
  dow: number,
  salonHours: SalonDaySchedule[] = DEFAULT_SALON_HOURS
): TurnoSlot[] {
  const schedule =
    salonHours.find((h) => h.diaSemana === dow) ||
    DEFAULT_SALON_HOURS.find((h) => h.diaSemana === dow);

  if (!schedule || schedule.esCerrado) return [];

  const slots: TurnoSlot[] = [];
  const t1Start = schedule.aperturaTurno1 ? timeStringToMinutes(schedule.aperturaTurno1) : 11 * 60;
  const t1End = schedule.cierreTurno1 ? timeStringToMinutes(schedule.cierreTurno1) : (dow === 6 ? 18 * 60 : 14 * 60);

  if (dow === 6 || !schedule.aperturaTurno2 || !schedule.cierreTurno2) {
    for (let m = t1Start; m < t1End; m += 30) {
      slots.push({ hora: minutesToTimeString(m), minutosDesde0: m, turno: 'sabado', finTurnoMin: t1End });
    }
    return slots;
  }

  for (let m = t1Start; m < t1End; m += 30) {
    slots.push({ hora: minutesToTimeString(m), minutosDesde0: m, turno: 'manana', finTurnoMin: t1End });
  }

  const t2Start = timeStringToMinutes(schedule.aperturaTurno2);
  const t2End = timeStringToMinutes(schedule.cierreTurno2);
  for (let m = t2Start; m < t2End; m += 30) {
    slots.push({ hora: minutesToTimeString(m), minutosDesde0: m, turno: 'tarde', finTurnoMin: t2End });
  }

  return slots;
}

export interface EvaluacionCapacidadDia {
  cerrado: boolean;
  capacidadTotalMin: number;
  minutosOcupados: number;
  minutosLibres: number;
  porcentajeSaturacion: number;
  saturacionExcedida: boolean;
  mensajeCapacidad?: string;
  slots: {
    hora: string;
    minutosDesde0: number;
    turno: 'manana' | 'tarde' | 'sabado';
    disponible: boolean;
    motivoDetalle?: string;
  }[];
}

export function evaluarCapacidadDia(
  dia: DiaDisponible,
  servicio: Servicio | null,
  appointments: (AppointmentItem | OccupiedSlot | { isoDate: string; time: string; service: string; status: string; expiresAt?: number; durationMin?: number })[],
  serviciosCatalogo: Servicio[] = [],
  salonHours: SalonDaySchedule[] = DEFAULT_SALON_HOURS
): EvaluacionCapacidadDia {
  const dow = isoToDate(dia.iso).getDay();
  const schedule =
    salonHours.find((h) => h.diaSemana === dow) ||
    DEFAULT_SALON_HOURS.find((h) => h.diaSemana === dow);

  if (!schedule || schedule.esCerrado) {
    return {
      cerrado: true,
      capacidadTotalMin: 0,
      minutosOcupados: 0,
      minutosLibres: 0,
      porcentajeSaturacion: 100,
      saturacionExcedida: true,
      mensajeCapacidad: 'El salón permanece cerrado este día.',
      slots: [],
    };
  }

  // Capacidad física total calculada desde horarios reales (Lun-Vie = 6h = 360m, Sáb = 7h = 420m)
  const t1Dur =
    schedule.aperturaTurno1 && schedule.cierreTurno1
      ? Math.max(0, timeStringToMinutes(schedule.cierreTurno1) - timeStringToMinutes(schedule.aperturaTurno1))
      : 0;
  const t2Dur =
    schedule.aperturaTurno2 && schedule.cierreTurno2
      ? Math.max(0, timeStringToMinutes(schedule.cierreTurno2) - timeStringToMinutes(schedule.aperturaTurno2))
      : 0;
  const capacidadTotalMin = t1Dur + t2Dur || (dow === 6 ? 420 : 360);
  const slotsBase = obtenerSlotsPorDia(dow, salonHours);

  // Citas existentes en este día (ignora citas canceladas, no asistidas, expiradas o con anticipo vencido)
  const nowMs = Date.now();
  const citasDelDia = appointments.filter(a => {
    if (a.isoDate !== dia.iso) return false;
    if (a.status === 'No asistió' || a.status === 'Expirada' || a.status === 'Cancelada') return false;
    if (a.status === 'Pendiente anticipo' && a.expiresAt && nowMs > a.expiresAt) return false;
    return true;
  });

  // Mapear cada cita existente a su ventana de tiempo [inicio, fin]
  const citasRangos = citasDelDia.map(cita => {
    const inicio = timeStringToMinutes(cita.time);
    let dur = cita.durationMin || 30;
    if (!cita.durationMin) {
      const match = serviciosCatalogo.find(s => s.nombre.toLowerCase() === cita.service.toLowerCase());
      if (match) dur = match.duracionMin;
      else if (cita.service.toLowerCase().includes('color') || cita.service.toLowerCase().includes('tinte')) dur = 150;
      else if (cita.service.toLowerCase().includes('alaciado')) dur = 180;
      else if (cita.service.toLowerCase().includes('maquillaje')) dur = 60;
      else if (cita.service.toLowerCase().includes('barba')) dur = 20;
    }

    return { inicio, fin: inicio + dur, dur, service: cita.service };
  });

  const minutosOcupados = Math.min(
    capacidadTotalMin,
    citasRangos.reduce((acc, c) => acc + c.dur, 0)
  );
  const minutosLibres = Math.max(0, capacidadTotalMin - minutosOcupados);
  const porcentajeSaturacion = Math.min(100, Math.round((minutosOcupados / capacidadTotalMin) * 100));

  const durReq = servicio ? servicio.duracionMin : 30;
  const saturacionExcedida = minutosLibres < durReq;

  let mensajeCapacidad: string | undefined = undefined;
  if (saturacionExcedida && servicio) {
    mensajeCapacidad = `⚠️ Capacidad diaria agotada para ${servicio.nombre}: A Yoss le restan ${minutosLibres} min libres este día. Se pueden agendar servicios breves (cortes de 30 min o perfilado de 20 min), pero para un servicio de ${durReq} min no es humanamente posible atenderte hoy con la máxima dedicación. Por favor selecciona otra fecha.`;
  }

  // Evaluar cada slot con respecto a la duración requerida y hora actual si es hoy
  const nowDate = new Date();
  const isToday = dia.iso === dateToIso(nowDate);
  const currentMinOfDay = nowDate.getHours() * 60 + nowDate.getMinutes();

  const slots = slotsBase.map(s => {
    const slotInicio = s.minutosDesde0;
    const slotFin = slotInicio + durReq;

    if (isToday && slotInicio <= currentMinOfDay + 15) {
      return {
        ...s,
        disponible: false,
        motivoDetalle: 'Hora pasada',
      };
    }

    // 1. ¿Cabe antes del fin del turno de trabajo?
    if (slotFin > s.finTurnoMin) {
      return {
        ...s,
        disponible: false,
        motivoDetalle: 'Tiempo insuficiente',
      };
    }

    // 2. ¿Choca con alguna cita existente?
    const colision = citasRangos.some(
      c => Math.max(slotInicio, c.inicio) < Math.min(slotFin, c.fin)
    );
    if (colision) {
      return {
        ...s,
        disponible: false,
        motivoDetalle: 'Ocupado',
      };
    }

    // 3. ¿La saturación global del día no da abasto para este servicio?
    if (saturacionExcedida) {
      return {
        ...s,
        disponible: false,
        motivoDetalle: 'Sin cupo',
      };
    }

    return {
      ...s,
      disponible: true,
      motivoDetalle: undefined,
    };
  });

  return {
    cerrado: false,
    capacidadTotalMin,
    minutosOcupados,
    minutosLibres,
    porcentajeSaturacion,
    saturacionExcedida,
    mensajeCapacidad,
    slots,
  };
}

interface Props {
  onNavigateBack: () => void;
  fechaInicial?: string;
  servicioInicialId?: string;
  isRecompensa?: boolean;
  recompensaNombre?: string;
}

export default function AgendarCitaScreen({
  onNavigateBack,
  fechaInicial,
  servicioInicialId,
  isRecompensa,
  recompensaNombre,
}: Props) {
  const { occupiedSlots, servicesCatalog, salonHours, addAppointment, clientProfile } = useSalon();
  const SERVICIOS = useMemo(() => servicesCatalog.filter(s => s.active), [servicesCatalog]);
  const semanaDias = useMemo(() => generarSemanaCompleta(), []);

  // Servicio inicial si se recibió por prop
  const srvPre = useMemo(() => {
    if (!servicioInicialId) return null;
    return SERVICIOS.find(s => s.id === servicioInicialId) ?? null;
  }, [servicioInicialId, SERVICIOS]);

  // Fecha inicial
  const fechaInicialObj = useMemo(() => {
    if (!fechaInicial) return null;
    return buildDia(isoToDate(fechaInicial));
  }, [fechaInicial]);

  // Estados principales
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(srvPre);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<DiaDisponible | null>(fechaInicialObj);
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null);
  const [notas, setNotas] = useState('');
  const [showMpModal, setShowMpModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'mercadopago'>(
    srvPre?.requiresDeposit ? 'mercadopago' : 'efectivo'
  );

  // Sincronizar servicio preseleccionado si el catálogo terminó de cargar después del mount
  useEffect(() => {
    if (srvPre && !servicioSeleccionado) {
      setServicioSeleccionado(srvPre);
      setMetodoPago(srvPre.requiresDeposit ? 'mercadopago' : 'efectivo');
      setStep(fechaSeleccionada ? 3 : 2);
    }
  }, [srvPre, servicioSeleccionado, fechaSeleccionada]);

  // Evaluación de saturación y capacidad humana autónoma usando ocupación real del salón
  const evalCapacidad = useMemo(() => {
    if (!fechaSeleccionada) return null;
    return evaluarCapacidadDia(fechaSeleccionada, servicioSeleccionado, occupiedSlots, SERVICIOS, salonHours);
  }, [fechaSeleccionada, servicioSeleccionado, occupiedSlots, SERVICIOS, salonHours]);

  // Paso activo (1: Servicio, 2: Fecha, 3: Horario)
  const initialStep: 1 | 2 | 3 = srvPre && fechaInicialObj ? 3 : srvPre ? 2 : 1;
  const [step, setStep] = useState<1 | 2 | 3>(initialStep);

  // Calendario mensual
  const hoy = new Date();
  const [calMes, setCalMes] = useState(hoy.getMonth());
  const [calAnio, setCalAnio] = useState(hoy.getFullYear());
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const calendario = useMemo(() => generarCalendario(calAnio, calMes), [calAnio, calMes]);

  // Éxito
  const [submitted, setSubmitted] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  function handleSelectServicio(srv: Servicio) {
    setServicioSeleccionado(srv);
    setHoraSeleccionada(null);
    if (srv.requiresDeposit) {
      setMetodoPago('mercadopago');
    } else {
      setMetodoPago('efectivo');
    }
    if (fechaSeleccionada) {
      setStep(3);
    } else {
      setStep(2);
    }
  }

  function handleSelectFecha(dia: DiaDisponible) {
    if (dia.isDisabled) return;
    setFechaSeleccionada(dia);
    setHoraSeleccionada(null);
    setMostrarCalendario(false);
    setStep(3);
  }

  function navMesAnterior() {
    if (calMes === 0) {
      setCalMes(11);
      setCalAnio(a => a - 1);
    } else {
      setCalMes(m => m - 1);
    }
  }

  function navMesSiguiente() {
    if (calMes === 11) {
      setCalMes(0);
      setCalAnio(a => a + 1);
    } else {
      setCalMes(m => m + 1);
    }
  }

  async function doConfirmAgendar(
    paidNote: string,
    status: 'Aceptada' | 'En proceso' | 'Solicitud' | 'Pendiente anticipo',
    method: 'efectivo' | 'mercadopago',
    expiresAt?: number,
    canSwitchToCash?: boolean
  ) {
    if (!servicioSeleccionado || !fechaSeleccionada || !horaSeleccionada || isSaving) return;

    setIsSaving(true);
    const createdId = await addAppointment({
      client: clientProfile.name,
      serviceId: servicioSeleccionado.id,
      service: servicioSeleccionado.nombre,
      date: `${fechaSeleccionada.dayName}, ${fechaSeleccionada.dayNum} ${fechaSeleccionada.month}`,
      isoDate: fechaSeleccionada.iso,
      time: horaSeleccionada,
      durationMin: servicioSeleccionado.duracionMin,
      status: isRecompensa ? 'Aceptada' : status,
      tone: isRecompensa ? 'olive' : status === 'Pendiente anticipo' ? 'amber' : 'olive',
      detail: isRecompensa
        ? `🎁 Beneficio de recompensa Club: ${recompensaNombre || 'Cortesía 100%'}`
        : status === 'Aceptada'
        ? method === 'efectivo'
          ? 'Cita confirmada automáticamente · Pago en efectivo en salón al llegar'
          : 'Cita confirmada automáticamente · Anticipo validado con Mercado Pago'
        : 'Anticipo pendiente con Mercado Pago · 15 minutos para completar pago',
      paid: isRecompensa ? 'Cortesía 100% Club Yoss' : paidNote,
      paymentMethod: method,
      expiresAt,
      canSwitchToCash,
      depositAmount: servicioSeleccionado.requiresDeposit ? (servicioSeleccionado.depositAmount || 300) : 0,
      isReward: isRecompensa,
      rewardNote: recompensaNombre,
      notes: notas.trim() || undefined,
    });
    setIsSaving(false);

    if (!createdId) {
      Alert.alert(
        'Error al guardar',
        'No se pudo registrar tu cita en la base de datos. Verifica tu conexión e intenta nuevamente.'
      );
      return;
    }

    setSubmitted(true);

    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 60,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }

  function handleConfirmar() {
    if (!servicioSeleccionado || !fechaSeleccionada || !horaSeleccionada) return;

    if (isRecompensa) {
      doConfirmAgendar('Cortesía 100% Club Yoss', 'Aceptada', 'efectivo');
      return;
    }

    if (metodoPago === 'efectivo') {
      // Efectivo: Aprobación inmediata automática sin intervención de Yoss
      doConfirmAgendar('Pago en efectivo en salón al llegar', 'Aceptada', 'efectivo');
    } else if (servicioSeleccionado.requiresDeposit) {
      // Mercado Pago para servicios con anticipo (Colorimetría, Alaciados): en pleno funcionamiento
      setShowMpModal(true);
    } else {
      // Mercado Pago para servicios cotidianos sin anticipo:
      // Queda como pendiente debido a que los servicios cotidianos no cuentan con precios fijos
      doConfirmAgendar(
        'Pago digital con Mercado Pago pendiente · Precio a cotizar en salón al evaluar tu cabello (sin precio fijo)',
        'En proceso',
        'mercadopago'
      );
    }
  }

  // ── PANTALLA DE ÉXITO ──────────────────────────────────────────────────────
  if (submitted && servicioSeleccionado && fechaSeleccionada && horaSeleccionada) {
    return (
      <ScrollView style={p.page} contentContainerStyle={[p.scroll, s.successContainer]}>
        <Animated.View style={[s.successCard, { transform: [{ scale: scaleAnim }] }]}>
          <View style={s.checkCircle}>
            <Text style={s.checkIcon}>✓</Text>
          </View>
          <Text style={s.successTitle}>¡Cita solicitada!</Text>
          <Text style={s.successSubtitle}>
            Se ha guardado en tu agenda y enviado la confirmación a tu bandeja de mensajes.
          </Text>

          <View style={s.summaryBlock}>
            <SummaryRow label="Servicio" value={servicioSeleccionado.nombre} />
            <SummaryRow
              label="Fecha"
              value={`${fechaSeleccionada.dayName}, ${fechaSeleccionada.dayNum} ${fechaSeleccionada.month} ${fechaSeleccionada.year}`}
            />
            <SummaryRow label="Hora" value={horaSeleccionada} />
            <SummaryRow label="Duración" value={servicioSeleccionado.duracion} />
            {isRecompensa ? (
              <SummaryRow
                label="Recompensa"
                value="100% Cubierto (Club Yoss)"
                isStatus
                tone="olive"
              />
            ) : (
              <SummaryRow
                label="Estado inicial"
                value={
                  metodoPago === 'efectivo'
                    ? 'Aceptada (Confirmada en automático)'
                    : servicioSeleccionado.requiresDeposit
                    ? 'Pendiente anticipo'
                    : 'En proceso (Pendiente cotización)'
                }
                isStatus
                tone={metodoPago === 'efectivo' ? 'olive' : 'amber'}
              />
            )}
            {notas ? <SummaryRow label="Notas" value={notas} /> : null}
          </View>

          {servicioSeleccionado.requiresDeposit && !isRecompensa && metodoPago === 'mercadopago' && (
            <View style={s.anticipoWarning}>
              <Text style={s.anticipoIcon}>⚠️</Text>
              <Text style={s.anticipoText}>
                Este servicio requiere un anticipo. Tienes 15 minutos para asegurar tu lugar o puedes pagarlo desde la sección de Mis Citas con Mercado Pago.
              </Text>
            </View>
          )}

          {!servicioSeleccionado.requiresDeposit && !isRecompensa && metodoPago === 'mercadopago' && (
            <View style={[s.anticipoWarning, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
              <Text style={s.anticipoIcon}>ℹ️</Text>
              <Text style={[s.anticipoText, { color: '#B45309' }]}>
                Has elegido Mercado Pago para un servicio sin precio fijo. Tu cita quedó en proceso para que Yoss cotice el costo en el salón al evaluar tu cabello, o puedes liquidar en efectivo al llegar.
              </Text>
            </View>
          )}

          <TouchableOpacity style={[p.button, { marginTop: 24, width: '100%' }]} onPress={onNavigateBack}>
            <Text style={p.buttonText}>Ver mis citas →</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        style={p.page}
        contentContainerStyle={p.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader
          eyebrow="Nueva cita"
          title={isRecompensa ? 'Agendar Recompensa' : 'Agendar cita'}
          subtitle={
            isRecompensa
              ? `Beneficio Club: ${recompensaNombre}. Elige tu fecha y horario.`
              : 'Selecciona el servicio, el día y el horario de tu preferencia.'
          }
        />

        <TouchableOpacity onPress={onNavigateBack} style={s.backBtn}>
          <Text style={s.backBtnText}>← Volver a Mis Citas</Text>
        </TouchableOpacity>

        {/* ── Banner de Recompensa Aplicada ── */}
        {isRecompensa && (
          <View style={s.recompensaBanner}>
            <Text style={s.recompensaIcon}>🎁</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.recompensaTitle}>Recompensa del Club Aplicada</Text>
              <Text style={s.recompensaSub}>{recompensaNombre} · 100% gratis en tu visita</Text>
            </View>
          </View>
        )}

        {/* ── Banner de Fecha Pre-seleccionada ── */}
        {fechaInicialObj && fechaSeleccionada && (
          <View style={s.fechaPreBanner}>
            <Text style={s.fechaPreIcon}>📅</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.fechaPreTitle}>
                {fechaSeleccionada.dayName} {fechaSeleccionada.dayNum} de {fechaSeleccionada.monthFull} {fechaSeleccionada.year}
              </Text>
              <Text style={s.fechaPreSub}>
                Fecha pre-cargada · Selecciona el servicio para ver horarios disponibles
              </Text>
            </View>
            <TouchableOpacity onPress={() => setStep(2)}>
              <Text style={s.cambiarFechaLink}>Cambiar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Indicador de 3 pasos */}
        <StepIndicator currentStep={step} hasFechaPrevia={!!fechaSeleccionada} />

        {/* ══════════════ PASO 1 — SERVICIO ══════════════ */}
        <View style={[p.card, s.stepCard]}>
          <StepHeader
            num={1}
            label="Selecciona el servicio"
            active={step === 1}
            done={!!servicioSeleccionado}
          />

          <View style={s.serviciosGrid}>
            {SERVICIOS.map(srv => {
              const isSelected = servicioSeleccionado?.id === srv.id;
              return (
                <TouchableOpacity
                  key={srv.id}
                  style={[s.servicioCard, isSelected && s.servicioCardActive]}
                  onPress={() => handleSelectServicio(srv)}
                  activeOpacity={0.8}
                >
                  <View style={[s.duracionBadge, srv.requiresDeposit && !isRecompensa && s.duracionBadgeAmber]}>
                    <Text style={[s.duracionText, srv.requiresDeposit && !isRecompensa && s.duracionTextAmber]}>
                      {isRecompensa && isSelected ? 'BENEFICIO CLUB' : srv.duracion}
                    </Text>
                  </View>
                  <Text style={s.servicioIcon}>{srv.icon}</Text>
                  <Text style={[s.servicioNombre, isSelected && s.servicioNombreActive]}>
                    {srv.nombre}
                  </Text>
                  <Text style={s.servicioDesc} numberOfLines={2}>
                    {srv.descripcion}
                  </Text>
                  <View style={s.tagsRow}>
                    {srv.tags.slice(0, 3).map(tag => (
                      <View key={tag} style={[s.tag, isSelected && s.tagActive]}>
                        <Text style={[s.tagText, isSelected && s.tagTextActive]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                  {srv.requiresDeposit && !isRecompensa && (
                    <View style={s.depositChip}>
                      <Text style={s.depositIcon}>⚠️</Text>
                      <Text style={s.depositText}>Requiere anticipo</Text>
                    </View>
                  )}
                  {isSelected && (
                    <View style={s.selectedCheck}>
                      <Text style={s.selectedCheckText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ══════════════ PASO 2 — FECHA ══════════════ */}
        {(step === 2 || (!fechaInicial && servicioSeleccionado)) && (
          <View style={[p.card, s.stepCard]}>
            <StepHeader
              num={2}
              label="Elige el día"
              active={step === 2}
              done={!!fechaSeleccionada && step > 2}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.dateScroll}
              contentContainerStyle={s.dateRow}
            >
              {semanaDias.map(dia => {
                const isSelected = fechaSeleccionada?.iso === dia.iso;
                return (
                  <TouchableOpacity
                    key={dia.iso}
                    style={[
                      s.dateChip,
                      isSelected && s.dateChipActive,
                      dia.isDisabled && s.dateChipDisabled,
                    ]}
                    onPress={() => handleSelectFecha(dia)}
                    activeOpacity={dia.isDisabled ? 1 : 0.8}
                  >
                    <Text
                      style={[
                        s.dateDayName,
                        isSelected && s.dateTextActive,
                        dia.isDisabled && s.dateTextDisabled,
                      ]}
                    >
                      {dia.dayName}
                    </Text>
                    <Text
                      style={[
                        s.dateDayNum,
                        isSelected && s.dateTextActive,
                        dia.isDisabled && s.dateTextDisabled,
                      ]}
                    >
                      {dia.dayNum}
                    </Text>
                    <Text
                      style={[
                        s.dateMonth,
                        isSelected && s.dateTextActive,
                        dia.isDisabled && s.dateTextDisabled,
                      ]}
                    >
                      {dia.month}
                    </Text>
                    {dia.isDisabled && <Text style={s.closedLabel}>Cerrado</Text>}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[
                  s.dateChip,
                  s.calendarViñeta,
                  mostrarCalendario && s.calendarViñetaActive,
                ]}
                onPress={() => setMostrarCalendario(prev => !prev)}
                activeOpacity={0.8}
              >
                <Text style={s.calendarIcon}>🗓️</Text>
                <Text
                  style={[
                    s.calendarViñetaText,
                    mostrarCalendario && s.dateTextActive,
                  ]}
                >
                  {mostrarCalendario ? 'Ocultar' : 'Más'}
                </Text>
                <Text
                  style={[
                    s.calendarViñetaSub,
                    mostrarCalendario && s.dateTextActive,
                  ]}
                >
                  {mostrarCalendario ? 'mes' : 'fechas'}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {mostrarCalendario && (
              <View style={s.calFullContainer}>
                <View style={s.calNavRow}>
                  <TouchableOpacity onPress={navMesAnterior} style={s.calNavBtn}>
                    <Text style={s.calNavIcon}>‹</Text>
                  </TouchableOpacity>
                  <Text style={s.calMesLabel}>
                    {MESES_LARGOS[calMes]} {calAnio}
                  </Text>
                  <TouchableOpacity onPress={navMesSiguiente} style={s.calNavBtn}>
                    <Text style={s.calNavIcon}>›</Text>
                  </TouchableOpacity>
                </View>

                <View style={s.calWeekRow}>
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                    <Text key={d} style={[s.calWeekLabel, d === 'Dom' && s.calWeekLabelDom]}>
                      {d}
                    </Text>
                  ))}
                </View>

                {calendario.semanas.map((semana, si) => (
                  <View key={si} style={s.calWeekRow}>
                    {semana.map((dia, di) => {
                      if (!dia) return <View key={di} style={s.calCellEmpty} />;
                      const isSelected = fechaSeleccionada?.iso === dia.iso;
                      const esPasado = dia.iso < dateToIso(hoy);
                      const disabled = dia.isDisabled || esPasado;

                      return (
                        <TouchableOpacity
                          key={dia.iso}
                          style={[
                            s.calCell,
                            isSelected && s.calCellActive,
                            disabled && s.calCellDisabled,
                          ]}
                          onPress={() => handleSelectFecha(dia)}
                          activeOpacity={disabled ? 1 : 0.75}
                          disabled={disabled}
                        >
                          <Text
                            style={[
                              s.calCellText,
                              isSelected && s.calCellTextActive,
                              disabled && s.calCellTextDisabled,
                              di === 6 && s.calCellTextDom,
                            ]}
                          >
                            {dia.dayNum}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}

            <Text style={s.closedNote}>Los domingos el salón permanece cerrado.</Text>
          </View>
        )}

        {/* ══════════════ PASO 3 — HORARIO ══════════════ */}
        {step >= 3 && fechaSeleccionada && (
          <View style={[p.card, s.stepCard]}>
            <StepHeader
              num={3}
              label="Selecciona el horario"
              active={step === 3}
              done={!!horaSeleccionada}
            />

            <View style={s.fechaResumenRow}>
              <Text style={s.fechaResumenIcon}>📅</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.fechaResumenText}>
                  {fechaSeleccionada.dayName}, {fechaSeleccionada.dayNum} de {fechaSeleccionada.monthFull} {fechaSeleccionada.year}
                </Text>
                <Text style={s.fechaResumenSub}>
                  {evalCapacidad?.cerrado
                    ? 'El salón permanece cerrado este día'
                    : `Capacidad libre: ${evalCapacidad?.minutosLibres ?? 0} min libres · Saturación: ${evalCapacidad?.porcentajeSaturacion ?? 0}%`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setStep(2)}>
                <Text style={s.cambiarFechaLink}>Cambiar día</Text>
              </TouchableOpacity>
            </View>

            {/* ── ALERTA DE SATURACIÓN Y CAPACIDAD HUMANA AUTÓNOMA ── */}
            {evalCapacidad?.saturacionExcedida && servicioSeleccionado && (
              <View style={s.capacidadAlerta}>
                <Text style={s.capacidadAlertaIcon}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.capacidadAlertaTitle}>
                    Capacidad diaria superada para {servicioSeleccionado.nombre}
                  </Text>
                  <Text style={s.capacidadAlertaDesc}>
                    A Yoss le restan {evalCapacidad.minutosLibres} min libres este día. Un servicio breve (como corte de 30 min o perfilado de 20 min) aún puede agendarse, pero para {servicioSeleccionado.nombre} ({servicioSeleccionado.duracionMin} min) no es humanamente posible atenderte hoy con la máxima dedicación sin prisas.
                  </Text>
                  <TouchableOpacity style={s.btnCambiarDiaAlerta} onPress={() => setStep(2)}>
                    <Text style={s.btnCambiarDiaAlertaText}>← Cambiar a un día con mayor disponibilidad</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── LISTADO DE TURNOS Y SLOTS POR HORARIO DEL SALÓN ── */}
            {evalCapacidad && !evalCapacidad.cerrado && (
              <View style={{ gap: 14 }}>
                {/* Turno Mañana (Lun-Vie: 11:00 a 14:00) */}
                {evalCapacidad.slots.some(s => s.turno === 'manana') && (
                  <View style={{ gap: 8 }}>
                    <View style={s.turnoHeaderRow}>
                      <Text style={s.turnoHeaderTitle}>☀️ Turno Matutino</Text>
                      <Text style={s.turnoHeaderSub}>11:00 am – 2:00 pm</Text>
                    </View>
                    <View style={s.slotsGrid}>
                      {evalCapacidad.slots
                        .filter(s => s.turno === 'manana')
                        .map(slot => {
                          const isSelected = horaSeleccionada === slot.hora;
                          const isDispo = slot.disponible;
                          return (
                            <TouchableOpacity
                              key={slot.hora}
                              style={[
                                s.slotChip,
                                isSelected && s.slotChipActive,
                                !isDispo && s.slotChipOcupado,
                              ]}
                              onPress={() => {
                                if (isDispo) setHoraSeleccionada(slot.hora);
                              }}
                              disabled={!isDispo}
                              activeOpacity={isDispo ? 0.8 : 1}
                            >
                              <Text
                                style={[
                                  s.slotText,
                                  isSelected && s.slotTextActive,
                                  !isDispo && s.slotTextOcupado,
                                ]}
                              >
                                {slot.hora}
                              </Text>
                              {!isDispo && (
                                <Text style={s.slotOcupadoLabel} numberOfLines={1}>
                                  {slot.motivoDetalle || 'No disponible'}
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  </View>
                )}

                {/* Turno Tarde (Lun-Vie: 16:00 a 19:00) */}
                {evalCapacidad.slots.some(s => s.turno === 'tarde') && (
                  <View style={{ gap: 8 }}>
                    <View style={s.turnoHeaderRow}>
                      <Text style={s.turnoHeaderTitle}>🌇 Turno Vespertino</Text>
                      <Text style={s.turnoHeaderSub}>4:00 pm – 7:00 pm</Text>
                    </View>
                    <View style={s.slotsGrid}>
                      {evalCapacidad.slots
                        .filter(s => s.turno === 'tarde')
                        .map(slot => {
                          const isSelected = horaSeleccionada === slot.hora;
                          const isDispo = slot.disponible;
                          return (
                            <TouchableOpacity
                              key={slot.hora}
                              style={[
                                s.slotChip,
                                isSelected && s.slotChipActive,
                                !isDispo && s.slotChipOcupado,
                              ]}
                              onPress={() => {
                                if (isDispo) setHoraSeleccionada(slot.hora);
                              }}
                              disabled={!isDispo}
                              activeOpacity={isDispo ? 0.8 : 1}
                            >
                              <Text
                                style={[
                                  s.slotText,
                                  isSelected && s.slotTextActive,
                                  !isDispo && s.slotTextOcupado,
                                ]}
                              >
                                {slot.hora}
                              </Text>
                              {!isDispo && (
                                <Text style={s.slotOcupadoLabel} numberOfLines={1}>
                                  {slot.motivoDetalle || 'No disponible'}
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  </View>
                )}

                {/* Turno Sábado (11:00 a 18:00) */}
                {evalCapacidad.slots.some(s => s.turno === 'sabado') && (
                  <View style={{ gap: 8 }}>
                    <View style={s.turnoHeaderRow}>
                      <Text style={s.turnoHeaderTitle}>🌿 Sábado (Horario Corrido)</Text>
                      <Text style={s.turnoHeaderSub}>11:00 am – 6:00 pm</Text>
                    </View>
                    <View style={s.slotsGrid}>
                      {evalCapacidad.slots
                        .filter(s => s.turno === 'sabado')
                        .map(slot => {
                          const isSelected = horaSeleccionada === slot.hora;
                          const isDispo = slot.disponible;
                          return (
                            <TouchableOpacity
                              key={slot.hora}
                              style={[
                                s.slotChip,
                                isSelected && s.slotChipActive,
                                !isDispo && s.slotChipOcupado,
                              ]}
                              onPress={() => {
                                if (isDispo) setHoraSeleccionada(slot.hora);
                              }}
                              disabled={!isDispo}
                              activeOpacity={isDispo ? 0.8 : 1}
                            >
                              <Text
                                style={[
                                  s.slotText,
                                  isSelected && s.slotTextActive,
                                  !isDispo && s.slotTextOcupado,
                                ]}
                              >
                                {slot.hora}
                              </Text>
                              {!isDispo && (
                                <Text style={s.slotOcupadoLabel} numberOfLines={1}>
                                  {slot.motivoDetalle || 'No disponible'}
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ══════════════ PASO 4 — MÉTODO DE PAGO ══════════════ */}
        {horaSeleccionada && (
          <View style={[p.card, s.stepCard]}>
            <StepHeader
              num={4}
              label="Método de pago"
              active={true}
              done={!!metodoPago}
            />

            <Text style={s.metodoPagoSubtitle}>
              {servicioSeleccionado?.requiresDeposit
                ? 'Este servicio requiere un anticipo para asegurar tu turno y fórmulas personalizadas:'
                : 'Únicos métodos de pago aceptados para agendar tu cita:'}
            </Text>

            <View style={s.paymentOptionsList}>
              {/* Opción 1: Efectivo (Disponible para servicios que NO requieran anticipo) */}
              {!servicioSeleccionado?.requiresDeposit ? (
                <TouchableOpacity
                  style={[
                    s.paymentOptionCard,
                    metodoPago === 'efectivo' && s.paymentOptionCardActive,
                  ]}
                  onPress={() => setMetodoPago('efectivo')}
                  activeOpacity={0.8}
                >
                  <View style={[s.paymentOptionIconBox, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={{ fontSize: 22 }}>💵</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s.paymentOptionTitle}>Efectivo en el salón</Text>
                      <View style={s.autoConfirmPill}>
                        <Text style={s.autoConfirmPillText}>APROBACIÓN INMEDIATA</Text>
                      </View>
                    </View>
                    <Text style={s.paymentOptionSub}>
                      Paga en persona en efectivo una vez que llegues por tu cita a la estética. La cita se confirma de inmediato sin necesidad de autorización manual.
                    </Text>
                  </View>
                  <View style={[s.paymentRadio, metodoPago === 'efectivo' && s.paymentRadioActive]}>
                    {metodoPago === 'efectivo' && <View style={s.paymentRadioInner} />}
                  </View>
                </TouchableOpacity>
              ) : null}

              {/* Opción 2: Mercado Pago */}
              <TouchableOpacity
                style={[
                  s.paymentOptionCard,
                  metodoPago === 'mercadopago' && s.paymentOptionCardActive,
                ]}
                onPress={() => setMetodoPago('mercadopago')}
                activeOpacity={0.8}
              >
                <View style={[s.paymentOptionIconBox, { backgroundColor: '#E1F5FE' }]}>
                  <Text style={{ fontSize: 22 }}>💙</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.paymentOptionTitle}>
                      {servicioSeleccionado?.requiresDeposit
                        ? 'Mercado Pago (Anticipo obligatorio)'
                        : 'Mercado Pago (Pago digital)'}
                    </Text>
                    {servicioSeleccionado?.requiresDeposit ? (
                      <View style={[s.autoConfirmPill, { backgroundColor: '#FFF3E0' }]}>
                        <Text style={[s.autoConfirmPillText, { color: '#E65100' }]}>EN FUNCIONAMIENTO</Text>
                      </View>
                    ) : (
                      <View style={[s.autoConfirmPill, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1 }]}>
                        <Text style={[s.autoConfirmPillText, { color: '#B45309' }]}>PENDIENTE / SIN PRECIO FIJO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.paymentOptionSub}>
                    {servicioSeleccionado?.requiresDeposit
                      ? 'Paga de forma 100% segura tu anticipo con tarjeta, SPEI o saldo de Mercado Pago para apartar tu lugar. Si dejas el anticipo pendiente, tendrás un límite de 15 minutos para pagarlo antes de que el horario se libere.'
                      : 'Esta opción digital completa se encuentra actualmente pendiente para servicios cotidianos, ya que no cuentan con precios fijos (varían según el largo del cabello y valoración física en salón). Si la eliges, tu cita quedará registrada como pendiente.'}
                  </Text>
                </View>
                <View style={[s.paymentRadio, metodoPago === 'mercadopago' && s.paymentRadioActive]}>
                  {metodoPago === 'mercadopago' && <View style={s.paymentRadioInner} />}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ══════════════ NOTAS OPCIONALES ══════════════ */}
        {horaSeleccionada && (
          <View style={[p.card, s.stepCard]}>
            <Text style={s.sectionLabel}>Notas para Yoss (opcional)</Text>
            <TextInput
              style={s.notasInput}
              placeholder="Ej: tengo alergia a ciertos tintes, quisiera mantener el largo..."
              placeholderTextColor={colors.beige[400]}
              value={notas}
              onChangeText={setNotas}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* ══════════════ RESUMEN ══════════════ */}
        {servicioSeleccionado && fechaSeleccionada && horaSeleccionada && (
          <View style={[p.card, s.stepCard, s.resumenCard]}>
            <Text style={s.resumenTitle}>Resumen de tu cita</Text>
            <SummaryRow label="Servicio" value={servicioSeleccionado.nombre} />
            <SummaryRow label="Duración" value={servicioSeleccionado.duracion} />
            <SummaryRow
              label="Fecha"
              value={`${fechaSeleccionada.dayName}, ${fechaSeleccionada.dayNum} ${fechaSeleccionada.month} ${fechaSeleccionada.year}`}
            />
            <SummaryRow label="Hora" value={horaSeleccionada} />
            <SummaryRow
              label="Método de pago"
              value={
                isRecompensa
                  ? 'Recompensa 100% Cubierta'
                  : metodoPago === 'efectivo'
                  ? 'Efectivo en salón al llegar'
                  : servicioSeleccionado.requiresDeposit
                  ? `Mercado Pago (Anticipo $${servicioSeleccionado.depositAmount || 300} MXN)`
                  : 'Mercado Pago (Pendiente de cotización)'
              }
            />
            {isRecompensa ? (
              <SummaryRow label="Precio" value="GRATIS (100% Club Yoss)" isStatus tone="olive" />
            ) : (
              <SummaryRow
                label="Confirmación"
                value={
                  metodoPago === 'efectivo'
                    ? 'Aprobada automáticamente (En efectivo)'
                    : servicioSeleccionado.requiresDeposit
                    ? 'Validación con Mercado Pago'
                    : 'En proceso (Pendiente de cotización en salón)'
                }
                isStatus
                tone={metodoPago === 'efectivo' || servicioSeleccionado.requiresDeposit ? 'olive' : 'amber'}
              />
            )}
          </View>
        )}

        {/* ══════════════ BOTÓN FINAL ══════════════ */}
        <View style={{ marginTop: 8, marginBottom: 32 }}>
          {!servicioSeleccionado ? (
            <HintBanner text="👆 Selecciona un servicio para continuar" />
          ) : !fechaSeleccionada ? (
            <HintBanner text="📅 Selecciona una fecha para continuar" />
          ) : !horaSeleccionada ? (
            <HintBanner text="🕐 Selecciona un horario disponible" />
          ) : (
            <TouchableOpacity style={[p.button, isSaving && { opacity: 0.6 }]} onPress={handleConfirmar} disabled={isSaving} activeOpacity={0.88}>
              {isSaving ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={p.buttonText}>
                  {metodoPago === 'efectivo'
                    ? 'Confirmar cita (Pagar en efectivo en salón) ✓'
                    : servicioSeleccionado.requiresDeposit
                    ? `Pagar anticipo con Mercado Pago ($${servicioSeleccionado.depositAmount || 300} MXN) →`
                    : 'Solicitar cita (Mercado Pago pendiente) →'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ── Modal de Información de Pago con Mercado Pago ── */}
      <MercadoPagoModal
        visible={showMpModal}
        onClose={() => setShowMpModal(false)}
        servicioNombre={servicioSeleccionado?.nombre}
        fechaHora={
          fechaSeleccionada && horaSeleccionada
            ? `${fechaSeleccionada.dayName} ${fechaSeleccionada.dayNum} a las ${horaSeleccionada}`
            : undefined
        }
        montoAnticipo={servicioSeleccionado?.depositAmount || 300}
        clienteNombre={clientProfile.name}
        onConfirmPayment={note => {
          setShowMpModal(false);
          // Validación automática: Cita Aceptada inmediatamente
          doConfirmAgendar(note, 'Aceptada', 'mercadopago');
        }}
        onPayLater={() => {
          setShowMpModal(false);
          // Pago pendiente: Temporizador de 15 minutos (900,000 ms)
          const timeout15Min = Date.now() + 15 * 60 * 1000;
          const monto = servicioSeleccionado?.depositAmount || 300;
          doConfirmAgendar(
            `Anticipo pendiente con Mercado Pago ($${monto} MXN)`,
            'Pendiente anticipo',
            'mercadopago',
            timeout15Min,
            !servicioSeleccionado?.requiresDeposit
          );
        }}
      />
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────────────────────
function HintBanner({ text }: { text: string }) {
  return (
    <View style={s.stepHint}>
      <Text style={s.stepHintText}>{text}</Text>
    </View>
  );
}

function StepIndicator({ currentStep, hasFechaPrevia }: { currentStep: 1 | 2 | 3; hasFechaPrevia: boolean }) {
  return (
    <View style={s.stepIndicatorRow}>
      {([1, 2, 3] as const).map((n, i) => {
        const done = n === 1 ? currentStep > 1 : n === 2 ? hasFechaPrevia || currentStep > 2 : false;
        const active = currentStep === n;
        const labels = ['Servicio', 'Fecha', 'Horario'];
        return (
          <React.Fragment key={n}>
            <View style={s.stepIndicatorItem}>
              <View style={[s.stepDot, active && s.stepDotActive, done && s.stepDotDone]}>
                <Text style={[s.stepDotText, (active || done) && s.stepDotTextActive]}>
                  {done ? '✓' : n}
                </Text>
              </View>
              <Text style={[s.stepDotLabel, active && s.stepDotLabelActive]}>{labels[i]}</Text>
            </View>
            {i < 2 && (
              <View style={[s.stepLine, (currentStep > n || (n === 1 && hasFechaPrevia)) && s.stepLineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function StepHeader({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  return (
    <View style={s.stepHeaderRow}>
      <View style={[s.stepNumBadge, active && s.stepNumBadgeActive, done && s.stepNumBadgeDone]}>
        <Text style={[s.stepNum, (active || done) && s.stepNumActive]}>{done ? '✓' : num}</Text>
      </View>
      <Text style={[s.stepLabel, active && s.stepLabelActive]}>{label}</Text>
    </View>
  );
}

type SummaryRowTone = 'olive' | 'amber' | 'red' | 'gray';
function SummaryRow({
  label,
  value,
  isStatus,
  tone,
}: {
  label: string;
  value: string;
  isStatus?: boolean;
  tone?: SummaryRowTone;
}) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      {isStatus ? (
        <StatusPill
          label={value}
          tone={tone === 'amber' ? 'amber' : tone === 'red' ? 'red' : tone === 'gray' ? 'gray' : 'olive'}
        />
      ) : (
        <Text style={s.summaryValue}>{value}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  backBtn: { marginBottom: spacing.md, paddingHorizontal: spacing.md },
  backBtnText: { color: colors.primary[500], fontSize: 13, fontWeight: '600' },

  recompensaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary[50],
    borderWidth: 1.5,
    borderColor: colors.primary[400],
    borderRadius: borderRadius.card,
    padding: 14,
    marginBottom: spacing.md,
  },
  recompensaIcon: { fontSize: 24 },
  recompensaTitle: { fontSize: 14, fontWeight: '700', color: colors.primary[700] },
  recompensaSub: { fontSize: 11, color: colors.ink[700], marginTop: 2 },

  fechaPreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary[50],
    borderWidth: 1.5,
    borderColor: colors.primary[300],
    borderRadius: borderRadius.card,
    padding: 14,
    marginBottom: spacing.md,
  },
  fechaPreIcon: { fontSize: 24 },
  fechaPreTitle: { fontSize: 14, fontWeight: '700', color: colors.primary[700] },
  fechaPreSub: { fontSize: 11, color: colors.ink[700], marginTop: 2 },
  cambiarFechaLink: {
    color: colors.primary[600],
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  stepIndicatorItem: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.beige[100],
    borderWidth: 1.5,
    borderColor: colors.beige[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  stepDotDone: { backgroundColor: colors.primary[200], borderColor: colors.primary[300] },
  stepDotText: { fontSize: 12, fontWeight: '700', color: colors.beige[400] },
  stepDotTextActive: { color: colors.white },
  stepDotLabel: { fontSize: 9, color: colors.beige[400], fontWeight: '500' },
  stepDotLabelActive: { color: colors.primary[500], fontWeight: '700' },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.beige[200],
    marginHorizontal: 6,
    marginBottom: 16,
  },
  stepLineDone: { backgroundColor: colors.primary[300] },

  stepCard: { marginBottom: spacing.md, gap: 14 },
  stepHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.beige[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumBadgeActive: { backgroundColor: colors.primary[500] },
  stepNumBadgeDone: { backgroundColor: colors.primary[200] },
  stepNum: { fontSize: 12, fontWeight: '700', color: colors.beige[400] },
  stepNumActive: { color: colors.white },
  stepLabel: { fontSize: 15, fontWeight: '700', color: colors.ink[700] },
  stepLabelActive: { color: colors.ink[800] },

  serviciosGrid: { gap: 10 },
  servicioCard: {
    backgroundColor: colors.beige[50],
    borderRadius: borderRadius.card,
    borderWidth: 1.5,
    borderColor: colors.beige[200],
    padding: 14,
    gap: 6,
    position: 'relative',
  },
  servicioCardActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
    ...shadow.card,
  },
  duracionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  duracionBadgeAmber: { backgroundColor: '#FEF3C7' },
  duracionText: { fontSize: 10, fontWeight: '700', color: colors.primary[600], letterSpacing: 0.5 },
  duracionTextAmber: { color: '#B45309' },
  servicioIcon: { fontSize: 28, marginTop: 2 },
  servicioNombre: { fontSize: 15, fontWeight: '700', color: colors.ink[800] },
  servicioNombreActive: { color: colors.primary[600] },
  servicioDesc: { fontSize: 12, color: colors.ink[700], lineHeight: 17 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  tag: {
    backgroundColor: colors.beige[100],
    borderRadius: borderRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagActive: { backgroundColor: colors.primary[100] },
  tagText: { fontSize: 10, color: colors.ink[700] },
  tagTextActive: { color: colors.primary[600] },
  depositChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  depositIcon: { fontSize: 12 },
  depositText: { fontSize: 11, color: '#B45309', fontWeight: '600' },
  selectedCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckText: { color: colors.white, fontSize: 12, fontWeight: '700' },

  dateScroll: { marginHorizontal: -4 },
  dateRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, paddingBottom: 4 },
  dateChip: {
    width: 60,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: borderRadius.card,
    backgroundColor: colors.beige[100],
    borderWidth: 1.5,
    borderColor: colors.beige[200],
    gap: 2,
  },
  dateChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
    ...shadow.card,
  },
  dateChipDisabled: {
    backgroundColor: colors.beige[50],
    borderColor: colors.beige[100],
    opacity: 0.45,
  },
  dateDayName: { fontSize: 9, fontWeight: '600', color: colors.ink[700] },
  dateDayNum: { fontSize: 20, fontWeight: '700', color: colors.ink[800] },
  dateMonth: { fontSize: 9, color: colors.ink[700] },
  dateTextActive: { color: colors.white },
  dateTextDisabled: { color: colors.beige[300] },
  closedLabel: { fontSize: 7, color: colors.beige[400], marginTop: 1 },

  calendarViñeta: {
    backgroundColor: colors.beige[50],
    borderWidth: 1.5,
    borderColor: colors.primary[300],
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  calendarViñetaActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
    borderStyle: 'solid',
  },
  calendarIcon: { fontSize: 18, marginBottom: 2 },
  calendarViñetaText: { fontSize: 11, fontWeight: '700', color: colors.primary[700] },
  calendarViñetaSub: { fontSize: 8, color: colors.primary[600], fontWeight: '500' },

  calFullContainer: {
    backgroundColor: colors.beige[50],
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.beige[200],
    padding: 14,
    gap: 8,
    marginTop: 6,
  },
  calNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.beige[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  calNavIcon: { fontSize: 20, color: colors.primary[500], lineHeight: 24 },
  calMesLabel: { fontSize: 14, fontWeight: '700', color: colors.ink[800] },
  calWeekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  calWeekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: colors.ink[700],
    paddingVertical: 4,
  },
  calWeekLabelDom: { color: colors.status.error },
  calCellEmpty: { flex: 1, height: 34 },
  calCell: {
    flex: 1,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    margin: 1.5,
  },
  calCellActive: { backgroundColor: colors.primary[500], ...shadow.card },
  calCellDisabled: { opacity: 0.3 },
  calCellText: { fontSize: 12, fontWeight: '500', color: colors.ink[800] },
  calCellTextActive: { color: colors.white, fontWeight: '700' },
  calCellTextDisabled: { color: colors.beige[300] },
  calCellTextDom: { color: colors.status.error },
  closedNote: { fontSize: 11, color: colors.beige[400], textAlign: 'center', marginTop: 2 },

  fechaResumenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.sm,
    padding: 12,
  },
  fechaResumenIcon: { fontSize: 20 },
  fechaResumenText: { fontSize: 13, fontWeight: '700', color: colors.primary[700] },
  fechaResumenSub: { fontSize: 11, color: colors.ink[700], marginTop: 2 },

  // Alerta de saturación y capacidad humana
  capacidadAlerta: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
  },
  capacidadAlertaIcon: { fontSize: 20, marginTop: 2 },
  capacidadAlertaTitle: { fontSize: 12, fontWeight: '800', color: '#92400E', marginBottom: 3 },
  capacidadAlertaDesc: { fontSize: 11, color: '#B45309', lineHeight: 16 },
  btnCambiarDiaAlerta: { marginTop: 8 },
  btnCambiarDiaAlertaText: { fontSize: 11, fontWeight: '800', color: colors.primary[700], textDecorationLine: 'underline' },

  // Encabezados de turnos del salón
  turnoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  turnoHeaderTitle: { fontSize: 12, fontWeight: '700', color: colors.ink[800] },
  turnoHeaderSub: { fontSize: 10, color: colors.primary[600], fontWeight: '600' },

  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: {
    width: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.beige[100],
    borderWidth: 1.5,
    borderColor: colors.beige[200],
    gap: 2,
  },
  slotChipActive: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  slotChipOcupado: { backgroundColor: colors.beige[50], borderColor: colors.beige[100], opacity: 0.55 },
  slotText: { fontSize: 12, fontWeight: '600', color: colors.ink[800] },
  slotTextActive: { color: colors.white },
  slotTextOcupado: { color: colors.beige[300] },
  slotOcupadoLabel: { fontSize: 7, color: colors.beige[400] },

  // Método de pago
  metodoPagoSubtitle: { fontSize: 12, color: colors.ink[700], lineHeight: 18, marginBottom: 4 },
  paymentOptionsList: { gap: 10 },
  paymentOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.beige[200],
    padding: 14,
    ...shadow.card,
  },
  paymentOptionCardActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  paymentOptionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentOptionTitle: { fontSize: 13, fontWeight: '700', color: colors.ink[800] },
  paymentOptionSub: { fontSize: 11, color: colors.ink[700], marginTop: 3, lineHeight: 15 },
  autoConfirmPill: {
    backgroundColor: '#E8F5E9',
    borderRadius: borderRadius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  autoConfirmPillText: { fontSize: 8, fontWeight: '800', color: '#2E7D32', letterSpacing: 0.5 },
  paymentRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.beige[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentRadioActive: { borderColor: colors.primary[500] },
  paymentRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary[500] },

  sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.ink[800] },
  notasInput: {
    backgroundColor: colors.beige[50],
    borderRadius: borderRadius.card,
    borderWidth: 1.5,
    borderColor: colors.beige[200],
    padding: 14,
    minHeight: 90,
    fontSize: 13,
    color: colors.ink[800],
    lineHeight: 20,
  },

  resumenCard: { borderWidth: 1, borderColor: colors.primary[200] },
  resumenTitle: { fontSize: 15, fontWeight: '700', color: colors.ink[800], marginBottom: 4 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.beige[100],
  },
  summaryLabel: { fontSize: 12, color: colors.ink[700] },
  summaryValue: { fontSize: 13, fontWeight: '600', color: colors.ink[800], maxWidth: '60%', textAlign: 'right' },

  anticipoWarning: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: borderRadius.sm,
    padding: 12,
    marginTop: 4,
  },
  anticipoIcon: { fontSize: 14 },
  anticipoText: { flex: 1, fontSize: 12, color: '#B45309', lineHeight: 17 },

  stepHint: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: colors.beige[100],
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.beige[200],
  },
  stepHintText: { fontSize: 13, color: colors.ink[700], fontWeight: '500' },

  successContainer: { justifyContent: 'center', alignItems: 'center', flexGrow: 1, paddingVertical: 40 },
  successCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card + 4,
    padding: 28,
    width: '90%',
    alignItems: 'center',
    ...shadow.elevated,
    gap: 8,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary[50],
    borderWidth: 3,
    borderColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  checkIcon: { fontSize: 32, color: colors.primary[500] },
  successTitle: { fontSize: 24, fontWeight: '700', color: colors.ink[800], textAlign: 'center' },
  successSubtitle: { fontSize: 13, color: colors.ink[700], textAlign: 'center', lineHeight: 19, marginBottom: 8 },
  summaryBlock: { width: '100%', marginTop: 4 },
});
