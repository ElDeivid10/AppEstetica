/**
 * MiPerfilScreen.tsx
 * Perfil personal del cliente en Yoss Beauty Salon:
 * - Datos personales y perfil clínico capilar (alergias, tipo de cabello).
 * - Bandeja de Mensajes y Asistente Yoss con indicador de notificaciones no leídas.
 * - Sección de Favoritos (Servicios y Productos sincronizados en tiempo real).
 * - Resumen del Club de Recompensas.
 */

import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { PageHeader, SectionTitle, pageStyles as p } from '@/components/SalonUI';
import { useAuth } from '@/context/AuthContext';
import { useSalon } from '@/context/SalonContext';
import ChatClienteModal from '@/screens/cliente/ChatClienteModal';
import { theme } from '@/constants/YossTheme';

const { colors, borderRadius, shadow, spacing } = theme;

// Catálogo base para mapear favoritos guardados
const ALL_SERVICES = [
  { id: 'srv-001', icon: '✂', name: 'Cortes de Cabello', duration: '20–45 MIN' },
  { id: 'srv-002', icon: '◯', name: 'Perfilado de Barba', duration: '15–20 MIN' },
  { id: 'srv-003', icon: '✦', name: 'Colorimetría', duration: '2–8 HORAS' },
  { id: 'srv-004', icon: '★', name: 'Maquillaje y Peinado', duration: '45–90 MIN' },
  { id: 'srv-005', icon: '✿', name: 'Depilaciones', duration: '15–45 MIN' },
  { id: 'srv-006', icon: '♡', name: 'Alaciados Progresivos', duration: '3–5 HORAS' },
];

const ALL_PRODUCTS = [
  { id: 'p1', brand: "L'ORÉAL", name: 'Acondicionador Vitamino Color', tint: '#F5E8DD', image: 'https://www.sephora.com/productimages/sku/s2717411-main-zoom.jpg' },
  { id: 'p2', brand: 'WELLA', name: 'Color Fresh Mask', tint: '#E9E5F1', image: 'https://wella.bynder.com/m/cdb6a5785d08b9f5/original/Wella_Professionals_Color_Fresh_Mask_Copper_Glow_150ml_PI_1.png' },
  { id: 'p3', brand: 'OLAPLEX', name: 'No.5 Bond Maintenance', tint: '#F0EEDC', image: 'https://olaplex.com/cdn/shop/articles/Large_JPG-TEXTURE_N5_WHITE_BG_W_PRODUCT_3000x3000_0faafb22-1f16-42ff-b774-7361fdaa005f.jpg?v=1706268308&width=1200' },
  { id: 'p4', brand: 'KERASTASE', name: 'Chroma Absolu Fondant', tint: '#F1E6EC', image: 'https://www.kerastase.com.br/dw/image/v2/AAFM_PRD/on/demandware.static/-/Sites-kerastase-master-catalog/pt_BR/dw831df1bc/images/KRBR00119/condicionador-kerastase-%20chroma-absolu-fondant-cica-chroma.jpg' },
];

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.detailValue}>{value || '—'}</Text>
    </View>
  );
}

