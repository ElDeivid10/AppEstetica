import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { PageHeader, SectionTitle, StatusPill, pageStyles as p } from '@/components/SalonUI';
import { theme } from '@/constants/YossTheme';

const { colors } = theme;
const week = [
  { day: 'MIÉ', date: '22', time: '11:00', service: 'Retoque de raíz', status: 'Confirmada', tone: 'olive' as const },
  { day: 'VIE', date: '24', time: '16:30', service: 'Diseño de ceja', status: 'En proceso', tone: 'amber' as const },
];
const products = [
  { brand: 'L’ORÉAL PROFESSIONNEL', name: 'Acondicionador Vitamino Color', detail: 'Protección para cabello teñido', price: '$520', image: 'https://www.sephora.com/productimages/sku/s2717411-main-zoom.jpg', color: '#F5E8DD' },
  { brand: 'WELLA PROFESSIONALS', name: 'Color Fresh Mask', detail: 'Mascarilla con color temporal', price: '$690', image: 'https://wella.bynder.com/m/cdb6a5785d08b9f5/original/Wella_Professionals_Color_Fresh_Mask_Copper_Glow_150ml_PI_1.png', color: '#E9E5F1' },
  { brand: 'OLAPLEX', name: 'No.5 Bond Maintenance', detail: 'Acondicionador reparador', price: '$780', image: 'https://olaplex.com/cdn/shop/articles/Large_JPG-TEXTURE_N5_WHITE_BG_W_PRODUCT_3000x3000_0faafb22-1f16-42ff-b774-7361fdaa005f.jpg?v=1706268308&width=1200', color: '#F0EEDC' },
];
const services = [
  { icon: '✂️', name: 'Corte y peinado', time: '60 min', price: 'Desde $450' },
  { icon: '🎨', name: 'Coloración', time: '120–180 min', price: 'Desde $1,200' },
  { icon: '🫧', name: 'Tratamiento capilar', time: '75 min', price: 'Desde $650' },
];

export default function ExplorarScreen() {
  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <PageHeader eyebrow="Yoss Beauty Salon" title="Hola, Ana ✨" subtitle="Tu semana de belleza y cuidado, en un solo lugar." />

      <View style={styles.weekCard}>
        <View style={p.row}><View><Text style={styles.weekEyebrow}>RESUMEN SEMANAL</Text><Text style={styles.weekTitle}>Esta semana</Text></View><Text style={styles.weekIcon}>🌿</Text></View>
        <View style={styles.weekStats}><Text style={styles.weekStat}><Text style={styles.statNumber}>2</Text> citas</Text><Text style={styles.weekStat}><Text style={styles.statNumber}>1</Text> por confirmar</Text></View>
        {week.map(item => <View key={item.date} style={styles.appointmentRow}>
          <View style={styles.dateBox}><Text style={styles.dateDay}>{item.day}</Text><Text style={styles.dateNum}>{item.date}</Text></View>
          <View style={{ flex: 1 }}><Text style={styles.appointmentName}>{item.service}</Text><Text style={p.muted}>{item.time} · Yoss Beauty Salon</Text></View>
          <StatusPill label={item.status} tone={item.tone} />
        </View>)}
      </View>

      <View>
        <SectionTitle title="Servicios" action="Ver catálogo" />
        <View style={styles.serviceList}>{services.map(service => <View key={service.name} style={[p.card, styles.serviceCard]}>
          <Text style={styles.serviceIcon}>{service.icon}</Text><View style={{ flex: 1 }}><Text style={styles.productName}>{service.name}</Text><Text style={p.muted}>{service.time} · {service.price}</Text></View><Text style={styles.chevron}>›</Text>
        </View>)}</View>
      </View>

      <View>
        <SectionTitle title="Favoritos para tu cabello" action="Ver todos" />
        <Text style={[p.muted, { marginTop: -5, marginBottom: 12 }]}>Cuidado y color seleccionados para ti.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRail}>
          {products.map(product => <View key={product.name} style={styles.productCard}>
            <View style={[styles.productArt, { backgroundColor: product.color }]}><Image source={{ uri: product.image }} style={styles.productPhoto} contentFit="contain" transition={180} accessibilityLabel={`Imagen de ${product.name}`} /><View style={styles.heart}><Text>♡</Text></View></View>
            <Text style={styles.brand}>{product.brand}</Text><Text style={styles.productName} numberOfLines={2}>{product.name}</Text><Text style={styles.productDetail} numberOfLines={1}>{product.detail}</Text><Text style={styles.price}>{product.price}</Text>
          </View>)}
        </ScrollView>
      </View>

      <View style={styles.note}><Text style={styles.noteIcon}>♡</Text><Text style={[p.muted, { flex: 1 }]}>Productos y servicios de muestra. El catálogo se actualizará cuando conectemos el inventario.</Text></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  weekCard: { backgroundColor: colors.ink[800], borderRadius: 22, padding: 18, gap: 14 },
  weekEyebrow: { color: colors.primary[200], fontSize: 9, fontWeight: '700', letterSpacing: 1.7 },
  weekTitle: { color: colors.white, fontSize: 21, fontWeight: '700', marginTop: 2 },
  weekIcon: { fontSize: 25 },
  weekStats: { flexDirection: 'row', gap: 18, borderBottomWidth: 1, borderBottomColor: '#FFFFFF22', paddingBottom: 12 },
  weekStat: { color: '#EEECE3', fontSize: 12 },
  statNumber: { color: colors.white, fontSize: 17, fontWeight: '700' },
  appointmentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateBox: { width: 42, height: 48, backgroundColor: '#FFFFFF18', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  dateDay: { color: colors.primary[200], fontSize: 8, fontWeight: '700' }, dateNum: { color: colors.white, fontSize: 18, fontWeight: '700' },
  appointmentName: { color: colors.white, fontWeight: '700', fontSize: 12 },
  serviceList: { gap: 9 }, serviceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  serviceIcon: { fontSize: 24, width: 38, textAlign: 'center' }, chevron: { fontSize: 26, color: colors.beige[400] },
  productRail: { gap: 12, paddingRight: 16 },
  productCard: { width: 176, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.beige[200], borderRadius: 17, padding: 10 },
  productArt: { height: 112, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 9, overflow: 'hidden' }, productPhoto: { width: '100%', height: '100%' },
  heart: { position: 'absolute', top: 7, right: 8, height: 26, width: 26, backgroundColor: colors.white, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  brand: { color: colors.primary[500], fontSize: 8, letterSpacing: 1, fontWeight: '700', marginBottom: 4 },
  productName: { color: colors.ink[800], fontSize: 13, fontWeight: '700' }, productDetail: { color: colors.ink[700], fontSize: 10, marginTop: 4 }, price: { color: colors.ink[800], fontSize: 13, fontWeight: '700', marginTop: 8 },
  note: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 13, backgroundColor: colors.beige[100], borderRadius: 14 }, noteIcon: { color: colors.primary[500], fontSize: 19 },
});
