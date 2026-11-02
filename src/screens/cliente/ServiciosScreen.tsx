import React, { useState } from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { PageHeader, StatusPill, pageStyles as p } from '@/components/SalonUI';
import { theme } from '@/constants/YossTheme';

const { colors } = theme;

// ── Datos de servicios — espejo del catálogo web ───────────────────────────────
const SERVICES = [
  {
    id: 's1', icon: '✂', name: 'Cortes de Cabello', duration: '20–45 MIN',
    desc: 'Cortes modernos y clásicos adaptados a cada persona, realizados con técnica profesional.',
    tags: ['Dama', 'Caballero', 'Niños', 'Niñas'],
    requiresDeposit: false,
  },
  {
    id: 's2', icon: '◯', name: 'Perfilado de Barba', duration: '15–20 MIN',
    desc: 'Definición y perfilado de barba para un acabado limpio y estilizado.',
    tags: [],
    requiresDeposit: false,
  },
  {
    id: 's3', icon: '✦', name: 'Colorimetría', duration: '2–8 HORAS',
    desc: 'Transforma tu cabello con colores personalizados y técnicas de última generación.',
    tags: ['Mechas', 'Tintes', 'Balayage', 'Baby Lights', 'Rayos'],
    requiresDeposit: true,
  },
  {
    id: 's4', icon: '★', name: 'Maquillaje y Peinado', duration: '45–90 MIN',
    desc: 'Realza tu belleza natural con maquillaje profesional y peinados para cualquier ocasión.',
    tags: [],
    requiresDeposit: false,
  },
  {
    id: 's5', icon: '✿', name: 'Depilaciones', duration: '15–45 MIN',
    desc: 'Técnicas de depilación suaves y eficaces para una piel perfectamente suave.',
    tags: ['Rostro completo', 'Cejas', 'Bigote', 'Patillas', 'Mejillas', 'Frente', 'Barbilla', 'Axilas'],
    requiresDeposit: false,
  },
  {
    id: 's6', icon: '♡', name: 'Alaciados Progresivos', duration: '3–5 HORAS',
    desc: 'Tratamiento para alisar y suavizar el cabello de forma duradera con productos de calidad.',
    tags: [],
    requiresDeposit: true,
  },
];

// ── Datos de productos (de ejemplo) ───────────────────────────────────────────
const PRODUCTS = [
  { id: 'p1', brand: "L'OREAL PROFESSIONNEL", name: 'Acondicionador Vitamino Color', detail: 'Proteccion para cabello tenido · 200 ml', price: '$520', tint: '#F5E8DD', image: 'https://www.sephora.com/productimages/sku/s2717411-main-zoom.jpg' },
  { id: 'p2', brand: 'WELLA PROFESSIONALS', name: 'Color Fresh Mask', detail: 'Mascarilla con color temporal · 150 ml', price: '$690', tint: '#E9E5F1', image: 'https://wella.bynder.com/m/cdb6a5785d08b9f5/original/Wella_Professionals_Color_Fresh_Mask_Copper_Glow_150ml_PI_1.png' },
  { id: 'p3', brand: 'OLAPLEX', name: 'No.5 Bond Maintenance', detail: 'Acondicionador reparador · 250 ml', price: '$780', tint: '#F0EEDC', image: 'https://olaplex.com/cdn/shop/articles/Large_JPG-TEXTURE_N5_WHITE_BG_W_PRODUCT_3000x3000_0faafb22-1f16-42ff-b774-7361fdaa005f.jpg?v=1706268308&width=1200' },
  { id: 'p4', brand: 'KERASTASE', name: 'Chroma Absolu Fondant', detail: 'Acondicionador para cabello tenido · 200 ml', price: '$1,150', tint: '#F1E6EC', image: 'https://www.kerastase.com.br/dw/image/v2/AAFM_PRD/on/demandware.static/-/Sites-kerastase-master-catalog/pt_BR/dw831df1bc/images/KRBR00119/condicionador-kerastase-%20chroma-absolu-fondant-cica-chroma.jpg' },
];

type ActiveSection = 'servicios' | 'productos';

