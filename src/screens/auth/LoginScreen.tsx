import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
import { theme } from '@/constants/YossTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const { colors, fonts, borderRadius, shadow, spacing } = theme;

// ─── Ícono de ojo minimalista (SVG-like con View) ────────────────────────────
const EyeIcon = ({ open }: { open: boolean }) => (
  <View style={eye.container}>
    <View style={[eye.outer, open && eye.outerOpen]} />
    {open && <View style={eye.pupil} />}
    {!open && <View style={eye.slash} />}
  </View>
);

const eye = StyleSheet.create({
  container: { width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  outer: {
    width: 18, height: 12,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.ink[700],
  },
  outerOpen: { borderColor: colors.primary[500] },
  pupil: {
    position: 'absolute',
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary[500],
  },
  slash: {
    position: 'absolute',
    width: 22, height: 1.5,
    backgroundColor: colors.ink[700],
    transform: [{ rotate: '-35deg' }],
  },
});

// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  onNavigateToRegister: () => void;
}

export default function LoginScreen({ onNavigateToRegister }: Props) {
  const { setUserRole } = useAuth();

  const [fontsLoaded] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const passwordRef = useRef<TextInput>(null);

  const titleFont  = fontsLoaded ? fonts.title  : theme.fontFallback.title;
  const bodyFont   = fontsLoaded ? fonts.body    : theme.fontFallback.body;
  const mediumFont = fontsLoaded ? fonts.bodyMedium : theme.fontFallback.body;
  const semiBoldFont = fontsLoaded ? fonts.bodySemiBold : theme.fontFallback.body;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      setError('Completa tu teléfono y contraseña para continuar.');
      triggerShake();
      return;
    }
    setError('');
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 850));

    if (phone.trim() === '123' && password.trim() === 'admin') {
      setUserRole('admin');
    } else {
      setUserRole('cliente');
    }
    setIsLoading(false);
  };

  return (
    <View style={s.root}>
      <StatusBar style="dark" />

      {/* ── Banda decorativa superior ── */}
      <View style={s.topBand} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.kbView}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Branding ── */}
          <View style={s.brand}>
            {/* Línea fina decorativa */}
            <View style={s.brandLine} />
            <Text style={[s.brandSub, { fontFamily: mediumFont }]}>
              ESTÉTICA &amp; BELLEZA
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

            {/* ── Error ── */}
            {error !== '' && (
              <View style={s.errorBox}>
                <View style={s.errorDot} />
                <Text style={[s.errorText, { fontFamily: mediumFont }]}>{error}</Text>
              </View>
            )}

            {/* ── Campo Teléfono ── */}
            <View style={s.field}>
              <Text style={[s.label, { fontFamily: semiBoldFont }]}>Teléfono</Text>
              <View style={[s.inputRow, phoneFocused && s.inputRowFocused]}>
                <TextInput
                  style={[s.input, { fontFamily: bodyFont }]}
                  placeholder="10 dígitos"
                  placeholderTextColor={colors.beige[400]}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  value={phone}
                  onChangeText={(t) => { setPhone(t); if (error) setError(''); }}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  maxLength={15}
                  accessible
                  accessibilityLabel="Teléfono"
                />
              </View>
            </View>

            {/* ── Campo Contraseña ── */}
            <View style={s.field}>
              <Text style={[s.label, { fontFamily: semiBoldFont }]}>Contraseña</Text>
              <View style={[s.inputRow, passwordFocused && s.inputRowFocused]}>
                <TextInput
                  ref={passwordRef}
                  style={[s.input, { fontFamily: bodyFont }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.beige[400]}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  value={password}
                  onChangeText={(t) => { setPassword(t); if (error) setError(''); }}
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

            {/* ── ¿Olvidaste tu contraseña? ── */}
            <TouchableOpacity style={s.forgotRow} accessible accessibilityLabel="Recuperar contraseña">
              <Text style={[s.forgotText, { fontFamily: mediumFont }]}>
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>

            {/* ── CTA Principal ── */}
            <TouchableOpacity
              style={[s.btn, isLoading && s.btnDisabled]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={isLoading}
              accessible
              accessibilityLabel="Iniciar sesión"
              accessibilityRole="button"
            >
              {isLoading
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={[s.btnText, { fontFamily: semiBoldFont }]}>Iniciar Sesión</Text>
              }
            </TouchableOpacity>

            {/* ── Divisor ── */}
            <View style={s.divider}>
              <View style={s.divLine} />
              <Text style={[s.divText, { fontFamily: bodyFont }]}>ó</Text>
              <View style={s.divLine} />
            </View>

            {/* ── Botón Crear Cuenta ── */}
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

          {/* ── Footer ── */}
          <Text style={[s.footer, { fontFamily: bodyFont }]}>
            © {new Date().getFullYear()} Yoss Beauty Salon
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.beige[50],
  },

  // ── Banda superior ─────────────────────────────
  topBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.38,
    backgroundColor: colors.ink[800],
    borderBottomLeftRadius:  40,
    borderBottomRightRadius: 40,
  },

  // ── Layout ────────────────────────────────────
  kbView: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 64 : 52,
    paddingBottom: spacing.xl,
  },

  // ── Branding ──────────────────────────────────
  brand: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  brandLine: {
    width: 32,
    height: 1,
    backgroundColor: colors.primary[500],
    marginBottom: spacing.sm,
    opacity: 0.7,
  },
  brandSub: {
    fontSize: 10,
    color: colors.primary[300],
    letterSpacing: 3.5,
    marginBottom: 6,
  },
  brandName: {
    fontSize: 44,
    color: colors.white,
    letterSpacing: 0.5,
    lineHeight: 48,
  },
  brandTagline: {
    fontSize: 38,
    color: colors.primary[300],
    letterSpacing: 1,
    lineHeight: 40,
    marginTop: -4,
  },

  // ── Formulario (tarjeta) ───────────────────────
  form: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    ...shadow.elevated,
    borderWidth: 1,
    borderColor: colors.beige[200],
  },
  formTitle: {
    fontSize: 26,
    color: colors.ink[800],
    marginBottom: 4,
  },
  formSub: {
    fontSize: 13,
    color: colors.ink[700],
    marginBottom: spacing.lg,
    lineHeight: 18,
  },

  // ── Error ─────────────────────────────────────
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
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: colors.status.error,
    marginTop: 4,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.status.error,
    lineHeight: 18,
  },

  // ── Campos ────────────────────────────────────
  field: { marginBottom: spacing.md },
  label: {
    fontSize: 12,
    color: colors.ink[800],
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 7,
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

  // ── ¿Olvidaste? ───────────────────────────────
  forgotRow: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    marginBottom: spacing.lg,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    color: colors.primary[500],
  },

  // ── Botón principal ───────────────────────────
  btn: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.button,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...shadow.button,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: {
    color: colors.white,
    fontSize: 15,
    letterSpacing: 0.4,
  },

  // ── Divisor ───────────────────────────────────
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: 12,
  },
  divLine: { flex: 1, height: 1, backgroundColor: colors.beige[200] },
  divText: { fontSize: 13, color: colors.beige[400] },

  // ── Botón outline ─────────────────────────────
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

  // ── Footer ────────────────────────────────────
  footer: {
    textAlign: 'center',
    color: colors.beige[400],
    fontSize: 11,
    marginTop: spacing.xl,
  },
});
