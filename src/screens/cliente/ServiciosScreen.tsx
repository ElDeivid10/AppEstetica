/**
 * ServiciosScreen.tsx
 * Catálogo completo de servicios y productos de Yoss Beauty Salon:
 * - Selección entre pestañas "Servicios" y "Productos".
 * - Botón "Agendar cita →" directo en cada servicio para abrir el flujo de reserva con ese servicio pre-cargado.
 * - Iconos de favoritos conectados al estado global (SalonContext).
 * - Advertencias de anticipo para servicios de larga duración (Colorimetría, Alaciados).
 */

import React, { useState } from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { PageHeader, pageStyles as p } from '@/components/SalonUI';
import { useSalon } from '@/context/SalonContext';
import { theme } from '@/constants/YossTheme';

const { colors, borderRadius, shadow, spacing } = theme;

interface Props {
  onNavigateToAgendar?: (params?: { fecha?: string; servicioId?: string; isRecompensa?: boolean; recompensaNombre?: string }) => void;
}

// ── Datos de servicios — espejo del catálogo web ───────────────────────────────
const SERVICES = [
  {
    id: 'srv-001',
    icon: '✂',
    name: 'Cortes de Cabello',
    duration: '20–45 MIN',
    desc: 'Cortes modernos y clásicos adaptados a cada persona, realizados con técnica profesional.',
    tags: ['Dama', 'Caballero', 'Niños', 'Niñas'],
    requiresDeposit: false,
  },
  {
    id: 'srv-002',
    icon: '◯',
    name: 'Perfilado de Barba',
    duration: '15–20 MIN',
    desc: 'Definición y perfilado de barba para un acabado limpio y estilizado.',
    tags: ['Caballero'],
    requiresDeposit: false,
  },
  {
    id: 'srv-003',
    icon: '✦',
    name: 'Colorimetría',
    duration: '2–8 HORAS',
    desc: 'Transforma tu cabello con colores personalizados y técnicas de última generación.',
    tags: ['Mechas', 'Tintes', 'Balayage', 'Baby Lights', 'Rayos'],
    requiresDeposit: true,
  },
  {
    id: 'srv-004',
    icon: '★',
    name: 'Maquillaje y Peinado',
    duration: '45–90 MIN',
    desc: 'Realza tu belleza natural con maquillaje profesional y peinados para cualquier ocasión.',
    tags: ['Social', 'Novia', 'Graduación'],
    requiresDeposit: false,
  },
  {
    id: 'srv-005',
    icon: '✿',
    name: 'Depilaciones',
    duration: '15–45 MIN',
    desc: 'Técnicas de depilación suaves y eficaces para una piel perfectamente suave.',
    tags: ['Rostro completo', 'Cejas', 'Bigote', 'Axilas', 'Piernas'],
    requiresDeposit: false,
  },
  {
    id: 'srv-006',
    icon: '♡',
    name: 'Alaciados Progresivos',
    duration: '3–5 HORAS',
    desc: 'Tratamiento para alisar y suavizar el cabello de forma duradera con productos de calidad.',
    tags: ['Keratina', 'Botox Capilar', 'Nanoplastia'],
    requiresDeposit: true,
  },
];

// ── Datos de productos de ejemplo ─────────────────────────────────────────────
const PRODUCTS = [
  {
    id: 'p1',
    brand: "L'ORÉAL PROFESSIONNEL",
    name: 'Acondicionador Vitamino Color',
    detail: 'Protección para cabello teñido · 200 ml',
    price: '$520',
    tint: '#F5E8DD',
    image: 'https://www.sephora.com/productimages/sku/s2717411-main-zoom.jpg',
  },
  {
    id: 'p2',
    brand: 'WELLA PROFESSIONALS',
    name: 'Color Fresh Mask',
    detail: 'Mascarilla con color temporal · 150 ml',
    price: '$690',
    tint: '#E9E5F1',
    image: 'https://wella.bynder.com/m/cdb6a5785d08b9f5/original/Wella_Professionals_Color_Fresh_Mask_Copper_Glow_150ml_PI_1.png',
  },
  {
    id: 'p3',
    brand: 'OLAPLEX',
    name: 'No.5 Bond Maintenance',
    detail: 'Acondicionador reparador · 250 ml',
    price: '$780',
    tint: '#F0EEDC',
    image: 'https://olaplex.com/cdn/shop/articles/Large_JPG-TEXTURE_N5_WHITE_BG_W_PRODUCT_3000x3000_0faafb22-1f16-42ff-b774-7361fdaa005f.jpg?v=1706268308&width=1200',
  },
  {
    id: 'p4',
    brand: 'KERASTASE',
    name: 'Chroma Absolu Fondant',
    detail: 'Acondicionador para cabello teñido · 200 ml',
    price: '$1,150',
    tint: '#F1E6EC',
    image: 'https://www.kerastase.com.br/dw/image/v2/AAFM_PRD/on/demandware.static/-/Sites-kerastase-master-catalog/pt_BR/dw831df1bc/images/KRBR00119/condicionador-kerastase-%20chroma-absolu-fondant-cica-chroma.jpg',
  },
];

type ActiveSection = 'servicios' | 'productos';

