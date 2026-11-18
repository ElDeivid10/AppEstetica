/**
 * ExplorarScreen.tsx
 * Pantalla principal del cliente con todas las funcionalidades activas:
 * - "Ver catálogo" navega a la pestaña de Servicios.
 * - Cada tarjeta de servicio permite agendar directamente en AgendarCitaScreen.
 * - Botones de favoritos interactivos conectados al estado global (SalonContext).
 * - "Esta semana" / citas navegan a la agenda personal (Mis Citas).
 */

import React from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { PageHeader, SectionTitle, StatusPill, pageStyles as p } from '@/components/SalonUI';
import { useSalon } from '@/context/SalonContext';
import { theme } from '@/constants/YossTheme';

const { colors, borderRadius, shadow, spacing } = theme;

interface Props {
  onNavigateTab?: (tab: 'explorar' | 'citas' | 'recompensas' | 'servicios' | 'perfil') => void;
  onNavigateToAgendar?: (params?: { fecha?: string; servicioId?: string; isRecompensa?: boolean; recompensaNombre?: string }) => void;
}

const PRODUCTS = [
  {
    id: 'p1',
    brand: "L'ORÉAL PROFESSIONNEL",
    name: 'Acondicionador Vitamino Color',
    detail: 'Protección para cabello teñido',
    price: '$520',
    image: 'https://www.sephora.com/productimages/sku/s2717411-main-zoom.jpg',
    color: '#F5E8DD',
  },
  {
    id: 'p2',
    brand: 'WELLA PROFESSIONALS',
    name: 'Color Fresh Mask',
    detail: 'Mascarilla con color temporal',
    price: '$690',
    image: 'https://wella.bynder.com/m/cdb6a5785d08b9f5/original/Wella_Professionals_Color_Fresh_Mask_Copper_Glow_150ml_PI_1.png',
    color: '#E9E5F1',
  },
  {
    id: 'p3',
    brand: 'OLAPLEX',
    name: 'No.5 Bond Maintenance',
    detail: 'Acondicionador reparador',
    price: '$780',
    image: 'https://olaplex.com/cdn/shop/articles/Large_JPG-TEXTURE_N5_WHITE_BG_W_PRODUCT_3000x3000_0faafb22-1f16-42ff-b774-7361fdaa005f.jpg?v=1706268308&width=1200',
    color: '#F0EEDC',
  },
];

const SERVICES = [
  { id: 'srv-001', icon: '✂️', name: 'Corte y peinado', time: '60 min', price: 'Desde $450', subtitle: 'Técnica personalizada y secado' },
  { id: 'srv-003', icon: '🎨', name: 'Coloración & Balayage', time: '120–180 min', price: 'Desde $1,200', subtitle: 'Tonos a medida sin maltratar' },
  { id: 'srv-006', icon: '🫧', name: 'Tratamiento capilar', time: '75 min', price: 'Desde $650', subtitle: 'Hidratación profunda y brillo' },
];

