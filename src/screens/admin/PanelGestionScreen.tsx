import React, { useState } from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity, TextInput, Switch } from 'react-native';
import { Image } from 'expo-image';
import { PageHeader, StatusPill, pageStyles as p } from '@/components/SalonUI';
import { useAuth } from '@/context/AuthContext';
import { theme } from '@/constants/YossTheme';

const { colors } = theme;

type PanelTab = 'Anticipos' | 'Métricas' | 'Catálogo';
type CatalogoType = 'servicios' | 'productos';

type Product = { name: string; brand: string; price: string; stock: boolean; image?: string };
type ServiceItem = {
  id: string;
  name: string;
  duration: string;
  requiresDeposit: boolean;
  active: boolean; // true = Disponible, false = Sin servicio
  icon: string;
};

const initialProducts: Product[] = [
  { brand: 'L’Oréal Professionnel', name: 'Vitamino Color Spectrum · Acondicionador', price: '$520', stock: true, image: 'https://www.sephora.com/productimages/sku/s2717411-main-zoom.jpg' },
  { brand: 'Wella Professionals', name: 'Color Fresh Mask · Copper Glow', price: '$690', stock: true, image: 'https://wella.bynder.com/m/cdb6a5785d08b9f5/original/Wella_Professionals_Color_Fresh_Mask_Copper_Glow_150ml_PI_1.png' },
  { brand: 'Olaplex', name: 'No.5 Bond Maintenance · Acondicionador', price: '$780', stock: false, image: 'https://olaplex.com/cdn/shop/articles/Large_JPG-TEXTURE_N5_WHITE_BG_W_PRODUCT_3000x3000_0faafb22-1f16-42ff-b774-7361fdaa005f.jpg?v=1706268308&width=1200' },
  { brand: 'Kérastase', name: 'Chroma Absolu Fondant', price: '$1,150', stock: true, image: 'https://www.kerastase.com.br/dw/image/v2/AAFM_PRD/on/demandware.static/-/Sites-kerastase-master-catalog/pt_BR/dw831df1bc/images/KRBR00119/condicionador-kerastase-%20chroma-absolu-fondant-cica-chroma.jpg' },
];