export default function ServiciosScreen({ onNavigateToAgendar }: Props) {
  const [activeSection, setActiveSection] = useState<ActiveSection>('servicios');
  const { isFavService, toggleFavService, isFavProduct, toggleFavProduct } = useSalon();

  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <PageHeader
        eyebrow="Catálogo Oficial"
        title="Servicios y Productos"
        subtitle="Todo lo que necesitas para tu cuidado y estilo, con la técnica de Yoss."
      />

      {/* ── Selector de Secciones ── */}
      <View style={s.sectionTabs}>
        <TouchableOpacity
          style={[s.sectionTab, activeSection === 'servicios' && s.sectionTabActive]}
          onPress={() => setActiveSection('servicios')}
          activeOpacity={0.8}
        >
          <Text style={[s.sectionTabText, activeSection === 'servicios' && s.sectionTabTextActive]}>
            ✂  Servicios ({SERVICES.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.sectionTab, activeSection === 'productos' && s.sectionTabActive]}
          onPress={() => setActiveSection('productos')}
          activeOpacity={0.8}
        >
          <Text style={[s.sectionTabText, activeSection === 'productos' && s.sectionTabTextActive]}>
            🧴  Productos ({PRODUCTS.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Vista de SERVICIOS ── */}
      {activeSection === 'servicios' && (
        <View style={s.listContainer}>
          {SERVICES.map(service => {
            const isFav = isFavService(service.id);
            return (
              <View key={service.id} style={s.serviceCard}>
                {/* Cabecera de la tarjeta */}
                <View style={s.serviceCardTop}>
                  <View style={s.serviceIconBox}>
                    <Text style={s.serviceIcon}>{service.icon}</Text>
                  </View>
                  <View style={s.serviceNameRow}>
                    <Text style={s.serviceName}>{service.name}</Text>
                    <View style={s.durationBadge}>
                      <Text style={s.durationText}>{service.duration}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => toggleFavService(service.id)}
                    style={s.favBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.favIcon, isFav && s.favIconActive]}>
                      {isFav ? '♥' : '♡'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Descripción */}
                <Text style={s.serviceDesc}>{service.desc}</Text>

                {/* Tags */}
                {service.tags.length > 0 && (
                  <View style={s.tagsRow}>
                    {service.tags.map(tag => (
                      <View key={tag} style={s.tag}>
                        <Text style={s.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Advertencia de anticipo */}
                {service.requiresDeposit && (
                  <View style={s.depositWarning}>
                    <Text style={s.depositIcon}>⚠</Text>
                    <Text style={s.depositText}>Requiere anticipo mediante la app</Text>
                  </View>
                )}

                {/* Botón Agendar Cita */}
                <View style={s.serviceFooter}>
                  <View style={s.dividerLine} />
                  <TouchableOpacity
                    onPress={() => onNavigateToAgendar?.({ servicioId: service.id })}
                    style={s.ctaButton}
                    activeOpacity={0.75}
                  >
                    <Text style={s.ctaText}>Agendar cita →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Vista de PRODUCTOS ── */}
      {activeSection === 'productos' && (
        <View style={s.productGrid}>
          {PRODUCTS.map(product => {
            const isFav = isFavProduct(product.id);
            return (
              <View key={product.id} style={s.productCard}>
                <View style={[s.productArt, { backgroundColor: product.tint }]}>
                  <Image
                    source={{ uri: product.image }}
                    style={s.productPhoto}
                    contentFit="contain"
                    transition={180}
                    accessibilityLabel={`Imagen de ${product.name}`}
                  />
                  <TouchableOpacity
                    onPress={() => toggleFavProduct(product.id)}
                    style={s.productFavBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.productFavIcon, isFav && s.productFavIconActive]}>
                      {isFav ? '♥' : '♡'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.productBrand}>{product.brand}</Text>
                <Text style={s.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={s.productDetail} numberOfLines={1}>
                  {product.detail}
                </Text>
                <Text style={s.productPrice}>{product.price}</Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  // Pestañas de sección
  sectionTabs: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.beige[100],
    padding: 4,
    borderRadius: 14,
    marginBottom: spacing.md,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 11,
  },
  sectionTabActive: {
    backgroundColor: colors.white,
    ...shadow.card,
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink[700],
  },
  sectionTabTextActive: {
    color: colors.primary[600],
    fontWeight: '700',
  },

  listContainer: { gap: 14 },

  // Tarjeta de servicio
  serviceCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.beige[200],
    padding: 18,
    gap: 10,
    ...shadow.card,
  },
  serviceCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.beige[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceIcon: {
    fontSize: 20,
    color: colors.primary[600],
  },
  serviceNameRow: {
    flex: 1,
    gap: 3,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink[800],
  },
  durationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.beige[100],
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  durationText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.beige[500],
    letterSpacing: 0.5,
  },
  favBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.beige[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  favIcon: {
    fontSize: 18,
    color: colors.beige[400],
  },
  favIconActive: {
    color: colors.status.error,
  },

  serviceDesc: {
    fontSize: 12,
    color: colors.ink[700],
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: colors.beige[100],
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 10,
    color: colors.ink[700],
  },
  depositWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  depositIcon: {
    fontSize: 12,
    color: '#B45309',
  },
  depositText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '600',
  },
  serviceFooter: {
    marginTop: 4,
    gap: 10,
  },
  dividerLine: {
    height: 1,
    backgroundColor: colors.beige[100],
  },
  ctaButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  ctaText: {
    color: colors.primary[600],
    fontSize: 13,
    fontWeight: '700',
  },

  // Grid de productos
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.beige[200],
    padding: 10,
    ...shadow.card,
  },
  productArt: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  productPhoto: {
    width: '100%',
    height: '100%',
  },
  productFavBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  productFavIcon: {
    fontSize: 16,
    color: colors.beige[400],
  },
  productFavIconActive: {
    color: colors.status.error,
  },
  productBrand: {
    color: colors.primary[500],
    fontSize: 8,
    letterSpacing: 0.8,
    fontWeight: '700',
    marginBottom: 2,
  },
  productName: {
    color: colors.ink[800],
    fontSize: 12,
    fontWeight: '700',
  },
  productDetail: {
    color: colors.ink[700],
    fontSize: 10,
    marginTop: 2,
  },
  productPrice: {
    color: colors.ink[800],
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
});
