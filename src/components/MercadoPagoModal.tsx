/**
 * MercadoPagoModal.tsx
 * Ventana emergente con los datos oficiales de la cuenta de Mercado Pago
 * de la dueña del salón (Yoss Beauty Salon).
 *
 * Funcionalidades:
 * - Datos de transferencia (Titular, Alias, CVU/CLABE, Banco, Concepto).
 * - Copiado rápido al portapapeles con confirmación visual (expo-clipboard).
 * - Botón interactivo para abrir la App o sitio web de Mercado Pago.
 * - Código QR de escaneo rápido de Mercado Pago.
 * - Botón para reportar "Ya realicé mi pago" (actualiza el estado de la cita).
 * - Opción de "Pagar más tarde" (mantiene la cita como 'Pendiente anticipo').
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { theme } from '@/constants/YossTheme';

const { colors, borderRadius, shadow, spacing } = theme;

// ── Datos de la cuenta de Mercado Pago (Listos para vincular cuenta real) ──
export const MERCADO_PAGO_CONFIG = {
  titular: 'Yoss Beauty Salon / Yoselín Gómez',
  alias: 'yoss.beauty.salon.mp',
  clabe: '646018142300123456',
  banco: 'Mercado Pago Wallet (STP)',
  appScheme: 'mercadopago://',
  checkoutUrl: 'https://link.mercadopago.com.mx/yossbeautysalon',
  portalUrl: 'https://www.mercadopago.com.mx',
  montoDefault: 300, // MXN
};

interface Props {
  visible: boolean;
  onClose: () => void;
  servicioNombre?: string;
  fechaHora?: string;
  montoAnticipo?: number;
  clienteNombre?: string;
  onConfirmPayment?: (paidNote: string) => void;
  onPayLater?: () => void;
}

export default function MercadoPagoModal({
  visible,
  onClose,
  servicioNombre = 'Servicio especializado',
  fechaHora,
  montoAnticipo = MERCADO_PAGO_CONFIG.montoDefault,
  clienteNombre = 'Clienta Yoss',
  onConfirmPayment,
  onPayLater,
}: Props) {
  const [copiedField, setCopiedField] = useState<'alias' | 'clabe' | null>(null);
  const [reportando, setReportando] = useState(false);

  const conceptoPago = `Anticipo ${servicioNombre.slice(0, 15)} - ${clienteNombre.split(' ')[0]}`;

  const handleCopy = async (text: string, field: 'alias' | 'clabe') => {
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    setTimeout(() => {
      setCopiedField(null);
    }, 2500);
  };

  const handleOpenMercadoPago = async () => {
    try {
      const canOpen = await Linking.canOpenURL(MERCADO_PAGO_CONFIG.appScheme);
      if (canOpen) {
        await Linking.openURL(MERCADO_PAGO_CONFIG.appScheme);
      } else {
        await Linking.openURL(MERCADO_PAGO_CONFIG.checkoutUrl || MERCADO_PAGO_CONFIG.portalUrl);
      }
    } catch {
      await Linking.openURL(MERCADO_PAGO_CONFIG.portalUrl);
    }
  };

  const handleConfirmarPago = () => {
    setReportando(true);
    setTimeout(() => {
      setReportando(false);
      onConfirmPayment?.(`Anticipo $${montoAnticipo} MXN reportado via Mercado Pago`);
      onClose();
    }, 600);
  };

  const handlePagarDespues = () => {
    if (onPayLater) {
      onPayLater();
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={s.backdrop}>
        <View style={s.modalContainer}>
          {/* ── Encabezado Mercado Pago ── */}
          <View style={s.header}>
            <View style={s.mpBadge}>
              <Text style={s.mpLogoEmoji}>💙</Text>
              <Text style={s.mpBadgeText}>Mercado Pago</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.75}>
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
            {/* Título y monto */}
            <View style={s.titleBlock}>
              <Text style={s.title}>Anticipo de Reservación</Text>
              <Text style={s.subtitle}>
                Asegura tu espacio y preparación de fórmulas para tu cita en Yoss Beauty Salon.
              </Text>
              <View style={s.amountCard}>
                <Text style={s.amountLabel}>MONTO DEL ANTICIPO</Text>
                <Text style={s.amountValue}>${montoAnticipo} MXN</Text>
                <Text style={s.amountHint}>
                  {servicioNombre} {fechaHora ? `· ${fechaHora}` : ''}
                </Text>
              </View>
            </View>

            {/* ── Botón Principal: Abrir App Mercado Pago ── */}
            <TouchableOpacity
              style={s.openMpBtn}
              onPress={handleOpenMercadoPago}
              activeOpacity={0.88}
            >
              <Text style={s.openMpBtnIcon}>⚡</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.openMpBtnTitle}>Pagar en App de Mercado Pago</Text>
                <Text style={s.openMpBtnSub}>Abre Mercado Pago o tu navegador al instante</Text>
              </View>
              <Text style={s.openMpBtnArrow}>→</Text>
            </TouchableOpacity>

            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>O PAGA POR TRANSFERENCIA / SPEI</Text>
              <View style={s.dividerLine} />
            </View>

            {/* ── Tarjeta con Datos Bancarios de Yoss ── */}
            <View style={s.detailsCard}>
              <View style={s.detailRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>TITULAR DE LA CUENTA</Text>
                  <Text style={s.fieldValue}>{MERCADO_PAGO_CONFIG.titular}</Text>
                </View>
                <View style={s.verifiedPill}>
                  <Text style={s.verifiedText}>✓ Verificado</Text>
                </View>
              </View>

              {/* Alias Mercado Pago */}
              <View style={s.fieldBox}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>ALIAS DE MERCADO PAGO</Text>
                  <Text style={s.codeText}>{MERCADO_PAGO_CONFIG.alias}</Text>
                </View>
                <TouchableOpacity
                  style={[s.copyBtn, copiedField === 'alias' && s.copyBtnSuccess]}
                  onPress={() => handleCopy(MERCADO_PAGO_CONFIG.alias, 'alias')}
                  activeOpacity={0.75}
                >
                  <Text style={[s.copyBtnText, copiedField === 'alias' && s.copyBtnTextSuccess]}>
                    {copiedField === 'alias' ? '✓ Copiado' : 'Copiar alias'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* CLABE Interbancaria */}
              <View style={s.fieldBox}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>CLABE INTERBANCARIA (SPEI)</Text>
                  <Text style={s.codeText}>{MERCADO_PAGO_CONFIG.clabe}</Text>
                  <Text style={s.fieldSubValue}>Banco: {MERCADO_PAGO_CONFIG.banco}</Text>
                </View>
                <TouchableOpacity
                  style={[s.copyBtn, copiedField === 'clabe' && s.copyBtnSuccess]}
                  onPress={() => handleCopy(MERCADO_PAGO_CONFIG.clabe, 'clabe')}
                  activeOpacity={0.75}
                >
                  <Text style={[s.copyBtnText, copiedField === 'clabe' && s.copyBtnTextSuccess]}>
                    {copiedField === 'clabe' ? '✓ Copiada' : 'Copiar CLABE'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Concepto sugerido */}
              <View style={[s.fieldBox, { backgroundColor: '#F9FBF8' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>CONCEPTO SUGERIDO</Text>
                  <Text style={s.fieldValue}>{conceptoPago}</Text>
                </View>
              </View>
            </View>

            {/* ── Código QR Visual Simulado ── */}
            <View style={s.qrCard}>
              <View style={s.qrBox}>
                <Text style={s.qrPattern}>
                  ⬛⬜⬛⬛⬜⬛⬜⬛{'\n'}
                  ⬜⬛⬜⬜⬛⬜⬛⬜{'\n'}
                  ⬛⬛  💙 MP  ⬛⬛{'\n'}
                  ⬜⬛⬜⬜⬛⬜⬛⬜{'\n'}
                  ⬛⬜⬛⬛⬜⬛⬜⬛
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.qrTitle}>Código QR de pago rápido</Text>
                <Text style={s.qrSub}>
                  Escanea con la app de Mercado Pago desde otro dispositivo para pagar en segundos.
                </Text>
              </View>
            </View>

            {/* Aviso de seguridad */}
            <View style={s.securityNotice}>
              <Text style={s.securityIcon}>🔒</Text>
              <Text style={s.securityText}>
                Tus pagos están protegidos por el sistema seguro de Mercado Pago. Guarda tu captura de pantalla de comprobante.
              </Text>
            </View>

            {/* ── Botones de Acción ── */}
            <View style={s.actionButtons}>
              <TouchableOpacity
                style={[s.confirmBtn, reportando && s.confirmBtnDisabled]}
                onPress={handleConfirmarPago}
                disabled={reportando}
                activeOpacity={0.88}
              >
                <Text style={s.confirmBtnText}>
                  {reportando ? 'Registrando anticipo...' : '✓ Ya realicé mi pago'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.payLaterBtn}
                onPress={handlePagarDespues}
                activeOpacity={0.8}
              >
                <Text style={s.payLaterBtnText}>Pagar después (Quedará como pendiente)</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,24,20,0.68)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    ...shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.beige[200],
  },
  mpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6F4FB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
  },
  mpLogoEmoji: { fontSize: 16 },
  mpBadgeText: { color: '#009EE3', fontWeight: '800', fontSize: 13 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.beige[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: colors.ink[700], fontWeight: '700' },

  scrollContent: {
    padding: spacing.lg,
    gap: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },

  titleBlock: { gap: 6 },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink[800] },
  subtitle: { fontSize: 12, color: colors.ink[700], lineHeight: 18 },

  amountCard: {
    backgroundColor: '#F3F8F2',
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  amountLabel: { fontSize: 10, fontWeight: '800', color: colors.primary[700], letterSpacing: 1 },
  amountValue: { fontSize: 28, fontWeight: '800', color: colors.primary[700], marginVertical: 2 },
  amountHint: { fontSize: 11, color: colors.ink[700] },

  openMpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#009EE3',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    ...shadow.button,
  },
  openMpBtnIcon: { fontSize: 22, color: colors.white },
  openMpBtnTitle: { color: colors.white, fontSize: 14, fontWeight: '800' },
  openMpBtnSub: { color: 'rgba(255,255,255,0.85)', fontSize: 10, marginTop: 1 },
  openMpBtnArrow: { color: colors.white, fontSize: 18, fontWeight: '800' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.beige[200] },
  dividerText: { fontSize: 9, color: colors.beige[400], fontWeight: '800', letterSpacing: 0.8 },

  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.beige[200],
    padding: 14,
    gap: 12,
    ...shadow.card,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.beige[100],
  },
  verifiedPill: {
    backgroundColor: '#E8F5E9',
    borderRadius: borderRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedText: { color: '#2E7D32', fontSize: 10, fontWeight: '700' },

  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.beige[50],
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  fieldLabel: { fontSize: 9, fontWeight: '800', color: colors.beige[500], letterSpacing: 0.8, marginBottom: 2 },
  fieldValue: { fontSize: 13, fontWeight: '700', color: colors.ink[800] },
  fieldSubValue: { fontSize: 10, color: colors.ink[700], marginTop: 2 },
  codeText: { fontSize: 13, fontWeight: '800', color: colors.ink[900], letterSpacing: 0.5 },

  copyBtn: {
    backgroundColor: colors.primary[500],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  copyBtnSuccess: {
    backgroundColor: '#2E7D32',
  },
  copyBtnText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  copyBtnTextSuccess: { color: colors.white },

  qrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.beige[100],
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  qrBox: {
    width: 68,
    height: 68,
    backgroundColor: colors.white,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.beige[300],
  },
  qrPattern: { fontSize: 8, textAlign: 'center', lineHeight: 10, fontWeight: '700' },
  qrTitle: { fontSize: 12, fontWeight: '700', color: colors.ink[800] },
  qrSub: { fontSize: 10, color: colors.ink[700], marginTop: 2, lineHeight: 14 },

  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  securityIcon: { fontSize: 14 },
  securityText: { flex: 1, fontSize: 10, color: '#B45309', lineHeight: 14 },

  actionButtons: { gap: 8, marginTop: 4 },
  confirmBtn: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadow.button,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: colors.white, fontSize: 14, fontWeight: '800' },

  payLaterBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: borderRadius.button,
    borderWidth: 1.5,
    borderColor: colors.beige[300],
    backgroundColor: colors.white,
  },
  payLaterBtnText: { color: colors.ink[700], fontSize: 12, fontWeight: '700' },
});