export default function MiPerfilScreen() {
  const { logout } = useAuth();
  const {
    clientProfile,
    updateClientProfile,
    favServices,
    favProducts,
    unreadClientCount,
  } = useSalon();

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showFavModal, setShowFavModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  // Form states
  const [name, setName] = useState(clientProfile.name);
  const [phone, setPhone] = useState(clientProfile.phone);
  const [allergies, setAllergies] = useState(clientProfile.allergies);
  const [favModalTab, setFavModalTab] = useState<'servicios' | 'productos'>('servicios');

  const save = () => {
    updateClientProfile({ name, phone, allergies });
    setEditing(false);
    setSaved(true);
  };

  const initials = clientProfile.name
    .trim()
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Filtrar los favoritos reales
  const myFavServices = ALL_SERVICES.filter(s => favServices.has(s.id));
  const myFavProducts = ALL_PRODUCTS.filter(p => favProducts.has(p.id));

  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <PageHeader
        eyebrow="Tu cuenta"
        title="Mi perfil"
        subtitle="Tus datos y preferencias para una atención personalizada."
      />

      {/* ── Tarjeta de Perfil ── */}
      <View style={[p.card, s.profileCard]}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.profileName}>{clientProfile.name}</Text>
          <Text style={p.muted}>Clienta desde octubre 2025</Text>
        </View>
        <TouchableOpacity
          style={p.outlineButton}
          onPress={() => {
            setEditing(!editing);
            setSaved(false);
          }}
        >
          <Text style={p.outlineButtonText}>{editing ? 'Cancelar' : 'Editar'}</Text>
        </TouchableOpacity>
      </View>

      {/* ─────────────────────────────────────────────────────────────────────
          ── BANDEJA DE MENSAJES Y ASISTENTE (Chatbot & Yoss) ────────────────
      ─────────────────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={s.chatBanner}
        onPress={() => setShowChatModal(true)}
        activeOpacity={0.88}
      >
        <View style={s.chatBannerIconBox}>
          <Text style={s.chatBannerIcon}>💬</Text>
          {unreadClientCount > 0 && (
            <View style={s.chatUnreadPill}>
              <Text style={s.chatUnreadPillText}>{unreadClientCount}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.chatBannerTitle}>Mensajes & Asistente Yoss</Text>
            {unreadClientCount > 0 && (
              <View style={s.newBadge}>
                <Text style={s.newBadgeText}>NUEVO</Text>
              </View>
            )}
          </View>
          <Text style={s.chatBannerSub}>
            Recordatorios de citas, dudas frecuentes y chat con Yoss.
          </Text>
        </View>
        <Text style={s.chatBannerArrow}>→</Text>
      </TouchableOpacity>

      {/* ── Formulario de Edición / Información Personal ── */}
      {editing ? (
        <View style={[p.card, s.form]}>
          <Text style={s.formTitle}>Editar datos personales</Text>
          <Text style={s.fieldLabel}>NOMBRE COMPLETO</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Tu nombre" style={p.input} />
          <Text style={s.fieldLabel}>TELÉFONO</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Tu número"
            keyboardType="phone-pad"
            style={p.input}
          />
          <Text style={s.fieldLabel}>ALERGIAS O SENSIBILIDADES</Text>
          <TextInput
            value={allergies}
            onChangeText={setAllergies}
            placeholder="Indica alergias (amoniaco, látex, etc.)"
            multiline
            style={[p.input, { minHeight: 76, textAlignVertical: 'top' }]}
          />
          <TouchableOpacity style={p.button} onPress={save} activeOpacity={0.88}>
            <Text style={p.buttonText}>Guardar cambios</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[p.card, s.details]}>
          <SectionTitle title="Información personal" />
          <Detail label="NOMBRE" value={clientProfile.name} />
          <Detail label="TELÉFONO" value={clientProfile.phone} />
          <Detail label="ALERGIAS" value={clientProfile.allergies} />
          <View style={s.preference}>
            <Text style={s.prefIcon}>✦</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.prefTitle}>Perfil capilar registrado</Text>
              <Text style={p.muted}>{clientProfile.hairProfile}</Text>
            </View>
          </View>
          {saved && <Text style={s.saved}>Cambios guardados ✓</Text>}
        </View>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          ── VIÑETA DE FAVORITOS ─────────────────────────────────────────────
      ─────────────────────────────────────────────────────────────────────── */}
      <View>
        <View style={s.favHeader}>
          <Text style={s.favTitle}>Mis Favoritos ({myFavServices.length + myFavProducts.length})</Text>
          <TouchableOpacity onPress={() => setShowFavModal(true)} style={s.favSeeAll}>
            <Text style={s.favSeeAllText}>Ver todos →</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.favScroll}>
          {myFavServices.map(item => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setShowFavModal(true)}
              style={s.favServiceChip}
              activeOpacity={0.75}
            >
              <Text style={s.favServiceChipIcon}>{item.icon}</Text>
              <Text style={s.favServiceChipName} numberOfLines={1}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}

          {myFavProducts.map(item => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setShowFavModal(true)}
              activeOpacity={0.8}
              style={s.favProductChip}
            >
              <View style={[s.favProductArt, { backgroundColor: item.tint }]}>
                <Image source={{ uri: item.image }} style={s.favProductPhoto} contentFit="contain" transition={180} />
              </View>
              <Text style={s.favProductBrand} numberOfLines={1}>
                {item.brand}
              </Text>
              <Text style={s.favProductName} numberOfLines={1}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}

          {myFavServices.length === 0 && myFavProducts.length === 0 && (
            <View style={s.emptyFavs}>
              <Text style={p.muted}>Aún no has guardado favoritos. Pulsa el corazón ♡ en el catálogo.</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* ── Modal de Favoritos Completo ── */}
      <Modal visible={showFavModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFavModal(false)}>
        <View style={s.modalRoot}>
          <View style={s.modalHeader}>
            <Text style={s.modalHeaderTitle}>Mis Favoritos</Text>
            <TouchableOpacity onPress={() => setShowFavModal(false)} style={s.modalCloseBtn}>
              <Text style={s.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={s.modalTabs}>
            {(['servicios', 'productos'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setFavModalTab(tab)}
                style={[s.modalTab, favModalTab === tab && s.modalTabActive]}
              >
                <Text style={[s.modalTabText, favModalTab === tab && s.modalTabTextActive]}>
                  {tab === 'servicios' ? `✂ Servicios (${myFavServices.length})` : `🧴 Productos (${myFavProducts.length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {favModalTab === 'servicios' ? (
            <FlatList
              key="servicios-flatlist"
              data={myFavServices}
              keyExtractor={item => item.id}
              contentContainerStyle={s.modalList}
              renderItem={({ item }) => (
                <View style={s.serviceRow}>
                  <View style={s.serviceIcon}>
                    <Text style={{ fontSize: 20, color: colors.primary[600] }}>{item.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.serviceName}>{item.name}</Text>
                    <Text style={s.serviceDuration}>{item.duration}</Text>
                  </View>
                  <Text style={s.favHeart}>♥</Text>
                </View>
              )}
            />
          ) : (
            <FlatList
              key="productos-flatlist"
              data={myFavProducts}
              keyExtractor={item => item.id}
              numColumns={2}
              columnWrapperStyle={{ gap: 12 }}
              contentContainerStyle={s.modalList}
              renderItem={({ item }) => (
                <View style={s.productCard}>
                  <View style={[s.productArt, { backgroundColor: item.tint }]}>
                    <Image source={{ uri: item.image }} style={s.productPhoto} contentFit="contain" transition={180} />
                  </View>
                  <Text style={s.productBrand}>{item.brand}</Text>
                  <Text style={s.productName}>{item.name}</Text>
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      {/* ── Modal de Chat & Mensajes ── */}
      <ChatClienteModal visible={showChatModal} onClose={() => setShowChatModal(false)} />

      {/* ── Resumen Club Recompensas ── */}
      <View style={s.rewardCard}>
        <View style={s.rewardIcon}>
          <Text style={{ fontSize: 22 }}>✧</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.rewardEyebrow}>YOSS BEAUTY CLUB</Text>
          <Text style={s.rewardTitle}>Recompensas Activas</Text>
          <Text style={s.rewardText}>
            {clientProfile.totalVisits} visitas · ${clientProfile.totalSpent.toLocaleString()} MXN acumulados
          </Text>
        </View>
        <View style={s.rewardLevelBadge}>
          <Text style={s.rewardLevelText}>{clientProfile.level.toUpperCase()}</Text>
        </View>
      </View>

      {/* ── Cerrar Sesión ── */}
      <TouchableOpacity style={s.logout} onPress={logout} activeOpacity={0.75}>
        <Text style={s.logoutText}>Cerrar sesión</Text>
        <Text style={s.logoutArrow}>↗</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary[700], fontSize: 16, fontWeight: '700' },
  profileName: { color: colors.ink[800], fontSize: 15, fontWeight: '700', marginBottom: 3 },

  // Chat banner
  chatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    borderWidth: 1.5,
    borderColor: colors.primary[300],
    padding: 14,
    gap: 12,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  chatBannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  chatBannerIcon: { fontSize: 22 },
  chatUnreadPill: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.status.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  chatUnreadPillText: { color: colors.white, fontSize: 9, fontWeight: '800' },
  chatBannerTitle: { fontSize: 14, fontWeight: '700', color: colors.ink[800] },
  chatBannerSub: { fontSize: 11, color: colors.ink[700], marginTop: 2 },
  chatBannerArrow: { fontSize: 18, color: colors.primary[500], fontWeight: '700' },
  newBadge: {
    backgroundColor: colors.status.error,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  newBadgeText: { color: colors.white, fontSize: 8, fontWeight: '800' },

  form: { gap: 9 },
  formTitle: { color: colors.ink[800], fontSize: 17, fontWeight: '700', marginBottom: 3 },
  fieldLabel: { color: colors.beige[500], fontSize: 9, letterSpacing: 1, fontWeight: '700', marginTop: 5 },

  details: { gap: 9 },
  detailRow: { borderBottomWidth: 1, borderBottomColor: colors.beige[100], paddingVertical: 7 },
  detailValue: { color: colors.ink[800], fontSize: 13, fontWeight: '600', marginTop: 4 },
  preference: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 13,
    backgroundColor: colors.beige[100],
    marginTop: 4,
  },
  prefIcon: { color: colors.primary[500], fontSize: 22 },
  prefTitle: { color: colors.ink[800], fontSize: 12, fontWeight: '700', marginBottom: 3 },
  saved: { color: colors.primary[600], fontSize: 11, fontWeight: '700' },

  // Favoritos
  favHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  favTitle: { color: colors.ink[800], fontSize: 16, fontWeight: '700' },
  favSeeAll: {},
  favSeeAllText: { color: colors.primary[500], fontSize: 12, fontWeight: '700' },
  favScroll: { gap: 10, paddingRight: 4, paddingBottom: 4 },
  favServiceChip: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.beige[200],
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    ...shadow.card,
  },
  favServiceChipIcon: { fontSize: 16, color: colors.primary[600] },
  favServiceChipName: { color: colors.ink[800], fontSize: 11, fontWeight: '600', maxWidth: 110 },
  favProductChip: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.beige[200],
    width: 100,
    padding: 8,
    ...shadow.card,
  },
  favProductArt: { height: 72, borderRadius: 10, overflow: 'hidden', marginBottom: 6 },
  favProductPhoto: { width: '100%', height: '100%' },
  favProductBrand: { color: colors.primary[500], fontSize: 7, fontWeight: '700', letterSpacing: 0.6 },
  favProductName: { color: colors.ink[800], fontSize: 9, fontWeight: '700', marginTop: 2 },
  emptyFavs: { padding: 10 },

  // Modal favoritos
  modalRoot: { flex: 1, backgroundColor: colors.beige[50] },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 24,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.beige[200],
  },
  modalHeaderTitle: { color: colors.ink[800], fontSize: 20, fontWeight: '700' },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.beige[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: { color: colors.ink[700], fontSize: 13, fontWeight: '700' },
  modalTabs: {
    flexDirection: 'row',
    gap: 4,
    margin: 16,
    backgroundColor: colors.beige[100],
    padding: 4,
    borderRadius: 13,
  },
  modalTab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  modalTabActive: { backgroundColor: colors.white, ...shadow.card },
  modalTabText: { color: colors.ink[700], fontSize: 12, fontWeight: '600' },
  modalTabTextActive: { color: colors.primary[600], fontWeight: '700' },
  modalList: { padding: 16, gap: 10 },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.beige[200],
    padding: 14,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.beige[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceName: { color: colors.ink[800], fontWeight: '700', fontSize: 13 },
  serviceDuration: { color: colors.ink[700], fontSize: 10, marginTop: 2 },
  favHeart: { color: colors.primary[500], fontSize: 18 },
  productCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.beige[200],
    padding: 10,
  },
  productArt: { height: 90, borderRadius: 10, marginBottom: 7, overflow: 'hidden' },
  productPhoto: { width: '100%', height: '100%' },
  productBrand: { color: colors.primary[500], fontSize: 7, fontWeight: '700', letterSpacing: 0.8 },
  productName: { color: colors.ink[800], fontSize: 11, fontWeight: '700', marginTop: 2 },

  // Recompensas
  rewardCard: {
    borderRadius: 18,
    backgroundColor: colors.ink[800],
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    ...shadow.card,
  },
  rewardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardEyebrow: { fontSize: 8, color: colors.primary[200], letterSpacing: 1.4, fontWeight: '700' },
  rewardTitle: { color: colors.white, fontSize: 17, fontWeight: '700', marginTop: 2 },
  rewardText: { color: '#D2D2C8', fontSize: 10, marginTop: 3 },
  rewardLevelBadge: { paddingHorizontal: 9, paddingVertical: 7, backgroundColor: '#FFFFFF1A', borderRadius: 9 },
  rewardLevelText: { color: '#CDBB87', fontSize: 8, letterSpacing: 0.5, fontWeight: '700' },

  logout: { flexDirection: 'row', justifyContent: 'center', gap: 8, padding: 13 },
  logoutText: { color: colors.status.error, fontSize: 12, fontWeight: '700' },
  logoutArrow: { color: colors.status.error },
});
