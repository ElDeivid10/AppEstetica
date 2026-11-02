import React, { useState } from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity, TextInput, Switch } from 'react-native';
import { PageHeader, SectionTitle, pageStyles as p } from '@/components/SalonUI';
import { theme } from '@/constants/YossTheme';

const { colors } = theme;

type RewardType = 'visitas' | 'gasto';
type Reward = {
  id: string;
  icon: string;
  title: string;
  description: string;
  type: RewardType;
  goal: number;
  active: boolean;
};

const initialRewards: Reward[] = [
  { id: 'r1', icon: '✂️', title: 'Corte de cabello gratis', description: 'Un corte profesional sin costo para la cliente.', type: 'visitas', goal: 10, active: true },
  { id: 'r2', icon: '🧴', title: 'Producto a elegir', description: 'Un producto del catálogo a elección de la cliente.', type: 'gasto', goal: 2000, active: true },
  { id: 'r3', icon: '✨', title: 'Tratamiento capilar gratis', description: 'Sesión de hidratación profunda o keratina sin costo.', type: 'gasto', goal: 3500, active: true },
  { id: 'r4', icon: '💅', title: 'Diseño de cejas gratis', description: 'Retoque completo de cejas sin cargo.', type: 'visitas', goal: 5, active: true },
  { id: 'r5', icon: '🎁', title: 'Kit de productos premium', description: 'Set de cuidado capilar especial de la estética.', type: 'gasto', goal: 6000, active: false },
];

const ICONS = ['✂️', '🧴', '✨', '💅', '🎁', '🌿', '💆', '🎀', '💄', '🫧'];

