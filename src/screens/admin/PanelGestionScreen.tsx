import React, { useState, useMemo } from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity, TextInput, Switch } from 'react-native';
import { Image } from 'expo-image';
import { PageHeader, StatusPill, pageStyles as p } from '@/components/SalonUI';
import { useAuth } from '@/context/AuthContext';
import { useSalon, ServiceCatalogItem, ProductCatalogItem } from '@/context/SalonContext';
import { theme } from '@/constants/YossTheme';

const { colors, borderRadius } = theme;

type PanelTab = 'Pagos y Anticipos' | 'Métricas' | 'Catálogo';
type CatalogoType = 'servicios' | 'productos';

export default function PanelGestionScreen() {
  const { logout } = useAuth();
  const {
    appointments,
    mpPayments,
    clientsList,
    servicesCatalog,
    productsCatalog,
    saveServiceCatalog,
    toggleServiceActive,
    saveProductCatalog,
    toggleProductStock,
  } = useSalon();

  const [active, setActive] = useState<PanelTab>('Pagos y Anticipos');
  const [catalogoType, setCatalogoType] = useState<CatalogoType>('servicios');
  const [paymentFilter, setPaymentFilter] = useState<'todos' | 'anticipos' | 'completos' | 'pendientes' | 'efectivo'>('todos');

  // Formulario de producto
  const [showProductForm, setShowProductForm] = useState(false);
  const [productName, setProductName] = useState('');
  const [productBrand, setProductBrand] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [editingProduct, setEditingProduct] = useState<ProductCatalogItem | null>(null);

  // Formulario de servicio
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceDuration, setServiceDuration] = useState('');
  const [serviceRequiresDeposit, setServiceRequiresDeposit] = useState(false);
  const [editingService, setEditingService] = useState<ServiceCatalogItem | null>(null);

  const saveProduct = async () => {
    if (!productName.trim()) return;
    const numericPrice = parseFloat(productPrice.replace(/[^\d.]/g, '')) || 0;
    await saveProductCatalog({
      id: editingProduct?.id,
      brand: productBrand.trim() || editingProduct?.brand || 'Yoss Beauty Salon',
      name: productName.trim(),
      price: numericPrice,
      stock: editingProduct ? editingProduct.stock : true,
      image: editingProduct?.image,
      active: true,
    });
    setProductName('');
    setProductBrand('');
    setProductPrice('');
    setEditingProduct(null);
    setShowProductForm(false);
  };

  const editProduct = (item: ProductCatalogItem) => {
    setEditingProduct(item);
    setProductBrand(item.brand);
    setProductName(item.name);
    setProductPrice(String(item.price));
    setShowProductForm(true);
  };

  const saveService = async () => {
    if (!serviceName.trim()) return;
    await saveServiceCatalog({
      id: editingService?.id,
      nombre: serviceName.trim(),
      duracion: serviceDuration.trim() || '30 MIN',
      requiresDeposit: serviceRequiresDeposit,
      depositAmount: serviceRequiresDeposit ? (editingService?.depositAmount || 300) : 0,
      icon: editingService?.icon || '✂️',
      tags: editingService?.tags || [],
      descripcion: editingService?.descripcion || 'Servicio profesional en Yoss Beauty Salon.',
      active: editingService ? editingService.active : true,
    });
    setServiceName('');
    setServiceDuration('');
    setServiceRequiresDeposit(false);
    setEditingService(null);
    setShowServiceForm(false);
  };

  const editService = (item: ServiceCatalogItem) => {
    setEditingService(item);
    setServiceName(item.nombre);
    setServiceDuration(item.duracion);
    setServiceRequiresDeposit(item.requiresDeposit);
    setShowServiceForm(true);
  };

  // ── CÁLCULO REAL DE MÉTRICAS GLOBALES (SOLO MERCADO PAGO EN SUPABASE) ──
  const nowMs = Date.now();

  const totalAnticiposMP = useMemo(() => {
    return mpPayments
      .filter((pay) => pay.estado === 'aprobado' && pay.tipoPago === 'anticipo')
      .reduce((acc, pay) => acc + pay.monto, 0);
  }, [mpPayments]);

  const totalPagosCompletosMP = useMemo(() => {
    return mpPayments
      .filter((pay) => pay.estado === 'aprobado' && pay.tipoPago === 'pago_completo')
      .reduce((acc, pay) => acc + pay.monto, 0);
  }, [mpPayments]);

  const totalRecaudadoMP = totalAnticiposMP + totalPagosCompletosMP;

  const citasPendientesHold = useMemo(
    () => appointments.filter((a) => a.status === 'Pendiente anticipo' && (!a.expiresAt || a.expiresAt > nowMs)),
    [appointments, nowMs]
  );

  const totalCitasEfectivo = useMemo(
    () => appointments.filter((a) => a.paymentMethod === 'efectivo' && a.status !== 'Cancelada' && a.status !== 'Expirada').length,
    [appointments]
  );

  type Movimiento = {
    id: string;
    client: string;
    initials: string;
    service: string;
    date: string;
    amount: string;
    method: 'efectivo' | 'mercadopago';
    category: 'anticipo' | 'completo' | 'efectivo';
    status: string;
    tone: 'olive' | 'amber' | 'red' | 'gray';
  };

  const movimientosCitas: Movimiento[] = useMemo(() => {
    return appointments
      .filter((a) => a.status !== 'Expirada' && a.status !== 'Cancelada')
      .map((a) => {
        const isCash = a.paymentMethod === 'efectivo';
        const initials = a.client.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'CL';

        let amount = '';
        let statusText = '';
        let category: 'anticipo' | 'completo' | 'efectivo' = 'efectivo';
        let tone: 'olive' | 'amber' | 'red' | 'gray' = 'gray';

        if (isCash) {
          amount = 'Cobro en salón';
          statusText = a.status === 'Aceptada' ? 'Efectivo en salón' : a.status;
          category = 'efectivo';
          tone = a.status === 'Aceptada' || a.status === 'Finalizada' ? 'olive' : 'gray';
        } else if (a.status === 'Pendiente anticipo') {
          amount = `$${a.depositAmount || 300} MXN`;
          statusText = 'Anticipo en espera (Hold 15m)';
          category = 'anticipo';
          tone = 'amber';
        } else if (a.depositAmount && a.depositAmount > 0) {
          amount = `$${a.depositAmount} MXN`;
          statusText = 'Anticipo validado';
          category = 'anticipo';
          tone = 'olive';
        } else {
          amount = 'Por cotizar';
          statusText = 'MP pendiente (Sin precio fijo)';
          category = 'completo';
          tone = 'amber';
        }

        return {
          id: a.id,
          client: a.client,
          initials,
          service: a.service,
          date: `${a.date} · ${a.time}`,
          amount,
          method: a.paymentMethod || (a.status === 'Pendiente anticipo' ? 'mercadopago' : 'efectivo'),
          category,
          status: statusText,
          tone,
        };
      });
  }, [appointments]);

  const movimientosFiltrados = movimientosCitas.filter((m) => {
    if (paymentFilter === 'todos') return true;
    if (paymentFilter === 'anticipos') return m.category === 'anticipo' && m.status === 'Anticipo validado';
    if (paymentFilter === 'completos') return m.category === 'completo';
    if (paymentFilter === 'pendientes') return m.status.includes('Hold') || m.status.includes('espera');
    if (paymentFilter === 'efectivo') return m.category === 'efectivo';
    return true;
  });

  // ── MÉTRICAS REALES (últimas 4 semanas desde citas en Supabase) ──
  const metricsData = useMemo(() => {
    const activeApts = appointments.filter((a) => a.status !== 'Cancelada' && a.status !== 'Expirada');
    const attendedCount = appointments.filter((a) => a.status === 'Finalizada' || a.status === 'Aceptada').length;

    const now = new Date();
    const weeks = [3, 2, 1, 0].map((weeksAgo, idx) => {
      const end = new Date(now);
      end.setDate(now.getDate() - weeksAgo * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);

      const startIso = start.toISOString().slice(0, 10);
      const endIso = end.toISOString().slice(0, 10);
      const count = activeApts.filter((a) => a.isoDate >= startIso && a.isoDate <= endIso).length;
      return { label: `Sem ${idx + 1}`, count };
    });

    const maxCount = Math.max(1, ...weeks.map((w) => w.count));
    const bars = weeks.map((w) => ({
      ...w,
      height: w.count === 0 ? 6 : Math.max(16, Math.round((w.count / maxCount) * 86)),
    }));

    return {
      attendedCount,
      totalActive: activeApts.length,
      registeredClients: clientsList.length,
      bars,
    };
  }, [appointments, clientsList]);

  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <PageHeader eyebrow="Panel administrador" title="Gestión" subtitle="Pagos, anticipos, actividad real del salón y catálogo." />

      <View style={styles.tabs}>
        {(['Pagos y Anticipos', 'Métricas', 'Catálogo'] as PanelTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActive(tab)}
            style={[styles.tab, active === tab && styles.activeTab]}
          >
            <Text style={[styles.tabText, active === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── SECCIÓN PAGOS Y ANTICIPOS ── */}
      {active === 'Pagos y Anticipos' && (
        <View style={styles.section}>
          <View style={[p.card, styles.totalCard]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.totalLabel}>RECAUDACIÓN REGISTRADA EN APP · MERCADO PAGO</Text>
              <Text style={styles.totalAmount}>
                ${totalRecaudadoMP.toLocaleString()} <Text style={styles.currency}>MXN</Text>
              </Text>
              <Text style={styles.totalCaption}>Control contable de ingresos digitales: Anticipos validados por Mercado Pago</Text>
            </View>
            <Text style={{ fontSize: 32 }}>💙</Text>
          </View>

          <View style={styles.metricGrid3}>
            <View style={[p.card, styles.metricCardSmall]}>
              <View style={styles.metricIconRow}>
                <Text style={styles.metricCardIcon}>💙</Text>
                <Text style={[styles.metricCardBadge, { color: '#0277BD', backgroundColor: '#E1F5FE' }]}>Activo</Text>
              </View>
              <Text style={[styles.metricCardValue, { color: '#009EE3' }]}>
                ${totalAnticiposMP.toLocaleString()} <Text style={styles.metricCardCur}>MXN</Text>
              </Text>
              <Text style={styles.metricCardTitle}>Anticipos MP</Text>
              <Text style={styles.metricCardSub}>Colorimetría y alaciados</Text>
            </View>

            <View style={[p.card, styles.metricCardSmall]}>
              <View style={styles.metricIconRow}>
                <Text style={styles.metricCardIcon}>💳</Text>
                <Text style={[styles.metricCardBadge, { color: '#B45309', backgroundColor: '#FEF3C7' }]}>Pendiente</Text>
              </View>
              <Text style={[styles.metricCardValue, { color: '#B45309' }]}>
                ${totalPagosCompletosMP.toLocaleString()} <Text style={styles.metricCardCur}>MXN</Text>
              </Text>
              <Text style={styles.metricCardTitle}>Pagos completos MP</Text>
              <Text style={styles.metricCardSub}>Servicios sin precio fijo</Text>
            </View>

            <View style={[p.card, styles.metricCardSmall]}>
              <View style={styles.metricIconRow}>
                <Text style={styles.metricCardIcon}>⏱️</Text>
                <Text style={[styles.metricCardBadge, { color: '#B45309', backgroundColor: '#FEF3C7' }]}>Hold 15m</Text>
              </View>
              <Text style={[styles.metricCardValue, { color: '#B45309' }]}>{citasPendientesHold.length}</Text>
              <Text style={styles.metricCardTitle}>En espera</Text>
              <Text style={styles.metricCardSub}>Apartados temporales</Text>
            </View>
          </View>

          <View style={styles.cashInfoCard}>
            <Text style={{ fontSize: 20 }}>💵</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cashInfoTitle}>Control de Efectivo en Salón ({totalCitasEfectivo} citas registradas)</Text>
              <Text style={styles.cashInfoSub}>
                Los servicios cotidianos se liquidan en efectivo directamente en el salón según la cotización física y largo del cabello. No se suman a la contabilidad digital de la app.
              </Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
            {(
              [
                { id: 'todos', label: 'Todos' },
                { id: 'anticipos', label: '💙 Anticipos validados' },
                { id: 'completos', label: '💳 Pagos completos MP (Pendiente)' },
                { id: 'pendientes', label: '⏱️ En espera' },
                { id: 'efectivo', label: '💵 Citas en efectivo' },
              ] as const
            ).map((f) => {
              const isSelected = paymentFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() => setPaymentFilter(f.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={p.row}>
            <Text style={styles.sectionTitle}>Movimientos y pagos registrados</Text>
            <StatusPill label={`${movimientosFiltrados.length} registros`} tone="gray" />
          </View>

          {movimientosFiltrados.length === 0 ? (
            <View style={[p.card, { alignItems: 'center', paddingVertical: 26, gap: 6 }]}>
              <Text style={{ fontSize: 28 }}>💳</Text>
              <Text style={styles.client}>Sin movimientos registrados aún</Text>
              <Text style={[p.muted, { textAlign: 'center' }]}>
                Aquí aparecerán los anticipos de Mercado Pago y citas en efectivo conforme se agenden en la aplicación.
              </Text>
            </View>
          ) : (
            movimientosFiltrados.map((mov) => (
              <View key={mov.id} style={[p.card, styles.depositRow]}>
                <View style={[styles.avatar, mov.method === 'mercadopago' ? styles.avatarMp : styles.avatarCash]}>
                  <Text style={[styles.initials, mov.method === 'mercadopago' ? styles.initialsMp : styles.initialsCash]}>
                    {mov.initials}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={p.row}>
                    <Text style={styles.client}>{mov.client}</Text>
                    <View style={[styles.methodBadge, mov.method === 'mercadopago' ? styles.methodBadgeMp : styles.methodBadgeCash]}>
                      <Text style={[styles.methodBadgeText, mov.method === 'mercadopago' ? styles.methodBadgeTextMp : styles.methodBadgeTextCash]}>
                        {mov.method === 'mercadopago' ? '💙 MP' : '💵 Efectivo'}
                      </Text>
                    </View>
                  </View>
                  <Text style={p.muted}>{mov.service}</Text>
                  <Text style={styles.depositDate}>{mov.date}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.amount}>{mov.amount}</Text>
                  <StatusPill label={mov.status} tone={mov.tone} />
                </View>
              </View>
            ))
          )}

          <Text style={styles.note}>
            La app controla numéricamente los anticipos y cobros recibidos mediante Mercado Pago. El efectivo se gestiona en caja física al acudir la clienta.
          </Text>
        </View>
      )}

      {/* ── SECCIÓN MÉTRICAS REALES ── */}
      {active === 'Métricas' && (
        <View style={styles.section}>
          <View style={[p.card, styles.metricIntro]}>
            <Text style={styles.totalLabel}>CITAS CONFIRMADAS Y ATENDIDAS</Text>
            <View style={p.row}>
              <Text style={styles.metricTotal}>{metricsData.attendedCount}</Text>
              <StatusPill label="Tiempo real" tone="olive" />
            </View>
            <Text style={p.muted}>Conteo real de citas confirmadas o finalizadas en Supabase.</Text>
          </View>

          <View style={[p.card, styles.chartCard]}>
            <View style={p.row}>
              <Text style={styles.sectionTitle}>Actividad de últimas 4 semanas</Text>
              <Text style={styles.chartUnit}>CITAS</Text>
            </View>
            <View style={styles.chart}>
              {metricsData.bars.map((item, i) => (
                <View key={item.label} style={styles.barColumn}>
                  <Text style={styles.barValue}>{item.count}</Text>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: item.height,
                        backgroundColor: i === 3 ? colors.primary[500] : colors.primary[200],
                      },
                    ]}
                  />
                  <Text style={styles.barLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.axis}>
              <Text>Hace 4 sem</Text>
              <Text>Esta semana</Text>
            </View>
          </View>

          <View style={styles.metricTiles}>
            <View style={[p.card, styles.metricTile]}>
              <Text style={styles.tileIcon}>👤</Text>
              <Text style={styles.tileValue}>{metricsData.registeredClients}</Text>
              <Text style={p.muted}>clientas registradas</Text>
            </View>
            <View style={[p.card, styles.metricTile]}>
              <Text style={styles.tileIcon}>✦</Text>
              <Text style={styles.tileValue}>{metricsData.totalActive}</Text>
              <Text style={p.muted}>citas totales activas</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── SECCIÓN CATÁLOGO (SERVICIOS Y PRODUCTOS EN SUPABASE) ── */}
      {active === 'Catálogo' && (
        <View style={styles.section}>
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

          {catalogoType === 'servicios' && (
            <>
              <View style={p.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Catálogo de servicios</Text>
                  <Text style={p.muted}>Edita servicios, duración y disponibilidad en vivo.</Text>
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    setEditingService(null);
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
                    {editingService ? 'Editar servicio' : 'Nuevo servicio'}
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
                    placeholder="Duración (ej. 30 MIN)"
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
                      {editingService ? 'Guardar cambios' : 'Agregar al catálogo'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {servicesCatalog.map((service) => (
                <View key={service.id} style={[p.card, styles.itemRow]}>
                  <View style={styles.serviceThumb}>
                    <Text style={{ fontSize: 20 }}>{service.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{service.nombre}</Text>
                    <View style={[p.row, { justifyContent: 'flex-start', gap: 6, marginTop: 4 }]}>
                      <Text style={styles.serviceMetaText}>{service.duracion}</Text>
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
                    <TouchableOpacity onPress={() => editService(service)} style={styles.stockButton}>
                      <Text style={styles.stockButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => toggleServiceActive(service.id, !service.active)}
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

          {catalogoType === 'productos' && (
            <>
              <View style={p.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Catálogo de productos</Text>
                  <Text style={p.muted}>Edita productos, precios y disponibilidad en vivo.</Text>
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    setEditingProduct(null);
                    setProductBrand('');
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
                    {editingProduct ? 'Editar producto' : 'Nuevo producto'}
                  </Text>
                  <TextInput
                    value={productBrand}
                    onChangeText={setProductBrand}
                    placeholder="Marca (ej. Olaplex)"
                    style={p.input}
                    placeholderTextColor={colors.beige[400]}
                  />
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
                    placeholder="Precio numérico · ej. 450"
                    keyboardType="numeric"
                    style={p.input}
                    placeholderTextColor={colors.beige[400]}
                  />
                  <TouchableOpacity style={p.button} onPress={saveProduct}>
                    <Text style={p.buttonText}>
                      {editingProduct ? 'Guardar cambios' : 'Agregar al catálogo'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {productsCatalog.map((product) => (
                <View key={product.id} style={[p.card, styles.itemRow]}>
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
                      <Text style={styles.productPrice}>{product.priceFormatted}</Text>
                      <StatusPill
                        label={product.stock ? 'En stock' : 'Agotado'}
                        tone={product.stock ? 'olive' : 'red'}
                      />
                    </View>
                  </View>
                  <View style={styles.productActions}>
                    <TouchableOpacity onPress={() => editProduct(product)} style={styles.stockButton}>
                      <Text style={styles.stockButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => toggleProductStock(product.id, !product.stock)}
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
    backgroundColor: colors.ink[800], borderColor: colors.ink[800], flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', padding: 18,
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

  metricGrid3: { flexDirection: 'row', gap: 8 },
  metricCardSmall: { flex: 1, padding: 12, gap: 4 },
  metricIconRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricCardIcon: { fontSize: 16 },
  metricCardBadge: { fontSize: 8, fontWeight: '700', color: colors.primary[600], backgroundColor: colors.primary[50], paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  metricCardValue: { fontSize: 14, fontWeight: '800', color: colors.ink[800], marginTop: 2 },
  metricCardCur: { fontSize: 8, fontWeight: '600', color: colors.beige[500] },
  metricCardTitle: { fontSize: 10, fontWeight: '700', color: colors.ink[800] },
  metricCardSub: { fontSize: 8, color: colors.ink[700], lineHeight: 11 },

  filterBar: { flexDirection: 'row', gap: 6, marginVertical: 2 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: borderRadius.pill, backgroundColor: colors.beige[100] },
  filterChipActive: { backgroundColor: colors.primary[500] },
  filterChipText: { fontSize: 10, fontWeight: '600', color: colors.ink[700] },
  filterChipTextActive: { color: colors.white, fontWeight: '700' },

  avatarMp: { backgroundColor: '#E1F5FE' },
  avatarCash: { backgroundColor: colors.primary[50] },
  initialsMp: { color: '#0277BD' },
  initialsCash: { color: colors.primary[600] },
  methodBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  methodBadgeMp: { backgroundColor: '#E1F5FE' },
  methodBadgeCash: { backgroundColor: colors.primary[50] },
  methodBadgeText: { fontSize: 8, fontWeight: '700' },
  methodBadgeTextMp: { color: '#0277BD' },
  methodBadgeTextCash: { color: colors.primary[600] },

  cashInfoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F5F9F2',
    borderWidth: 1, borderColor: '#D4E7C5', borderRadius: borderRadius.sm, padding: 12,
  },
  cashInfoTitle: { fontSize: 11, fontWeight: '700', color: colors.primary[700] },
  cashInfoSub: { fontSize: 10, color: colors.ink[700], marginTop: 2, lineHeight: 14 },
});
