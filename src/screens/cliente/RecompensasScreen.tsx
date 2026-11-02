import React, { useState } from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { PageHeader, pageStyles as p } from '@/components/SalonUI';
import { theme } from '@/constants/YossTheme';

const { colors } = theme;

// ── Datos de ejemplo de recompensas ───────────────────────────────────────────
const REWARDS = [
  {
    id: 'r1',
    icon: '✂️',
    title: 'Corte de cabello gratis',
    description: 'Un corte profesional sin costo para ti.',
    type: 'visitas',
    goal: 10,
    current: 7,
    unit: 'visitas',
  },
  {
    id: 'r2',
    icon: '🧴',
    title: 'Producto a elegir',
    description: 'Llévate un producto del catálogo de tu elección.',
    type: 'gasto',
    goal: 2000,
    current: 1380,
    unit: 'MXN en compras',
  },
  {
    id: 'r3',
    icon: '✨',
    title: 'Tratamiento capilar gratis',
    description: 'Sesión de hidratación profunda o keratina.',
    type: 'gasto',
    goal: 3500,
    current: 1380,
    unit: 'MXN en compras',
  },
  {
    id: 'r4',
    icon: '💅',
    title: 'Diseño de cejas gratis',
    description: 'Retoque completo de cejas sin costo.',
    type: 'visitas',
    goal: 5,
    current: 5,
    unit: 'visitas',
    unlocked: true,
  },
  {
    id: 'r5',
    icon: '🎁',
    title: 'Kit de productos premium',
    description: 'Set de cuidado capilar valorado en $1,500.',
    type: 'gasto',
    goal: 6000,
    current: 1380,
    unit: 'MXN en compras',
  },
];

// ── Stats de la clienta (datos de ejemplo) ────────────────────────────────────
const STATS = {
  totalSpent: 1380,
  totalVisits: 7,
  level: 'Plata',
  nextLevel: 'Oro',
  nextLevelAt: 2000,
};

function ProgressBar({ progress }: { progress: number }) {
  const pct = Math.min(Math.max(progress, 0), 1);
  return (
    <View style={bar.track}>
      <View style={[bar.fill, { width: `${Math.round(pct * 100)}%` as any }]} />
      {pct >= 1 && <View style={bar.completeMark}><Text style={bar.completeMarkText}>✓</Text></View>}
    </View>
  );
}

const bar = StyleSheet.create({
  track: { height: 7, backgroundColor: colors.beige[200], borderRadius: 99, overflow: 'visible', position: 'relative' },
  fill: { height: 7, backgroundColor: colors.primary[500], borderRadius: 99 },
  completeMark: { position: 'absolute', right: -2, top: -9, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary[500], alignItems: 'center', justifyContent: 'center' },
  completeMarkText: { color: colors.white, fontSize: 10, fontWeight: '700' },
});

