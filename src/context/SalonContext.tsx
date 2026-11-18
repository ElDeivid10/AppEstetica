/**
 * SalonContext.tsx
 * Estado global centralizado de Yoss Beauty Salon.
 *
 * Administra:
 *  - Citas (Cliente y Admin sincronizados)
 *  - Favoritos (Servicios y Productos compartidos entre Explorar, Servicios y Perfil)
 *  - Recompensas (Canjes de servicios con agendado, productos, aumento de umbrales)
 *  - Mensajería y Chatbot (Mensajes personalizados, recordatorios, dudas automáticas y chat bidireccional con Yoss)
 *  - Perfil del cliente y estadísticas
 */

import React, { createContext, useContext, useState, useMemo } from 'react';

// ── Tipos de Citas ─────────────────────────────────────────────────────────────
export interface AppointmentItem {
  id: string;
  client: string;
  service: string;
  date: string;       // Formato legible o ISO
  isoDate: string;    // YYYY-MM-DD
  time: string;
  status: 'Aceptada' | 'En proceso' | 'Solicitud' | 'Finalizada' | 'No asistió' | 'Pendiente anticipo';
  tone: 'olive' | 'amber' | 'red' | 'gray';
  detail: string;
  paid?: string;
  isReward?: boolean;
  rewardNote?: string;
}

// ── Tipos de Recompensas ───────────────────────────────────────────────────────
export interface RewardItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  type: 'visitas' | 'gasto';
  category: 'servicio' | 'producto';
  serviceMatchId?: string; // ID de servicio que aplica si es categoría servicio
  goal: number;
  current: number;
  unit: string;
  unlocked: boolean;
  claimed: boolean;
  tierLevel?: number; // Para subir de nivel al canjear
}

// ── Tipos de Mensajes ─────────────────────────────────────────────────────────
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
}

// ── Perfil del Cliente ────────────────────────────────────────────────────────
export interface ClientProfile {
  id: string;
  name: string;
  phone: string;
  allergies: string;
  hairProfile: string;
  totalSpent: number;
  totalVisits: number;
  level: string;
  nextLevel: string;
  nextLevelAt: number;
}

// ── Contexto Interface ────────────────────────────────────────────────────────
interface SalonContextType {
  // Citas
  appointments: AppointmentItem[];
  addAppointment: (cita: Omit<AppointmentItem, 'id'>) => string;
  cancelAppointment: (id: string) => void;

  // Favoritos
  favServices: Set<string>;
  favProducts: Set<string>;
  toggleFavService: (id: string) => void;
  toggleFavProduct: (id: string) => void;
  isFavService: (id: string) => boolean;
  isFavProduct: (id: string) => boolean;

  // Recompensas
  rewards: RewardItem[];
  claimReward: (rewardId: string) => { success: boolean; isService: boolean; serviceName?: string; isProduct: boolean };

  // Chat y Notificaciones
  messages: ChatMessage[];
  unreadClientCount: number;
  unreadAdminCount: number;
  sendMessageAsClient: (text: string) => void;
  sendMessageAsAdmin: (clientId: string, text: string) => void;
  markClientMessagesAsRead: () => void;
  markAdminMessagesAsRead: (clientId: string) => void;

  // Perfil
  clientProfile: ClientProfile;
  updateClientProfile: (updates: Partial<ClientProfile>) => void;
}

const SalonContext = createContext<SalonContextType | null>(null);

// ── DATOS INICIALES ───────────────────────────────────────────────────────────
const INITIAL_APPOINTMENTS: AppointmentItem[] = [
  {
    id: 'apt-1',
    client: 'Ana López',
    service: 'Retoque de raíz',
    date: 'Mié, 22 oct',
    isoDate: '2026-10-22',
    time: '11:00',
    status: 'Aceptada',
    tone: 'olive',
    detail: 'Confirmada por Yoss Beauty Salon',
    paid: 'Anticipo $300 cubierto',
  },
  {
    id: 'apt-2',
    client: 'Ana López',
    service: 'Diseño de ceja',
    date: 'Vie, 24 oct',
    isoDate: '2026-10-24',
    time: '16:30',
    status: 'En proceso',
    tone: 'amber',
    detail: 'Tu solicitud está en revisión por Yoss',
    paid: 'Sin anticipo requerido',
  },
  {
    id: 'apt-3',
    client: 'Ana López',
    service: 'Tratamiento hidratante',
    date: 'Vie, 17 oct',
    isoDate: '2026-10-17',
    time: '16:00',
    status: 'Finalizada',
    tone: 'gray',
    detail: 'Atendida por Yoss — cabello nutrido con éxito',
    paid: 'Total $650 pagado',
  },
  {
    id: 'apt-4',
    client: 'Mariana Torres',
    service: 'Corte y peinado',
    date: 'Mié, 21 oct',
    isoDate: '2026-10-21',
    time: '09:30',
    status: 'Aceptada',
    tone: 'olive',
    detail: 'Confirmada',
    paid: 'Anticipo $300',
  },
  {
    id: 'apt-5',
    client: 'Lucía Ramírez',
    service: 'Coloración completa',
    date: 'Mié, 21 oct',
    isoDate: '2026-10-21',
    time: '12:00',
    status: 'Aceptada',
    tone: 'olive',
    detail: 'Confirmada',
    paid: 'Anticipo $500',
  },
];

