import React, { useState } from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { PageHeader, StatusPill, pageStyles as p } from '@/components/SalonUI';
import { theme } from '@/constants/YossTheme';

const { colors } = theme;
const initialProducts = [
  { id: '1', brand: 'L’ORÉAL PROFESSIONNEL', name: 'Vitamino Color Spectrum', detail: 'Acondicionador protector de color · 200 ml', price: '$520', icon: '🧴', image: 'https://www.sephora.com/productimages/sku/s2717411-main-zoom.jpg', tint: '#F4E7D6', badge: 'Más vendido' },
  { id: '2', brand: 'WELLA PROFESSIONALS', name: 'Color Fresh Mask — Copper Glow', detail: 'Mascarilla tonalizante · 150 ml', price: '$690', icon: '🎨', image: 'https://wella.bynder.com/m/cdb6a5785d08b9f5/original/Wella_Professionals_Color_Fresh_Mask_Copper_Glow_150ml_PI_1.png', tint: '#F2E2DF', badge: 'Color' },
  { id: '3', brand: 'OLAPLEX', name: 'No.5 Bond Maintenance', detail: 'Acondicionador reparador · 250 ml', price: '$780', icon: '✨', image: 'https://olaplex.com/cdn/shop/articles/Large_JPG-TEXTURE_N5_WHITE_BG_W_PRODUCT_3000x3000_0faafb22-1f16-42ff-b774-7361fdaa005f.jpg?v=1706268308&width=1200', tint: '#EEEDDF', badge: 'Reparación' },
  { id: '4', brand: 'KÉRASTASE', name: 'Chroma Absolu Fondant', detail: 'Acondicionador para cabello teñido · 200 ml', price: '$1,150', icon: '🌸', image: 'https://www.kerastase.com.br/dw/image/v2/AAFM_PRD/on/demandware.static/-/Sites-kerastase-master-catalog/pt_BR/dw831df1bc/images/KRBR00119/condicionador-kerastase-%20chroma-absolu-fondant-cica-chroma.jpg', tint: '#F1E6EC', badge: 'Cuidado de color' },
];

export default function FavoritosScreen() {
  const [products, setProducts] = useState(initialProducts);
  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <PageHeader eyebrow="Tu selección" title="Favoritos" subtitle="Productos de belleza que guardaste para después." />
      <View style={styles.countRow}><Text style={styles.count}>{products.length} productos guardados</Text><StatusPill label="Cuidado capilar" /></View>
      {products.length === 0 ? <View style={[p.card, styles.empty]}><Text style={{ fontSize: 32 }}>♡</Text><Text style={styles.name}>Aún no tienes favoritos</Text><Text style={p.muted}>Cuando guardes productos, aparecerán aquí.</Text></View> : products.map(item => <View key={item.id} style={[p.card, styles.productCard]}>
        <View style={[styles.productImage, { backgroundColor: item.tint }]}><Image source={{ uri: item.image }} style={styles.productPhoto} contentFit="contain" transition={180} accessibilityLabel={`Imagen de ${item.name}`} /><View style={styles.brandMark}><Text style={styles.brandMarkText}>{item.brand.split(' ').map(x => x[0]).join('').slice(0, 3)}</Text></View></View>
        <View style={styles.info}><Text style={styles.brand}>{item.brand}</Text><Text style={styles.name}>{item.name}</Text><Text style={[p.muted, { marginTop: 4 }]}>{item.detail}</Text><View style={[p.row, { marginTop: 10 }]}><Text style={styles.price}>{item.price}</Text><TouchableOpacity onPress={() => setProducts(products.filter(product => product.id !== item.id))} style={styles.heart}><Text style={styles.heartText}>♥</Text></TouchableOpacity></View><Text style={styles.badge}>{item.badge}</Text></View>
      </View>)}
      <Text style={styles.disclaimer}>Marcas y precios de muestra para la vista del catálogo.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, count: { color: colors.ink[700], fontSize: 12, fontWeight: '600' },
  productCard: { flexDirection: 'row', gap: 14, padding: 12, alignItems: 'flex-start' }, productImage: { width: 104, height: 132, flexGrow: 0, flexShrink: 0, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, productPhoto: { width: 104, height: 132, flexGrow: 0, flexShrink: 0 },
  brandMark: { position: 'absolute', bottom: 7, left: 7, borderRadius: 6, backgroundColor: '#FFFFFFCC', paddingHorizontal: 6, paddingVertical: 3 }, brandMarkText: { color: colors.ink[800], fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  info: { flex: 1, justifyContent: 'center' }, brand: { color: colors.primary[500], fontSize: 8, letterSpacing: 1, fontWeight: '700', marginBottom: 5 }, name: { color: colors.ink[800], fontSize: 14, fontWeight: '700' }, price: { color: colors.ink[800], fontSize: 16, fontWeight: '700' },
  heart: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' }, heartText: { color: colors.primary[500], fontSize: 15 }, badge: { color: colors.beige[500], fontSize: 9, marginTop: 6 },
  empty: { alignItems: 'center', paddingVertical: 30, gap: 8 }, disclaimer: { textAlign: 'center', color: colors.beige[500], fontSize: 10 },
});
