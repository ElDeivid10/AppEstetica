/**
 * ChatClienteModal.tsx
 * Bandeja de mensajes, recordatorios, notificaciones y chat interactivo para la clienta.
 *
 * Funcionalidades:
 * - Mensajes de bienvenida personalizados.
 * - Confirmaciones automáticas al agendar citas.
 * - Recordatorios de citas programadas.
 * - Preguntas rápidas frecuentes (horarios, ubicación, anticipos, recompensas).
 * - Envío de mensajes directos que llegan a la bandeja de la dueña (Yoss).
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSalon, ChatMessage } from '@/context/SalonContext';
import { theme } from '@/constants/YossTheme';

const { colors, borderRadius, shadow, spacing } = theme;

interface Props {
  visible: boolean;
  onClose: () => void;
}

const QUICK_QUESTIONS = [
  '🕒 Horarios del salón',
  '📍 Ubicación y cómo llegar',
  '💳 ¿Cómo funcionan los anticipos?',
  '✦ ¿Cuántos puntos de club tengo?',
  '⚠️ Política de cancelaciones',
];

export default function ChatClienteModal({ visible, onClose }: Props) {
  const { messages, sendMessageAsClient, markClientMessagesAsRead, clientProfile } = useSalon();
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<any>(null);

  // Marcar mensajes como leídos al abrir
  useEffect(() => {
    if (visible) {
      markClientMessagesAsRead();
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [visible, messages.length]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;
    if (!textToSend) setInputText('');
    await sendMessageAsClient(text);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* ── Encabezado ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.avatarBox}>
              <Text style={s.avatarIcon}>🌿</Text>
              <View style={s.onlineDot} />
            </View>
            <View>
              <Text style={s.headerTitle}>Asistente & Mensajes</Text>
              <Text style={s.headerSubtitle}>Yoss Beauty Salon · En línea</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.75}>
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* ── Preguntas Rápidas (Chips) ── */}
        <View style={s.chipsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsScroll}>
            {QUICK_QUESTIONS.map((q, idx) => (
              <TouchableOpacity
                key={idx}
                style={s.chip}
                onPress={() => handleSend(q.replace(/^[^\w\s¿]+/, '').trim())}
                activeOpacity={0.75}
              >
                <Text style={s.chipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Lista de Mensajes ── */}
        <ScrollView
          ref={scrollRef}
          style={s.messagesContainer}
          contentContainerStyle={s.messagesScroll}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((item: ChatMessage) => {
            const isClient = item.sender === 'cliente';
            const isYoss = item.sender === 'yoss';
            const isBot = item.sender === 'bot';

            return (
              <View
                key={item.id}
                style={[
                  s.messageWrapper,
                  isClient ? s.wrapperClient : s.wrapperSalon,
                ]}
              >
                {/* Remitente tag */}
                {!isClient && (
                  <View style={s.senderHeader}>
                    <Text style={[s.senderName, isYoss && s.senderNameYoss]}>
                      {item.senderName}
                    </Text>
                    {isYoss && (
                      <View style={s.yossBadge}>
                        <Text style={s.yossBadgeText}>DUEÑA</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Burbuja */}
                <View
                  style={[
                    s.bubble,
                    isClient && s.bubbleClient,
                    isYoss && s.bubbleYoss,
                    isBot && s.bubbleBot,
                  ]}
                >
                  <Text
                    style={[
                      s.messageText,
                      isClient && s.messageTextClient,
                      isYoss && s.messageTextYoss,
                    ]}
                  >
                    {item.text}
                  </Text>
                  <Text
                    style={[
                      s.timestamp,
                      isClient && s.timestampClient,
                      isYoss && s.timestampYoss,
                    ]}
                  >
                    {item.timestamp}
                  </Text>
                </View>

                {/* ── Tarjeta de Mapa Interactivo ── */}
                {!!item.mapUrl && (
                  <TouchableOpacity
                    style={s.mapCard}
                    onPress={() => Linking.openURL(item.mapUrl!)}
                    activeOpacity={0.85}
                  >
                    <View style={s.mapCardIconBox}>
                      <Text style={s.mapCardEmoji}>🗺️</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.mapCardTitle} numberOfLines={1}>
                        {item.mapTitle ?? 'Ver en Google Maps'}
                      </Text>
                      <Text style={s.mapCardAddress} numberOfLines={2}>
                        {item.mapAddress}
                      </Text>
                    </View>
                    <Text style={s.mapCardArrow}>→</Text>
                  </TouchableOpacity>
                )}

                {/* ── Botón Mercado Pago ── */}
                {!!item.paymentUrl && (
                  <TouchableOpacity
                    style={s.paymentBtn}
                    onPress={() => Linking.openURL(item.paymentUrl!)}
                    activeOpacity={0.85}
                  >
                    <Text style={s.paymentBtnIcon}>💙</Text>
                    <Text style={s.paymentBtnText}>
                      {item.paymentTitle ?? 'Pagar con Mercado Pago'}
                    </Text>
                    <Text style={s.paymentBtnArrow}>→</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* ── Barra de Entrada ── */}
        <View style={s.inputContainer}>
          <TextInput
            style={s.input}
            placeholder="Escribe tu mensaje o duda para Yoss..."
            placeholderTextColor={colors.beige[400]}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={400}
          />
          <TouchableOpacity
            style={[s.sendBtn, !inputText.trim() && s.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim()}
            activeOpacity={0.8}
          >
            <Text style={s.sendBtnIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.beige[50] },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.beige[200],
    ...shadow.card,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[50],
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarIcon: { fontSize: 22 },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.status.success,
    borderWidth: 2,
    borderColor: colors.white,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.ink[800] },
  headerSubtitle: { fontSize: 11, color: colors.primary[600], fontWeight: '500' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.beige[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: colors.ink[700], fontWeight: '700' },

  // Chips
  chipsSection: {
    paddingVertical: 10,
    backgroundColor: colors.beige[100],
    borderBottomWidth: 1,
    borderBottomColor: colors.beige[200],
  },
  chipsScroll: { paddingHorizontal: spacing.md, gap: 8 },
  chip: {
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.beige[200],
  },
  chipText: { fontSize: 11, color: colors.ink[800], fontWeight: '600' },

  // Messages
  messagesContainer: { flex: 1 },
  messagesScroll: { padding: spacing.md, gap: 12 },
  messageWrapper: { maxWidth: '82%', gap: 3 },
  wrapperClient: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  wrapperSalon: { alignSelf: 'flex-start', alignItems: 'flex-start' },

  senderHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 4, marginBottom: 2 },
  senderName: { fontSize: 10, color: colors.beige[500], fontWeight: '700' },
  senderNameYoss: { color: colors.primary[600] },
  yossBadge: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  yossBadgeText: { color: colors.white, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },

  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    ...shadow.card,
  },
  bubbleClient: {
    backgroundColor: colors.primary[500],
    borderBottomRightRadius: 4,
  },
  bubbleYoss: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary[400],
    borderBottomLeftRadius: 4,
  },
  bubbleBot: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.beige[200],
    borderBottomLeftRadius: 4,
  },

  messageText: { fontSize: 13, color: colors.ink[800], lineHeight: 18 },
  messageTextClient: { color: colors.white },
  messageTextYoss: { color: colors.ink[900] },

  timestamp: { fontSize: 9, color: colors.beige[400], alignSelf: 'flex-end', marginTop: 4 },
  timestampClient: { color: 'rgba(255,255,255,0.7)' },
  timestampYoss: { color: colors.primary[600] },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.beige[200],
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.beige[50],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.beige[200],
    paddingHorizontal: 16,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.ink[800],
    maxHeight: 90,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.button,
  },
  sendBtnDisabled: { backgroundColor: colors.beige[300] },
  sendBtnIcon: { color: colors.white, fontSize: 16, marginLeft: 2 },

  // ── Tarjeta de Mapa ──────────────────────────────────────────────────────────
  mapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#4CAF50',
    padding: 12,
    marginTop: 6,
    maxWidth: '90%',
    ...shadow.card,
  },
  mapCardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCardEmoji: { fontSize: 20 },
  mapCardTitle: { color: colors.ink[800], fontSize: 12, fontWeight: '700', marginBottom: 2 },
  mapCardAddress: { color: colors.ink[700], fontSize: 10, lineHeight: 14 },
  mapCardArrow: { color: '#4CAF50', fontSize: 16, fontWeight: '700' },

  // ── Botón Mercado Pago ───────────────────────────────────────────────────────
  paymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#009EE3',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    maxWidth: '90%',
    ...shadow.button,
  },
  paymentBtnIcon: { fontSize: 18 },
  paymentBtnText: { flex: 1, color: colors.white, fontSize: 12, fontWeight: '700' },
  paymentBtnArrow: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '700' },
});
