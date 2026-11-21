/**
 * OnboardingGuide.tsx
 * Sistema de guía de primer uso para Yoss Beauty Salon.
 *
 * Muestra una secuencia de pasos interactivos la primera vez que el usuario
 * o el administrador inician sesión, señalando las secciones principales de la app.
 * Se activa desde el contexto de autenticación (flag `hasSeenOnboarding`).
 */

import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { theme } from '@/constants/YossTheme';

const { colors, borderRadius, shadow, spacing } = theme;
const SCREEN_WIDTH = Dimensions.get('window').width;

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface OnboardingStep {
  id: string;
  emoji: string;
  title: string;
  description: string;
  tip?: string;
  accentColor?: string;
}

// ── Pasos para CLIENTE ────────────────────────────────────────────────────────
export const CLIENT_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'bienvenida',
    emoji: '🌿',
    title: '¡Bienvenida a Yoss Beauty Salon!',
    description:
      'Esta es tu app personal para gestionar tus citas, explorar el catálogo de servicios y mantenerte siempre conectada con el salón.',
    tip: 'Navega con las pestañas de la barra inferior.',
    accentColor: colors.primary[500],
  },
  {
    id: 'explorar',
    emoji: '✦',
    title: 'Explorar',
    description:
      'En la pestaña "Explorar" encuentras todos los servicios y productos del salón. Puedes guardar tus favoritos tocando el ♡ en cada tarjeta.',
    tip: 'Toca cualquier servicio para ver sus detalles y agendar.',
    accentColor: '#8A9A65',
  },
  {
    id: 'citas',
    emoji: '🗓️',
    title: 'Mis Citas',
    description:
      'Aquí puedes solicitar una nueva cita eligiendo el día y servicio que prefieras. También verás el historial de todas tus visitas anteriores.',
    tip: 'El botón "Solicitar este día" pre-rellena la fecha automáticamente.',
    accentColor: '#B8976C',
  },
  {
    id: 'club',
    emoji: '✧',
    title: 'Club Yoss Recompensas',
    description:
      'Cada visita y compra acumula puntos en tu cuenta. Desbloquea recompensas exclusivas como cortes gratis, productos y más beneficios.',
    tip: 'Las recompensas de servicio te llevan directo al agendado.',
    accentColor: '#9E7D5D',
  },
  {
    id: 'perfil',
    emoji: '👤',
    title: 'Mi Perfil',
    description:
      'Personaliza tu foto de perfil, edita tus datos y abre el chat con el Asistente Yoss para consultar horarios, ubicación y anticipos.',
    tip: 'El chat también te envía recordatorios de tus citas.',
    accentColor: colors.primary[600],
  },
  {
    id: 'chat',
    emoji: '💬',
    title: 'Asistente & Mensajes',
    description:
      'Desde "Mi Perfil" accedes a la bandeja de mensajes. Pregunta horarios, ubicación o anticipa pagos con Mercado Pago directamente desde aquí.',
    tip: '¡Usa los chips de preguntas rápidas para respuestas al instante!',
    accentColor: '#009EE3',
  },
];

// ── Pasos para ADMIN ──────────────────────────────────────────────────────────
export const ADMIN_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'bienvenida-admin',
    emoji: '🌸',
    title: '¡Hola, Yoss! Bienvenida al Panel Admin',
    description:
      'Este es tu panel de control completo. Desde aquí gestionas citas, expedientes de clientas, recompensas y la mensajería del salón.',
    tip: 'Navega con las pestañas de la barra inferior.',
    accentColor: colors.primary[500],
  },
  {
    id: 'agenda',
    emoji: '📋',
    title: 'Agenda del Salón',
    description:
      'Visualiza y administra todas las citas del día. Acepta solicitudes, actualiza estados (En proceso, Finalizada, No asistió) y lleva el control.',
    tip: 'El badge rojo indica citas nuevas pendientes de revisión.',
    accentColor: '#8A9A65',
  },
  {
    id: 'expedientes',
    emoji: '📁',
    title: 'Expedientes',
    description:
      'Accede al perfil completo de cada clienta: historial de servicios, fórmulas de color, alergias y preferencias para una atención personalizada.',
    tip: 'Mantén los expedientes actualizados después de cada visita.',
    accentColor: '#B8976C',
  },
  {
    id: 'recompensas-admin',
    emoji: '✧',
    title: 'Gestión de Recompensas',
    description:
      'Administra el programa de fidelidad. Configura las metas, aprueba canjes y da seguimiento al nivel de cada clienta en el Club Yoss.',
    tip: 'Las recompensas canjeadas suben automáticamente a un nivel mayor.',
    accentColor: '#9E7D5D',
  },
  {
    id: 'mensajes-admin',
    emoji: '💌',
    title: 'Bandeja de Mensajes',
    description:
      'Recibe y responde los mensajes de tus clientas en tiempo real. Cada conversación está separada por perfil para una atención personalizada.',
    tip: 'El número rojo en la pestaña indica mensajes sin leer.',
    accentColor: colors.primary[600],
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  role: 'cliente' | 'admin';
  onFinish: () => void;
}

