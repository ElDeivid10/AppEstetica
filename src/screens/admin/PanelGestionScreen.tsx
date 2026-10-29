import React, { useState } from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { PageHeader, StatusPill, pageStyles as p } from '@/components/SalonUI';
import { useAuth } from '@/context/AuthContext';
import { theme } from '@/constants/YossTheme';

const { colors } = theme;
type PanelTab = 'Anticipos' | 'Métricas' | 'Catálogo';
type Product = { name: string; brand: string; price: string; stock: boolean; image?: string };
const initialProducts: Product[] = [
  { brand: 'L’Oréal Professionnel', name: 'Vitamino Color Spectrum · Acondicionador', price: '$520', stock: true, image: 'https://www.sephora.com/productimages/sku/s2717411-main-zoom.jpg' },
  { brand: 'Wella Professionals', name: 'Color Fresh Mask · Copper Glow', price: '$690', stock: true, image: 'https://wella.bynder.com/m/cdb6a5785d08b9f5/original/Wella_Professionals_Color_Fresh_Mask_Copper_Glow_150ml_PI_1.png' },
  { brand: 'Olaplex', name: 'No.5 Bond Maintenance · Acondicionador', price: '$780', stock: false, image: 'https://olaplex.com/cdn/shop/articles/Large_JPG-TEXTURE_N5_WHITE_BG_W_PRODUCT_3000x3000_0faafb22-1f16-42ff-b774-7361fdaa005f.jpg?v=1706268308&width=1200' },
  { brand: 'Kérastase', name: 'Chroma Absolu Fondant', price: '$1,150', stock: true, image: 'https://www.kerastase.com.br/dw/image/v2/AAFM_PRD/on/demandware.static/-/Sites-kerastase-master-catalog/pt_BR/dw831df1bc/images/KRBR00119/condicionador-kerastase-%20chroma-absolu-fondant-cica-chroma.jpg' },
];
const deposits = [
  { client: 'Lucía Ramírez', date: '21 oct 2026', service: 'Coloración completa', amount: '$500', initials: 'LR' },
  { client: 'Mariana Torres', date: '20 oct 2026', service: 'Corte y peinado', amount: '$300', initials: 'MT' },
  { client: 'Sofía Morales', date: '18 oct 2026', service: 'Keratina y sellado', amount: '$250', initials: 'SM' },
  { client: 'Camila Reyes', date: '16 oct 2026', service: 'Diseño de ceja', amount: '$150', initials: 'CR' },
];
const weekly = [
  { label: 'Sem 1', count: 18, height: 47 }, { label: 'Sem 2', count: 24, height: 63 },
  { label: 'Sem 3', count: 21, height: 55 }, { label: 'Sem 4', count: 31, height: 82 },
];

