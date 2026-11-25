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

const PRODUCT_TINTS = ['#F5E8DD', '#E9E5F1', '#F0EEDC', '#F1E6EC'];

type ActiveSection = 'servicios' | 'productos';

export default function ServiciosScreen({ onNavigateToAgendar }: Props) {
  const [activeSection, setActiveSection] = useState<ActiveSection>('servicios');
  const { servicesCatalog, productsCatalog, isFavService, toggleFavService, isFavProduct, toggleFavProduct } = useSalon();

  const SERVICES = servicesCatalog.filter(s => s.active);
  const PRODUCTS = productsCatalog.filter(pItem => pItem.active);

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
                    <Text style={s.serviceName}>{service.nombre}</Text>
                    <View style={s.durationBadge}>
                      <Text style={s.durationText}>{service.duracion}</Text>
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
                <Text style={s.serviceDesc}>{service.descripcion}</Text>

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
          {PRODUCTS.map((product, idx) => {
            const isFav = isFavProduct(product.id);
            const tint = PRODUCT_TINTS[idx % PRODUCT_TINTS.length];
            return (
              <View key={product.id} style={s.productCard}>
                <View style={[s.productArt, { backgroundColor: tint }]}>
                  {product.image ? (
                    <Image
                      source={{ uri: product.image }}
                      style={s.productPhoto}
                      contentFit="contain"
                      transition={180}
                      accessibilityLabel={`Imagen de ${product.name}`}
                    />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 32 }}>🧴</Text>
                    </View>
                  )}
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
                <Text style={s.productBrand}>{product.brand.toUpperCase()}</Text>
                <Text style={s.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={s.productDetail} numberOfLines={1}>
                  {product.stock ? 'En stock en salón' : 'Agotado'}
                </Text>
                <Text style={s.productPrice}>{product.priceFormatted}</Text>
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