// ── Componente Principal ──────────────────────────────────────────────────────
export default function OnboardingGuide({ visible, role, onFinish }: Props) {
  const steps = role === 'admin' ? ADMIN_ONBOARDING_STEPS : CLIENT_ONBOARDING_STEPS;
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goToStep = (nextIndex: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep(nextIndex);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    setCurrentStep(0);
    fadeAnim.setValue(1);
    onFinish();
  };

  const step = steps[currentStep];
  const accent = step.accentColor ?? colors.primary[500];
  const isLast = currentStep === steps.length - 1;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      {/* Fondo oscuro */}
      <View style={s.backdrop}>
        <View style={s.card}>
          {/* Botón saltar */}
          <TouchableOpacity style={s.skipBtn} onPress={handleFinish} activeOpacity={0.7}>
            <Text style={s.skipText}>Saltar guía</Text>
          </TouchableOpacity>

          {/* Contenido animado */}
          <Animated.View style={[s.stepContent, { opacity: fadeAnim }]}>
            {/* Emoji grande */}
            <View style={[s.emojiWrap, { backgroundColor: accent + '1A' }]}>
              <Text style={s.emoji}>{step.emoji}</Text>
            </View>

            {/* Título */}
            <Text style={[s.title, { color: accent }]}>{step.title}</Text>

            {/* Descripción */}
            <Text style={s.description}>{step.description}</Text>

            {/* Consejo */}
            {!!step.tip && (
              <View style={[s.tipBox, { borderColor: accent + '40', backgroundColor: accent + '0D' }]}>
                <Text style={s.tipIcon}>💡</Text>
                <Text style={[s.tipText, { color: accent }]}>{step.tip}</Text>
              </View>
            )}
          </Animated.View>

          {/* Indicadores de paso */}
          <View style={s.dotsRow}>
            {steps.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => goToStep(i)} activeOpacity={0.7}>
                <View
                  style={[
                    s.dot,
                    i === currentStep
                      ? [s.dotActive, { backgroundColor: accent }]
                      : s.dotInactive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Botones de navegación */}
          <View style={s.navRow}>
            {currentStep > 0 ? (
              <TouchableOpacity style={s.prevBtn} onPress={handlePrev} activeOpacity={0.75}>
                <Text style={s.prevBtnText}>← Anterior</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <TouchableOpacity
              style={[s.nextBtn, { backgroundColor: accent }]}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={s.nextBtnText}>
                {isLast ? '¡Comenzar! 🌿' : 'Siguiente →'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Número de paso */}
          <Text style={s.stepCounter}>
            {currentStep + 1} / {steps.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,34,28,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: 24,
    paddingTop: 20,
    ...shadow.card,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  skipText: {
    color: colors.beige[400],
    fontSize: 11,
    fontWeight: '600',
  },

  stepContent: {
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 4,
  },

  emojiWrap: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emoji: { fontSize: 42 },

  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 26,
  },
  description: {
    fontSize: 14,
    color: colors.ink[700],
    textAlign: 'center',
    lineHeight: 20,
  },

  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    width: '100%',
  },
  tipIcon: { fontSize: 14, marginTop: 1 },
  tipText: { flex: 1, fontSize: 11, fontWeight: '600', lineHeight: 16 },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
    marginTop: 22,
    marginBottom: 16,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  dotActive: { width: 22 },
  dotInactive: { width: 7, backgroundColor: colors.beige[200] },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prevBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: borderRadius.pill,
    borderWidth: 1.5,
    borderColor: colors.beige[200],
    alignItems: 'center',
  },
  prevBtnText: { color: colors.ink[700], fontSize: 13, fontWeight: '700' },

  nextBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    ...shadow.button,
  },
  nextBtnText: { color: colors.white, fontSize: 14, fontWeight: '800' },

  stepCounter: {
    textAlign: 'center',
    color: colors.beige[400],
    fontSize: 10,
    marginTop: 10,
    fontWeight: '600',
  },
});