const INITIAL_REWARDS: RewardItem[] = [
  {
    id: 'r1',
    icon: '✂️',
    title: 'Corte de cabello gratis',
    description: 'Un corte profesional de dama o caballero sin costo para ti.',
    type: 'visitas',
    category: 'servicio',
    serviceMatchId: 'srv-001',
    goal: 10,
    current: 7,
    unit: 'visitas',
    unlocked: false,
    claimed: false,
    tierLevel: 1,
  },
  {
    id: 'r2',
    icon: '🧴',
    title: 'Producto capilar a elegir',
    description: 'Llévate un tratamiento o acondicionador del catálogo.',
    type: 'gasto',
    category: 'producto',
    goal: 2000,
    current: 1380,
    unit: 'MXN en compras',
    unlocked: false,
    claimed: false,
    tierLevel: 1,
  },
  {
    id: 'r3',
    icon: '✨',
    title: 'Tratamiento capilar gratis',
    description: 'Sesión de hidratación profunda o mascarilla reconstructora.',
    type: 'gasto',
    category: 'servicio',
    serviceMatchId: 'srv-006',
    goal: 3500,
    current: 1380,
    unit: 'MXN en compras',
    unlocked: false,
    claimed: false,
    tierLevel: 1,
  },
  {
    id: 'r4',
    icon: '💅',
    title: 'Diseño de cejas gratis',
    description: 'Perfilado y diseño completo de cejas sin costo.',
    type: 'visitas',
    category: 'servicio',
    serviceMatchId: 'srv-005',
    goal: 5,
    current: 5,
    unit: 'visitas',
    unlocked: true,
    claimed: false,
    tierLevel: 1,
  },
  {
    id: 'r5',
    icon: '🎁',
    title: 'Kit de productos premium',
    description: 'Set completo de cuidado capilar valorado en $1,500.',
    type: 'gasto',
    category: 'producto',
    goal: 6000,
    current: 1380,
    unit: 'MXN en compras',
    unlocked: false,
    claimed: false,
    tierLevel: 1,
  },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    clientId: 'cli-ana',
    sender: 'bot',
    senderName: 'Asistente Yoss',
    text: '¡Hola Ana! ✨ Bienvenida a tu espacio personal en Yoss Beauty Salon. Aquí podrás consultar tus citas, resolver dudas y recibir recordatorios de tus tratamientos.',
    timestamp: '10:00 AM',
    type: 'welcome',
    readByClient: true,
    readByAdmin: true,
  },
  {
    id: 'msg-2',
    clientId: 'cli-ana',
    sender: 'yoss',
    senderName: 'Yoss (Dueña)',
    text: 'Hola Ana, un gusto tenerte por aquí. Si tienes alguna duda sobre tu próximo retoque o deseas agregar un tratamiento reconstructor, escríbeme directamente.',
    timestamp: '10:05 AM',
    type: 'chat',
    readByClient: true,
    readByAdmin: true,
  },
  {
    id: 'msg-3',
    clientId: 'cli-ana',
    sender: 'bot',
    senderName: 'Recordatorio',
    text: '🔔 Recordatorio: Tu cita de "Retoque de raíz" está agendada para el Miércoles 22 a las 11:00 AM. Te recomendamos llegar 5 minutos antes.',
    timestamp: 'Ayer 06:00 PM',
    type: 'reminder',
    readByClient: false,
    readByAdmin: true,
  },
];