function ServiceCard({ service, isFav, onToggleFav }: {
  service: typeof SERVICES[0];
  isFav: boolean;
  onToggleFav: () => void;
}) {
  return (
    <View style={s.serviceCard}>
      {/* ── Encabezado de tarjeta ── */}
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
        <TouchableOpacity onPress={onToggleFav} style={s.favBtn} activeOpacity={0.7}>
          <Text style={[s.favIcon, isFav && s.favIconActive]}>{isFav ? '♥' : '♡'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Descripción ── */}
      <Text style={s.serviceDesc}>{service.desc}</Text>

      {/* ── Tags ── */}
      {service.tags.length > 0 && (
        <View style={s.tagsRow}>
          {service.tags.map(tag => (
            <View key={tag} style={s.tag}>
              <Text style={s.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Advertencia anticipo ── */}
      {service.requiresDeposit && (
        <View style={s.depositWarning}>
          <Text style={s.depositIcon}>⚠</Text>
          <Text style={s.depositText}>Requiere anticipo mediante la app</Text>
        </View>
      )}

      {/* ── Footer ── */}
      <View style={s.serviceFooter}>
        <View style={s.dividerLine} />
        <TouchableOpacity activeOpacity={0.75}>
          <Text style={s.ctaText}>Agendar cita →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ProductCard({ product, isFav, onToggleFav }: {
  product: typeof PRODUCTS[0];
  isFav: boolean;
  onToggleFav: () => void;
}) {
  return (
    <View style={s.productCard}>
      <View style={[s.productArt, { backgroundColor: product.tint }]}>
        <Image
          source={{ uri: product.image }}
          style={s.productPhoto}
          contentFit="contain"
          transition={180}
          accessibilityLabel={`Imagen de ${product.name}`}
        />
        <TouchableOpacity onPress={onToggleFav} style={s.productFavBtn} activeOpacity={0.7}>
          <Text style={[s.productFavIcon, isFav && s.productFavIconActive]}>
            {isFav ? '♥' : '♡'}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={s.productBrand}>{product.brand}</Text>
      <Text style={s.productName} numberOfLines={2}>{product.name}</Text>
      <Text style={s.productDetail} numberOfLines={1}>{product.detail}</Text>
      <Text style={s.productPrice}>{product.price}</Text>
    </View>
  );
}

export default function ServiciosScreen() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('servicios');
  const [favServices, setFavServices] = useState<Set<string>>(new Set());
  const [favProducts, setFavProducts] = useState<Set<string>>(new Set());

  const toggleServiceFav = (id: string) =>
    setFavServices(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const toggleProductFav = (id: string) =>
    setFavProducts(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <PageHeader
        eyebrow="Yoss Beauty Salon"
        title="Servicios y Productos"
        subtitle="Explora lo que ofrecemos y guarda tus favoritos."
      />

      {/* ── Selector Servicios / Productos ── */}
      <View style={s.sectionTabs}>
        {(['servicios', 'productos'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveSection(tab)}
            style={[s.sectionTab, activeSection === tab && s.sectionTabActive]}
            activeOpacity={0.8}
          >
            <Text style={[s.sectionTabText, activeSection === tab && s.sectionTabTextActive]}>
              {tab === 'servicios' ? '✂ Servicios' : '🧴 Productos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeSection === 'servicios' && (
        <>
          <Text style={s.hint}>Toca ♡ para guardar en tus favoritos</Text>
          {SERVICES.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              isFav={favServices.has(service.id)}
              onToggleFav={() => toggleServiceFav(service.id)}
            />
          ))}
        </>
      )}

      {activeSection === 'productos' && (
        <>
          <Text style={s.hint}>Toca ♡ para guardar en tus favoritos</Text>
          <View style={s.productGrid}>
            {PRODUCTS.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                isFav={favProducts.has(product.id)}
                onToggleFav={() => toggleProductFav(product.id)}
              />
            ))}
          </View>
          <Text style={s.disclaimer}>Productos de muestra. El catálogo completo estará disponible pronto.</Text>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  // Section tabs
  sectionTabs: { flexDirection: 'row', backgroundColor: colors.beige[100], padding: 4, borderRadius: 14, gap: 4 },
  sectionTab: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 11 },
  sectionTabActive: { backgroundColor: colors.white, ...theme.shadow.card },
  sectionTabText: { color: colors.ink[700], fontSize: 12, fontWeight: '600' },
  sectionTabTextActive: { color: colors.primary[600], fontWeight: '700' },

  hint: { color: colors.beige[500], fontSize: 10, textAlign: 'center' },

  // Service card — estilo tarjeta web
  serviceCard: {
    backgroundColor: colors.white, borderRadius: 18, borderWidth: 1,
    borderColor: colors.beige[200], padding: 18, gap: 12,
    ...theme.shadow.card,
  },
  serviceCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  serviceIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.beige[100], alignItems: 'center', justifyContent: 'center',
  },
  serviceIcon: { fontSize: 20, color: colors.primary[600] },
  serviceNameRow: { flex: 1, gap: 4 },
  serviceName: { color: colors.ink[800], fontSize: 15, fontWeight: '700' },
  durationBadge: { alignSelf: 'flex-start', backgroundColor: colors.beige[100], borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  durationText: { color: colors.ink[700], fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
  favBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.beige[50], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.beige[200] },
  favIcon: { fontSize: 16, color: colors.beige[400] },
  favIconActive: { color: colors.primary[500] },

  serviceDesc: { color: colors.ink[700], fontSize: 12, lineHeight: 18 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { borderRadius: 99, backgroundColor: colors.beige[100], paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { color: colors.ink[700], fontSize: 10, fontWeight: '500' },

  depositWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFBEB', borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A',
    padding: 10,
  },
  depositIcon: { color: '#F59E0B', fontSize: 13 },
  depositText: { color: '#B45309', fontSize: 11, fontWeight: '600' },

  serviceFooter: { gap: 10 },
  dividerLine: { height: 1, backgroundColor: colors.beige[200] },
  ctaText: { color: colors.primary[500], fontSize: 12, fontWeight: '700' },

  // Product grid
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  productCard: {
    width: '48%', backgroundColor: colors.white,
    borderRadius: 17, borderWidth: 1, borderColor: colors.beige[200], padding: 10,
    ...theme.shadow.card,
  },
  productArt: { height: 120, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 9, overflow: 'hidden', position: 'relative' },
  productPhoto: { width: '100%', height: '100%' },
  productFavBtn: { position: 'absolute', top: 7, right: 7, width: 28, height: 28, backgroundColor: colors.white, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  productFavIcon: { fontSize: 14, color: colors.beige[400] },
  productFavIconActive: { color: colors.primary[500] },
  productBrand: { color: colors.primary[500], fontSize: 7, letterSpacing: 0.8, fontWeight: '700', marginBottom: 3 },
  productName: { color: colors.ink[800], fontSize: 11, fontWeight: '700' },
  productDetail: { color: colors.ink[700], fontSize: 9, marginTop: 3 },
  productPrice: { color: colors.ink[800], fontSize: 13, fontWeight: '700', marginTop: 6 },

  disclaimer: { textAlign: 'center', color: colors.beige[500], fontSize: 10 },
});
