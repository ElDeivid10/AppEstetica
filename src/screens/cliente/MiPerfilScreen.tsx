import React, { useState } from 'react';
import {
  ScrollView, Text, View, StyleSheet, TouchableOpacity,
  TextInput, Modal, FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { PageHeader, SectionTitle, pageStyles as p } from '@/components/SalonUI';
import { useAuth } from '@/context/AuthContext';
import { theme } from '@/constants/YossTheme';

const { colors } = theme;

// ── Datos de ejemplo para favoritos ───────────────────────────────────────────
const FAV_SERVICES = [
  { id: 'fs1', icon: '✂', name: 'Cortes de Cabello', duration: '20–45 MIN' },
  { id: 'fs2', icon: '✦', name: 'Colorimetría', duration: '2–8 HORAS' },
  { id: 'fs3', icon: '♡', name: 'Alaciados Progresivos', duration: '3–5 HORAS' },
];
const FAV_PRODUCTS = [
  { id: 'fp1', brand: "L'OREAL", name: 'Vitamino Color', tint: '#F5E8DD', image: 'https://www.sephora.com/productimages/sku/s2717411-main-zoom.jpg' },
  { id: 'fp2', brand: 'WELLA', name: 'Color Fresh Mask', tint: '#E9E5F1', image: 'https://wella.bynder.com/m/cdb6a5785d08b9f5/original/Wella_Professionals_Color_Fresh_Mask_Copper_Glow_150ml_PI_1.png' },
  { id: 'fp3', brand: 'OLAPLEX', name: 'No.5 Bond', tint: '#F0EEDC', image: 'https://olaplex.com/cdn/shop/articles/Large_JPG-TEXTURE_N5_WHITE_BG_W_PRODUCT_3000x3000_0faafb22-1f16-42ff-b774-7361fdaa005f.jpg?v=1706268308&width=1200' },
  { id: 'fp4', brand: 'KERASTASE', name: 'Chroma Absolu', tint: '#F1E6EC', image: 'https://www.kerastase.com.br/dw/image/v2/AAFM_PRD/on/demandware.static/-/Sites-kerastase-master-catalog/pt_BR/dw831df1bc/images/KRBR00119/condicionador-kerastase-%20chroma-absolu-fondant-cica-chroma.jpg' },
];

// ── Sub-componente: modal de favoritos completo ────────────────────────────────
function FavoritosModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'servicios' | 'productos'>('servicios');
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={m.root}>
        <View style={m.header}>
          <Text style={m.headerTitle}>Mis Favoritos</Text>
          <TouchableOpacity onPress={onClose} style={m.closeBtn}>
            <Text style={m.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={m.tabs}>
          {(['servicios', 'productos'] as const).map(tab => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[m.tab, activeTab === tab && m.tabActive]}>
              <Text style={[m.tabText, activeTab === tab && m.tabTextActive]}>
                {tab === 'servicios' ? '✂ Servicios' : '🧴 Productos'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {activeTab === 'servicios'
          ? <FlatList
              data={FAV_SERVICES}
              keyExtractor={item => item.id}
              contentContainerStyle={m.list}
              renderItem={({ item }) => (
                <View style={m.serviceRow}>
                  <View style={m.serviceIcon}><Text style={{ fontSize: 20, color: colors.primary[600] }}>{item.icon}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={m.serviceName}>{item.name}</Text>
                    <Text style={m.serviceDuration}>{item.duration}</Text>
                  </View>
                  <Text style={m.favHeart}>♥</Text>
                </View>
              )}
            />
          : <FlatList
              data={FAV_PRODUCTS}
              keyExtractor={item => item.id}
              numColumns={2}
              columnWrapperStyle={{ gap: 12 }}
              contentContainerStyle={m.list}
              renderItem={({ item }) => (
                <View style={m.productCard}>
                  <View style={[m.productArt, { backgroundColor: item.tint }]}>
                    <Image source={{ uri: item.image }} style={m.productPhoto} contentFit="contain" transition={180} />
                  </View>
                  <Text style={m.productBrand}>{item.brand}</Text>
                  <Text style={m.productName}>{item.name}</Text>
                </View>
              )}
            />
        }
      </View>
    </Modal>
  );
}

const m = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.beige[50] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 24, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.beige[200] },
  headerTitle: { color: colors.ink[800], fontSize: 20, fontWeight: '700' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.beige[100], alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: colors.ink[700], fontSize: 13, fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: 4, margin: 16, backgroundColor: colors.beige[100], padding: 4, borderRadius: 13 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: colors.white, ...theme.shadow.card },
  tabText: { color: colors.ink[700], fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: colors.primary[600], fontWeight: '700' },
  list: { padding: 16, gap: 10 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.beige[200], padding: 14 },
  serviceIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.beige[100], alignItems: 'center', justifyContent: 'center' },
  serviceName: { color: colors.ink[800], fontWeight: '700', fontSize: 13 },
  serviceDuration: { color: colors.ink[700], fontSize: 10, marginTop: 2 },
  favHeart: { color: colors.primary[500], fontSize: 18 },
  productCard: { flex: 1, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.beige[200], padding: 10 },
  productArt: { height: 90, borderRadius: 10, marginBottom: 7, overflow: 'hidden' },
  productPhoto: { width: '100%', height: '100%' },
  productBrand: { color: colors.primary[500], fontSize: 7, fontWeight: '700', letterSpacing: 0.8 },
  productName: { color: colors.ink[800], fontSize: 11, fontWeight: '700', marginTop: 2 },
});

