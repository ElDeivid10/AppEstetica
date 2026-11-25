/**
 * SalonContext.tsx
 * Estado global centralizado de Yoss Beauty Salon conectado 100% a Supabase.
 *
 * Administra en tiempo real:
 *  - Catálogo de servicios y productos (servicios, productos)
 *  - Citas del cliente y agenda global del administrador (citas + obtener_slots_ocupados)
 *  - Pagos digitales de Mercado Pago (pagos_mercadopago)
 *  - Favoritos por usuario (favoritos)
 *  - Recompensas del Club Yoss (recompensas + recompensas_usuario)
 *  - Mensajería y Chatbot FAQ (mensajes_chat)
 *  - Perfil de clienta y listado de clientas registradas para Yoss (usuarios)
 */

import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';

// ── Utilidades de fecha/hora ──────────────────────────────────────────────────
const DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatIsoToLabel(isoDate: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const dateObj = new Date(y, m - 1, d);
  return `${DIAS_ES[dateObj.getDay()]}, ${d} ${MESES_CORTOS[m - 1]}`;
}

function formatTimeHHMM(isoTimestamp?: string | null): string {
  const date = isoTimestamp ? new Date(isoTimestamp) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const len = clean.length;
  let padding = 0;
  if (clean.endsWith('==')) padding = 2;
  else if (clean.endsWith('=')) padding = 1;

  const byteLen = Math.max(0, Math.floor((len * 3) / 4) - padding);
  const bytes = new Uint8Array(byteLen);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const e1 = chars.indexOf(clean[i]);
    const e2 = chars.indexOf(clean[i + 1]);
    const c3 = clean[i + 2];
    const c4 = clean[i + 3];
    const e3 = c3 === '=' ? 0 : chars.indexOf(c3);
    const e4 = c4 === '=' ? 0 : chars.indexOf(c4);
    const n = (e1 << 18) | (e2 << 12) | (e3 << 6) | e4;
    if (p < byteLen) bytes[p++] = (n >> 16) & 255;
    if (c3 !== '=' && p < byteLen) bytes[p++] = (n >> 8) & 255;
    if (c4 !== '=' && p < byteLen) bytes[p++] = n & 255;
  }
  return bytes.buffer;
}

function formatPriceMXN(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

// ── Tipos Públicos ────────────────────────────────────────────────────────────
export type AppointmentStatus =
  | 'Aceptada'
  | 'En proceso'
  | 'Solicitud'
  | 'Finalizada'
  | 'No asistió'
  | 'Pendiente anticipo'
  | 'Expirada'
  | 'Cancelada';

export interface AppointmentItem {
  id: string;
  clientId?: string;
  client: string;
  serviceId?: string;
  service: string;
  date: string;       // Formato legible: 'Mié, 25 nov'
  isoDate: string;    // YYYY-MM-DD
  time: string;
  durationMin: number;
  status: AppointmentStatus;
  tone: 'olive' | 'amber' | 'red' | 'gray';
  detail: string;
  paid?: string;
  paymentMethod?: 'efectivo' | 'mercadopago';
  expiresAt?: number; // timestamp en ms para expiración automática (15 min)
  canSwitchToCash?: boolean;
  depositAmount?: number;
  totalPrice?: number;
  isReward?: boolean;
  rewardNote?: string;
  notes?: string;
}

export interface OccupiedSlot {
  id: string;
  isoDate: string;
  time: string;
  durationMin: number;
  service: string;
  status: string;
  expiresAt?: number;
}

export interface ServiceCatalogItem {
  id: string;
  nombre: string;
  duracion: string;
  duracionMin: number;
  icon: string;
  tags: string[];
  requiresDeposit: boolean;
  depositAmount: number;
  tienePrecioFijo: boolean;
  precioBase?: number;
  descripcion: string;
  active: boolean;
}

export interface ProductCatalogItem {
  id: string;
  brand: string;
  name: string;
  price: number;
  priceFormatted: string;
  stock: boolean;
  image?: string;
  description?: string;
  active: boolean;
}

export interface SalonDaySchedule {
  diaSemana: number; // 0=Domingo, 1=Lunes, ... 6=Sábado
  diaNombre: string;
  aperturaTurno1?: string; // '11:00'
  cierreTurno1?: string;   // '14:00'
  aperturaTurno2?: string; // '16:00'
  cierreTurno2?: string;   // '19:00'
  esCerrado: boolean;
}

export const DEFAULT_SALON_HOURS: SalonDaySchedule[] = [
  { diaSemana: 0, diaNombre: 'Domingo', esCerrado: true },
  { diaSemana: 1, diaNombre: 'Lunes', aperturaTurno1: '11:00', cierreTurno1: '14:00', aperturaTurno2: '16:00', cierreTurno2: '19:00', esCerrado: false },
  { diaSemana: 2, diaNombre: 'Martes', aperturaTurno1: '11:00', cierreTurno1: '14:00', aperturaTurno2: '16:00', cierreTurno2: '19:00', esCerrado: false },
  { diaSemana: 3, diaNombre: 'Miércoles', aperturaTurno1: '11:00', cierreTurno1: '14:00', aperturaTurno2: '16:00', cierreTurno2: '19:00', esCerrado: false },
  { diaSemana: 4, diaNombre: 'Jueves', aperturaTurno1: '11:00', cierreTurno1: '14:00', aperturaTurno2: '16:00', cierreTurno2: '19:00', esCerrado: false },
  { diaSemana: 5, diaNombre: 'Viernes', aperturaTurno1: '11:00', cierreTurno1: '14:00', aperturaTurno2: '16:00', cierreTurno2: '19:00', esCerrado: false },
  { diaSemana: 6, diaNombre: 'Sábado', aperturaTurno1: '11:00', cierreTurno1: '18:00', esCerrado: false },
];

export interface MpPaymentItem {
  id: string;
  citaId: string;
  clienteId?: string;
  clientName: string;
  serviceName: string;
  tipoPago: 'anticipo' | 'pago_completo';
  monto: number;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'expirado' | 'reembolsado';
  fechaPago?: string;
  creadoEn: string;
}

export interface ClientSummary {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  hair: string;
  allergies: string;
  avatarUri?: string;
  totalSpent: number;
  totalVisits: number;
  level: string;
  createdAt?: string;
}

export interface RewardItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  type: 'visitas' | 'gasto';
  category: 'servicio' | 'producto';
  serviceMatchId?: string;
  goal: number;
  current: number;
  unit: string;
  unlocked: boolean;
  claimed: boolean;
  tierLevel?: number;
  active: boolean;
}

export interface ChatMessage {
  id: string;
  clientId: string;
  sender: 'bot' | 'yoss' | 'cliente';
  senderName: string;
  text: string;
  timestamp: string;
  type?: 'welcome' | 'reminder' | 'confirmation' | 'reward' | 'chat';
  readByClient: boolean;
  readByAdmin: boolean;
  mapUrl?: string;
  mapAddress?: string;
  mapTitle?: string;
  paymentUrl?: string;
  paymentTitle?: string;
}

