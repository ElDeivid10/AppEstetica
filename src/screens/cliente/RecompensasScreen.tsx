/**
 * RecompensasScreen.tsx
 * Sistema de fidelización y recompensas del Club Yoss.
 *
 * Reglas de Negocio Implementadas:
 * 1. Recompensas de Servicios (Corte, Cejas, Tratamientos):
 *    - Al canjear, invita a agendar su cita directamente aplicando el 100% de descuento.
 * 2. Recompensas de Productos:
 *    - Opción de agregarlo como regalo en su próxima cita o generar cupón para recoger en salón.
 * 3. Ciclo de progreso:
 *    - Al canjear, la recompensa se actualiza al siguiente nivel con una meta de alcance mayor (nivel 2, 3...).
 *    - Se genera una notificación en la bandeja de mensajes.
 */

import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { PageHeader, pageStyles as p } from '@/components/SalonUI';
import { useSalon, RewardItem } from '@/context/SalonContext';
import { theme } from '@/constants/YossTheme';

const { colors, borderRadius, shadow, spacing } = theme;

interface Props {
  onNavigateToAgendar?: (params?: { fecha?: string; servicioId?: string; isRecompensa?: boolean; recompensaNombre?: string }) => void;
}

function ProgressBar({ progress }: { progress: number }) {
  const pct = Math.min(Math.max(progress, 0), 1);
  return (
    <View style={bar.track}>
      <View style={[bar.fill, { width: `${Math.round(pct * 100)}%` as any }]} />
      {pct >= 1 && (
        <View style={bar.completeMark}>
          <Text style={bar.completeMarkText}>✓</Text>
        </View>
      )}
    </View>
  );
}

const bar = StyleSheet.create({
  track: {
    height: 7,
    backgroundColor: colors.beige[200],
    borderRadius: 99,
    overflow: 'visible',
    position: 'relative',
  },
  fill: {
    height: 7,
    backgroundColor: colors.primary[500],
    borderRadius: 99,
  },
  completeMark: {
    position: 'absolute',
    right: -2,
    top: -9,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.button,
  },
  completeMarkText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
});

