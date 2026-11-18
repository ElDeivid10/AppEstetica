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

import React, { useState, useRef, useMemo } from 'react';
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
} from 'react-native';
import { PageHeader, StatusPill, pageStyles as p } from '@/components/SalonUI';
import { useSalon } from '@/context/SalonContext';
import { theme } from '@/constants/YossTheme';

const { colors, borderRadius, shadow, spacing } = theme;

// ─────────────────────────────────────────────────────────────────────────────
//  CATÁLOGO DE SERVICIOS
// ─────────────────────────────────────────────────────────────────────────────
interface Servicio {
  id: string;
  nombre: string;
  duracion: string;
  duracionMin: number;
  icon: string;
  tags: string[];
  requiresDeposit: boolean;
  descripcion: string;
}

const SERVICIOS: Servicio[] = [
  {
    id: 'srv-001',
    nombre: 'Cortes de Cabello',
    duracion: '20–45 MIN',
    duracionMin: 45,
    icon: '✂️',
    tags: ['Dama', 'Caballero', 'Niños', 'Niñas'],
    requiresDeposit: false,
    descripcion: 'Cortes modernos y clásicos adaptados a cada persona.',
  },
  {
    id: 'srv-002',
    nombre: 'Perfilado de Barba',
    duracion: '15–20 MIN',
    duracionMin: 20,
    icon: '🪒',
    tags: ['Caballero'],
    requiresDeposit: false,
    descripcion: 'Definición y perfilado para un acabado limpio y estilizado.',
  },
  {
    id: 'srv-003',
    nombre: 'Colorimetría',
    duracion: '2–8 HORAS',
    duracionMin: 480,
    icon: '🎨',
    tags: ['Mechas', 'Tintes', 'Balayage', 'Baby Lights', 'Rayos'],
    requiresDeposit: true,
    descripcion: 'Colores personalizados con técnicas de última generación.',
  },
  {
    id: 'srv-004',
    nombre: 'Maquillaje y Peinado',
    duracion: '45–90 MIN',
    duracionMin: 90,
    icon: '💄',
    tags: ['Social', 'Novia', 'Graduación'],
    requiresDeposit: false,
    descripcion: 'Realza tu belleza natural para cualquier ocasión.',
  },
  {
    id: 'srv-005',
    nombre: 'Depilaciones',
    duracion: '15–45 MIN',
    duracionMin: 45,
    icon: '✨',
    tags: ['Cejas', 'Bigote', 'Axilas', 'Piernas'],
    requiresDeposit: false,
    descripcion: 'Técnicas suaves y eficaces para una piel perfectamente suave.',
  },
  {
    id: 'srv-006',
    nombre: 'Alaciados Progresivos',
    duracion: '3–5 HORAS',
    duracionMin: 300,
    icon: '💆',
    tags: ['Keratina', 'Botox Capilar', 'Nanoplastia'],
    requiresDeposit: true,
    descripcion: 'Alisa y suaviza el cabello de forma duradera.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  UTILIDADES DE FECHA
// ─────────────────────────────────────────────────────────────────────────────
const DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface DiaDisponible {
  iso: string;
  dayName: string;
  dayNum: number;
  month: string;
  monthFull: string;
  year: number;
  isDisabled: boolean;
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateToIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function buildDia(d: Date): DiaDisponible {
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
//  HORARIOS (SLOTS)
// ─────────────────────────────────────────────────────────────────────────────
function generarSlots(): string[] {
  const slots: string[] = [];
  for (let h = 9; h < 19; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}

const SLOTS_OCUPADOS_MOCK = ['10:00', '10:30', '14:00', '14:30', '15:00', '16:30'];
const TODOS_SLOTS = generarSlots();

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
  const { addAppointment, clientProfile } = useSalon();
  const semanaDias = useMemo(() => generarSemanaCompleta(), []);

  // Servicio inicial si se recibió por prop
  const srvPre = useMemo(() => {
    if (!servicioInicialId) return null;
    return SERVICIOS.find(s => s.id === servicioInicialId) ?? null;
  }, [servicioInicialId]);

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

  function handleConfirmar() {
    if (!servicioSeleccionado || !fechaSeleccionada || !horaSeleccionada) return;

    // Agregar la cita al estado global sincronizado (SalonContext)
    addAppointment({
      client: clientProfile.name,
      service: servicioSeleccionado.nombre,
      date: `${fechaSeleccionada.dayName}, ${fechaSeleccionada.dayNum} ${fechaSeleccionada.month}`,
      isoDate: fechaSeleccionada.iso,
      time: horaSeleccionada,
      status: isRecompensa
        ? 'Aceptada'
        : servicioSeleccionado.requiresDeposit
        ? 'Pendiente anticipo'
        : 'Solicitud',
      tone: isRecompensa ? 'olive' : servicioSeleccionado.requiresDeposit ? 'amber' : 'olive',
      detail: isRecompensa
        ? `🎁 Beneficio de recompensa Club: ${recompensaNombre || 'Cortesía 100%'}`
        : servicioSeleccionado.requiresDeposit
        ? 'Anticipo pendiente de confirmación con Yoss'
        : 'Esperando confirmación por Yoss Beauty Salon',
      paid: isRecompensa
        ? 'Cortesía 100% Club Yoss'
        : servicioSeleccionado.requiresDeposit
        ? 'Anticipo requerido'
        : 'Pago en salón',
      isReward: isRecompensa,
      rewardNote: recompensaNombre,
    });

    setSubmitted(true);

    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 60,
      friction: 7,
      useNativeDriver: true,
    }).start();
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
                value={servicioSeleccionado.requiresDeposit ? 'Pendiente anticipo' : 'Solicitud enviada'}
                isStatus
                tone={servicioSeleccionado.requiresDeposit ? 'amber' : 'olive'}
              />
            )}
            {notas ? <SummaryRow label="Notas" value={notas} /> : null}
          </View>

          {servicioSeleccionado.requiresDeposit && !isRecompensa && (
            <View style={s.anticipoWarning}>
              <Text style={s.anticipoIcon}>⚠️</Text>
              <Text style={s.anticipoText}>
                Este servicio requiere un anticipo. Yoss se pondrá en contacto contigo o puedes escribirle en el chat para acordar el pago.
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
                <Text style={s.fechaResumenSub}>Horarios disponibles para este día:</Text>
              </View>
              <TouchableOpacity onPress={() => setStep(2)}>
                <Text style={s.cambiarFechaLink}>Cambiar día</Text>
              </TouchableOpacity>
            </View>

            <View style={s.slotsGrid}>
              {TODOS_SLOTS.map(slot => {
                const isOcupado = SLOTS_OCUPADOS_MOCK.includes(slot);
                const isSelected = horaSeleccionada === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      s.slotChip,
                      isSelected && s.slotChipActive,
                      isOcupado && s.slotChipOcupado,
                    ]}
                    onPress={() => {
                      if (!isOcupado) setHoraSeleccionada(slot);
                    }}
                    activeOpacity={isOcupado ? 1 : 0.8}
                  >
                    <Text
                      style={[
                        s.slotText,
                        isSelected && s.slotTextActive,
                        isOcupado && s.slotTextOcupado,
                      ]}
                    >
                      {slot}
                    </Text>
                    {isOcupado && <Text style={s.slotOcupadoLabel}>Ocupado</Text>}
                  </TouchableOpacity>
                );
              })}
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
            {isRecompensa ? (
              <SummaryRow label="Precio" value="GRATIS (100% Club Yoss)" isStatus tone="olive" />
            ) : (
              <SummaryRow
                label="Estado inicial"
                value={servicioSeleccionado.requiresDeposit ? 'Pendiente anticipo' : 'Solicitud enviada'}
                isStatus
                tone={servicioSeleccionado.requiresDeposit ? 'amber' : 'olive'}
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
            <TouchableOpacity style={p.button} onPress={handleConfirmar} activeOpacity={0.88}>
              <Text style={p.buttonText}>Confirmar solicitud de cita ✓</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
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

  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: {
    width: '22%',
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