function RewardCard({ reward }: { reward: typeof REWARDS[0] }) {
  const unlocked = reward.unlocked || reward.current >= reward.goal;
  const pct = Math.min(reward.current / reward.goal, 1);
  const remaining = reward.goal - reward.current;

  return (
    <View style={[s.card, unlocked && s.cardUnlocked]}>
      {unlocked && (
        <View style={s.unlockedBadge}>
          <Text style={s.unlockedBadgeText}>¡DISPONIBLE!</Text>
        </View>
      )}
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
              ? `${reward.current} de ${reward.goal} visitas`
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
              ? `Te faltan ${remaining} visita${remaining !== 1 ? 's' : ''}`
              : `Te faltan $${remaining.toLocaleString()} MXN en compras`}
          </Text>
        )}
      </View>

      {unlocked && (
        <TouchableOpacity style={s.redeemBtn} activeOpacity={0.8}>
          <Text style={s.redeemBtnText}>Canjear recompensa →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function RecompensasScreen() {
  const [activeFilter, setActiveFilter] = useState<'todas' | 'visitas' | 'gasto'>('todas');
  const filtered = activeFilter === 'todas' ? REWARDS : REWARDS.filter(r => r.type === activeFilter);

  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <PageHeader
        eyebrow="Yoss Beauty Club"
        title="Recompensas"
        subtitle="Acumula visitas y compras para obtener beneficios exclusivos."
      />

      {/* ── Tarjeta de estado del cliente ── */}
      <View style={s.statusCard}>
        <View style={s.statusLeft}>
          <Text style={s.statusEyebrow}>TU NIVEL</Text>
          <View style={s.levelRow}>
            <Text style={s.levelIcon}>✦</Text>
            <Text style={s.levelName}>{STATS.level}</Text>
          </View>
          <Text style={s.statusSub}>Siguiente nivel: {STATS.nextLevel} · ${STATS.nextLevelAt.toLocaleString()} MXN</Text>
        </View>
        <View style={s.statusDivider} />
        <View style={s.statusRight}>
          <View style={s.statItem}>
            <Text style={s.statValue}>{STATS.totalVisits}</Text>
            <Text style={s.statLabel}>Visitas</Text>
          </View>
          <View style={s.statItem}>
            <Text style={s.statValue}>${STATS.totalSpent.toLocaleString()}</Text>
            <Text style={s.statLabel}>Gastado</Text>
          </View>
        </View>
      </View>

      {/* ── Barra de progreso de nivel ── */}
      <View style={s.levelProgressCard}>
        <View style={s.levelProgressHeader}>
          <Text style={s.levelProgressLabel}>Progreso hacia nivel {STATS.nextLevel}</Text>
          <Text style={s.levelProgressPct}>{Math.round((STATS.totalSpent / STATS.nextLevelAt) * 100)}%</Text>
        </View>
        <ProgressBar progress={STATS.totalSpent / STATS.nextLevelAt} />
        <Text style={s.levelProgressSub}>
          Te faltan ${(STATS.nextLevelAt - STATS.totalSpent).toLocaleString()} MXN para alcanzar nivel {STATS.nextLevel}
        </Text>
      </View>

      {/* ── Filtros ── */}
      <View style={s.filterRow}>
        {([['todas', 'Todas'], ['visitas', 'Por visitas'], ['gasto', 'Por gasto']] as const).map(([key, label]) => (
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
        ))}
      </View>

      {/* ── Lista de recompensas ── */}
      {filtered.map(reward => (
        <RewardCard key={reward.id} reward={reward} />
      ))}

      <Text style={s.disclaimer}>
        Las recompensas se acumulan automáticamente con cada visita y compra registrada en el salón.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  // Status card
  statusCard: { backgroundColor: colors.ink[800], borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 },
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
  levelProgressCard: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.beige[200], padding: 14, gap: 9 },
  levelProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  levelProgressLabel: { color: colors.ink[800], fontWeight: '700', fontSize: 12 },
  levelProgressPct: { color: colors.primary[600], fontWeight: '700', fontSize: 12 },
  levelProgressSub: { color: colors.ink[700], fontSize: 10, marginTop: 2 },

  // Filters
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { borderRadius: 99, borderWidth: 1, borderColor: colors.beige[200], paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.white },
  filterChipActive: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  filterChipText: { color: colors.ink[700], fontSize: 11, fontWeight: '600' },
  filterChipTextActive: { color: colors.white },

  // Reward card
  card: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.beige[200], padding: 16, gap: 14 },
  cardUnlocked: { borderColor: colors.primary[300], backgroundColor: colors.primary[50] },
  unlockedBadge: { alignSelf: 'flex-start', backgroundColor: colors.primary[500], borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  unlockedBadgeText: { color: colors.white, fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  iconBox: { width: 48, height: 48, borderRadius: 15, backgroundColor: colors.beige[100], alignItems: 'center', justifyContent: 'center' },
  iconBoxUnlocked: { backgroundColor: colors.primary[100] },
  icon: { fontSize: 24 },
  rewardTitle: { color: colors.ink[800], fontSize: 14, fontWeight: '700', marginBottom: 3 },
  rewardDesc: { color: colors.ink[700], fontSize: 11, lineHeight: 16 },

  // Progress section
  progressSection: { gap: 7 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: colors.ink[700], fontSize: 10, fontWeight: '600' },
  progressPct: { color: colors.primary[600], fontSize: 11, fontWeight: '700' },
  progressPctUnlocked: { color: colors.primary[500] },
  remaining: { color: colors.beige[500], fontSize: 9, marginTop: 2 },

  // Redeem
  redeemBtn: { backgroundColor: colors.primary[500], borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  redeemBtnText: { color: colors.white, fontSize: 12, fontWeight: '700' },

  disclaimer: { textAlign: 'center', color: colors.beige[500], fontSize: 10, lineHeight: 15 },
});