export default function RecompensasScreen({ onNavigateToAgendar }: Props) {
  const { rewards, claimReward, clientProfile } = useSalon();
  const [activeFilter, setActiveFilter] = useState<'todas' | 'visitas' | 'gasto'>('todas');

  // Modal de Canje
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [modalMode, setModalMode] = useState<'service' | 'product' | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);

  const filtered = activeFilter === 'todas'
    ? rewards
    : rewards.filter(r => r.type === activeFilter);

  const handleOpenClaim = (reward: RewardItem) => {
    setSelectedReward(reward);
    if (reward.category === 'servicio') {
      setModalMode('service');
    } else {
      setModalMode('product');
    }
  };

  const handleConfirmServiceClaim = () => {
    if (!selectedReward) return;
    claimReward(selectedReward.id);
    const servicioId = selectedReward.serviceMatchId || 'srv-001';
    const rewardName = selectedReward.title;
    setModalMode(null);
    setSelectedReward(null);
    // Redirige a agendar cita con el beneficio aplicado
    onNavigateToAgendar?.({
      servicioId,
      isRecompensa: true,
      recompensaNombre: rewardName,
    });
  };

  const handleAttachProductToAppointment = () => {
    if (!selectedReward) return;
    claimReward(selectedReward.id);
    const rewardName = selectedReward.title;
    setModalMode(null);
    setSelectedReward(null);
    // Agenda cita con el producto asignado como recompensa a recoger
    onNavigateToAgendar?.({
      isRecompensa: true,
      recompensaNombre: `Producto Gratis: ${rewardName}`,
    });
  };

  const handleGenerateCoupon = () => {
    if (!selectedReward) return;
    claimReward(selectedReward.id);
    const code = `YOSS-${Math.floor(1000 + Math.random() * 9000)}`;
    setCouponCode(code);
  };

  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <PageHeader
        eyebrow="Yoss Beauty Club"
        title="Recompensas"
        subtitle="Acumula visitas y compras para obtener beneficios exclusivos."
      />

      {/* ── Tarjeta de Estado del Cliente ── */}
      <View style={s.statusCard}>
        <View style={s.statusLeft}>
          <Text style={s.statusEyebrow}>TU NIVEL</Text>
          <View style={s.levelRow}>
            <Text style={s.levelIcon}>✦</Text>
            <Text style={s.levelName}>{clientProfile.level}</Text>
          </View>
          <Text style={s.statusSub}>
            Siguiente nivel: {clientProfile.nextLevel} · ${clientProfile.nextLevelAt.toLocaleString()} MXN
          </Text>
        </View>
        <View style={s.statusDivider} />
        <View style={s.statusRight}>
          <View style={s.statItem}>
            <Text style={s.statValue}>{clientProfile.totalVisits}</Text>
            <Text style={s.statLabel}>Visitas</Text>
          </View>
          <View style={s.statItem}>
            <Text style={s.statValue}>${clientProfile.totalSpent.toLocaleString()}</Text>
            <Text style={s.statLabel}>Gastado</Text>
          </View>
        </View>
      </View>

      {/* ── Progreso de Nivel ── */}
      <View style={s.levelProgressCard}>
        <View style={s.levelProgressHeader}>
          <Text style={s.levelProgressLabel}>Progreso hacia nivel {clientProfile.nextLevel}</Text>
          <Text style={s.levelProgressPct}>
            {Math.round((clientProfile.totalSpent / clientProfile.nextLevelAt) * 100)}%
          </Text>
        </View>
        <ProgressBar progress={clientProfile.totalSpent / clientProfile.nextLevelAt} />
        <Text style={s.levelProgressSub}>
          Te faltan ${(clientProfile.nextLevelAt - clientProfile.totalSpent).toLocaleString()} MXN para alcanzar nivel {clientProfile.nextLevel}
        </Text>
      </View>

      {/* ── Filtros ── */}
      <View style={s.filterRow}>
        {([['todas', 'Todas'], ['visitas', 'Por visitas'], ['gasto', 'Por gasto']] as const).map(
          ([key, label]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveFilter(key)}
              style={[s.filterChip, activeFilter === key && s.filterChipActive]}
              activeOpacity={0.75}
            >
              <Text style={[s.filterChipText, activeFilter === key && s.filterChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* ── Lista de Recompensas ── */}
      {filtered.map(reward => {
        const unlocked = reward.unlocked || reward.current >= reward.goal;
        const pct = Math.min(reward.current / reward.goal, 1);
        const remaining = Math.max(reward.goal - reward.current, 0);

        return (
          <View key={reward.id} style={[s.card, unlocked && s.cardUnlocked]}>
            <View style={s.badgeRow}>
              {unlocked ? (
                <View style={s.unlockedBadge}>
                  <Text style={s.unlockedBadgeText}>¡DISPONIBLE PARA CANJEAR!</Text>
                </View>
              ) : reward.claimed ? (
                <View style={s.claimedBadge}>
                  <Text style={s.claimedBadgeText}>NIVEL {(reward.tierLevel || 1)} · NUEVA META</Text>
                </View>
              ) : null}

              <View style={s.categoryBadge}>
                <Text style={s.categoryBadgeText}>
                  {reward.category === 'servicio' ? '✂ Tratamiento en salón' : '🧴 Producto'}
                </Text>
              </View>
            </View>

            <View style={s.cardTop}>
              <View style={[s.iconBox, unlocked && s.iconBoxUnlocked]}>
                <Text style={s.icon}>{reward.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rewardTitle}>{reward.title}</Text>
                <Text style={s.rewardDesc}>{reward.description}</Text>
              </View>
            </View>

            <View style={s.progressSection}>
              <View style={s.progressHeader}>
                <Text style={s.progressLabel}>
                  {reward.type === 'visitas'
                    ? `${reward.current} de ${reward.goal} visitas acumuladas`
                    : `$${reward.current.toLocaleString()} de $${reward.goal.toLocaleString()} ${reward.unit}`}
                </Text>
                <Text style={[s.progressPct, unlocked && s.progressPctUnlocked]}>
                  {Math.round(pct * 100)}%
                </Text>
              </View>
              <ProgressBar progress={pct} />
              {!unlocked && (
                <Text style={s.remaining}>
                  {reward.type === 'visitas'
                    ? `Te faltan ${remaining} visita${remaining !== 1 ? 's' : ''} para alcanzar la recompensa`
                    : `Te faltan $${remaining.toLocaleString()} MXN en consumos para desbloquearla`}
                </Text>
              )}
            </View>

            {unlocked && (
              <TouchableOpacity
                style={s.redeemBtn}
                onPress={() => handleOpenClaim(reward)}
                activeOpacity={0.85}
              >
                <Text style={s.redeemBtnText}>
                  Canjear recompensa {reward.category === 'servicio' ? 'y agendar cita →' : '→'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      <Text style={s.disclaimer}>
        Al canjear un beneficio, la meta se actualiza al siguiente nivel con mayores recompensas exclusivas.
      </Text>

      {/* ── MODAL: Canje de Servicio (Tratamiento/Corte) ── */}
      <Modal visible={modalMode === 'service'} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalIconCircle}>
              <Text style={{ fontSize: 28 }}>✂️</Text>
            </View>
            <Text style={s.modalTitle}>¡Canjear {selectedReward?.title}!</Text>
            <Text style={s.modalBody}>
              Esta recompensa cubre el 100% del costo del tratamiento en tu visita.
              {'\n\n'}
              ¿Deseas agendar tu cita ahora mismo para disfrutar tu beneficio?
            </Text>

            <TouchableOpacity
              style={[p.button, { width: '100%' }]}
              onPress={handleConfirmServiceClaim}
              activeOpacity={0.88}
            >
              <Text style={p.buttonText}>Agendar cita gratis ahora →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.modalCancelBtn}
              onPress={() => setModalMode(null)}
              activeOpacity={0.7}
            >
              <Text style={s.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: Canje de Producto ── */}
      <Modal visible={modalMode === 'product'} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={[s.modalIconCircle, { backgroundColor: colors.beige[100] }]}>
              <Text style={{ fontSize: 28 }}>🧴</Text>
            </View>
            <Text style={s.modalTitle}>{selectedReward?.title}</Text>

            {!couponCode ? (
              <>
                <Text style={s.modalBody}>
                  Puedes recoger tu producto en tu próxima cita en el salón o generar un cupón digital para pasar por él.
                </Text>

                <TouchableOpacity
                  style={[p.button, { width: '100%', marginBottom: 10 }]}
                  onPress={handleAttachProductToAppointment}
                  activeOpacity={0.88}
                >
                  <Text style={p.buttonText}>📅 Agendar cita y recogerlo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.couponChoiceBtn]}
                  onPress={handleGenerateCoupon}
                  activeOpacity={0.8}
                >
                  <Text style={s.couponChoiceText}>🎫 Generar cupón para tienda</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.modalCancelBtn}
                  onPress={() => setModalMode(null)}
                  activeOpacity={0.7}
                >
                  <Text style={s.modalCancelText}>Volver</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={s.modalBody}>
                  Muestra este código a Yoss en recepción para entregarte tu producto:
                </Text>
                <View style={s.couponBox}>
                  <Text style={s.couponCodeText}>{couponCode}</Text>
                  <Text style={s.couponSub}>Válido por 30 días · Canje único</Text>
                </View>
                <TouchableOpacity
                  style={[p.button, { width: '100%' }]}
                  onPress={() => {
                    setCouponCode(null);
                    setModalMode(null);
                  }}
                  activeOpacity={0.88}
                >
                  <Text style={p.buttonText}>Entendido ✓</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  // Status card
  statusCard: {
    backgroundColor: colors.ink[800],
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...shadow.card,
  },
  statusLeft: { flex: 1.4, gap: 4 },
  statusEyebrow: { color: colors.primary[200], fontSize: 8, letterSpacing: 1.8, fontWeight: '700' },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 2 },
  levelIcon: { color: '#CDBB87', fontSize: 18 },
  levelName: { color: colors.white, fontSize: 22, fontWeight: '700' },
  statusSub: { color: '#B8B6A8', fontSize: 9, marginTop: 3 },
  statusDivider: { width: 1, height: 60, backgroundColor: '#FFFFFF20' },
  statusRight: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 3 },
  statValue: { color: colors.white, fontSize: 19, fontWeight: '700' },
  statLabel: { color: colors.primary[200], fontSize: 9, fontWeight: '600' },

  // Level progress
  levelProgressCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.beige[200],
    padding: 14,
    gap: 9,
    ...shadow.card,
  },
  levelProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  levelProgressLabel: { color: colors.ink[800], fontWeight: '700', fontSize: 12 },
  levelProgressPct: { color: colors.primary[600], fontWeight: '700', fontSize: 12 },
  levelProgressSub: { color: colors.ink[700], fontSize: 10, marginTop: 2 },

  // Filters
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    borderRadius: 99,
    borderWidth: 1,
    borderColor: colors.beige[200],
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  filterChipActive: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  filterChipText: { color: colors.ink[700], fontSize: 11, fontWeight: '600' },
  filterChipTextActive: { color: colors.white },

  // Reward card
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.beige[200],
    padding: 16,
    gap: 12,
    ...shadow.card,
  },
  cardUnlocked: { borderColor: colors.primary[400], backgroundColor: colors.primary[50] },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  unlockedBadge: {
    backgroundColor: colors.primary[500],
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unlockedBadgeText: { color: colors.white, fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  claimedBadge: {
    backgroundColor: colors.beige[200],
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  claimedBadgeText: { color: colors.ink[700], fontSize: 8, fontWeight: '700' },
  categoryBadge: {
    backgroundColor: colors.beige[100],
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryBadgeText: { color: colors.ink[700], fontSize: 9, fontWeight: '600' },

  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.beige[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxUnlocked: { backgroundColor: colors.primary[100] },
  icon: { fontSize: 24 },
  rewardTitle: { color: colors.ink[800], fontSize: 14, fontWeight: '700', marginBottom: 2 },
  rewardDesc: { color: colors.ink[700], fontSize: 11, lineHeight: 16 },

  progressSection: { gap: 6 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: colors.ink[700], fontSize: 10, fontWeight: '600' },
  progressPct: { color: colors.primary[600], fontSize: 11, fontWeight: '700' },
  progressPctUnlocked: { color: colors.primary[500] },
  remaining: { color: colors.beige[500], fontSize: 9, marginTop: 2 },

  redeemBtn: {
    backgroundColor: colors.primary[500],
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    ...shadow.button,
  },
  redeemBtnText: { color: colors.white, fontSize: 12, fontWeight: '700' },

  disclaimer: { textAlign: 'center', color: colors.beige[500], fontSize: 10, lineHeight: 15 },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    gap: 12,
    ...shadow.card,
  },
  modalIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary[200],
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.ink[800], textAlign: 'center' },
  modalBody: { fontSize: 13, color: colors.ink[700], textAlign: 'center', lineHeight: 19 },
  modalCancelBtn: { paddingVertical: 8, marginTop: 4 },
  modalCancelText: { color: colors.beige[500], fontSize: 12, fontWeight: '600' },

  couponChoiceBtn: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.primary[500],
    borderRadius: borderRadius.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
  couponChoiceText: { color: colors.primary[600], fontSize: 13, fontWeight: '700' },

  couponBox: {
    backgroundColor: colors.beige[50],
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary[400],
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    width: '100%',
    gap: 4,
    marginVertical: 6,
  },
  couponCodeText: { fontSize: 20, fontWeight: '800', color: colors.primary[700], letterSpacing: 2 },
  couponSub: { fontSize: 10, color: colors.beige[500] },
});