export interface AvatarPreset {
  id: string;
  name: string;
  category: 'salon' | 'pinturas' | 'animales';
  categoryLabel: string;
  uri: string;
  color: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'preset-s1', name: 'Corte Chic', category: 'salon', categoryLabel: 'Salón', uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', color: '#8A9A65' },
  { id: 'preset-s2', name: 'Rizos Glam', category: 'salon', categoryLabel: 'Salón', uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80', color: '#B8976C' },
  { id: 'preset-s3', name: 'Rubio Balayage', category: 'salon', categoryLabel: 'Salón', uri: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80', color: '#4B5548' },
  { id: 'preset-s4', name: 'Ondas Castañas', category: 'salon', categoryLabel: 'Salón', uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', color: '#654321' },
  { id: 'preset-s5', name: 'Moño Elegante', category: 'salon', categoryLabel: 'Salón', uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80', color: '#2C3E2D' },
  { id: 'preset-s6', name: 'Look Natural', category: 'salon', categoryLabel: 'Salón', uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80', color: '#A08060' },
  { id: 'preset-p1', name: 'Dama Clásica', category: 'pinturas', categoryLabel: 'Pinturas', uri: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=300&q=80', color: '#9E7D5D' },
  { id: 'preset-p2', name: 'Musa con Perla', category: 'pinturas', categoryLabel: 'Pinturas', uri: 'https://images.unsplash.com/photo-1582561424760-0321d75e81fa?auto=format&fit=crop&w=300&q=80', color: '#3A4E5C' },
  { id: 'preset-p3', name: 'Retrato Barroco', category: 'pinturas', categoryLabel: 'Pinturas', uri: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=300&q=80', color: '#63442C' },
  { id: 'preset-p4', name: 'Acuarela Botánica', category: 'pinturas', categoryLabel: 'Pinturas', uri: 'https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?auto=format&fit=crop&w=300&q=80', color: '#5C7457' },
  { id: 'preset-p5', name: 'Dama del Jardín', category: 'pinturas', categoryLabel: 'Pinturas', uri: 'https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?auto=format&fit=crop&w=300&q=80', color: '#A45D48' },
  { id: 'preset-p6', name: 'Lienzo Renacentista', category: 'pinturas', categoryLabel: 'Pinturas', uri: 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=300&q=80', color: '#82653E' },
  { id: 'preset-a1', name: 'Gatita Ilustrada', category: 'animales', categoryLabel: 'Animales', uri: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=300&q=80', color: '#8A7968' },
  { id: 'preset-a2', name: 'Cierva Mística', category: 'animales', categoryLabel: 'Animales', uri: 'https://images.unsplash.com/photo-1484406566174-9da000fda645?auto=format&fit=crop&w=300&q=80', color: '#5E6649' },
  { id: 'preset-a3', name: 'Zorro Noble', category: 'animales', categoryLabel: 'Animales', uri: 'https://images.unsplash.com/photo-1516934024742-b461fba47600?auto=format&fit=crop&w=300&q=80', color: '#9C582B' },
  { id: 'preset-a4', name: 'Cisne Sereno', category: 'animales', categoryLabel: 'Animales', uri: 'https://images.unsplash.com/photo-1557008075-7f2c5efa4cfd?auto=format&fit=crop&w=300&q=80', color: '#657A88' },
  { id: 'preset-a5', name: 'Colibrí Esmeralda', category: 'animales', categoryLabel: 'Animales', uri: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=300&q=80', color: '#346B52' },
  { id: 'preset-a6', name: 'Mariposa Monarca', category: 'animales', categoryLabel: 'Animales', uri: 'https://images.unsplash.com/photo-1559253664-ca249d4608c6?auto=format&fit=crop&w=300&q=80', color: '#B6662D' },
];

export interface ClientProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  allergies: string;
  hairProfile: string;
  totalSpent: number;
  totalVisits: number;
  level: string;
  nextLevel: string;
  nextLevelAt: number;
  avatarUri?: string;
  avatarPresetId?: string;
  createdAt?: string;
}

const EMPTY_PROFILE: ClientProfile = {
  id: '',
  name: '',
  email: '',
  phone: '',
  allergies: 'Ninguna registrada',
  hairProfile: 'Por definir',
  totalSpent: 0,
  totalVisits: 0,
  level: 'Plata',
  nextLevel: 'Oro',
  nextLevelAt: 2000,
};

export interface NewAppointmentInput {
  client?: string;
  serviceId?: string;
  service: string;
  date: string;
  isoDate: string;
  time: string;
  durationMin?: number;
  status: AppointmentStatus;
  tone?: 'olive' | 'amber' | 'red' | 'gray';
  detail?: string;
  paid?: string;
  paymentMethod?: 'efectivo' | 'mercadopago';
  expiresAt?: number;
  canSwitchToCash?: boolean;
  depositAmount?: number;
  totalPrice?: number;
  isReward?: boolean;
  rewardNote?: string;
  notes?: string;
}

interface SalonContextType {
  isLoadingData: boolean;
  refreshAllData: () => Promise<void>;

  // Catálogos reales desde Supabase
  servicesCatalog: ServiceCatalogItem[];
  productsCatalog: ProductCatalogItem[];
  salonHours: SalonDaySchedule[];
  saveServiceCatalog: (item: Partial<ServiceCatalogItem> & { nombre: string; duracion: string; requiresDeposit: boolean }) => Promise<void>;
  toggleServiceActive: (id: string, active: boolean) => Promise<void>;
  saveProductCatalog: (item: Partial<ProductCatalogItem> & { name: string; price: number }) => Promise<void>;
  toggleProductStock: (id: string, stock: boolean) => Promise<void>;

  // Citas y disponibilidad global
  appointments: AppointmentItem[];
  occupiedSlots: OccupiedSlot[];
  mpPayments: MpPaymentItem[];
  addAppointment: (cita: NewAppointmentInput) => Promise<string | null>;
  cancelAppointment: (id: string) => Promise<void>;
  updateAppointmentStatus: (id: string, status: AppointmentStatus, extraSpent?: number) => Promise<void>;
  updateAppointmentPayment: (id: string, paidNote?: string) => Promise<void>;
  switchPaymentToCash: (id: string) => Promise<void>;
  expireAppointment: (id: string) => Promise<void>;

  // Favoritos
  favServices: Set<string>;
  favProducts: Set<string>;
  toggleFavService: (id: string) => Promise<void>;
  toggleFavProduct: (id: string) => Promise<void>;
  isFavService: (id: string) => boolean;
  isFavProduct: (id: string) => boolean;

  // Recompensas
  rewards: RewardItem[];
  claimReward: (rewardId: string) => Promise<{ success: boolean; isService: boolean; serviceName?: string; isProduct: boolean }>;
  saveRewardCatalog: (reward: { id?: string; icon: string; title: string; description: string; type: 'visitas' | 'gasto'; goal: number }) => Promise<void>;
  toggleRewardActive: (id: string, active: boolean) => Promise<void>;
  deleteRewardCatalog: (id: string) => Promise<void>;

  // Chat y Notificaciones
  messages: ChatMessage[];
  unreadClientCount: number;
  unreadAdminCount: number;
  sendMessageAsClient: (text: string) => Promise<void>;
  sendMessageAsAdmin: (clientId: string, text: string) => Promise<void>;
  markClientMessagesAsRead: () => Promise<void>;
  markAdminMessagesAsRead: (clientId: string) => Promise<void>;

  // Perfil y Clientas (Admin)
  clientProfile: ClientProfile;
  clientsList: ClientSummary[];
  updateClientProfile: (updates: Partial<ClientProfile>) => Promise<void>;
  updateAvatar: (uri?: string, presetId?: string, base64Data?: string) => Promise<void>;
  removeAvatar: () => Promise<void>;
}

const SalonContext = createContext<SalonContextType | null>(null);

function toneFromStatus(status: string): 'olive' | 'amber' | 'red' | 'gray' {
  switch (status) {
    case 'Aceptada':
      return 'olive';
    case 'Finalizada':
      return 'gray';
    case 'No asistió':
    case 'Cancelada':
      return 'red';
    case 'Expirada':
      return 'gray';
    default:
      return 'amber';
  }
}

function defaultDetailFromRow(row: any): string {
  if (row.es_recompensa) {
    return `🎁 Beneficio Club Yoss: ${row.nota_recompensa || 'Cortesía 100%'}`;
  }
  switch (row.estado) {
    case 'Aceptada':
      return row.metodo_pago === 'efectivo'
        ? 'Cita confirmada automáticamente · Pago en efectivo en salón al llegar'
        : 'Cita confirmada · Anticipo validado con Mercado Pago';
    case 'Pendiente anticipo':
      return 'Anticipo pendiente con Mercado Pago · 15 minutos para completar pago';
    case 'En proceso':
      return 'Pago digital pendiente de cotización física en salón';
    case 'Finalizada':
      return 'Atendida por Yoss Beauty Salon';
    case 'No asistió':
      return 'Inasistencia registrada';
    case 'Cancelada':
      return 'Cancelada por el cliente';
    case 'Expirada':
      return 'Apartado cancelado por tiempo límite de 15 min · Horario liberado';
    default:
      return 'Solicitud recibida por Yoss Beauty Salon';
  }
}

function mapCitaRow(row: any): AppointmentItem {
  return {
    id: row.id,
    clientId: row.cliente_id ?? undefined,
    client: row.cliente_nombre,
    serviceId: row.servicio_id ?? undefined,
    service: row.servicio_nombre,
    date: formatIsoToLabel(row.fecha_cita),
    isoDate: row.fecha_cita,
    time: row.hora_cita,
    durationMin: Number(row.duracion_min) || 30,
    status: row.estado as AppointmentStatus,
    tone: toneFromStatus(row.estado),
    detail: defaultDetailFromRow(row),
    paid: row.nota_pago ?? undefined,
    paymentMethod: row.metodo_pago ?? undefined,
    expiresAt: row.expira_en ? new Date(row.expira_en).getTime() : undefined,
    canSwitchToCash: Boolean(row.puede_cambiar_a_efectivo),
    depositAmount: Number(row.monto_anticipo) || 0,
    totalPrice: row.precio_total != null ? Number(row.precio_total) : undefined,
    isReward: Boolean(row.es_recompensa),
    rewardNote: row.nota_recompensa ?? undefined,
    notes: row.notas_cliente ?? undefined,
  };
}

function mapMensajeRow(row: any): ChatMessage {
  return {
    id: row.id,
    clientId: row.cliente_id,
    sender: row.remitente,
    senderName: row.nombre_remitente,
    text: row.texto,
    timestamp: formatTimeHHMM(row.creado_en),
    type: row.tipo,
    readByClient: Boolean(row.leido_cliente),
    readByAdmin: Boolean(row.leido_admin),
    mapUrl: row.map_url ?? undefined,
    mapAddress: row.map_address ?? undefined,
    mapTitle: row.map_title ?? undefined,
    paymentUrl: row.payment_url ?? undefined,
    paymentTitle: row.payment_title ?? undefined,
  };
}

export function SalonProvider({ children }: { children: React.ReactNode }) {
  const { session, userId, userRole, setIsBlocked } = useAuth();

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [servicesCatalog, setServicesCatalog] = useState<ServiceCatalogItem[]>([]);
  const [productsCatalog, setProductsCatalog] = useState<ProductCatalogItem[]>([]);
  const [salonHours, setSalonHours] = useState<SalonDaySchedule[]>(DEFAULT_SALON_HOURS);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<OccupiedSlot[]>([]);
  const [mpPayments, setMpPayments] = useState<MpPaymentItem[]>([]);
  const [favServices, setFavServices] = useState<Set<string>>(new Set());
  const [favProducts, setFavProducts] = useState<Set<string>>(new Set());
  const [rawRewards, setRawRewards] = useState<any[]>([]);
  const [userRewardsMap, setUserRewardsMap] = useState<Record<string, any>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [clientProfile, setClientProfile] = useState<ClientProfile>(EMPTY_PROFILE);
  const [clientsList, setClientsList] = useState<ClientSummary[]>([]);

  // ── Fetch Catálogos Públicos (Servicios, Productos, Horarios, Recompensas) ──
  const fetchCatalogs = useCallback(async () => {
    if (!isSupabaseConfigured) return;

    const [srvRes, prodRes, rewRes, hrsRes] = await Promise.all([
      supabase.from('servicios').select('*').order('id', { ascending: true }),
      supabase.from('productos').select('*').order('creado_en', { ascending: true }),
      supabase.from('recompensas').select('*').order('id', { ascending: true }),
      supabase.from('horarios_salon').select('*').order('dia_semana', { ascending: true }),
    ]);

    if (srvRes.error) console.warn('Error cargando servicios:', srvRes.error.message);
    if (prodRes.error) console.warn('Error cargando productos:', prodRes.error.message);
    if (rewRes.error) console.warn('Error cargando recompensas:', rewRes.error.message);
    if (hrsRes.error) console.warn('Error cargando horarios_salon:', hrsRes.error.message);

    if (hrsRes.data && hrsRes.data.length > 0) {
      setSalonHours(
        hrsRes.data.map((h: any) => ({
          diaSemana: Number(h.dia_semana),
          diaNombre: h.dia_nombre,
          aperturaTurno1: h.apertura_turno1 ? String(h.apertura_turno1).slice(0, 5) : undefined,
          cierreTurno1: h.cierre_turno1 ? String(h.cierre_turno1).slice(0, 5) : undefined,
          aperturaTurno2: h.apertura_turno2 ? String(h.apertura_turno2).slice(0, 5) : undefined,
          cierreTurno2: h.cierre_turno2 ? String(h.cierre_turno2).slice(0, 5) : undefined,
          esCerrado: Boolean(h.es_cerrado),
        }))
      );
    }

    if (srvRes.data) {
      setServicesCatalog(
        srvRes.data.map((s: any) => ({
          id: s.id,
          nombre: s.nombre,
          duracion: s.duracion_texto,
          duracionMin: Number(s.duracion_min) || 30,
          icon: s.icono || '✂️',
          tags: Array.isArray(s.tags) ? s.tags : [],
          requiresDeposit: Boolean(s.requiere_anticipo),
          depositAmount: Number(s.monto_anticipo) || (s.requiere_anticipo ? 300 : 0),
          tienePrecioFijo: Boolean(s.tiene_precio_fijo),
          precioBase: s.precio_base != null ? Number(s.precio_base) : undefined,
          descripcion: s.descripcion || '',
          active: s.activo !== false,
        }))
      );
    }

    if (prodRes.data) {
      setProductsCatalog(
        prodRes.data.map((p: any) => ({
          id: p.id,
          brand: p.marca,
          name: p.nombre,
          price: Number(p.precio) || 0,
          priceFormatted: formatPriceMXN(Number(p.precio) || 0),
          stock: p.stock !== false,
          image: p.imagen_url ?? undefined,
          description: p.descripcion ?? undefined,
          active: p.activo !== false,
        }))
      );
    }

    if (rewRes.data) {
      setRawRewards(rewRes.data);
    }
  }, []);

  // ── Fetch Disponibilidad Global del Salón ───────────────────────────────────
  const fetchOccupiedSlots = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase.rpc('obtener_slots_ocupados');
    if (!error && Array.isArray(data)) {
      setOccupiedSlots(
        data.map((row: any) => ({
          id: row.id,
          isoDate: row.iso_date,
          time: row.hora_cita,
          durationMin: Number(row.duracion_min) || 30,
          service: row.servicio_nombre,
          status: row.estado,
          expiresAt: row.expira_en ? new Date(row.expira_en).getTime() : undefined,
        }))
      );
    }
  }, []);

  // ── Fetch Datos del Usuario o Administrador ──────────────────────────────────
  const fetchUserScopedData = useCallback(async () => {
    if (!isSupabaseConfigured || !userId || !userRole) return;

    // 1. Perfil propio
    const { data: profileData, error: profileError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.warn('Error cargando perfil de usuario:', profileError.message);
    }

    const authMeta = session?.user?.user_metadata || {};
    if (profileData) {
      setClientProfile({
        id: profileData.id,
        name: profileData.nombre || authMeta.nombre || '',
        email: profileData.email || session?.user?.email || '',
        phone: profileData.telefono || authMeta.telefono || '',
        allergies: profileData.alergias || authMeta.alergias || 'Ninguna registrada',
        hairProfile: profileData.perfil_cabello || authMeta.perfil_cabello || 'Por definir',
        totalSpent: Number(profileData.total_gastado) || 0,
        totalVisits: Number(profileData.total_visitas) || 0,
        level: profileData.nivel || 'Plata',
        nextLevel: profileData.siguiente_nivel || 'Oro',
        nextLevelAt: Number(profileData.meta_siguiente_nivel) || 2000,
        avatarUri: profileData.avatar_uri ?? undefined,
        avatarPresetId: profileData.avatar_preset_id ?? undefined,
        createdAt: profileData.creado_en ?? undefined,
      });
    } else if (session?.user) {
      setClientProfile({
        ...EMPTY_PROFILE,
        id: userId,
        name: authMeta.nombre || '',
        email: session.user.email || '',
        phone: authMeta.telefono || '',
        allergies: authMeta.alergias || 'Ninguna registrada',
        hairProfile: authMeta.perfil_cabello || 'Por definir',
      });
    }

    // 2. Citas (admin ve todas; cliente ve las suyas)
    const citasQuery = supabase
      .from('citas')
      .select('*')
      .order('fecha_cita', { ascending: userRole === 'admin' })
      .order('hora_cita', { ascending: userRole === 'admin' });

    const { data: citasData, error: citasError } =
      userRole === 'admin' ? await citasQuery : await citasQuery.eq('cliente_id', userId);

    if (citasError) {
      console.warn('Error cargando citas:', citasError.message);
    }

    const mappedCitas = (citasData || []).map(mapCitaRow);
    setAppointments(mappedCitas);

    if (userRole === 'cliente') {
      const noShows = mappedCitas.filter((a) => a.status === 'No asistió').length;
      if (noShows >= 3) setIsBlocked(true);
    }

    // 3. Mensajes (admin ve todos; cliente ve los suyos)
    const msgQuery = supabase
      .from('mensajes_chat')
      .select('*')
      .order('creado_en', { ascending: true });

    const { data: msgData, error: msgError } =
      userRole === 'admin' ? await msgQuery : await msgQuery.eq('cliente_id', userId);

    if (msgError) {
      console.warn('Error cargando mensajes_chat:', msgError.message);
    }

    if (userRole === 'cliente' && !msgError && (!msgData || msgData.length === 0)) {
      const firstName =
        (profileData?.nombre || authMeta.nombre || 'Bienvenida').split(' ')[0] || 'Bienvenida';
      const nowTs = Date.now();
      const welcomeRows = [
        {
          id: `msg-${nowTs}-1`,
          cliente_id: userId,
          remitente: 'bot',
          nombre_remitente: 'Asistente Yoss',
          texto: `¡Hola ${firstName}! ✨ Bienvenida a tu espacio personal en Yoss Beauty Salon. Aquí puedes consultar tus citas, horarios, ubicación y resolver dudas de tus tratamientos.`,
          tipo: 'welcome',
          leido_cliente: false,
          leido_admin: true,
          creado_en: new Date(nowTs).toISOString(),
        },
        {
          id: `msg-${nowTs}-2`,
          cliente_id: userId,
          remitente: 'bot',
          nombre_remitente: 'Ubicación Yoss Beauty Salon',
          texto: '📍 Nuestra dirección:\nCueramo, Gomez 60154, Uruapan, Mich.\n\n¡Toca el mapa interactivo para ver la ruta exacta en Google Maps!',
          tipo: 'chat',
          leido_cliente: false,
          leido_admin: true,
          map_url: 'https://maps.app.goo.gl/gjva8goQK7GQSpqQ6',
          map_address: 'Cueramo, Gomez 60154, Uruapan, Mich.',
          map_title: 'Yoss Beauty Salon · Uruapan, Mich.',
          creado_en: new Date(nowTs + 50).toISOString(),
        },
      ];
      const { error: seedErr } = await supabase.from('mensajes_chat').insert(welcomeRows);
      if (!seedErr) {
        setMessages(welcomeRows.map((r) => mapMensajeRow(r)));
      } else {
        setMessages([]);
      }
    } else {
      setMessages((msgData || []).map(mapMensajeRow));
    }

    // 4. Pagos Mercado Pago
    const payQuery = supabase
      .from('pagos_mercadopago')
      .select('*')
      .order('creado_en', { ascending: false });

    const { data: payData, error: payError } =
      userRole === 'admin' ? await payQuery : await payQuery.eq('cliente_id', userId);

    if (payError) {
      console.warn('Error cargando pagos_mercadopago:', payError.message);
    }

    const citaById = new Map(mappedCitas.map((c) => [c.id, c]));
    setMpPayments(
      (payData || []).map((pRow: any) => {
        const linkedCita = citaById.get(pRow.cita_id);
        return {
          id: pRow.id,
          citaId: pRow.cita_id,
          clienteId: pRow.cliente_id ?? undefined,
          clientName: linkedCita?.client || 'Clienta',
          serviceName: linkedCita?.service || 'Servicio',
          tipoPago: pRow.tipo_pago,
          monto: Number(pRow.monto) || 0,
          estado: pRow.estado,
          fechaPago: pRow.fecha_pago ?? undefined,
          creadoEn: pRow.creado_en,
        };
      })
    );

    // 5. Favoritos & Progreso de Recompensas (cliente) / Lista de clientas (admin)
    if (userRole === 'cliente') {
      const [favRes, urRes] = await Promise.all([
        supabase.from('favoritos').select('*').eq('usuario_id', userId),
        supabase.from('recompensas_usuario').select('*').eq('usuario_id', userId),
      ]);

      if (favRes.error) console.warn('Error cargando favoritos:', favRes.error.message);
      if (urRes.error) console.warn('Error cargando recompensas_usuario:', urRes.error.message);

      const srvFavs = new Set<string>();
      const prodFavs = new Set<string>();
      (favRes.data || []).forEach((f: any) => {
        if (f.tipo_item === 'servicio') srvFavs.add(f.item_id);
        if (f.tipo_item === 'producto') prodFavs.add(f.item_id);
      });
      setFavServices(srvFavs);
      setFavProducts(prodFavs);

      const urMap: Record<string, any> = {};
      (urRes.data || []).forEach((r: any) => {
        urMap[r.recompensa_id] = r;
      });
      setUserRewardsMap(urMap);
      setClientsList([]);
    } else if (userRole === 'admin') {
      const { data: clientesData, error: clientesError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('rol', 'cliente')
        .order('creado_en', { ascending: false });

      if (clientesError) {
        console.warn('Error cargando lista de clientas:', clientesError.message);
      }

      setClientsList(
        (clientesData || []).map((u: any) => {
          const safeName = (u.nombre || u.email?.split('@')[0] || 'Clienta').trim();
          return {
            id: u.id,
            name: safeName,
            initials:
              safeName
                .split(' ')
                .filter(Boolean)
                .map((w: string) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'CL',
            email: u.email,
            phone: u.telefono || 'Sin teléfono',
            hair: u.perfil_cabello || 'Por definir',
            allergies: u.alergias || 'Ninguna registrada',
            avatarUri: u.avatar_uri ?? undefined,
            totalSpent: Number(u.total_gastado) || 0,
            totalVisits: Number(u.total_visitas) || 0,
            level: u.nivel || 'Plata',
            createdAt: u.creado_en ?? undefined,
          };
        })
      );
    }
  }, [userId, userRole, session, setIsBlocked]);

  const refreshAllData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      await Promise.all([fetchCatalogs(), fetchOccupiedSlots(), fetchUserScopedData()]);
    } finally {
      setIsLoadingData(false);
    }
  }, [fetchCatalogs, fetchOccupiedSlots, fetchUserScopedData]);

  // Carga inicial al autenticar / cerrar sesión
  useEffect(() => {
    if (!userId || !userRole) {
      setAppointments([]);
      setMessages([]);
      setMpPayments([]);
      setFavServices(new Set());
      setFavProducts(new Set());
      setUserRewardsMap({});
      setClientProfile(EMPTY_PROFILE);
      setClientsList([]);
      fetchCatalogs();
      return;
    }
    refreshAllData();
  }, [userId, userRole, refreshAllData, fetchCatalogs]);

  // ── Suscripción Supabase Realtime ───────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured || !userId || !userRole) return;

    const channel = supabase
      .channel(`salon-realtime-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, () => {
        fetchUserScopedData();
        fetchOccupiedSlots();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes_chat' }, () => {
        fetchUserScopedData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos_mercadopago' }, () => {
        fetchUserScopedData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'servicios' }, () => {
        fetchCatalogs();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => {
        fetchCatalogs();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recompensas' }, () => {
        fetchCatalogs();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'horarios_salon' }, () => {
        fetchCatalogs();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'favoritos' }, () => {
        fetchUserScopedData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recompensas_usuario' }, () => {
        fetchUserScopedData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => {
        fetchUserScopedData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userRole, fetchUserScopedData, fetchOccupiedSlots, fetchCatalogs]);

  // ── Verificación periódica para liberar apartados vencidos (15 min) ─────────
  useEffect(() => {
    if (!isSupabaseConfigured || !userId) return;

    const interval = setInterval(async () => {
      const now = Date.now();
      const expired = appointments.filter(
        (a) => a.status === 'Pendiente anticipo' && a.expiresAt && now > a.expiresAt
      );
      if (expired.length === 0) return;

      const ids = expired.map((a) => a.id);
      await supabase.from('citas').update({ estado: 'Expirada' }).in('id', ids);
      fetchUserScopedData();
      fetchOccupiedSlots();
    }, 10000);

    return () => clearInterval(interval);
  }, [appointments, userId, fetchUserScopedData, fetchOccupiedSlots]);

  // ── Combinación de Recompensas del catálogo + progreso real del usuario ─────
  const rewards: RewardItem[] = useMemo(() => {
    return rawRewards.map((r: any) => {
      const ur = userRewardsMap[r.id];
      const tier = ur ? Number(ur.nivel_tier) || 1 : Number(r.nivel_tier) || 1;
      const baseGoal = Number(r.meta) || 1;
      const multiplier = r.tipo === 'visitas' ? Math.pow(1.6, tier - 1) : Math.pow(1.5, tier - 1);
      const goal = tier > 1 ? Math.round(baseGoal * multiplier) : baseGoal;
      const current = r.tipo === 'visitas' ? clientProfile.totalVisits : Math.round(clientProfile.totalSpent);
      const unlocked = current >= goal;
      const claimed = Boolean(ur?.canjeado) || tier > 1;

      return {
        id: r.id,
        icon: r.icono || '✦',
        title: r.titulo,
        description:
          tier > 1
            ? `${r.descripcion} (Nivel ${tier}: meta actualizada a ${goal} ${r.unidad})`
            : r.descripcion,
        type: r.tipo,
        category: r.categoria,
        serviceMatchId: r.servicio_match_id ?? undefined,
        goal,
        current,
        unit: r.unidad,
        unlocked,
        claimed,
        tierLevel: tier,
        active: r.activo !== false,
      };
    });
  }, [rawRewards, userRewardsMap, clientProfile.totalVisits, clientProfile.totalSpent]);

  // ── Acciones de Citas ───────────────────────────────────────────────────────
  const addAppointment = async (cita: NewAppointmentInput): Promise<string | null> => {
    if (!userId || !isSupabaseConfigured) return null;

    const newId = `apt-${Date.now()}`;
    const clientName = cita.client || clientProfile.name || 'Clienta';
    const matchedSrv = servicesCatalog.find(
      (s) => s.id === cita.serviceId || s.nombre.toLowerCase() === cita.service.toLowerCase()
    );
    const durationMin = cita.durationMin || matchedSrv?.duracionMin || 30;
    const depositAmount = cita.depositAmount ?? (matchedSrv?.requiresDeposit ? matchedSrv.depositAmount : 0);

    const { error } = await supabase.from('citas').insert({
      id: newId,
      cliente_id: userId,
      cliente_nombre: clientName,
      servicio_id: cita.serviceId || matchedSrv?.id || null,
      servicio_nombre: cita.service,
      fecha_cita: cita.isoDate,
      hora_cita: cita.time,
      duracion_min: durationMin,
      estado: cita.status,
      metodo_pago: cita.paymentMethod || 'efectivo',
      monto_anticipo: depositAmount,
      precio_total: cita.totalPrice ?? null,
      nota_pago: cita.paid ?? null,
      expira_en: cita.expiresAt ? new Date(cita.expiresAt).toISOString() : null,
      puede_cambiar_a_efectivo: Boolean(cita.canSwitchToCash),
      es_recompensa: Boolean(cita.isReward),
      nota_recompensa: cita.rewardNote ?? null,
      notas_cliente: cita.notes ?? null,
    });

    if (error) {
      console.warn('Error guardando cita en Supabase:', error.message);
      return null;
    }

    // Si el anticipo ya viene pagado al crearla, registrar en pagos_mercadopago
    if (cita.paymentMethod === 'mercadopago' && depositAmount > 0 && cita.status === 'Aceptada') {
      await supabase.from('pagos_mercadopago').insert({
        id: `pay-${Date.now()}`,
        cita_id: newId,
        cliente_id: userId,
        tipo_pago: 'anticipo',
        monto: depositAmount,
        estado: 'aprobado',
        mp_status_detail: cita.paid || 'Anticipo reportado vía Mercado Pago',
        fecha_pago: new Date().toISOString(),
      });
    }

    // Mensaje automático de confirmación en mensajes_chat
    await supabase.from('mensajes_chat').insert({
      id: `msg-${Date.now()}`,
      cliente_id: userId,
      remitente: 'bot',
      nombre_remitente: 'Confirmación de Cita',
      texto: `🗓️ ¡Cita registrada con éxito!\n\nServicio: ${cita.service}\nFecha: ${cita.date} · ${cita.time}\nEstado: ${cita.status}\n${cita.isReward ? '🎁 Beneficio de recompensa aplicado.\n' : ''}${cita.paid ? `Nota de pago: ${cita.paid}\n` : ''}`,
      tipo: 'confirmation',
      leido_cliente: false,
      leido_admin: false,
    });

    await Promise.all([fetchUserScopedData(), fetchOccupiedSlots()]);
    return newId;
  };

  const cancelAppointment = async (id: string) => {
    if (!isSupabaseConfigured) return;
    await supabase
      .from('citas')
      .update({ estado: 'Cancelada' })
      .eq('id', id);
    await Promise.all([fetchUserScopedData(), fetchOccupiedSlots()]);
  };

  const updateAppointmentStatus = async (
    id: string,
    status: AppointmentStatus,
    extraSpent?: number
  ) => {
    if (!isSupabaseConfigured) return;
    const target = appointments.find((a) => a.id === id);

    await supabase
      .from('citas')
      .update({ estado: status })
      .eq('id', id);

    // Si Yoss marca la cita como Finalizada, sumar visita y gasto al expediente de la clienta
    if (status === 'Finalizada' && target?.clientId && target.status !== 'Finalizada') {
      const { data: uRow } = await supabase
        .from('usuarios')
        .select('total_visitas, total_gastado')
        .eq('id', target.clientId)
        .maybeSingle();

      if (uRow) {
        const nextVisits = (Number(uRow.total_visitas) || 0) + 1;
        const addedAmount = extraSpent ?? (target.depositAmount || 0);
        const nextSpent = (Number(uRow.total_gastado) || 0) + addedAmount;
        const nextLevel = nextSpent >= 2000 ? 'Oro' : 'Plata';

        await supabase
          .from('usuarios')
          .update({
            total_visitas: nextVisits,
            total_gastado: nextSpent,
            nivel: nextLevel,
          })
          .eq('id', target.clientId);
      }
    }

    await Promise.all([fetchUserScopedData(), fetchOccupiedSlots()]);
  };

  const updateAppointmentPayment = async (id: string, paidNote?: string) => {
    if (!isSupabaseConfigured) return;
    const target = appointments.find((a) => a.id === id);
    const amount = target?.depositAmount || 300;
    const note = paidNote || `Anticipo Mercado Pago cubierto ($${amount} MXN)`;

    await supabase
      .from('citas')
      .update({
        estado: 'Aceptada',
        metodo_pago: 'mercadopago',
        nota_pago: note,
        expira_en: null,
        puede_cambiar_a_efectivo: false,
      })
      .eq('id', id);

    const ownerId = target?.clientId || userId;
    if (ownerId) {
      await supabase.from('pagos_mercadopago').insert({
        id: `pay-${Date.now()}`,
        cita_id: id,
        cliente_id: ownerId,
        tipo_pago: 'anticipo',
        monto: amount,
        estado: 'aprobado',
        mp_status_detail: note,
        fecha_pago: new Date().toISOString(),
      });

      await supabase.from('mensajes_chat').insert({
        id: `msg-${Date.now()}`,
        cliente_id: ownerId,
        remitente: 'bot',
        nombre_remitente: 'Confirmación de Anticipo',
        texto: `💳 ¡Anticipo de Mercado Pago registrado ($${amount} MXN)!\n\nTu cita ha quedado confirmada automáticamente. ¡Te esperamos en Yoss Beauty Salon!`,
        tipo: 'confirmation',
        leido_cliente: true,
        leido_admin: false,
      });
    }

    await Promise.all([fetchUserScopedData(), fetchOccupiedSlots()]);
  };

  const switchPaymentToCash = async (id: string) => {
    if (!isSupabaseConfigured) return;
    await supabase
      .from('citas')
      .update({
        estado: 'Aceptada',
        metodo_pago: 'efectivo',
        expira_en: null,
        puede_cambiar_a_efectivo: false,
        nota_pago: 'Pago en efectivo en salón al llegar',
      })
      .eq('id', id);
    await Promise.all([fetchUserScopedData(), fetchOccupiedSlots()]);
  };

  const expireAppointment = async (id: string) => {
    if (!isSupabaseConfigured) return;
    await supabase
      .from('citas')
      .update({ estado: 'Expirada' })
      .eq('id', id);
    await Promise.all([fetchUserScopedData(), fetchOccupiedSlots()]);
  };

  // ── Acciones de Catálogo (Admin) ────────────────────────────────────────────
  const saveServiceCatalog = async (
    item: Partial<ServiceCatalogItem> & { nombre: string; duracion: string; requiresDeposit: boolean }
  ) => {
    if (!isSupabaseConfigured) return;
    const id = item.id || `srv-${Date.now()}`;
    const parsedMin = parseInt(item.duracion.replace(/\D/g, ''), 10) || 30;
    const duracionMin = item.duracionMin || (item.duracion.toUpperCase().includes('H') ? parsedMin * 60 : parsedMin);

    await supabase.from('servicios').upsert(
      {
        id,
        nombre: item.nombre.trim(),
        duracion_texto: item.duracion.trim() || '30 MIN',
        duracion_min: duracionMin,
        icono: item.icon || '✂️',
        tags: item.tags || [],
        requiere_anticipo: item.requiresDeposit,
        monto_anticipo: item.requiresDeposit ? (item.depositAmount || 300) : 0,
        tiene_precio_fijo: Boolean(item.tienePrecioFijo),
        descripcion: item.descripcion || 'Servicio profesional en Yoss Beauty Salon.',
        activo: item.active !== false,
      },
      { onConflict: 'id' }
    );
    await fetchCatalogs();
  };

  const toggleServiceActive = async (id: string, active: boolean) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('servicios').update({ activo: active }).eq('id', id);
    await fetchCatalogs();
  };

  const saveProductCatalog = async (
    item: Partial<ProductCatalogItem> & { name: string; price: number }
  ) => {
    if (!isSupabaseConfigured) return;
    const id = item.id || `prod-${Date.now()}`;
    await supabase.from('productos').upsert(
      {
        id,
        marca: item.brand?.trim() || 'Yoss Beauty Salon',
        nombre: item.name.trim(),
        precio: item.price || 0,
        stock: item.stock !== false,
        imagen_url: item.image ?? null,
        descripcion: item.description ?? null,
        activo: item.active !== false,
      },
      { onConflict: 'id' }
    );
    await fetchCatalogs();
  };

  const toggleProductStock = async (id: string, stock: boolean) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('productos').update({ stock }).eq('id', id);
    await fetchCatalogs();
  };

  // ── Acciones de Favoritos ───────────────────────────────────────────────────
  const toggleFavService = async (id: string) => {
    if (!userId || !isSupabaseConfigured) return;
    const exists = favServices.has(id);
    setFavServices((prev) => {
      const next = new Set(prev);
      if (exists) next.delete(id);
      else next.add(id);
      return next;
    });

    if (exists) {
      const { error } = await supabase
        .from('favoritos')
        .delete()
        .eq('usuario_id', userId)
        .eq('tipo_item', 'servicio')
        .eq('item_id', id);
      if (error) console.warn('Error eliminando servicio favorito:', error.message);
    } else {
      const { error } = await supabase.from('favoritos').insert({
        usuario_id: userId,
        tipo_item: 'servicio',
        item_id: id,
      });
      if (error) console.warn('Error guardando servicio favorito:', error.message);
    }
  };

  const toggleFavProduct = async (id: string) => {
    if (!userId || !isSupabaseConfigured) return;
    const exists = favProducts.has(id);
    setFavProducts((prev) => {
      const next = new Set(prev);
      if (exists) next.delete(id);
      else next.add(id);
      return next;
    });

    if (exists) {
      const { error } = await supabase
        .from('favoritos')
        .delete()
        .eq('usuario_id', userId)
        .eq('tipo_item', 'producto')
        .eq('item_id', id);
      if (error) console.warn('Error eliminando producto favorito:', error.message);
    } else {
      const { error } = await supabase.from('favoritos').insert({
        usuario_id: userId,
        tipo_item: 'producto',
        item_id: id,
      });
      if (error) console.warn('Error guardando producto favorito:', error.message);
    }
  };

  const isFavService = (id: string) => favServices.has(id);
  const isFavProduct = (id: string) => favProducts.has(id);

  // ── Acciones de Recompensas ─────────────────────────────────────────────────
  const claimReward = async (rewardId: string) => {
    const target = rewards.find((r) => r.id === rewardId);
    if (!target || !userId || !isSupabaseConfigured) {
      return { success: false, isService: false, isProduct: false };
    }

    const nextTier = (target.tierLevel || 1) + 1;
    await supabase.from('recompensas_usuario').upsert(
      {
        usuario_id: userId,
        recompensa_id: rewardId,
        progreso_actual: target.current,
        desbloqueado: false,
        canjeado: true,
        canjeado_en: new Date().toISOString(),
        nivel_tier: nextTier,
        actualizado_en: new Date().toISOString(),
      },
      { onConflict: 'usuario_id,recompensa_id' }
    );

    await supabase.from('mensajes_chat').insert({
      id: `msg-${Date.now()}`,
      cliente_id: userId,
      remitente: 'bot',
      nombre_remitente: 'Club Yoss Recompensas',
      texto: `🎉 ¡Felicidades ${clientProfile.name}! Has canjeado tu recompensa: "${target.title}".\n\nTu meta ha subido a Nivel ${nextTier} para darte más beneficios exclusivos en tus próximas visitas.`,
      tipo: 'reward',
      leido_cliente: false,
      leido_admin: false,
    });

    await fetchUserScopedData();

    return {
      success: true,
      isService: target.category === 'servicio',
      serviceName: target.title,
      isProduct: target.category === 'producto',
    };
  };

  const saveRewardCatalog = async (reward: {
    id?: string;
    icon: string;
    title: string;
    description: string;
    type: 'visitas' | 'gasto';
    goal: number;
  }) => {
    if (!isSupabaseConfigured) return;
    const id = reward.id || `r${Date.now()}`;
    await supabase.from('recompensas').upsert(
      {
        id,
        icono: reward.icon,
        titulo: reward.title.trim(),
        descripcion: reward.description.trim() || 'Beneficio especial Club Yoss',
        tipo: reward.type,
        categoria: 'servicio',
        meta: reward.goal,
        unidad: reward.type === 'visitas' ? 'visitas' : 'MXN en compras',
        activo: true,
      },
      { onConflict: 'id' }
    );
    await fetchCatalogs();
  };

  const toggleRewardActive = async (id: string, active: boolean) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('recompensas').update({ activo: active }).eq('id', id);
    await fetchCatalogs();
  };

  const deleteRewardCatalog = async (id: string) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('recompensas').delete().eq('id', id);
    await fetchCatalogs();
  };

  // ── Acciones de Chat (Actualización optimista + persistencia Supabase) ──────
  const sendMessageAsClient = async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText || !userId || !isSupabaseConfigured) return;

    const nowTs = Date.now();
    const clientMsgId = `msg-${nowTs}-c`;
    const nowTime = formatTimeHHMM();

    const optimisticClientMsg: ChatMessage = {
      id: clientMsgId,
      clientId: userId,
      sender: 'cliente',
      senderName: clientProfile.name || 'Clienta',
      text: cleanText,
      timestamp: nowTime,
      type: 'chat',
      readByClient: true,
      readByAdmin: false,
    };

    // Respuesta automática FAQ del Asistente Yoss
    const lower = cleanText.toLowerCase();
    let botReply = '';
    let mapUrl: string | undefined;
    let mapAddress: string | undefined;
    let mapTitle: string | undefined;
    let paymentUrl: string | undefined;
    let paymentTitle: string | undefined;

    if (
      lower.includes('horario') ||
      lower.includes('hora') ||
      lower.includes('abre') ||
      lower.includes('cierra') ||
      lower.includes('dias') ||
      lower.includes('días')
    ) {
      botReply =
        '🕒 Horario de atención de Yoss Beauty Salon:\n\n' +
        '• Lunes a Viernes:\n' +
        '  11:00 am – 2:00 pm  y  4:00 pm – 7:00 pm\n\n' +
        '• Sábados:\n' +
        '  11:00 am – 6:00 pm (horario corrido)\n\n' +
        '• Domingos:\n' +
        '  Cerrado (descanso familiar)';
    } else if (
      lower.includes('ubicacion') ||
      lower.includes('ubicación') ||
      lower.includes('donde') ||
      lower.includes('dónde') ||
      lower.includes('dirección') ||
      lower.includes('direccion') ||
      lower.includes('llegar') ||
      lower.includes('mapa')
    ) {
      botReply =
        '📍 Nuestra ubicación:\n' +
        'Cueramo, Gomez 60154, Uruapan, Mich.\n\n' +
        'Toca la tarjeta de mapa interactivo a continuación para abrir la ruta en Google Maps:';
      mapUrl = 'https://maps.app.goo.gl/gjva8goQK7GQSpqQ6';
      mapAddress = 'Cueramo, Gomez 60154, Uruapan, Mich.';
      mapTitle = 'Yoss Beauty Salon · Uruapan';
    } else if (
      lower.includes('anticipo') ||
      lower.includes('deposito') ||
      lower.includes('depósito') ||
      lower.includes('mercado pago') ||
      lower.includes('mercadopago') ||
      lower.includes('pago') ||
      lower.includes('transferencia')
    ) {
      botReply =
        '💳 Anticipos con Mercado Pago:\n\n' +
        'Los servicios largos (como Colorimetría, Balayage, Mechas y Alaciados Progresivos) requieren un anticipo para asegurar tu cita y preparar tus fórmulas personalizadas.\n\n' +
        '💙 Puedes pagarlo mediante Mercado Pago (Tarjeta, SPEI, Saldo o OXXO).';
      paymentUrl = 'https://www.mercadopago.com.mx';
      paymentTitle = 'Pagar anticipo con Mercado Pago';
    } else if (lower.includes('recompensa') || lower.includes('punto') || lower.includes('club')) {
      botReply = `✦ Actualmente estás en Nivel ${clientProfile.level} con ${clientProfile.totalVisits} visitas y $${clientProfile.totalSpent.toLocaleString()} MXN acumulados. Puedes ver tus beneficios en la pestaña central "Club".`;
    } else if (lower.includes('cancela') || lower.includes('cancelar')) {
      botReply = '⚠️ Recuerda que acumular 3 inasistencias suspende la cuenta. Si necesitas mover tu fecha, avisa con 24h de anticipación.';
    } else {
      botReply = '✨ Hemos entregado tu mensaje a Yoss. En un momento te responderá directamente aquí.';
    }

    const botMsgId = `msg-${nowTs + 1}-b`;
    const optimisticBotMsg: ChatMessage = {
      id: botMsgId,
      clientId: userId,
      sender: 'bot',
      senderName: 'Asistente Yoss',
      text: botReply,
      timestamp: nowTime,
      type: 'chat',
      readByClient: true,
      readByAdmin: true,
      mapUrl,
      mapAddress,
      mapTitle,
      paymentUrl,
      paymentTitle,
    };

    // Mostrar al instante en la UI
    setMessages((prev) => [...prev, optimisticClientMsg, optimisticBotMsg]);

    // Persistir en Supabase en un solo lote con timestamps ordenados
    const { error: errBatch } = await supabase.from('mensajes_chat').insert([
      {
        id: clientMsgId,
        cliente_id: userId,
        remitente: 'cliente',
        nombre_remitente: clientProfile.name || 'Clienta',
        texto: cleanText,
        tipo: 'chat',
        leido_cliente: true,
        leido_admin: false,
        creado_en: new Date(nowTs).toISOString(),
      },
      {
        id: botMsgId,
        cliente_id: userId,
        remitente: 'bot',
        nombre_remitente: 'Asistente Yoss',
        texto: botReply,
        tipo: 'chat',
        leido_cliente: true,
        leido_admin: true,
        map_url: mapUrl ?? null,
        map_address: mapAddress ?? null,
        map_title: mapTitle ?? null,
        payment_url: paymentUrl ?? null,
        payment_title: paymentTitle ?? null,
        creado_en: new Date(nowTs + 50).toISOString(),
      },
    ]);
    if (errBatch) console.warn('Error guardando mensajes del chat:', errBatch.message);
  };

  const sendMessageAsAdmin = async (clientId: string, text: string) => {
    const cleanText = text.trim();
    if (!cleanText || !clientId || !isSupabaseConfigured) return;

    const msgId = `msg-${Date.now()}-y`;
    const optimisticAdminMsg: ChatMessage = {
      id: msgId,
      clientId,
      sender: 'yoss',
      senderName: 'Yoss (Dueña)',
      text: cleanText,
      timestamp: formatTimeHHMM(),
      type: 'chat',
      readByClient: false,
      readByAdmin: true,
    };

    setMessages((prev) => [...prev, optimisticAdminMsg]);

    const { error } = await supabase.from('mensajes_chat').insert({
      id: msgId,
      cliente_id: clientId,
      remitente: 'yoss',
      nombre_remitente: 'Yoss (Dueña)',
      texto: cleanText,
      tipo: 'chat',
      leido_cliente: false,
      leido_admin: true,
    });
    if (error) console.warn('Error enviando mensaje de admin:', error.message);
  };

  const markClientMessagesAsRead = async () => {
    if (!userId || !isSupabaseConfigured) return;
    const hasUnread = messages.some((m) => !m.readByClient && m.sender !== 'cliente');
    if (!hasUnread) return;
    setMessages((prev) => prev.map((m) => (!m.readByClient ? { ...m, readByClient: true } : m)));
    await supabase
      .from('mensajes_chat')
      .update({ leido_cliente: true })
      .eq('cliente_id', userId)
      .eq('leido_cliente', false);
  };

  const markAdminMessagesAsRead = async (clientId: string) => {
    if (!clientId || !isSupabaseConfigured) return;
    const hasUnread = messages.some((m) => m.clientId === clientId && !m.readByAdmin && m.sender === 'cliente');
    if (!hasUnread) return;
    setMessages((prev) =>
      prev.map((m) => (m.clientId === clientId && !m.readByAdmin ? { ...m, readByAdmin: true } : m))
    );
    await supabase
      .from('mensajes_chat')
      .update({ leido_admin: true })
      .eq('cliente_id', clientId)
      .eq('leido_admin', false);
  };

  const unreadClientCount = useMemo(
    () => messages.filter((m) => !m.readByClient && m.sender !== 'cliente').length,
    [messages]
  );

  const unreadAdminCount = useMemo(
    () => messages.filter((m) => !m.readByAdmin && m.sender === 'cliente').length,
    [messages]
  );

  // ── Acciones de Perfil ──────────────────────────────────────────────────────
  const updateClientProfile = async (updates: Partial<ClientProfile>) => {
    if (!userId || !isSupabaseConfigured) return;
    setClientProfile((prev) => ({ ...prev, ...updates }));

    const payload: Record<string, any> = {};
    if (updates.name !== undefined) payload.nombre = updates.name.trim() || clientProfile.name;
    if (updates.phone !== undefined) payload.telefono = updates.phone.trim() || null;
    if (updates.allergies !== undefined) payload.alergias = updates.allergies.trim() || 'Ninguna registrada';
    if (updates.hairProfile !== undefined) payload.perfil_cabello = updates.hairProfile.trim() || 'Por definir';

    if (Object.keys(payload).length === 0) return;

    const { error } = await supabase
      .from('usuarios')
      .update(payload)
      .eq('id', userId);
    if (error) console.warn('Error actualizando perfil:', error.message);
  };

  const updateAvatar = async (uri?: string, presetId?: string, base64Data?: string) => {
    if (!userId || !isSupabaseConfigured) return;

    let finalUri = uri;

    // Si la foto viene de cámara o galería local, subirla a Supabase Storage (o Data URI fallback)
    // para que se guarde en la base de datos y sea visible en todos los dispositivos
    if (base64Data && !presetId) {
      try {
        const filePath = `${userId}/avatar.jpg`;
        const fileBuffer = base64ToArrayBuffer(base64Data);
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(filePath, fileBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (!uploadErr) {
          const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(filePath);
          if (pubData?.publicUrl) {
            finalUri = `${pubData.publicUrl}?t=${Date.now()}`;
          }
        } else {
          console.warn('No se pudo subir a Storage, usando Data URI en usuarios:', uploadErr.message);
          finalUri = `data:image/jpeg;base64,${base64Data}`;
        }
      } catch (e) {
        console.warn('Error procesando imagen de perfil:', e);
        finalUri = `data:image/jpeg;base64,${base64Data}`;
      }
    }

    setClientProfile((prev) => ({
      ...prev,
      avatarUri: finalUri,
      avatarPresetId: presetId,
    }));

    const { error } = await supabase
      .from('usuarios')
      .update({
        avatar_uri: finalUri ?? null,
        avatar_preset_id: presetId ?? null,
      })
      .eq('id', userId);
    if (error) console.warn('Error guardando avatar en usuarios:', error.message);
  };

  const removeAvatar = async () => {
    if (!userId || !isSupabaseConfigured) return;
    setClientProfile((prev) => {
      const copy = { ...prev };
      delete copy.avatarUri;
      delete copy.avatarPresetId;
      return copy;
    });
    const { error } = await supabase
      .from('usuarios')
      .update({ avatar_uri: null, avatar_preset_id: null })
      .eq('id', userId);
    if (error) console.warn('Error eliminando avatar:', error.message);
  };

  return (
    <SalonContext.Provider
      value={{
        isLoadingData,
        refreshAllData,
        servicesCatalog,
        productsCatalog,
        salonHours,
        saveServiceCatalog,
        toggleServiceActive,
        saveProductCatalog,
        toggleProductStock,
        appointments,
        occupiedSlots,
        mpPayments,
        addAppointment,
        cancelAppointment,
        updateAppointmentStatus,
        updateAppointmentPayment,
        switchPaymentToCash,
        expireAppointment,
        favServices,
        favProducts,
        toggleFavService,
        toggleFavProduct,
        isFavService,
        isFavProduct,
        rewards,
        claimReward,
        saveRewardCatalog,
        toggleRewardActive,
        deleteRewardCatalog,
        messages,
        unreadClientCount,
        unreadAdminCount,
        sendMessageAsClient,
        sendMessageAsAdmin,
        markClientMessagesAsRead,
        markAdminMessagesAsRead,
        clientProfile,
        clientsList,
        updateClientProfile,
        updateAvatar,
        removeAvatar,
      }}
    >
      {children}
    </SalonContext.Provider>
  );
}

export function useSalon() {
  const context = useContext(SalonContext);
  if (!context) {
    throw new Error('useSalon debe ser usado dentro de un SalonProvider');
  }
  return context;
}
