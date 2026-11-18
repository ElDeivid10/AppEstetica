/**
 * MensajesAdminScreen.tsx
 * Bandeja de entrada de mensajes para la administradora (Yoss).
 * Dividida por perfiles de clientas, con acceso a su expediente capilar,
 * historial de dudas y respuesta directa en tiempo real.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { PageHeader, StatusPill, pageStyles as p } from '@/components/SalonUI';
import { useSalon, ChatMessage } from '@/context/SalonContext';
import { theme } from '@/constants/YossTheme';

const { colors, borderRadius, shadow, spacing } = theme;

// Clientas registradas en el sistema
interface ClientListItem {
  id: string;
  name: string;
  initials: string;
  phone: string;
  hair: string;
  allergies: string;
  lastService: string;
}

const CLIENT_LIST: ClientListItem[] = [
  {
    id: 'cli-ana',
    name: 'Ana López',
    initials: 'AL',
    phone: '55 1234 5678',
    hair: 'Ondulado · teñido · puntas secas',
    allergies: 'Ninguna registrada',
    lastService: 'Retoque de raíz',
  },
  {
    id: 'cli-lucia',
    name: 'Lucía Ramírez',
    initials: 'LR',
    phone: '55 9876 5432',
    hair: 'Ondulado · castaño oscuro · teñido',
    allergies: 'Sensibilidad a fragancias fuertes',
    lastService: 'Coloración completa',
  },
  {
    id: 'cli-mariana',
    name: 'Mariana Torres',
    initials: 'MT',
    phone: '55 5555 4321',
    hair: 'Lacio · fino · natural',
    allergies: 'Ninguna registrada',
    lastService: 'Corte en capas',
  },
  {
    id: 'cli-sofia',
    name: 'Sofía Morales',
    initials: 'SM',
    phone: '55 2222 3333',
    hair: 'Rizado · grueso · con mechas',
    allergies: 'Alergia conocida a látex',
    lastService: 'Keratina y sellado',
  },
];

export default function MensajesAdminScreen() {
  const { messages, sendMessageAsAdmin, markAdminMessagesAsRead } = useSalon();
  const [selectedClientId, setSelectedClientId] = useState('cli-ana');
  const [replyText, setReplyText] = useState('');
  const scrollRef = useRef<any>(null);

  const selectedClient = CLIENT_LIST.find(c => c.id === selectedClientId) ?? CLIENT_LIST[0];

  // Mensajes de la clienta seleccionada
  const clientMessages = messages.filter(m => m.clientId === selectedClientId);

  // Marcar como leídos al entrar
  useEffect(() => {
    markAdminMessagesAsRead(selectedClientId);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [selectedClientId, messages.length]);

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    sendMessageAsAdmin(selectedClientId, replyText);
    setReplyText('');
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.beige[50] }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={p.page} contentContainerStyle={[p.scroll, { paddingBottom: 16 }]} showsVerticalScrollIndicator={false}>
        <PageHeader
          eyebrow="Panel Administrador"
          title="Bandeja de Mensajes"
          subtitle="Atiende dudas, confirma anticipos y comunícate con cada clienta."
        />

        {/* ── Selector horizontal de Clientas ── */}
        <View style={s.clientsSection}>
          <Text style={s.sectionEyebrow}>PERFILES DE CLIENTAS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.clientsScroll}>
            {CLIENT_LIST.map(client => {
              const isSelected = selectedClientId === client.id;
              const unreadForThisClient = messages.filter(
                m => m.clientId === client.id && !m.readByAdmin && m.sender === 'cliente'
              ).length;

              return (
                <TouchableOpacity
                  key={client.id}
                  style={[s.clientCard, isSelected && s.clientCardActive]}
                  onPress={() => setSelectedClientId(client.id)}
                  activeOpacity={0.8}
                >
                  <View style={[s.clientAvatar, isSelected && s.clientAvatarActive]}>
                    <Text style={[s.clientInitials, isSelected && s.clientInitialsActive]}>
                      {client.initials}
                    </Text>
                    {unreadForThisClient > 0 && (
                      <View style={s.badgeNotification}>
                        <Text style={s.badgeNotificationText}>{unreadForThisClient}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.clientName, isSelected && s.clientNameActive]} numberOfLines={1}>
                    {client.name}
                  </Text>
                  <Text style={s.clientLastService} numberOfLines={1}>
                    {client.lastService}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Expediente rápido de la clienta seleccionada ── */}
        <View style={[p.card, s.expedienteSnippet]}>
          <View style={s.snippetTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.snippetName}>{selectedClient.name}</Text>
              <Text style={p.muted}>Tel: {selectedClient.phone}</Text>
            </View>
            <StatusPill label="Clienta Activa" tone="olive" />
          </View>
          <View style={s.snippetDetails}>
            <View style={s.snippetRow}>
              <Text style={s.snippetLabel}>PERFIL CAPILAR:</Text>
              <Text style={s.snippetValue}>{selectedClient.hair}</Text>
            </View>
            <View style={s.snippetRow}>
              <Text style={s.snippetLabel}>ALERGIAS:</Text>
              <Text style={[s.snippetValue, selectedClient.allergies !== 'Ninguna registrada' && { color: colors.status.error }]}>
                {selectedClient.allergies}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Ventana de Conversación ── */}
        <View style={[p.card, s.chatCard]}>
          <View style={s.chatHeader}>
            <Text style={s.chatHeaderTitle}>Conversación con {selectedClient.name}</Text>
            <Text style={s.chatHeaderCount}>{clientMessages.length} mensajes</Text>
          </View>

          <ScrollView
            ref={scrollRef}
            style={s.chatScroll}
            contentContainerStyle={s.chatScrollContent}
            nestedScrollEnabled
          >
            {clientMessages.length === 0 ? (
              <View style={s.emptyChat}>
                <Text style={s.emptyChatIcon}>💬</Text>
                <Text style={s.emptyChatText}>No hay mensajes registrados con esta clienta.</Text>
              </View>
            ) : (
              clientMessages.map(msg => {
                const isAdmin = msg.sender === 'yoss';
                const isClient = msg.sender === 'cliente';
                const isBot = msg.sender === 'bot';

                return (
                  <View
                    key={msg.id}
                    style={[
                      s.msgBubbleWrapper,
                      isAdmin ? s.msgAdminWrapper : isClient ? s.msgClientWrapper : s.msgBotWrapper,
                    ]}
                  >
                    <Text style={s.msgSenderLabel}>
                      {isAdmin ? 'Tú (Yoss)' : isClient ? selectedClient.name : 'Asistente Automatizado'}
                    </Text>
                    <View
                      style={[
                        s.msgBubble,
                        isAdmin && s.msgBubbleAdmin,
                        isClient && s.msgBubbleClient,
                        isBot && s.msgBubbleBot,
                      ]}
                    >
                      <Text
                        style={[
                          s.msgText,
                          isAdmin && s.msgTextAdmin,
                          isClient && s.msgTextClient,
                        ]}
                      >
                        {msg.text}
                      </Text>
                      <Text
                        style={[
                          s.msgTimestamp,
                          isAdmin && s.msgTimestampAdmin,
                        ]}
                      >
                        {msg.timestamp}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* ── Caja de Respuesta de Yoss ── */}
          <View style={s.replyBox}>
            <TextInput
              style={s.replyInput}
              placeholder={`Responder a ${selectedClient.name}...`}
              placeholderTextColor={colors.beige[400]}
              value={replyText}
              onChangeText={setReplyText}
              multiline
            />
            <TouchableOpacity
              style={[s.sendReplyBtn, !replyText.trim() && s.sendReplyBtnDisabled]}
              onPress={handleSendReply}
              disabled={!replyText.trim()}
              activeOpacity={0.8}
            >
              <Text style={s.sendReplyIcon}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  sectionEyebrow: {
    color: colors.primary[600],
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  clientsSection: { marginBottom: 12 },
  clientsScroll: { gap: 10, paddingRight: 8 },
  clientCard: {
    width: 100,
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    borderWidth: 1.5,
    borderColor: colors.beige[200],
    padding: 10,
    alignItems: 'center',
    gap: 4,
    ...shadow.card,
  },
  clientCardActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.beige[100],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  clientAvatarActive: { backgroundColor: colors.primary[500] },
  clientInitials: { color: colors.ink[800], fontSize: 13, fontWeight: '700' },
  clientInitialsActive: { color: colors.white },
  badgeNotification: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.status.error,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeNotificationText: { color: colors.white, fontSize: 9, fontWeight: '800' },
  clientName: { fontSize: 11, fontWeight: '700', color: colors.ink[800], textAlign: 'center' },
  clientNameActive: { color: colors.primary[700] },
  clientLastService: { fontSize: 9, color: colors.beige[500], textAlign: 'center' },

  // Snippet expediente
  expedienteSnippet: { gap: 8, backgroundColor: colors.white, borderColor: colors.primary[200] },
  snippetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  snippetName: { fontSize: 15, fontWeight: '700', color: colors.ink[800] },
  snippetDetails: { borderTopWidth: 1, borderTopColor: colors.beige[100], paddingTop: 8, gap: 4 },
  snippetRow: { flexDirection: 'row', gap: 6 },
  snippetLabel: { fontSize: 9, fontWeight: '700', color: colors.beige[500] },
  snippetValue: { fontSize: 11, color: colors.ink[700], flex: 1 },

  // Chat window
  chatCard: { gap: 12, padding: 0, overflow: 'hidden' },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.beige[100],
    borderBottomWidth: 1,
    borderBottomColor: colors.beige[200],
  },
  chatHeaderTitle: { fontSize: 13, fontWeight: '700', color: colors.ink[800] },
  chatHeaderCount: { fontSize: 10, color: colors.beige[500] },
  chatScroll: { height: 320, backgroundColor: colors.beige[50] },
  chatScrollContent: { padding: 14, gap: 10 },
  emptyChat: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  emptyChatIcon: { fontSize: 32 },
  emptyChatText: { fontSize: 12, color: colors.beige[400] },

  msgBubbleWrapper: { maxWidth: '82%', gap: 3 },
  msgAdminWrapper: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  msgClientWrapper: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  msgBotWrapper: { alignSelf: 'center', alignItems: 'center', maxWidth: '95%' },

  msgSenderLabel: { fontSize: 9, color: colors.beige[500], fontWeight: '600', marginLeft: 4 },
  msgBubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  msgBubbleAdmin: { backgroundColor: colors.primary[500], borderBottomRightRadius: 2 },
  msgBubbleClient: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.beige[200], borderBottomLeftRadius: 2 },
  msgBubbleBot: { backgroundColor: colors.beige[100], borderRadius: 10, paddingVertical: 6 },

  msgText: { fontSize: 12, color: colors.ink[800], lineHeight: 17 },
  msgTextAdmin: { color: colors.white },
  msgTextClient: { color: colors.ink[900] },
  msgTimestamp: { fontSize: 8, color: colors.beige[400], alignSelf: 'flex-end', marginTop: 3 },
  msgTimestampAdmin: { color: 'rgba(255,255,255,0.7)' },

  // Reply box
  replyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.beige[200],
  },
  replyInput: {
    flex: 1,
    backgroundColor: colors.beige[50],
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.beige[200],
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.ink[800],
    maxHeight: 80,
  },
  sendReplyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendReplyBtnDisabled: { backgroundColor: colors.beige[300] },
  sendReplyIcon: { color: colors.white, fontSize: 14, marginLeft: 2 },
});