export default function RecompensasAdminScreen() {
  const [rewards, setRewards] = useState<Reward[]>(initialRewards);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<RewardType>('visitas');
  const [formGoal, setFormGoal] = useState('');
  const [formIcon, setFormIcon] = useState('✂️');

  const resetForm = () => {
    setFormTitle(''); setFormDesc(''); setFormType('visitas');
    setFormGoal(''); setFormIcon('✂️'); setEditingId(null);
  };

  const openNew = () => { resetForm(); setShowForm(true); };
  const openEdit = (reward: Reward) => {
    setFormTitle(reward.title); setFormDesc(reward.description);
    setFormType(reward.type); setFormGoal(String(reward.goal));
    setFormIcon(reward.icon); setEditingId(reward.id);
    setShowForm(true);
  };

  const saveReward = () => {
    if (!formTitle.trim() || !formGoal.trim()) return;
    const goal = parseInt(formGoal.replace(/\D/g, ''), 10) || 1;
    if (editingId) {
      setRewards(rewards.map(r => r.id === editingId
        ? { ...r, title: formTitle.trim(), description: formDesc.trim(), type: formType, goal, icon: formIcon }
        : r));
    } else {
      const newReward: Reward = {
        id: `r${Date.now()}`, icon: formIcon,
        title: formTitle.trim(), description: formDesc.trim(),
        type: formType, goal, active: true,
      };
      setRewards([newReward, ...rewards]);
    }
    resetForm(); setShowForm(false);
  };

  const toggleActive = (id: string) =>
    setRewards(rewards.map(r => r.id === id ? { ...r, active: !r.active } : r));

  const deleteReward = (id: string) =>
    setRewards(rewards.filter(r => r.id !== id));

  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <PageHeader
        eyebrow="Panel administrador"
        title="Recompensas"
        subtitle="Gestiona el catálogo de beneficios para tus clientas."
      />

      {/* ── Estadísticas rápidas ── */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { backgroundColor: colors.primary[500] }]}>
          <Text style={s.statCardValue}>{rewards.filter(r => r.active).length}</Text>
          <Text style={s.statCardLabel}>Activas</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.ink[800] }]}>
          <Text style={s.statCardValue}>{rewards.length}</Text>
          <Text style={s.statCardLabel}>Total</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.beige[500] }]}>
          <Text style={s.statCardValue}>{rewards.filter(r => r.type === 'visitas').length}</Text>
          <Text style={s.statCardLabel}>Por visitas</Text>
        </View>
      </View>

      {/* ── Botón agregar + Formulario ── */}
      <View style={p.row}>
        <SectionTitle title="Recompensas" />
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => { if (showForm && !editingId) { setShowForm(false); resetForm(); } else openNew(); }}
          activeOpacity={0.8}
        >
          <Text style={s.addBtnText}>{showForm && !editingId ? 'Cerrar' : '+ Nueva'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={[p.card, s.form]}>
          <Text style={s.formTitle}>{editingId ? 'Editar recompensa' : 'Nueva recompensa'}</Text>

          {/* Icon selector */}
          <Text style={s.fieldLabel}>ÍCONO</Text>
          <View style={s.iconRow}>
            {ICONS.map(icon => (
              <TouchableOpacity
                key={icon}
                onPress={() => setFormIcon(icon)}
                style={[s.iconOption, formIcon === icon && s.iconOptionActive]}
              >
                <Text style={s.iconOptionText}>{icon}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.fieldLabel}>NOMBRE DE LA RECOMPENSA</Text>
          <TextInput
            value={formTitle}
            onChangeText={setFormTitle}
            placeholder="Ej. Corte de cabello gratis"
            style={p.input}
            placeholderTextColor={colors.beige[400]}
          />

          <Text style={s.fieldLabel}>DESCRIPCIÓN (opcional)</Text>
          <TextInput
            value={formDesc}
            onChangeText={setFormDesc}
            placeholder="Describe brevemente el beneficio"
            style={[p.input, { minHeight: 60, textAlignVertical: 'top' }]}
            multiline
            placeholderTextColor={colors.beige[400]}
          />

          <Text style={s.fieldLabel}>TIPO DE ACUMULACIÓN</Text>
          <View style={s.typeRow}>
            {(['visitas', 'gasto'] as const).map(type => (
              <TouchableOpacity
                key={type}
                onPress={() => setFormType(type)}
                style={[s.typeChip, formType === type && s.typeChipActive]}
              >
                <Text style={[s.typeChipText, formType === type && s.typeChipTextActive]}>
                  {type === 'visitas' ? '📅 Por visitas' : '💳 Por gasto'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.fieldLabel}>
            {formType === 'visitas' ? 'NÚMERO DE VISITAS REQUERIDAS' : 'MONTO REQUERIDO (MXN)'}
          </Text>
          <TextInput
            value={formGoal}
            onChangeText={setFormGoal}
            placeholder={formType === 'visitas' ? 'Ej. 10' : 'Ej. 2000'}
            keyboardType="numeric"
            style={p.input}
            placeholderTextColor={colors.beige[400]}
          />

          <View style={s.formActions}>
            <TouchableOpacity
              style={[p.outlineButton, { flex: 1 }]}
              onPress={() => { setShowForm(false); resetForm(); }}
            >
              <Text style={p.outlineButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[p.button, { flex: 2 }]} onPress={saveReward}>
              <Text style={p.buttonText}>{editingId ? 'Guardar cambios' : 'Crear recompensa'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Lista de recompensas ── */}
      {rewards.map(reward => (
        <View key={reward.id} style={[p.card, s.rewardRow, !reward.active && s.rewardRowInactive]}>
          <View style={[s.rewardIconBox, !reward.active && s.rewardIconBoxInactive]}>
            <Text style={s.rewardIcon}>{reward.icon}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[s.rewardTitle, !reward.active && s.textInactive]}>{reward.title}</Text>
            <Text style={s.rewardDesc} numberOfLines={1}>{reward.description}</Text>
            <View style={s.rewardMeta}>
              <View style={s.metaChip}>
                <Text style={s.metaChipText}>
                  {reward.type === 'visitas'
                    ? `${reward.goal} visitas`
                    : `$${reward.goal.toLocaleString()} MXN`}
                </Text>
              </View>
              <View style={[s.metaChip, reward.type === 'visitas' ? s.chipVisitas : s.chipGasto]}>
                <Text style={[s.metaChipText, reward.type === 'visitas' ? s.chipVisitasText : s.chipGastoText]}>
                  {reward.type === 'visitas' ? 'Por visitas' : 'Por gasto'}
                </Text>
              </View>
            </View>
          </View>

          <View style={s.rewardActions}>
            <Switch
              value={reward.active}
              onValueChange={() => toggleActive(reward.id)}
              trackColor={{ false: colors.beige[200], true: colors.primary[200] }}
              thumbColor={reward.active ? colors.primary[500] : colors.beige[400]}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
            <TouchableOpacity onPress={() => openEdit(reward)} style={s.editBtn}>
              <Text style={s.editBtnText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteReward(reward.id)} style={s.deleteBtn}>
              <Text style={s.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {rewards.length === 0 && (
        <View style={[p.card, s.empty]}>
          <Text style={{ fontSize: 32 }}>🎁</Text>
          <Text style={s.emptyTitle}>Sin recompensas</Text>
          <Text style={p.muted}>Crea la primera recompensa para tus clientas.</Text>
        </View>
      )}

      <Text style={s.note}>Los cambios se aplicarán cuando conectes la base de datos.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 3 },
  statCardValue: { color: colors.white, fontSize: 22, fontWeight: '700' },
  statCardLabel: { color: '#FFFFFF99', fontSize: 9, fontWeight: '600' },

  addBtn: { backgroundColor: colors.primary[500], borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText: { color: colors.white, fontSize: 11, fontWeight: '700' },

  form: { gap: 10 },
  formTitle: { color: colors.ink[800], fontSize: 16, fontWeight: '700', marginBottom: 2 },
  fieldLabel: { color: colors.beige[500], fontSize: 9, letterSpacing: 1, fontWeight: '700', marginTop: 2 },

  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconOption: { width: 40, height: 40, borderRadius: 11, backgroundColor: colors.beige[100], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.beige[200] },
  iconOptionActive: { backgroundColor: colors.primary[100], borderColor: colors.primary[400] },
  iconOptionText: { fontSize: 20 },

  typeRow: { flexDirection: 'row', gap: 9 },
  typeChip: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.beige[200], paddingVertical: 10, alignItems: 'center', backgroundColor: colors.white },
  typeChipActive: { backgroundColor: colors.primary[50], borderColor: colors.primary[500] },
  typeChipText: { color: colors.ink[700], fontSize: 11, fontWeight: '600' },
  typeChipTextActive: { color: colors.primary[600] },

  formActions: { flexDirection: 'row', gap: 9, marginTop: 4 },

  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 },
  rewardRowInactive: { opacity: 0.55 },
  rewardIconBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.beige[100], alignItems: 'center', justifyContent: 'center' },
  rewardIconBoxInactive: { backgroundColor: colors.ink[50] },
  rewardIcon: { fontSize: 22 },
  rewardTitle: { color: colors.ink[800], fontSize: 13, fontWeight: '700' },
  textInactive: { color: colors.ink[700] },
  rewardDesc: { color: colors.ink[700], fontSize: 10, marginTop: 2 },
  rewardMeta: { flexDirection: 'row', gap: 6, marginTop: 6 },
  metaChip: { borderRadius: 99, backgroundColor: colors.beige[100], paddingHorizontal: 8, paddingVertical: 3 },
  metaChipText: { color: colors.ink[700], fontSize: 9, fontWeight: '600' },
  chipVisitas: { backgroundColor: colors.primary[50] },
  chipVisitasText: { color: colors.primary[600] },
  chipGasto: { backgroundColor: '#FFF4D8' },
  chipGastoText: { color: '#946200' },

  rewardActions: { alignItems: 'center', gap: 5 },
  editBtn: { borderWidth: 1, borderColor: colors.beige[200], borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  editBtnText: { color: colors.ink[700], fontSize: 9, fontWeight: '600' },
  deleteBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FCE7E7', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: '#A83333', fontSize: 10, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyTitle: { color: colors.ink[800], fontSize: 15, fontWeight: '700' },
  note: { textAlign: 'center', color: colors.beige[500], fontSize: 10, lineHeight: 15 },
});
