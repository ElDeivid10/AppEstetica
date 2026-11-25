/**
 * LoginScreen.tsx
 * Pantalla de inicio de sesión de Yoss Beauty Salon conectada a Supabase Auth.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFonts,
  CormorantGaramond_300Light,
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';

import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/services/supabase';
import { theme } from '@/constants/YossTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const { colors, fonts, borderRadius, shadow, spacing } = theme;

// ── Ícono de ojo minimalista ──────────────────────────────────────────────────
const EyeIcon = ({ open }: { open: boolean }) => (
  <View style={eye.container}>
    <View style={[eye.outer, open && eye.outerOpen]} />
    {open && <View style={eye.pupil} />}
    {!open && <View style={eye.slash} />}
  </View>
);

const eye = StyleSheet.create({
  container: { width: 22, height: 22, justifyContent: 'center', alignItems: 'center' },
  outer: {
    width: 18,
    height: 12,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.ink[700],
  },
  outerOpen: { borderColor: colors.primary[500] },
  pupil: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary[500],
  },
  slash: {
    position: 'absolute',
    width: 22,
    height: 1.5,
    backgroundColor: colors.ink[700],
    transform: [{ rotate: '-35deg' }],
  },
});

interface Props {
  onNavigateToRegister: () => void;
}

export default function LoginScreen({ onNavigateToRegister }: Props) {
  const { signIn, sendPasswordReset } = useAuth();
  const insets = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [idFocused, setIdFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Seguridad: Control de intentos fallidos
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Modal de recuperación de contraseña por correo (Supabase Auth)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const passwordRef = useRef<any>(null);

  const titleFont = fontsLoaded ? fonts.title : theme.fontFallback.title;
  const bodyFont = fontsLoaded ? fonts.body : theme.fontFallback.body;
  const mediumFont = fontsLoaded ? fonts.bodyMedium : theme.fontFallback.body;
  const semiBoldFont = fontsLoaded ? fonts.bodySemiBold : theme.fontFallback.body;

  useEffect(() => {
    let interval: any = null;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (lockoutTimer > 0) {
      setError(`Demasiados intentos fallidos. Espera ${lockoutTimer}s.`);
      triggerShake();
      return;
    }

    const cleanId = identifier.trim();
    const cleanPassword = password.trim();

    if (!cleanId || !cleanPassword) {
      setError('Por favor ingresa tu teléfono o correo y contraseña.');
      triggerShake();
      return;
    }

    if (!cleanId.includes('@') && cleanId.replace(/[^\d]/g, '').length < 3) {
      setError('Número de teléfono inválido.');
      triggerShake();
      return;
    }

    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    const res = await signIn(cleanId, cleanPassword);

    if (res.error) {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);

      if (attempts >= 5) {
        setLockoutTimer(30);
        setError('Acceso bloqueado por seguridad durante 30 segundos (5 intentos fallidos).');
      } else {
        setError(`${res.error} (Intento ${attempts} de 5)`);
      }
      triggerShake();
    } else {
      setFailedAttempts(0);
    }

    setIsLoading(false);
  };

  const handleSendResetEmail = async () => {
    const clean = recoveryEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setRecoveryError('Ingresa un correo electrónico válido.');
      return;
    }
    setRecoveryError('');
    setRecoveryLoading(true);
    const res = await sendPasswordReset(clean);
    setRecoveryLoading(false);

    if (res.error) {
      setRecoveryError(res.error);
      return;
    }

    setRecoverySent(true);
    setTimeout(() => {
      setShowRecoveryModal(false);
      setRecoverySent(false);
      setRecoveryEmail('');
      setSuccessMsg('Se envió un enlace de recuperación a tu correo electrónico.');
    }, 1500);
  };

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      <View style={s.topBand} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.kbView}
      >
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            {
              paddingTop: Math.max(insets.top + 18, Platform.OS === 'ios' ? 60 : 48),
              paddingBottom: Math.max(insets.bottom + 20, spacing.xl),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.centerContainer}>
            {/* ── Branding ── */}
            <View style={s.brand}>
              <View style={s.brandLine} />
              <Text style={[s.brandSub, { fontFamily: mediumFont }]}>
                ESTÉTICA & BELLEZA
              </Text>
              <Text style={[s.brandName, { fontFamily: titleFont }]}>
                Yoss Beauty
              </Text>
              <Text style={[s.brandTagline, { fontFamily: fontsLoaded ? fonts.titleLight : 'serif' }]}>
                Salon
              </Text>
            </View>

            {/* ── Formulario ── */}
            <Animated.View style={[s.form, { transform: [{ translateX: shakeAnim }] }]}>
              <Text style={[s.formTitle, { fontFamily: titleFont }]}>
                Bienvenida de vuelta
              </Text>
              <Text style={[s.formSub, { fontFamily: bodyFont }]}>
                Accede a tu cuenta para gestionar tus citas
              </Text>

              {!isSupabaseConfigured && (
                <View style={s.errorBox}>
                  <View style={s.errorDot} />
                  <Text style={[s.errorText, { fontFamily: mediumFont }]}>
                    Atención: esta compilación no tiene configuradas las variables de Supabase (EXPO_PUBLIC_SUPABASE_URL).
                  </Text>
                </View>
              )}

              {successMsg !== '' && (
                <View style={s.successBox}>
                  <Text style={s.successIcon}>✓</Text>
                  <Text style={[s.successText, { fontFamily: mediumFont }]}>{successMsg}</Text>
                </View>
              )}

              {error !== '' && (
                <View style={s.errorBox}>
                  <View style={s.errorDot} />
                  <Text style={[s.errorText, { fontFamily: mediumFont }]}>{error}</Text>
                </View>
              )}

              {/* Teléfono o Correo */}
              <View style={s.field}>
                <Text style={[s.label, { fontFamily: semiBoldFont }]}>Teléfono o Correo</Text>
                <View style={[s.inputRow, idFocused && s.inputRowFocused]}>
                  <TextInput
                    style={[s.input, { fontFamily: bodyFont }]}
                    placeholder="10 dígitos o tu@correo.com"
                    placeholderTextColor={colors.beige[400]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="username"
                    autoComplete="username"
                    returnKeyType="next"
                    value={identifier}
                    onChangeText={(t) => {
                      setIdentifier(t);
                      if (error) setError('');
                    }}
                    onFocus={() => setIdFocused(true)}
                    onBlur={() => setIdFocused(false)}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    accessible
                    accessibilityLabel="Teléfono o correo electrónico"
                  />
                </View>
              </View>

              {/* Contraseña */}
              <View style={s.field}>
                <Text style={[s.label, { fontFamily: semiBoldFont }]}>Contraseña</Text>
                <View style={[s.inputRow, passwordFocused && s.inputRowFocused]}>
                  <TextInput
                    ref={passwordRef}
                    style={[s.input, { fontFamily: bodyFont }]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.beige[400]}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    autoComplete="password"
                    returnKeyType="done"
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      if (error) setError('');
                    }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    onSubmitEditing={handleLogin}
                    accessible
                    accessibilityLabel="Contraseña"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessible
                    accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    <EyeIcon open={showPassword} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ¿Olvidaste tu contraseña? */}
              <TouchableOpacity
                style={s.forgotRow}
                onPress={() => {
                  setRecoveryError('');
                  setRecoverySent(false);
                  setShowRecoveryModal(true);
                }}
                accessible
                accessibilityLabel="Recuperar contraseña"
                activeOpacity={0.75}
              >
                <Text style={[s.forgotText, { fontFamily: mediumFont }]}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>

              {/* CTA Iniciar Sesión */}
              <TouchableOpacity
                style={[s.btn, (isLoading || lockoutTimer > 0) && s.btnDisabled]}
                onPress={handleLogin}
                activeOpacity={0.85}
                disabled={isLoading || lockoutTimer > 0}
                accessible
                accessibilityLabel="Iniciar sesión"
                accessibilityRole="button"
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={[s.btnText, { fontFamily: semiBoldFont }]}>
                    {lockoutTimer > 0 ? `Bloqueado (${lockoutTimer}s)` : 'Iniciar Sesión'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Divisor */}
              <View style={s.divider}>
                <View style={s.divLine} />
                <Text style={[s.divText, { fontFamily: bodyFont }]}>ó</Text>
                <View style={s.divLine} />
              </View>

              {/* Botón Crear Cuenta */}
              <TouchableOpacity
                style={s.outlineBtn}
                onPress={onNavigateToRegister}
                activeOpacity={0.78}
                accessible
                accessibilityLabel="Crear cuenta nueva"
                accessibilityRole="button"
              >
                <Text style={[s.outlineBtnText, { fontFamily: semiBoldFont }]}>
                  Crear una cuenta
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <Text style={[s.footer, { fontFamily: bodyFont }]}>
              © {new Date().getFullYear()} Yoss Beauty Salon · Seguridad y Cuidado
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── MODAL DE RECUPERACIÓN DE CONTRASEÑA ── */}
      <Modal
        visible={showRecoveryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRecoveryModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { fontFamily: titleFont }]}>
                Recuperar Contraseña
              </Text>
              <TouchableOpacity
                onPress={() => setShowRecoveryModal(false)}
                style={s.modalClose}
                activeOpacity={0.7}
              >
                <Text style={s.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {recoveryError !== '' && (
              <View style={s.errorBox}>
                <View style={s.errorDot} />
                <Text style={[s.errorText, { fontFamily: mediumFont }]}>{recoveryError}</Text>
              </View>
            )}

            <View style={s.stepContent}>
              <Text style={s.stepDesc}>
                Ingresa el correo electrónico con el que te registraste para enviarte un enlace seguro de restablecimiento. Si te registraste sin correo, solicita ayuda directamente con Yoss en el salón.
              </Text>
              <View style={s.field}>
                <Text style={[s.label, { fontFamily: semiBoldFont }]}>Correo Electrónico</Text>
                <View style={s.inputRow}>
                  <TextInput
                    style={[s.input, { fontFamily: bodyFont }]}
                    placeholder="tu@correo.com"
                    placeholderTextColor={colors.beige[400]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={recoveryEmail}
                    onChangeText={setRecoveryEmail}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[s.btn, recoveryLoading && s.btnDisabled]}
                onPress={handleSendResetEmail}
                disabled={recoveryLoading}
                activeOpacity={0.88}
              >
                {recoveryLoading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={[s.btnText, { fontFamily: semiBoldFont }]}>
                    {recoverySent ? '✓ Enlace enviado' : 'Enviar enlace de recuperación →'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.beige[50],
  },
  topBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.38,
    backgroundColor: colors.ink[800],
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  kbView: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  centerContainer: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  brand: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingBottom: spacing.xl,
  },
  brandLine: {
    width: 32,
    height: 1,
    backgroundColor: colors.primary[500],
    marginBottom: spacing.sm,
    opacity: 0.7,
    alignSelf: 'center',
  },
  brandSub: {
    fontSize: 10,
    color: colors.primary[300],
    letterSpacing: 3.5,
    marginBottom: 6,
    textAlign: 'center',
    alignSelf: 'center',
  },
  brandName: {
    fontSize: 44,
    color: colors.white,
    letterSpacing: 0.5,
    lineHeight: 48,
    textAlign: 'center',
    alignSelf: 'center',
  },
  brandTagline: {
    fontSize: 38,
    color: colors.primary[300],
    letterSpacing: 1,
    lineHeight: 40,
    marginTop: -4,
    textAlign: 'center',
    alignSelf: 'center',
  },
  form: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    ...shadow.elevated,
    borderWidth: 1,
    borderColor: colors.beige[200],
    width: '100%',
  },
  formTitle: {
    fontSize: 26,
    color: colors.ink[800],
    marginBottom: 4,
    textAlign: 'center',
  },
  formSub: {
    fontSize: 13,
    color: colors.ink[700],
    marginBottom: spacing.lg,
    lineHeight: 18,
    textAlign: 'center',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.status.successBg,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successIcon: { fontSize: 16, color: colors.status.success, fontWeight: '700' },
  successText: { flex: 1, fontSize: 12, color: colors.status.success, lineHeight: 17 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.status.errorBg,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 8,
  },
  errorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.status.error,
    marginTop: 5,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.status.error,
    lineHeight: 17,
  },
  field: { marginBottom: spacing.md },
  label: {
    fontSize: 11,
    color: colors.ink[800],
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.beige[200],
    borderRadius: borderRadius.sm,
    backgroundColor: colors.beige[50],
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 2,
    minHeight: 52,
  },
  inputRowFocused: {
    borderColor: colors.primary[500],
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.ink[800],
    padding: 0,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    marginBottom: spacing.lg,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    color: colors.primary[500],
    fontWeight: '600',
  },
  btn: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.button,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...shadow.button,
  },
  btnDisabled: { opacity: 0.65 },
  btnText: {
    color: colors.white,
    fontSize: 15,
    letterSpacing: 0.4,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: 12,
  },
  divLine: { flex: 1, height: 1, backgroundColor: colors.beige[200] },
  divText: { fontSize: 13, color: colors.beige[400] },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary[500],
    borderRadius: borderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.primary[50],
  },
  outlineBtnText: {
    fontSize: 15,
    color: colors.primary[600],
    letterSpacing: 0.3,
  },
  footer: {
    textAlign: 'center',
    color: colors.beige[400],
    fontSize: 11,
    marginTop: spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    ...shadow.elevated,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 22, color: colors.ink[800] },
  modalClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.beige[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { fontSize: 13, color: colors.ink[700], fontWeight: '700' },
  stepContent: { gap: 10 },
  stepDesc: { fontSize: 13, color: colors.ink[700], lineHeight: 19, marginBottom: 6 },
});