const initialServices: ServiceItem[] = [
  { id: 's1', name: 'Cortes de Cabello', duration: '20–45 MIN', requiresDeposit: false, active: true, icon: '✂' },
  { id: 's2', name: 'Perfilado de Barba', duration: '15–20 MIN', requiresDeposit: false, active: true, icon: '◯' },
  { id: 's3', name: 'Colorimetría', duration: '2–8 HORAS', requiresDeposit: true, active: true, icon: '✦' },
  { id: 's4', name: 'Maquillaje y Peinado', duration: '45–90 MIN', requiresDeposit: false, active: true, icon: '★' },
  { id: 's5', name: 'Depilaciones', duration: '15–45 MIN', requiresDeposit: false, active: true, icon: '✿' },
  { id: 's6', name: 'Alaciados Progresivos', duration: '3–5 HORAS', requiresDeposit: true, active: true, icon: '♡' },
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
  const [catalogoType, setCatalogoType] = useState<CatalogoType>('servicios');

  // Estado de productos
  const [products, setProducts] = useState(initialProducts);
  const [showProductForm, setShowProductForm] = useState(false);
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);

  // Estado de servicios
  const [services, setServices] = useState(initialServices);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceDuration, setServiceDuration] = useState('');
  const [serviceRequiresDeposit, setServiceRequiresDeposit] = useState(false);
  const [editingServiceIndex, setEditingServiceIndex] = useState<number | null>(null);

  // Funciones de productos
  const saveProduct = () => {
    if (!productName.trim()) return;
    if (editingProductIndex !== null) {
      setProducts(products.map((pItem, idx) =>
        idx === editingProductIndex ? { ...pItem, name: productName.trim(), price: productPrice.trim() || 'Por definir' } : pItem
      ));
    } else {
      setProducts([{ brand: 'Yoss Beauty Salon', name: productName.trim(), price: productPrice.trim() || 'Por definir', stock: true }, ...products]);
    }
    setProductName(''); setProductPrice(''); setEditingProductIndex(null); setShowProductForm(false);
  };

  const editProduct = (index: number) => {
    setEditingProductIndex(index);
    setProductName(products[index].name);
    setProductPrice(products[index].price);
    setShowProductForm(true);
  };

  // Funciones de servicios
  const saveService = () => {
    if (!serviceName.trim()) return;
    if (editingServiceIndex !== null) {
      setServices(services.map((sItem, idx) =>
        idx === editingServiceIndex
          ? { ...sItem, name: serviceName.trim(), duration: serviceDuration.trim() || '30 MIN', requiresDeposit: serviceRequiresDeposit }
          : sItem
      ));
    } else {
      setServices([
        {
          id: `s-${Date.now()}`,
          name: serviceName.trim(),
          duration: serviceDuration.trim() || '30 MIN',
          requiresDeposit: serviceRequiresDeposit,
          active: true,
          icon: '✂',
        },
        ...services,
      ]);
    }
    setServiceName(''); setServiceDuration(''); setServiceRequiresDeposit(false); setEditingServiceIndex(null); setShowServiceForm(false);
  };

  const editService = (index: number) => {
    setEditingServiceIndex(index);
    setServiceName(services[index].name);
    setServiceDuration(services[index].duration);
    setServiceRequiresDeposit(services[index].requiresDeposit);
    setShowServiceForm(true);
  };

  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <PageHeader eyebrow="Panel administrador" title="Gestión" subtitle="Anticipos, actividad del salón y catálogo." />

      <View style={styles.tabs}>
        {(['Anticipos', 'Métricas', 'Catálogo'] as PanelTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActive(tab)}
            style={[styles.tab, active === tab && styles.activeTab]}
          >
            <Text style={[styles.tabText, active === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── SECCIÓN ANTICIPOS ── */}
      {active === 'Anticipos' && (
        <View style={styles.section}>
          <View style={[p.card, styles.totalCard]}>
            <View>
              <Text style={styles.totalLabel}>ANTICIPOS REGISTRADOS · OCTUBRE</Text>
              <Text style={styles.totalAmount}>$1,200 <Text style={styles.currency}>MXN</Text></Text>
              <Text style={styles.totalCaption}>4 clientes con anticipo registrado</Text>
            </View>
            <Text style={{ fontSize: 27 }}>💳</Text>
          </View>
          <View style={p.row}><Text style={styles.sectionTitle}>Movimientos recientes</Text><StatusPill label="Octubre 2026" tone="gray" /></View>
          {deposits.map(deposit => (
            <View key={deposit.client} style={[p.card, styles.depositRow]}>
              <View style={styles.avatar}><Text style={styles.initials}>{deposit.initials}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.client}>{deposit.client}</Text>
                <Text style={p.muted}>{deposit.service}</Text>
                <Text style={styles.depositDate}>Recibido el {deposit.date}</Text>
              </View>
              <Text style={styles.amount}>{deposit.amount}</Text>
            </View>
          ))}
          <Text style={styles.note}>Datos de ejemplo · los anticipos deben verificarse antes de conectarlos con pagos reales.</Text>
        </View>
      )}

      {/* ── SECCIÓN MÉTRICAS ── */}
      {active === 'Métricas' && (
        <View style={styles.section}>
          <View style={[p.card, styles.metricIntro]}>
            <Text style={styles.totalLabel}>CLIENTES ATENDIDAS</Text>
            <View style={p.row}>
              <Text style={styles.metricTotal}>94</Text>
              <StatusPill label="Último mes" tone="olive" />
            </View>
            <Text style={p.muted}>Personas registradas por semana en octubre.</Text>
          </View>
          <View style={[p.card, styles.chartCard]}>
            <View style={p.row}>
              <Text style={styles.sectionTitle}>Clientes por semana</Text>
              <Text style={styles.chartUnit}>CLIENTES</Text>
            </View>
            <View style={styles.chart}>
              {weekly.map((item, i) => (
                <View key={item.label} style={styles.barColumn}>
                  <Text style={styles.barValue}>{item.count}</Text>
                  <View style={[styles.bar, { height: item.height, backgroundColor: i === 3 ? colors.primary[500] : colors.primary[200] }]} />
                  <Text style={styles.barLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.axis}><Text>1 oct</Text><Text>31 oct</Text></View>
          </View>
          <View style={styles.metricTiles}>
            <View style={[p.card, styles.metricTile]}>
              <Text style={styles.tileIcon}>↗</Text>
              <Text style={styles.tileValue}>+18%</Text>
              <Text style={p.muted}>vs. mes anterior</Text>
            </View>
            <View style={[p.card, styles.metricTile]}>
              <Text style={styles.tileIcon}>✦</Text>
              <Text style={styles.tileValue}>24</Text>
              <Text style={p.muted}>promedio semanal</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── SECCIÓN CATÁLOGO (SERVICIOS Y PRODUCTOS) ── */}
      {active === 'Catálogo' && (
        <View style={styles.section}>
          {/* Subpestañas Servicios / Productos */}
          <View style={styles.subTabsContainer}>
            <TouchableOpacity
              style={[styles.subTab, catalogoType === 'servicios' && styles.subTabActive]}
              onPress={() => { setCatalogoType('servicios'); setShowProductForm(false); setShowServiceForm(false); }}
            >
              <Text style={[styles.subTabText, catalogoType === 'servicios' && styles.subTabTextActive]}>
                ✂ Catálogo de Servicios
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTab, catalogoType === 'productos' && styles.subTabActive]}
              onPress={() => { setCatalogoType('productos'); setShowProductForm(false); setShowServiceForm(false); }}
            >
              <Text style={[styles.subTabText, catalogoType === 'productos' && styles.subTabTextActive]}>
                🧴 Catálogo de Productos
              </Text>
            </TouchableOpacity>
          </View>

          {/* ──────── VISTA CATÁLOGO DE SERVICIOS ──────── */}
          {catalogoType === 'servicios' && (
            <>
              <View style={p.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Catálogo de servicios</Text>
                  <Text style={p.muted}>Edita servicios, duración y disponibilidad.</Text>
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    setEditingServiceIndex(null);
                    setServiceName('');
                    setServiceDuration('');
                    setServiceRequiresDeposit(false);
                    setShowServiceForm(!showServiceForm);
                  }}
                >
                  <Text style={styles.addButtonText}>{showServiceForm ? 'Cerrar' : '+ Agregar'}</Text>
                </TouchableOpacity>
              </View>

              {showServiceForm && (
                <View style={[p.card, styles.addForm]}>
                  <Text style={styles.formTitle}>
                    {editingServiceIndex === null ? 'Nuevo servicio' : 'Editar servicio'}
                  </Text>
                  <TextInput
                    value={serviceName}
                    onChangeText={setServiceName}
                    placeholder="Nombre del servicio (ej. Cortes de Cabello)"
                    style={p.input}
                    placeholderTextColor={colors.beige[400]}
                  />
                  <TextInput
                    value={serviceDuration}
                    onChangeText={setServiceDuration}
                    placeholder="Duración (ej. 20–45 MIN)"
                    style={p.input}
                    placeholderTextColor={colors.beige[400]}
                  />
                  <View style={[p.row, { paddingVertical: 4 }]}>
                    <Text style={{ fontSize: 13, color: colors.ink[800], fontWeight: '600' }}>
                      Requiere anticipo obligatorio
                    </Text>
                    <Switch
                      value={serviceRequiresDeposit}
                      onValueChange={setServiceRequiresDeposit}
                      trackColor={{ false: colors.beige[200], true: colors.primary[200] }}
                      thumbColor={serviceRequiresDeposit ? colors.primary[500] : colors.beige[400]}
                    />
                  </View>
                  <TouchableOpacity style={p.button} onPress={saveService}>
                    <Text style={p.buttonText}>
                      {editingServiceIndex === null ? 'Agregar al catálogo' : 'Guardar cambios'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {services.map((service, i) => (
                <View key={`${service.id}-${i}`} style={[p.card, styles.itemRow]}>
                  <View style={styles.serviceThumb}>
                    <Text style={{ fontSize: 20 }}>{service.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{service.name}</Text>
                    <View style={[p.row, { justifyContent: 'flex-start', gap: 6, marginTop: 4 }]}>
                      <Text style={styles.serviceMetaText}>{service.duration}</Text>
                      {service.requiresDeposit && (
                        <View style={styles.depositBadge}>
                          <Text style={styles.depositBadgeText}>Anticipo</Text>
                        </View>
                      )}
                      <StatusPill
                        label={service.active ? 'Disponible' : 'Sin servicio'}
                        tone={service.active ? 'olive' : 'red'}
                      />
                    </View>
                  </View>
                  <View style={styles.productActions}>
                    <TouchableOpacity onPress={() => editService(i)} style={styles.stockButton}>
                      <Text style={styles.stockButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        setServices(
                          services.map((item, index) =>
                            index === i ? { ...item, active: !item.active } : item
                          )
                        )
                      }
                      style={[
                        styles.stockButton,
                        service.active ? styles.btnInactive : styles.btnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stockButtonText,
                          service.active ? styles.btnInactiveText : styles.btnActiveText,
                        ]}
                      >
                        {service.active ? 'Sin servicio' : 'Activar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ──────── VISTA CATÁLOGO DE PRODUCTOS ──────── */}
          {catalogoType === 'productos' && (
            <>
              <View style={p.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Catálogo de productos</Text>
                  <Text style={p.muted}>Edita productos, precios y disponibilidad.</Text>
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    setEditingProductIndex(null);
                    setProductName('');
                    setProductPrice('');
                    setShowProductForm(!showProductForm);
                  }}
                >
                  <Text style={styles.addButtonText}>{showProductForm ? 'Cerrar' : '+ Agregar'}</Text>
                </TouchableOpacity>
              </View>

              {showProductForm && (
                <View style={[p.card, styles.addForm]}>
                  <Text style={styles.formTitle}>
                    {editingProductIndex === null ? 'Nuevo producto' : 'Editar producto'}
                  </Text>
                  <TextInput
                    value={productName}
                    onChangeText={setProductName}
                    placeholder="Nombre del producto"
                    style={p.input}
                    placeholderTextColor={colors.beige[400]}
                  />
                  <TextInput
                    value={productPrice}
                    onChangeText={setProductPrice}
                    placeholder="Precio · ej. $450"
                    style={p.input}
                    placeholderTextColor={colors.beige[400]}
                  />
                  <TouchableOpacity style={p.button} onPress={saveProduct}>
                    <Text style={p.buttonText}>
                      {editingProductIndex === null ? 'Agregar al catálogo' : 'Guardar cambios'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {products.map((product, i) => (
                <View key={`${product.name}-${i}`} style={[p.card, styles.itemRow]}>
                  <View style={styles.productThumb}>
                    {product.image ? (
                      <Image
                        source={{ uri: product.image }}
                        style={styles.productThumbImage}
                        contentFit="contain"
                        transition={180}
                        accessibilityLabel={`Imagen de ${product.name}`}
                      />
                    ) : (
                      <Text style={{ fontSize: 22 }}>🧴</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.brand}>{product.brand.toUpperCase()}</Text>
                    <Text style={styles.productName}>{product.name}</Text>
                    <View style={[p.row, { justifyContent: 'flex-start', gap: 8, marginTop: 5 }]}>
                      <Text style={styles.productPrice}>{product.price}</Text>
                      <StatusPill
                        label={product.stock ? 'En stock' : 'Agotado'}
                        tone={product.stock ? 'olive' : 'red'}
                      />
                    </View>
                  </View>
                  <View style={styles.productActions}>
                    <TouchableOpacity onPress={() => editProduct(i)} style={styles.stockButton}>
                      <Text style={styles.stockButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        setProducts(
                          products.map((item, index) =>
                            index === i ? { ...item, stock: !item.stock } : item
                          )
                        )
                      }
                      style={styles.stockButton}
                    >
                      <Text style={styles.stockButtonText}>
                        {product.stock ? 'Sin stock' : 'Reponer'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          <Text style={styles.note}>Cambios guardados en esta demostración.</Text>
        </View>
      )}

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar sesión de administrador</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: colors.beige[100], padding: 4, borderRadius: 13, gap: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  activeTab: { backgroundColor: colors.white, ...theme.shadow.card },
  tabText: { color: colors.ink[700], fontSize: 11, fontWeight: '600' },
  activeTabText: { color: colors.primary[600], fontWeight: '700' },
  section: { gap: 10 },

  totalCard: {
    backgroundColor: colors.ink[800],
    borderColor: colors.ink[800],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  totalLabel: { color: colors.primary[200], fontSize: 8, letterSpacing: 1.2, fontWeight: '700' },
  totalAmount: { color: colors.white, fontSize: 29, fontWeight: '700', marginTop: 6 },
  currency: { fontSize: 10, color: colors.primary[200] },
  totalCaption: { color: '#D2D2C8', fontSize: 10, marginTop: 3 },
  sectionTitle: { color: colors.ink[800], fontSize: 15, fontWeight: '700' },
  depositRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  avatar: { width: 36, height: 36, backgroundColor: colors.primary[50], borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.primary[600], fontWeight: '700', fontSize: 10 },
  client: { color: colors.ink[800], fontWeight: '700', fontSize: 12 },
  depositDate: { color: colors.beige[500], fontSize: 9, marginTop: 3 },
  amount: { color: colors.primary[600], fontSize: 15, fontWeight: '700' },
  note: { textAlign: 'center', color: colors.beige[500], fontSize: 9, lineHeight: 14, paddingHorizontal: 10 },

  metricIntro: { backgroundColor: colors.primary[50], borderColor: colors.primary[100], gap: 5 },
  metricTotal: { color: colors.ink[800], fontSize: 34, fontWeight: '700' },
  chartCard: { gap: 12 },
  chartUnit: { color: colors.beige[500], letterSpacing: 1, fontSize: 8, fontWeight: '700' },
  chart: { height: 128, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', borderBottomWidth: 1, borderColor: colors.beige[200], paddingTop: 12 },
  barColumn: { alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  barValue: { color: colors.ink[700], fontSize: 9, fontWeight: '700' },
  bar: { width: 34, borderTopLeftRadius: 7, borderTopRightRadius: 7 },
  barLabel: { color: colors.beige[500], fontSize: 9, marginTop: 2 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', color: colors.beige[500], fontSize: 9 },
  metricTiles: { flexDirection: 'row', gap: 10 },
  metricTile: { flex: 1, gap: 3 },
  tileIcon: { color: colors.primary[500], fontSize: 20 },
  tileValue: { color: colors.ink[800], fontWeight: '700', fontSize: 20 },

  // Subpestañas Catálogo
  subTabsContainer: { flexDirection: 'row', backgroundColor: colors.beige[100], padding: 3, borderRadius: 12, gap: 4, marginBottom: 4 },
  subTab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  subTabActive: { backgroundColor: colors.white, ...theme.shadow.card },
  subTabText: { color: colors.ink[700], fontSize: 11, fontWeight: '600' },
  subTabTextActive: { color: colors.primary[600], fontWeight: '700' },

  addButton: { backgroundColor: colors.primary[500], paddingHorizontal: 12, paddingVertical: 10, borderRadius: 11 },
  addButtonText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  addForm: { gap: 9 },
  formTitle: { color: colors.ink[800], fontWeight: '700', fontSize: 14 },

  itemRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10 },
  serviceThumb: { width: 40, height: 46, borderRadius: 12, backgroundColor: colors.beige[100], alignItems: 'center', justifyContent: 'center' },
  serviceMetaText: { color: colors.ink[700], fontSize: 10, fontWeight: '600' },
  depositBadge: { backgroundColor: '#FFFBEB', borderRadius: 6, borderWidth: 1, borderColor: '#FDE68A', paddingHorizontal: 6, paddingVertical: 2 },
  depositBadgeText: { color: '#B45309', fontSize: 8, fontWeight: '700' },

  productThumb: { width: 40, height: 46, flexGrow: 0, flexShrink: 0, borderRadius: 12, backgroundColor: colors.beige[100], alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productThumbImage: { width: 40, height: 46, flexGrow: 0, flexShrink: 0 },
  brand: { color: colors.primary[500], fontSize: 7, letterSpacing: 0.8, fontWeight: '700' },
  productName: { color: colors.ink[800], fontSize: 11, fontWeight: '700', marginTop: 3, flexShrink: 1 },
  productPrice: { color: colors.ink[800], fontSize: 11, fontWeight: '700' },
  productActions: { gap: 5, flexShrink: 0 },
  stockButton: { borderWidth: 1, borderColor: colors.beige[200], borderRadius: 9, paddingHorizontal: 8, paddingVertical: 7 },
  stockButtonText: { color: colors.ink[700], fontSize: 8, fontWeight: '600' },
  btnInactive: { backgroundColor: '#FCE7E7', borderColor: '#F8B4B4' },
  btnInactiveText: { color: '#A83333', fontWeight: '700' },
  btnActive: { backgroundColor: colors.primary[50], borderColor: colors.primary[200] },
  btnActiveText: { color: colors.primary[600], fontWeight: '700' },

  logout: { alignItems: 'center', padding: 10 },
  logoutText: { color: colors.status.error, fontWeight: '700', fontSize: 11 },
});
