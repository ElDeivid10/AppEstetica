import React from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { PageHeader, StatusPill, pageStyles as p } from '@/components/SalonUI';
import { useSalon } from '@/context/SalonContext';
import { theme } from '@/constants/YossTheme';

const { colors } = theme;
const TINTS = ['#F4E7D6', '#F2E2DF', '#EEEDDF', '#F1E6EC'];

export default function FavoritosScreen() {
  const { productsCatalog, favProducts, toggleFavProduct } = useSalon();
  const products = productsCatalog.filter((item) => favProducts.has(item.id));

  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <PageHeader eyebrow="Tu selección" title="Favoritos" subtitle="Productos de belleza que guardaste para después." />
      <View style={styles.countRow}>
        <Text style={styles.count}>{products.length} productos guardados</Text>
        <StatusPill label="Cuidado capilar" />
      </View>
      {products.length === 0 ? (
        <View style={[p.card, styles.empty]}>
          <Text style={{ fontSize: 32 }}>♡</Text>
          <Text style={styles.name}>Aún no tienes favoritos</Text>
          <Text style={p.muted}>Cuando guardes productos, aparecerán aquí.</Text>
        </View>
      ) : (
        products.map((item, idx) => (
          <View key={item.id} style={[p.card, styles.productCard]}>
            <View style={[styles.productImage, { backgroundColor: TINTS[idx % TINTS.length] }]}>
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  style={styles.productPhoto}
                  contentFit="contain"
                  transition={180}
                  accessibilityLabel={`Imagen de ${item.name}`}
                />
              ) : (
                <Text style={{ fontSize: 30 }}>🧴</Text>
              )}
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>
                  {item.brand.split(' ').map((x) => x[0]).join('').slice(0, 3)}
                </Text>
              </View>
            </View>
            <View style={styles.info}>
              <Text style={styles.brand}>{item.brand.toUpperCase()}</Text>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={[p.muted, { marginTop: 4 }]}>
                {item.stock ? 'Disponible en salón' : 'Agotado'}
              </Text>
              <View style={[p.row, { marginTop: 10 }]}>
                <Text style={styles.price}>{item.priceFormatted}</Text>
                <TouchableOpacity onPress={() => toggleFavProduct(item.id)} style={styles.heart}>
                  <Text style={styles.heartText}>♥</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, count: { color: colors.ink[700], fontSize: 12, fontWeight: '600' },
  productCard: { flexDirection: 'row', gap: 14, padding: 12, alignItems: 'flex-start' }, productImage: { width: 104, height: 132, flexGrow: 0, flexShrink: 0, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, productPhoto: { width: 104, height: 132, flexGrow: 0, flexShrink: 0 },
  brandMark: { position: 'absolute', bottom: 7, left: 7, borderRadius: 6, backgroundColor: '#FFFFFFCC', paddingHorizontal: 6, paddingVertical: 3 }, brandMarkText: { color: colors.ink[800], fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  info: { flex: 1, justifyContent: 'center' }, brand: { color: colors.primary[500], fontSize: 8, letterSpacing: 1, fontWeight: '700', marginBottom: 5 }, name: { color: colors.ink[800], fontSize: 14, fontWeight: '700' }, price: { color: colors.ink[800], fontSize: 16, fontWeight: '700' },
  heart: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' }, heartText: { color: colors.primary[500], fontSize: 15 },
  empty: { alignItems: 'center', paddingVertical: 30, gap: 8 },
});