export function SalonProvider({ children }: { children: React.ReactNode }) {
  // Citas
  const [appointments, setAppointments] = useState<AppointmentItem[]>(INITIAL_APPOINTMENTS);

  // Favoritos
  const [favServices, setFavServices] = useState<Set<string>>(new Set(['s1', 's3', 'srv-001']));
  const [favProducts, setFavProducts] = useState<Set<string>>(new Set(['p1', 'p3']));

  // Recompensas
  const [rewards, setRewards] = useState<RewardItem[]>(INITIAL_REWARDS);

  // Mensajes
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);

  // Perfil
  const [clientProfile, setClientProfile] = useState<ClientProfile>({
    id: 'cli-ana',
    name: 'Ana López',
    phone: '55 1234 5678',
    allergies: 'Ninguna registrada',
    hairProfile: 'Cabello teñido · ondulado · cuidado de color',
    totalSpent: 1380,
    totalVisits: 7,
    level: 'Plata',
    nextLevel: 'Oro',
    nextLevelAt: 2000,
  });

  // ── Acciones de Citas ───────────────────────────────────────────────────────
  const addAppointment = (cita: Omit<AppointmentItem, 'id'>) => {
    const newId = `apt-${Date.now()}`;
    const newApt: AppointmentItem = { ...cita, id: newId };
    setAppointments(prev => [newApt, ...prev]);

    // Mensaje automático de confirmación en el chat del cliente
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const autoMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      clientId: clientProfile.id,
      sender: 'bot',
      senderName: 'Confirmación de Cita',
      text: `🗓️ ¡Cita solicitada con éxito!\n\nServicio: ${cita.service}\nFecha: ${cita.date} · ${cita.time}\nEstado: ${cita.status}\n${cita.isReward ? '🎁 Beneficio de recompensa aplicado.\n' : ''}${cita.paid ? `Nota de pago: ${cita.paid}\n` : ''}\nYoss ha recibido la notificación y confirmará tu espacio en breve.`,
      timestamp: timeStr,
      type: 'confirmation',
      readByClient: false,
      readByAdmin: false,
    };
    setMessages(prev => [...prev, autoMsg]);

    return newId;
  };

  const cancelAppointment = (id: string) => {
    setAppointments(prev =>
      prev.map(a => (a.id === id ? { ...a, status: 'No asistió', tone: 'red', detail: 'Cancelada por el cliente' } : a))
    );
  };

  // ── Acciones de Favoritos ───────────────────────────────────────────────────
  const toggleFavService = (id: string) => {
    setFavServices(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFavProduct = (id: string) => {
    setFavProducts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isFavService = (id: string) => favServices.has(id);
  const isFavProduct = (id: string) => favProducts.has(id);

  // ── Acciones de Recompensas ─────────────────────────────────────────────────
  const claimReward = (rewardId: string) => {
    const target = rewards.find(r => r.id === rewardId);
    if (!target) return { success: false, isService: false, isProduct: false };

    // Actualizamos la recompensa: si ya se desbloqueó, se reinicia con mayor umbral o queda marcada
    setRewards(prev =>
      prev.map(r => {
        if (r.id === rewardId) {
          const nextTier = (r.tierLevel || 1) + 1;
          const nextGoal = Math.round(r.goal * (r.type === 'visitas' ? 1.6 : 1.5));
          return {
            ...r,
            tierLevel: nextTier,
            goal: nextGoal,
            claimed: true,
            unlocked: r.current >= nextGoal,
            description: `${r.description} (Nivel ${nextTier}: meta aumentada a ${nextGoal} ${r.unit})`,
          };
        }
        return r;
      })
    );

    // Mensaje automático al chat
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const rewardMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      clientId: clientProfile.id,
      sender: 'bot',
      senderName: 'Club Yoss Recompensas',
      text: `🎉 ¡Felicidades ${clientProfile.name}! Has canjeado tu recompensa: "${target.title}".\n\nTu meta ha subido de nivel para darte más beneficios exclusivos en tus próximas visitas.`,
      timestamp: timeStr,
      type: 'reward',
      readByClient: false,
      readByAdmin: false,
    };
    setMessages(prev => [...prev, rewardMsg]);

    return {
      success: true,
      isService: target.category === 'servicio',
      serviceName: target.title,
      isProduct: target.category === 'producto',
    };
  };

  // ── Acciones de Chat ────────────────────────────────────────────────────────
  const sendMessageAsClient = (text: string) => {
    if (!text.trim()) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const clientMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      clientId: clientProfile.id,
      sender: 'cliente',
      senderName: clientProfile.name,
      text: text.trim(),
      timestamp: timeStr,
      type: 'chat',
      readByClient: true,
      readByAdmin: false,
    };

    setMessages(prev => [...prev, clientMsg]);

    // Lógica de auto-respuesta bot / FAQ inmediata para el cliente
    const lower = text.toLowerCase();
    let botReply = '';

    if (lower.includes('horario') || lower.includes('hora') || lower.includes('abre') || lower.includes('cierra')) {
      botReply = '🕒 Nuestro horario de atención es de Lunes a Sábado de 9:00 AM a 7:00 PM. Los domingos descansamos.';
    } else if (lower.includes('ubicacion') || lower.includes('ubicación') || lower.includes('donde') || lower.includes('dirección') || lower.includes('direccion')) {
      botReply = '📍 Estamos ubicados en Av. Principal #120, Col. Centro. ¡Contamos con estacionamiento para clientas!';
    } else if (lower.includes('anticipo') || lower.includes('deposito') || lower.includes('pago')) {
      botReply = '💳 Los servicios largos como Colorimetría y Alaciados requieren un anticipo para asegurar tu bloque de tiempo. Puedes acordarlo directamente con Yoss al agendar.';
    } else if (lower.includes('recompensa') || lower.includes('punto') || lower.includes('club')) {
      botReply = `✦ Actualmente estás en Nivel ${clientProfile.level} con ${clientProfile.totalVisits} visitas y $${clientProfile.totalSpent.toLocaleString()} acumulados. Puedes ver tus beneficios en la pestaña central "Club".`;
    } else if (lower.includes('cancela') || lower.includes('cancelar')) {
      botReply = '⚠️ Recuerda que acumular 3 cancelaciones suspende la cuenta. Si necesitas mover tu fecha, puedes avisar con 24h de anticipación.';
    } else {
      botReply = '✨ Hemos entregado tu mensaje a Yoss. En un momento te responderá directamente aquí.';
    }

    setTimeout(() => {
      const now2 = new Date();
      const timeStr2 = `${String(now2.getHours()).padStart(2, '0')}:${String(now2.getMinutes()).padStart(2, '0')}`;
      const replyMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        clientId: clientProfile.id,
        sender: 'bot',
        senderName: 'Asistente Yoss',
        text: botReply,
        timestamp: timeStr2,
        type: 'chat',
        readByClient: false,
        readByAdmin: true,
      };
      setMessages(prev => [...prev, replyMsg]);
    }, 600);
  };

  const sendMessageAsAdmin = (clientId: string, text: string) => {
    if (!text.trim()) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const adminMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      clientId,
      sender: 'yoss',
      senderName: 'Yoss (Dueña)',
      text: text.trim(),
      timestamp: timeStr,
      type: 'chat',
      readByClient: false,
      readByAdmin: true,
    };
    setMessages(prev => [...prev, adminMsg]);
  };

  const markClientMessagesAsRead = () => {
    setMessages(prev => prev.map(m => (!m.readByClient ? { ...m, readByClient: true } : m)));
  };

  const markAdminMessagesAsRead = (clientId: string) => {
    setMessages(prev => prev.map(m => (m.clientId === clientId && !m.readByAdmin ? { ...m, readByAdmin: true } : m)));
  };

  const unreadClientCount = useMemo(
    () => messages.filter(m => !m.readByClient && m.sender !== 'cliente').length,
    [messages]
  );

  const unreadAdminCount = useMemo(
    () => messages.filter(m => !m.readByAdmin && m.sender === 'cliente').length,
    [messages]
  );

  const updateClientProfile = (updates: Partial<ClientProfile>) => {
    setClientProfile(prev => ({ ...prev, ...updates }));
  };

  return (
    <SalonContext.Provider
      value={{
        appointments,
        addAppointment,
        cancelAppointment,
        favServices,
        favProducts,
        toggleFavService,
        toggleFavProduct,
        isFavService,
        isFavProduct,
        rewards,
        claimReward,
        messages,
        unreadClientCount,
        unreadAdminCount,
        sendMessageAsClient,
        sendMessageAsAdmin,
        markClientMessagesAsRead,
        markAdminMessagesAsRead,
        clientProfile,
        updateClientProfile,
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