// ── Componente helper de detalle ───────────────────────────────────────────────
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.detailValue}>{value || '—'}</Text>
    </View>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function MiPerfilScreen() {
  const { logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState('Ana López');
  const [phone, setPhone] = useState('55 1234 5678');
  const [allergies, setAllergies] = useState('Ninguna registrada');
  const [showFavModal, setShowFavModal] = useState(false);

  const save = () => { setEditing(false); setSaved(true); };
  const initials = name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <PageHeader eyebrow="Tu cuenta" title="Mi perfil" subtitle="Tus datos y preferencias para una atención personalizada." />

      {/* ── Tarjeta de perfil ── */}
      <View style={[p.card, s.profileCard]}>
        <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.profileName}>{name}</Text>
          <Text style={p.muted}>Clienta desde octubre 2025</Text>
        </View>
        <TouchableOpacity style={p.outlineButton} onPress={() => { setEditing(!editing); setSaved(false); }}>
          <Text style={p.outlineButtonText}>{editing ? 'Cancelar' : 'Editar perfil'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Formulario de edición / vista de datos ── */}
      {editing
        ? <View style={[p.card, s.form]}>
            <Text style={s.formTitle}>Datos personales</Text>
            <Text style={s.fieldLabel}>NOMBRE COMPLETO</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Tu nombre" style={p.input} />
            <Text style={s.fieldLabel}>TELÉFONO</Text>
            <TextInput value={phone} onChangeText={setPhone} placeholder="Tu número" keyboardType="phone-pad" style={p.input} />
            <Text style={s.fieldLabel}>ALERGIAS O SENSIBILIDADES</Text>
            <TextInput value={allergies} onChangeText={setAllergies} placeholder="Indica alergias" multiline style={[p.input, { minHeight: 76, textAlignVertical: 'top' }]} />
            <TouchableOpacity style={p.button} onPress={save}><Text style={p.buttonText}>Guardar cambios</Text></TouchableOpacity>
          </View>
        : <View style={[p.card, s.details]}>
            <SectionTitle title="Información personal" />
            <Detail label="NOMBRE" value={name} />
            <Detail label="TELÉFONO" value={phone} />
            <Detail label="ALERGIAS" value={allergies} />
            <View style={s.preference}>
              <Text style={s.prefIcon}>✦</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.prefTitle}>Perfil capilar</Text>
                <Text style={p.muted}>Cabello teñido · ondulado · cuidado de color</Text>
              </View>
            </View>
            {saved && <Text style={s.saved}>Cambios guardados ✓</Text>}
          </View>
      }

      {/* ─────────────────────────────────────────────────────────────────────
          ── VIÑETA DE FAVORITOS ─────────────────────────────────────────────
      ─────────────────────────────────────────────────────────────────────── */}
      <View>
        <View style={s.favHeader}>
          <Text style={s.favTitle}>Mis Favoritos</Text>
          <TouchableOpacity onPress={() => setShowFavModal(true)} style={s.favSeeAll}>
            <Text style={s.favSeeAllText}>Ver todos →</Text>
          </TouchableOpacity>
        </View>

        {/* Scroll horizontal de favoritos */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.favScroll}>
          {/* Servicios favoritos */}
          {FAV_SERVICES.map(item => (
            <TouchableOpacity key={item.id} onPress={() => setShowFavModal(true)} style={s.favServiceChip} activeOpacity={0.75}>
              <Text style={s.favServiceChipIcon}>{item.icon}</Text>
              <Text style={s.favServiceChipName} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
          ))}
          {/* Productos favoritos */}
          {FAV_PRODUCTS.map(item => (
            <TouchableOpacity key={item.id} onPress={() => setShowFavModal(true)} activeOpacity={0.8} style={s.favProductChip}>
              <View style={[s.favProductArt, { backgroundColor: item.tint }]}>
                <Image source={{ uri: item.image }} style={s.favProductPhoto} contentFit="contain" transition={180} />
              </View>
              <Text style={s.favProductBrand} numberOfLines={1}>{item.brand}</Text>
              <Text style={s.favProductName} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Modal de favoritos completo ── */}
      <FavoritosModal visible={showFavModal} onClose={() => setShowFavModal(false)} />

      {/* ── Recompensas (resumen) ── */}
      <View style={s.rewardCard}>
        <View style={s.rewardIcon}><Text style={{ fontSize: 22 }}>✧</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.rewardEyebrow}>YOSS BEAUTY CLUB</Text>
          <Text style={s.rewardTitle}>Recompensas</Text>
          <Text style={s.rewardText}>7 visitas · $1,380 MXN · Nivel Plata</Text>
        </View>
        <View style={s.rewardLevelBadge}><Text style={s.rewardLevelText}>PLATA</Text></View>
      </View>

      {/* ── Cerrar sesión ── */}
      <TouchableOpacity style={s.logout} onPress={logout}>
        <Text style={s.logoutText}>Cerrar sesión</Text>
        <Text style={s.logoutArrow}>↗</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary[100], alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary[700], fontSize: 16, fontWeight: '700' },
  profileName: { color: colors.ink[800], fontSize: 15, fontWeight: '700', marginBottom: 3 },

  form: { gap: 9 },
  formTitle: { color: colors.ink[800], fontSize: 17, fontWeight: '700', marginBottom: 3 },
  fieldLabel: { color: colors.beige[500], fontSize: 9, letterSpacing: 1, fontWeight: '700', marginTop: 5 },

  details: { gap: 9 },
  detailRow: { borderBottomWidth: 1, borderBottomColor: colors.beige[100], paddingVertical: 7 },
  detailValue: { color: colors.ink[800], fontSize: 13, fontWeight: '600', marginTop: 4 },
  preference: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 13, backgroundColor: colors.beige[100], marginTop: 4 },
  prefIcon: { color: colors.primary[500], fontSize: 22 },
  prefTitle: { color: colors.ink[800], fontSize: 12, fontWeight: '700', marginBottom: 3 },
  saved: { color: colors.primary[600], fontSize: 11, fontWeight: '700' },

  // ── Favoritos ──
  favHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  favTitle: { color: colors.ink[800], fontSize: 17, fontWeight: '700' },
  favSeeAll: {},
  favSeeAllText: { color: colors.primary[500], fontSize: 12, fontWeight: '700' },
  favScroll: { gap: 10, paddingRight: 4, paddingBottom: 4 },

  favServiceChip: {
    backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.beige[200],
    paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 7,
    ...theme.shadow.card,
  },
  favServiceChipIcon: { fontSize: 16, color: colors.primary[600] },
  favServiceChipName: { color: colors.ink[800], fontSize: 11, fontWeight: '600', maxWidth: 110 },

  favProductChip: {
    backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.beige[200],
    width: 100, padding: 8, ...theme.shadow.card,
  },
  favProductArt: { height: 72, borderRadius: 10, overflow: 'hidden', marginBottom: 6 },
  favProductPhoto: { width: '100%', height: '100%' },
  favProductBrand: { color: colors.primary[500], fontSize: 7, fontWeight: '700', letterSpacing: 0.6 },
  favProductName: { color: colors.ink[800], fontSize: 9, fontWeight: '700', marginTop: 2 },

  // ── Recompensas ──
  rewardCard: { borderRadius: 18, backgroundColor: colors.ink[800], padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rewardIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFFFFF18', alignItems: 'center', justifyContent: 'center' },
  rewardEyebrow: { fontSize: 8, color: colors.primary[200], letterSpacing: 1.4, fontWeight: '700' },
  rewardTitle: { color: colors.white, fontSize: 17, fontWeight: '700', marginTop: 2 },
  rewardText: { color: '#D2D2C8', fontSize: 10, marginTop: 3 },
  rewardLevelBadge: { paddingHorizontal: 9, paddingVertical: 7, backgroundColor: '#FFFFFF1A', borderRadius: 9 },
  rewardLevelText: { color: '#CDBB87', fontSize: 8, letterSpacing: 0.5, fontWeight: '700' },

  logout: { flexDirection: 'row', justifyContent: 'center', gap: 8, padding: 13 },
  logoutText: { color: colors.status.error, fontSize: 12, fontWeight: '700' },
  logoutArrow: { color: colors.status.error },
});