export default function PanelGestionScreen() {
  const { logout } = useAuth();
  const [active, setActive] = useState<PanelTab>('Anticipos');
  const [products, setProducts] = useState(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const addProduct = () => {
    if (!newName.trim()) return;
    if (editingIndex !== null) {
      setProducts(products.map((product, index) => index === editingIndex ? { ...product, name: newName.trim(), price: newPrice.trim() || 'Por definir' } : product));
    } else {
      setProducts([{ brand: 'Yoss Beauty Salon', name: newName.trim(), price: newPrice.trim() || 'Por definir', stock: true }, ...products]);
    }
    setNewName(''); setNewPrice(''); setEditingIndex(null); setShowForm(false);
  };
  const editProduct = (index: number) => {
    setEditingIndex(index); setNewName(products[index].name); setNewPrice(products[index].price); setShowForm(true);
  };
  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <PageHeader eyebrow="Panel administrador" title="Gestión" subtitle="Anticipos, actividad del salón y catálogo." />
      <View style={styles.tabs}>{(['Anticipos', 'Métricas', 'Catálogo'] as PanelTab[]).map(tab => <TouchableOpacity key={tab} onPress={() => setActive(tab)} style={[styles.tab, active === tab && styles.activeTab]}><Text style={[styles.tabText, active === tab && styles.activeTabText]}>{tab}</Text></TouchableOpacity>)}</View>
      {active === 'Anticipos' && <View style={styles.section}>
        <View style={[p.card, styles.totalCard]}><View><Text style={styles.totalLabel}>ANTICIPOS REGISTRADOS · OCTUBRE</Text><Text style={styles.totalAmount}>$1,200 <Text style={styles.currency}>MXN</Text></Text><Text style={styles.totalCaption}>4 clientes con anticipo registrado</Text></View><Text style={{ fontSize: 27 }}>💳</Text></View>
        <View style={p.row}><Text style={styles.sectionTitle}>Movimientos recientes</Text><StatusPill label="Octubre 2026" tone="gray" /></View>
        {deposits.map(deposit => <View key={deposit.client} style={[p.card, styles.depositRow]}><View style={styles.avatar}><Text style={styles.initials}>{deposit.initials}</Text></View><View style={{ flex: 1 }}><Text style={styles.client}>{deposit.client}</Text><Text style={p.muted}>{deposit.service}</Text><Text style={styles.depositDate}>Recibido el {deposit.date}</Text></View><Text style={styles.amount}>{deposit.amount}</Text></View>)}
        <Text style={styles.note}>Datos de ejemplo · los anticipos deben verificarse antes de conectarlos con pagos reales.</Text>
      </View>}
      {active === 'Métricas' && <View style={styles.section}>
        <View style={[p.card, styles.metricIntro]}><Text style={styles.totalLabel}>CLIENTES ATENDIDAS</Text><View style={p.row}><Text style={styles.metricTotal}>94</Text><StatusPill label="Último mes" tone="olive" /></View><Text style={p.muted}>Personas registradas por semana en octubre.</Text></View>
        <View style={[p.card, styles.chartCard]}><View style={p.row}><Text style={styles.sectionTitle}>Clientes por semana</Text><Text style={styles.chartUnit}>CLIENTES</Text></View><View style={styles.chart}>{weekly.map((item, i) => <View key={item.label} style={styles.barColumn}><Text style={styles.barValue}>{item.count}</Text><View style={[styles.bar, { height: item.height, backgroundColor: i === 3 ? colors.primary[500] : colors.primary[200] }]} /><Text style={styles.barLabel}>{item.label}</Text></View>)}</View><View style={styles.axis}><Text>1 oct</Text><Text>31 oct</Text></View></View>
        <View style={styles.metricTiles}><View style={[p.card, styles.metricTile]}><Text style={styles.tileIcon}>↗</Text><Text style={styles.tileValue}>+18%</Text><Text style={p.muted}>vs. mes anterior</Text></View><View style={[p.card, styles.metricTile]}><Text style={styles.tileIcon}>✦</Text><Text style={styles.tileValue}>24</Text><Text style={p.muted}>promedio semanal</Text></View></View>
      </View>}
      {active === 'Catálogo' && <View style={styles.section}>
        <View style={p.row}><View><Text style={styles.sectionTitle}>Catálogo de productos</Text><Text style={p.muted}>Edita productos, precios y disponibilidad.</Text></View><TouchableOpacity style={styles.addButton} onPress={() => { setEditingIndex(null); setNewName(''); setNewPrice(''); setShowForm(!showForm); }}><Text style={styles.addButtonText}>{showForm ? 'Cerrar' : '+ Agregar'}</Text></TouchableOpacity></View>
        {showForm && <View style={[p.card, styles.addForm]}><Text style={styles.formTitle}>{editingIndex === null ? 'Nuevo producto' : 'Editar producto'}</Text><TextInput value={newName} onChangeText={setNewName} placeholder="Nombre del producto" style={p.input} /><TextInput value={newPrice} onChangeText={setNewPrice} placeholder="Precio · ej. $450" style={p.input} /><TouchableOpacity style={p.button} onPress={addProduct}><Text style={p.buttonText}>{editingIndex === null ? 'Agregar al catálogo' : 'Guardar cambios'}</Text></TouchableOpacity></View>}
        {products.map((product, i) => <View key={`${product.name}-${i}`} style={[p.card, styles.productRow]}><View style={styles.productThumb}>{product.image ? <Image source={{ uri: product.image }} style={styles.productThumbImage} contentFit="contain" transition={180} accessibilityLabel={`Imagen de ${product.name}`} /> : <Text style={{ fontSize: 22 }}>🧴</Text>}</View><View style={{ flex: 1 }}><Text style={styles.brand}>{product.brand.toUpperCase()}</Text><Text style={styles.productName}>{product.name}</Text><View style={[p.row, { justifyContent: 'flex-start', marginTop: 5 }]}><Text style={styles.productPrice}>{product.price}</Text><StatusPill label={product.stock ? 'En stock' : 'Agotado'} tone={product.stock ? 'olive' : 'red'} /></View></View><View style={styles.productActions}><TouchableOpacity onPress={() => editProduct(i)} style={styles.stockButton}><Text style={styles.stockButtonText}>Editar</Text></TouchableOpacity><TouchableOpacity onPress={() => setProducts(products.map((item, index) => index === i ? { ...item, stock: !item.stock } : item))} style={styles.stockButton}><Text style={styles.stockButtonText}>{product.stock ? 'Sin stock' : 'Reponer'}</Text></TouchableOpacity></View></View>)}
        <Text style={styles.note}>Cambios solo en esta vista de demostración.</Text>
      </View>}
      <TouchableOpacity style={styles.logout} onPress={logout}><Text style={styles.logoutText}>Cerrar sesión de administrador</Text></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: colors.beige[100], padding: 4, borderRadius: 13, gap: 4 }, tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 }, activeTab: { backgroundColor: colors.white, ...theme.shadow.card }, tabText: { color: colors.ink[700], fontSize: 11, fontWeight: '600' }, activeTabText: { color: colors.primary[600], fontWeight: '700' }, section: { gap: 10 },
  totalCard: { backgroundColor: colors.ink[800], borderColor: colors.ink[800], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 }, totalLabel: { color: colors.primary[200], fontSize: 8, letterSpacing: 1.2, fontWeight: '700' }, totalAmount: { color: colors.white, fontSize: 29, fontWeight: '700', marginTop: 6 }, currency: { fontSize: 10, color: colors.primary[200] }, totalCaption: { color: '#D2D2C8', fontSize: 10, marginTop: 3 }, sectionTitle: { color: colors.ink[800], fontSize: 15, fontWeight: '700' }, depositRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }, avatar: { width: 36, height: 36, backgroundColor: colors.primary[50], borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, initials: { color: colors.primary[600], fontWeight: '700', fontSize: 10 }, client: { color: colors.ink[800], fontWeight: '700', fontSize: 12 }, depositDate: { color: colors.beige[500], fontSize: 9, marginTop: 3 }, amount: { color: colors.primary[600], fontSize: 15, fontWeight: '700' }, note: { textAlign: 'center', color: colors.beige[500], fontSize: 9, lineHeight: 14, paddingHorizontal: 10 },
  metricIntro: { backgroundColor: colors.primary[50], borderColor: colors.primary[100], gap: 5 }, metricTotal: { color: colors.ink[800], fontSize: 34, fontWeight: '700' }, chartCard: { gap: 12 }, chartUnit: { color: colors.beige[500], letterSpacing: 1, fontSize: 8, fontWeight: '700' }, chart: { height: 128, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', borderBottomWidth: 1, borderColor: colors.beige[200], paddingTop: 12 }, barColumn: { alignItems: 'center', justifyContent: 'flex-end', gap: 4 }, barValue: { color: colors.ink[700], fontSize: 9, fontWeight: '700' }, bar: { width: 34, borderTopLeftRadius: 7, borderTopRightRadius: 7 }, barLabel: { color: colors.beige[500], fontSize: 9, marginTop: 2 }, axis: { flexDirection: 'row', justifyContent: 'space-between', color: colors.beige[500], fontSize: 9 }, metricTiles: { flexDirection: 'row', gap: 10 }, metricTile: { flex: 1, gap: 3 }, tileIcon: { color: colors.primary[500], fontSize: 20 }, tileValue: { color: colors.ink[800], fontWeight: '700', fontSize: 20 },
  addButton: { backgroundColor: colors.primary[500], paddingHorizontal: 12, paddingVertical: 10, borderRadius: 11 }, addButtonText: { color: colors.white, fontSize: 11, fontWeight: '700' }, addForm: { gap: 9 }, formTitle: { color: colors.ink[800], fontWeight: '700', fontSize: 14 }, productRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10 }, productThumb: { width: 40, height: 46, flexGrow: 0, flexShrink: 0, borderRadius: 12, backgroundColor: colors.beige[100], alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, productThumbImage: { width: 40, height: 46, flexGrow: 0, flexShrink: 0 }, brand: { color: colors.primary[500], fontSize: 7, letterSpacing: 0.8, fontWeight: '700' }, productName: { color: colors.ink[800], fontSize: 10, fontWeight: '700', marginTop: 3, flexShrink: 1 }, productPrice: { color: colors.ink[800], fontSize: 11, fontWeight: '700' }, productActions: { gap: 5, flexShrink: 0 }, stockButton: { borderWidth: 1, borderColor: colors.beige[200], borderRadius: 9, paddingHorizontal: 8, paddingVertical: 7 }, stockButtonText: { color: colors.ink[700], fontSize: 8, fontWeight: '600' }, logout: { alignItems: 'center', padding: 10 }, logoutText: { color: colors.status.error, fontWeight: '700', fontSize: 11 },
});