export default function ExplorarScreen({ onNavigateTab, onNavigateToAgendar }: Props) {
  const { appointments, toggleFavProduct, isFavProduct, clientProfile } = useSalon();

  // Citas próximas del cliente
  const upcomingAppointments = appointments.filter(
    a => a.client === clientProfile.name && (a.status === 'Aceptada' || a.status === 'En proceso')
  ).slice(0, 2);

  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <PageHeader
        eyebrow="Yoss Beauty Salon"
        title={`Hola, ${clientProfile.name.split(' ')[0]} ✨`}
        subtitle="Tu semana de belleza y cuidado, en un solo lugar."
      />

      {/* ── Tarjeta Resumen Semanal (Navega a Mis Citas) ── */}
      <TouchableOpacity
        style={styles.weekCard}
        onPress={() => onNavigateTab?.('citas')}
        activeOpacity={0.9}
      >
        <View style={p.row}>
          <View>
            <Text style={styles.weekEyebrow}>RESUMEN SEMANAL</Text>
            <Text style={styles.weekTitle}>Esta semana</Text>
          </View>
          <Text style={styles.weekIcon}>🌿</Text>
        </View>

        <View style={styles.weekStats}>
          <Text style={styles.weekStat}>
            <Text style={styles.statNumber}>{upcomingAppointments.length}</Text> citas activas
          </Text>
          <Text style={styles.weekStat}>
            <Text style={styles.statNumber}>
              {upcomingAppointments.filter(a => a.status === 'En proceso').length}
            </Text> por confirmar
          </Text>
        </View>

        {upcomingAppointments.map((item, idx) => (
          <View key={`${item.id}-${idx}`} style={styles.appointmentRow}>
            <View style={styles.dateBox}>
              <Text style={styles.dateDay}>{item.date.split(',')[0] || 'CITA'}</Text>
              <Text style={styles.dateNum}>{item.date.split(' ')[1] || '•'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.appointmentName}>{item.service}</Text>
              <Text style={p.muted}>{item.time} · Yoss Beauty Salon</Text>
            </View>
            <StatusPill label={item.status} tone={item.tone} />
          </View>
        ))}

        <View style={styles.cardActionFooter}>
          <Text style={styles.cardActionText}>Ver agenda completa →</Text>
        </View>
      </TouchableOpacity>

      {/* ── Catálogo de Servicios Rápidos ── */}
      <View>
        <SectionTitle
          title="Servicios"
          action="Ver catálogo"
          onActionPress={() => onNavigateTab?.('servicios')}
        />
        <View style={styles.serviceList}>
          {SERVICES.map(service => (
            <TouchableOpacity
              key={service.id}
              style={[p.card, styles.serviceCard]}
              onPress={() => onNavigateToAgendar?.({ servicioId: service.id })}
              activeOpacity={0.8}
            >
              <Text style={styles.serviceIcon}>{service.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceNameTitle}>{service.name}</Text>
                <Text style={styles.serviceSubtext}>{service.subtitle}</Text>
                <Text style={styles.servicePriceBadge}>{service.time} · {service.price}</Text>
              </View>
              <View style={styles.agendarChip}>
                <Text style={styles.agendarChipText}>Agendar ›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Productos y Favoritos ── */}
      <View>
        <SectionTitle
          title="Favoritos para tu cabello"
          action="Ver catálogo"
          onActionPress={() => onNavigateTab?.('servicios')}
        />
        <Text style={[p.muted, { marginTop: -5, marginBottom: 12 }]}>
          Cuidado profesional recomendado para tu tipo de cabello.
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRail}>
          {PRODUCTS.map(product => {
            const isFav = isFavProduct(product.id);
            return (
              <View key={product.id} style={styles.productCard}>
                <View style={[styles.productArt, { backgroundColor: product.color }]}>
                  <Image
                    source={{ uri: product.image }}
                    style={styles.productPhoto}
                    contentFit="contain"
                    transition={180}
                    accessibilityLabel={`Imagen de ${product.name}`}
                  />
                  <TouchableOpacity
                    style={[styles.heart, isFav && styles.heartActive]}
                    onPress={() => toggleFavProduct(product.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.heartText, isFav && styles.heartTextActive]}>
                      {isFav ? '♥' : '♡'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.brand}>{product.brand}</Text>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.productDetail} numberOfLines={1}>
                  {product.detail}
                </Text>
                <Text style={styles.price}>{product.price}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Banner de Club / Recompensas ── */}
      <TouchableOpacity
        style={styles.rewardsBanner}
        onPress={() => onNavigateTab?.('recompensas')}
        activeOpacity={0.88}
      >
        <Text style={styles.rewardsBannerIcon}>✦</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.rewardsBannerTitle}>Tienes recompensas por desbloquear</Text>
          <Text style={styles.rewardsBannerSub}>
            Nivel {clientProfile.level} · {clientProfile.totalVisits} visitas registradas
          </Text>
        </View>
        <Text style={styles.rewardsBannerArrow}>→</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  weekCard: { backgroundColor: colors.ink[800], borderRadius: 22, padding: 18, gap: 14, ...shadow.card },
  weekEyebrow: { color: colors.primary[200], fontSize: 9, fontWeight: '700', letterSpacing: 1.7 },
  weekTitle: { color: colors.white, fontSize: 21, fontWeight: '700', marginTop: 2 },
  weekIcon: { fontSize: 25 },
  weekStats: { flexDirection: 'row', gap: 18, borderBottomWidth: 1, borderBottomColor: '#FFFFFF22', paddingBottom: 12 },
  weekStat: { color: '#EEECE3', fontSize: 12 },
  statNumber: { color: colors.white, fontSize: 17, fontWeight: '700' },
  appointmentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateBox: { width: 42, height: 48, backgroundColor: '#FFFFFF18', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  dateDay: { color: colors.primary[200], fontSize: 8, fontWeight: '700' },
  dateNum: { color: colors.white, fontSize: 16, fontWeight: '700' },
  appointmentName: { color: colors.white, fontWeight: '700', fontSize: 13 },
  cardActionFooter: { borderTopWidth: 1, borderTopColor: '#FFFFFF18', paddingTop: 10, alignItems: 'flex-end' },
  cardActionText: { color: colors.primary[200], fontSize: 11, fontWeight: '700' },

  serviceList: { gap: 9 },
  serviceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  serviceIcon: { fontSize: 24, width: 38, textAlign: 'center' },
  serviceNameTitle: { color: colors.ink[800], fontSize: 14, fontWeight: '700' },
  serviceSubtext: { color: colors.ink[700], fontSize: 11, marginTop: 1 },
  servicePriceBadge: { color: colors.primary[600], fontSize: 10, fontWeight: '700', marginTop: 3 },
  agendarChip: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  agendarChipText: { color: colors.primary[700], fontSize: 11, fontWeight: '700' },

  productRail: { gap: 12, paddingRight: 16 },
  productCard: {
    width: 176,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.beige[200],
    borderRadius: 17,
    padding: 10,
    ...shadow.card,
  },
  productArt: { height: 112, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 9, overflow: 'hidden', position: 'relative' },
  productPhoto: { width: '100%', height: '100%' },
  heart: {
    position: 'absolute',
    top: 7,
    right: 8,
    height: 28,
    width: 28,
    backgroundColor: colors.white,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  heartActive: { backgroundColor: colors.primary[50] },
  heartText: { color: colors.beige[400], fontSize: 15 },
  heartTextActive: { color: colors.status.error, fontSize: 15 },

  brand: { color: colors.primary[500], fontSize: 8, letterSpacing: 1, fontWeight: '700', marginBottom: 4 },
  productName: { color: colors.ink[800], fontSize: 13, fontWeight: '700' },
  productDetail: { color: colors.ink[700], fontSize: 10, marginTop: 4 },
  price: { color: colors.ink[800], fontSize: 13, fontWeight: '700', marginTop: 8 },

  rewardsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.card,
    padding: 14,
    gap: 12,
    marginTop: 8,
    ...shadow.button,
  },
  rewardsBannerIcon: { fontSize: 24, color: '#CDBB87' },
  rewardsBannerTitle: { color: colors.white, fontSize: 13, fontWeight: '700' },
  rewardsBannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 1 },
  rewardsBannerArrow: { color: colors.white, fontSize: 18, fontWeight: '700' },
});
