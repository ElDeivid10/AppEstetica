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
  ActivityIndicator,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  CormorantGaramond_500Medium,
  CormorantGaramond_300Light,
} from '@expo-google-fonts/cormorant-garamond';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';

import { theme } from '@/constants/YossTheme';

const { colors, fonts, borderRadius, shadow, spacing } = theme;

// ─── Tipos de cabello para el selector ───────────────────────────────────────
const HAIR_TYPES = ['Liso', 'Ondulado', 'Rizado', 'Muy rizado', 'No sé aún'];

// ─── Componente Selector de opción ───────────────────────────────────────────
const PillSelector = ({
  options,
  selected,
  onSelect,
  fontFamily,
}: {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  fontFamily: string;
}) => (
  <View style={pill.row}>
    {options.map((opt) => {
      const active = selected === opt;
      return (
        <TouchableOpacity
          key={opt}
          style={[pill.chip, active && pill.chipActive]}
          onPress={() => onSelect(opt)}
          activeOpacity={0.75}
        >
          <Text style={[pill.label, active && pill.labelActive, { fontFamily }]}>
            {opt}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const pill = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: {
    borderWidth: 1,
    borderColor: colors.beige[200],
    borderRadius: borderRadius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.beige[50],
  },
  chipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  label: { fontSize: 13, color: colors.ink[700] },
  labelActive: { color: colors.white },
});

// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  onNavigateToLogin: () => void;
}

type Field = 'name' | 'lastName' | 'phone' | 'email' | 'password' | 'confirm';

export default function RegisterScreen({ onNavigateToLogin }: Props) {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  const titleFont    = fontsLoaded ? fonts.title        : 'serif';
  const bodyFont     = fontsLoaded ? fonts.body         : 'system-ui';
  const mediumFont   = fontsLoaded ? fonts.bodyMedium   : 'system-ui';
  const semiBoldFont = fontsLoaded ? fonts.bodySemiBold : 'system-ui';

  // ── Estado del formulario ──────────────────────
  const [form, setForm] = useState({
    name:        '',
    lastName:    '',
    phone:       '',
    email:       '',
    password:    '',
    confirm:     '',
    hairType:    '',
    allergies:   '',
  });
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [focused, setFocused]             = useState<Field | null>(null);
  const [errors, setErrors]               = useState<Partial<Record<Field, string>>>({});
  const [isLoading, setIsLoading]         = useState(false);
  const [success, setSuccess]             = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── Refs para avanzar con Return ──────────────
  const refs: Record<string, React.RefObject<TextInput | null>> = {
    lastName: useRef<TextInput>(null),
    phone:    useRef<TextInput>(null),
    email:    useRef<TextInput>(null),
    password: useRef<TextInput>(null),
    confirm:  useRef<TextInput>(null),
    allergies:useRef<TextInput>(null),
  };

  const set = (key: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const triggerShake = () =>
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 7,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -7, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 55, useNativeDriver: true }),
    ]).start();

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.name.trim())     e.name     = 'El nombre es requerido';
    if (!form.lastName.trim()) e.lastName = 'El apellido es requerido';
    if (!form.phone.trim() || form.phone.length < 10)
                               e.phone    = 'Ingresa un teléfono válido (10 dígitos)';
    if (!form.password || form.password.length < 6)
                               e.password = 'Mínimo 6 caracteres';
    if (form.password !== form.confirm)
                               e.confirm  = 'Las contraseñas no coinciden';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) { triggerShake(); return; }
    setIsLoading(true);
    // Simulación de registro (sin base de datos aún)
    await new Promise((r) => setTimeout(r, 1000));
    setIsLoading(false);
    setSuccess(true);
  };

  // ── Pantalla de éxito ─────────────────────────
  if (success) {
    return (
      <View style={s.successRoot}>
        <View style={s.successCard}>
          <View style={s.successMark}>
            <View style={s.checkStem} />
            <View style={s.checkKick} />
          </View>
          <Text style={[s.successTitle, { fontFamily: titleFont }]}>¡Registro exitoso!</Text>
          <Text style={[s.successBody, { fontFamily: bodyFont }]}>
            Tu cuenta ha sido creada. En cuanto vinculemos la base de datos podrás
            iniciar sesión con tu teléfono.
          </Text>
          <TouchableOpacity
            style={s.btn}
            onPress={onNavigateToLogin}
            activeOpacity={0.85}
          >
            <Text style={[s.btnText, { fontFamily: semiBoldFont }]}>Ir al inicio de sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  FORMULARIO
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* ── Banda superior ── */}
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
          {/* ── Cabecera ── */}
          <View style={s.header}>
            <TouchableOpacity style={s.backBtn} onPress={onNavigateToLogin}>
              <View style={s.backArrow} />
              <Text style={[s.backText, { fontFamily: mediumFont }]}>Iniciar sesión</Text>
            </TouchableOpacity>

            <Text style={[s.brandName, { fontFamily: titleFont }]}>Crea tu cuenta</Text>
            <Text style={[s.brandSub, { fontFamily: mediumFont }]}>
              YOSS BEAUTY SALON
            </Text>
          </View>

          {/* ── Tarjeta formulario ── */}
          <Animated.View style={[s.card, { transform: [{ translateX: shakeAnim }] }]}>

            {/* ── Sección: Datos Personales ── */}
            <SectionTitle label="Datos personales" fontFamily={semiBoldFont} />

            <View style={s.row}>
              <View style={[s.field, { flex: 1 }]}>
                <FieldLabel text="Nombre" fontFamily={semiBoldFont} />
                <InputRow
                  focused={focused === 'name'}
                  error={!!errors.name}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                >
                  <TextInput
                    style={[s.input, { fontFamily: bodyFont }]}
                    placeholder="Ej. María"
                    placeholderTextColor={colors.beige[400]}
                    value={form.name}
                    onChangeText={set('name')}
                    returnKeyType="next"
                    onSubmitEditing={() => refs.lastName.current?.focus()}
                    autoCapitalize="words"
                  />
                </InputRow>
                {errors.name && <ErrorMsg text={errors.name} fontFamily={bodyFont} />}
              </View>

              <View style={[s.field, { flex: 1 }]}>
                <FieldLabel text="Apellido" fontFamily={semiBoldFont} />
                <InputRow
                  focused={focused === 'lastName'}
                  error={!!errors.lastName}
                  onFocus={() => setFocused('lastName')}
                  onBlur={() => setFocused(null)}
                >
                  <TextInput
                    ref={refs.lastName}
                    style={[s.input, { fontFamily: bodyFont }]}
                    placeholder="Ej. García"
                    placeholderTextColor={colors.beige[400]}
                    value={form.lastName}
                    onChangeText={set('lastName')}
                    returnKeyType="next"
                    onSubmitEditing={() => refs.phone.current?.focus()}
                    autoCapitalize="words"
                  />
                </InputRow>
                {errors.lastName && <ErrorMsg text={errors.lastName} fontFamily={bodyFont} />}
              </View>
            </View>

            <View style={s.field}>
              <FieldLabel text="Teléfono" fontFamily={semiBoldFont} />
              <InputRow
                focused={focused === 'phone'}
                error={!!errors.phone}
                onFocus={() => setFocused('phone')}
                onBlur={() => setFocused(null)}
              >
                <TextInput
                  ref={refs.phone}
                  style={[s.input, { fontFamily: bodyFont }]}
                  placeholder="10 dígitos"
                  placeholderTextColor={colors.beige[400]}
                  keyboardType="phone-pad"
                  value={form.phone}
                  onChangeText={set('phone')}
                  maxLength={15}
                  returnKeyType="next"
                  onSubmitEditing={() => refs.email.current?.focus()}
                />
              </InputRow>
              {errors.phone && <ErrorMsg text={errors.phone} fontFamily={bodyFont} />}
            </View>

            <View style={s.field}>
              <FieldLabel text="Correo electrónico (opcional)" fontFamily={semiBoldFont} />
              <InputRow
                focused={focused === 'email'}
                error={false}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
              >
                <TextInput
                  ref={refs.email}
                  style={[s.input, { fontFamily: bodyFont }]}
                  placeholder="tu@correo.com"
                  placeholderTextColor={colors.beige[400]}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={set('email')}
                  returnKeyType="next"
                  onSubmitEditing={() => refs.password.current?.focus()}
                />
              </InputRow>
            </View>

            <View style={s.divider} />

            {/* ── Sección: Contraseña ── */}
            <SectionTitle label="Contraseña" fontFamily={semiBoldFont} />

            <View style={s.field}>
              <FieldLabel text="Nueva contraseña" fontFamily={semiBoldFont} />
              <InputRow
                focused={focused === 'password'}
                error={!!errors.password}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
              >
                <TextInput
                  ref={refs.password}
                  style={[s.input, { fontFamily: bodyFont }]}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={colors.beige[400]}
                  secureTextEntry={!showPassword}
                  value={form.password}
                  onChangeText={set('password')}
                  returnKeyType="next"
                  onSubmitEditing={() => refs.confirm.current?.focus()}
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
                  <Text style={[s.eyeText, { fontFamily: mediumFont }]}>
                    {showPassword ? 'Ocultar' : 'Ver'}
                  </Text>
                </TouchableOpacity>
              </InputRow>
              {errors.password && <ErrorMsg text={errors.password} fontFamily={bodyFont} />}
            </View>

            <View style={s.field}>
              <FieldLabel text="Confirmar contraseña" fontFamily={semiBoldFont} />
              <InputRow
                focused={focused === 'confirm'}
                error={!!errors.confirm}
                onFocus={() => setFocused('confirm')}
                onBlur={() => setFocused(null)}
              >
                <TextInput
                  ref={refs.confirm}
                  style={[s.input, { fontFamily: bodyFont }]}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor={colors.beige[400]}
                  secureTextEntry={!showConfirm}
                  value={form.confirm}
                  onChangeText={set('confirm')}
                  returnKeyType="next"
                  onSubmitEditing={() => refs.allergies.current?.focus()}
                />
                <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
                  <Text style={[s.eyeText, { fontFamily: mediumFont }]}>
                    {showConfirm ? 'Ocultar' : 'Ver'}
                  </Text>
                </TouchableOpacity>
              </InputRow>
              {errors.confirm && <ErrorMsg text={errors.confirm} fontFamily={bodyFont} />}
            </View>

            <View style={s.divider} />

            {/* ── Sección: Perfil Capilar ── */}
            <SectionTitle label="Perfil capilar" fontFamily={semiBoldFont} />
            <Text style={[s.sectionDesc, { fontFamily: bodyFont }]}>
              Esta información ayuda a Yoss a preparar el servicio ideal para ti.
            </Text>

            <View style={s.field}>
              <FieldLabel text="Tipo de cabello" fontFamily={semiBoldFont} />
              <PillSelector
                options={HAIR_TYPES}
                selected={form.hairType}
                onSelect={set('hairType')}
                fontFamily={bodyFont}
              />
            </View>

            <View style={[s.field, { marginTop: spacing.md }]}>
              <FieldLabel text="Alergias o sensibilidades (opcional)" fontFamily={semiBoldFont} />
              <InputRow
                focused={focused === ('allergies' as Field)}
                error={false}
                onFocus={() => setFocused('confirm')}
                onBlur={() => setFocused(null)}
                multiline
              >
                <TextInput
                  ref={refs.allergies}
                  style={[s.input, s.textArea, { fontFamily: bodyFont }]}
                  placeholder="Ej. alérgica al amoniaco, sensibilidad al cuero cabelludo..."
                  placeholderTextColor={colors.beige[400]}
                  value={form.allergies}
                  onChangeText={set('allergies')}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </InputRow>
            </View>

            {/* ── Aviso de privacidad ── */}
            <View style={s.privacyBox}>
              <View style={s.privacyDot} />
              <Text style={[s.privacyText, { fontFamily: bodyFont }]}>
                Al registrarte aceptas que tus datos se usarán únicamente para gestionar
                tus citas en Yoss Beauty Salon.
              </Text>
            </View>

            {/* ── CTA ── */}
            <TouchableOpacity
              style={[s.btn, isLoading && s.btnDisabled]}
              onPress={handleRegister}
              activeOpacity={0.85}
              disabled={isLoading}
              accessible
              accessibilityLabel="Crear cuenta"
              accessibilityRole="button"
            >
              {isLoading
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={[s.btnText, { fontFamily: semiBoldFont }]}>Crear cuenta</Text>
              }
            </TouchableOpacity>

            {/* ── Link a Login ── */}
            <View style={s.loginLink}>
              <Text style={[s.loginLinkText, { fontFamily: bodyFont }]}>
                ¿Ya tienes cuenta?{' '}
              </Text>
              <TouchableOpacity onPress={onNavigateToLogin}>
                <Text style={[s.loginLinkAction, { fontFamily: semiBoldFont }]}>
                  Inicia sesión
                </Text>
              </TouchableOpacity>
            </View>

          </Animated.View>

          <Text style={[s.footer, { fontFamily: bodyFont }]}>
            © {new Date().getFullYear()} Yoss Beauty Salon
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Sub-componentes reutilizables ────────────────────────────────────────────
const SectionTitle = ({ label, fontFamily }: { label: string; fontFamily: string }) => (
  <Text style={[sTitle.text, { fontFamily }]}>{label}</Text>
);
const sTitle = StyleSheet.create({
  text: {
    fontSize: 11,
    color: colors.primary[500],
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
});

const FieldLabel = ({ text, fontFamily }: { text: string; fontFamily: string }) => (
  <Text style={[fLabel.text, { fontFamily }]}>{text}</Text>
);
const fLabel = StyleSheet.create({
  text: {
    fontSize: 12,
    color: colors.ink[800],
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
});

const InputRow = ({
  children,
  focused,
  error,
  onFocus,
  onBlur,
  multiline = false,
}: {
  children: React.ReactNode;
  focused: boolean;
  error: boolean;
  onFocus: () => void;
  onBlur: () => void;
  multiline?: boolean;
}) => (
  <View
    style={[
      iRow.wrap,
      focused && iRow.focused,
      error   && iRow.errored,
      multiline && { alignItems: 'flex-start', paddingTop: 12 },
    ]}
    // Propagate focus/blur to the wrapper for visual feedback
    // (The actual handlers are on the TextInput inside)
    onTouchStart={onFocus}
  >
    {children}
  </View>
);
const iRow = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.beige[200],
    borderRadius: borderRadius.sm,
    backgroundColor: colors.beige[50],
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 13 : 2,
    minHeight: 50,
  },
  focused: {
    borderColor: colors.primary[500],
    backgroundColor: colors.white,
  },
  errored: {
    borderColor: colors.status.error,
    backgroundColor: '#FFF5F5',
  },
});

const ErrorMsg = ({ text, fontFamily }: { text: string; fontFamily: string }) => (
  <Text style={[eMsg.text, { fontFamily }]}>{text}</Text>
);
const eMsg = StyleSheet.create({
  text: {
    fontSize: 11,
    color: colors.status.error,
    marginTop: 4,
    letterSpacing: 0.2,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
//  ESTILOS GLOBALES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.beige[50] },

  topBand: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 220,
    backgroundColor: colors.ink[800],
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },

  kbView: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 58 : 46,
    paddingBottom: spacing.xl,
  },

  // ── Header ────────────────────────────────────
  header: { paddingBottom: spacing.xl },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  backArrow: {
    width: 8, height: 8,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: colors.primary[300],
    transform: [{ rotate: '45deg' }],
  },
  backText: { fontSize: 13, color: colors.primary[300] },
  brandName: { fontSize: 36, color: colors.white, letterSpacing: 0.3 },
  brandSub:  { fontSize: 10, color: colors.primary[300], letterSpacing: 3, marginTop: 2 },

  // ── Tarjeta ───────────────────────────────────
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    ...shadow.elevated,
    borderWidth: 1,
    borderColor: colors.beige[200],
  },

  // ── Campos ────────────────────────────────────
  row: { flexDirection: 'row', gap: 10 },
  field: { marginBottom: spacing.md },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.ink[800],
    padding: 0,
  },
  textArea: {
    minHeight: 60,
    paddingTop: 4,
  },
  eyeText: {
    fontSize: 12,
    color: colors.primary[500],
    marginLeft: 8,
  },

  // ── Divisor de sección ─────────────────────────
  divider: {
    height: 1,
    backgroundColor: colors.beige[200],
    marginVertical: spacing.lg,
  },
  sectionDesc: {
    fontSize: 13,
    color: colors.ink[700],
    lineHeight: 18,
    marginBottom: spacing.md,
    marginTop: -8,
  },

  // ── Privacidad ─────────────────────────────────
  privacyBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.beige[50],
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.beige[200],
    alignItems: 'flex-start',
  },
  privacyDot: {
    width: 5, height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary[400],
    marginTop: 5,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: colors.ink[700],
    lineHeight: 17,
  },

  // ── Botón ─────────────────────────────────────
  btn: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.button,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...shadow.button,
    marginBottom: spacing.md,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: colors.white, fontSize: 15, letterSpacing: 0.4 },

  // ── Link a login ───────────────────────────────
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
  },
  loginLinkText:   { fontSize: 13, color: colors.ink[700] },
  loginLinkAction: { fontSize: 13, color: colors.primary[500] },

  // ── Footer ────────────────────────────────────
  footer: {
    textAlign: 'center',
    color: colors.beige[400],
    fontSize: 11,
    marginTop: spacing.xl,
  },

  // ── Éxito ─────────────────────────────────────
  successRoot: {
    flex: 1,
    backgroundColor: colors.beige[50],
    justifyContent: 'center',
    padding: spacing.lg,
  },
  successCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.elevated,
  },
  successMark: {
    width: 64, height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary[50],
    borderWidth: 2,
    borderColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  checkStem: {
    position: 'absolute',
    width: 20, height: 2.5,
    backgroundColor: colors.primary[500],
    transform: [{ rotate: '40deg' }, { translateX: 2 }, { translateY: 4 }],
    borderRadius: 2,
  },
  checkKick: {
    position: 'absolute',
    width: 10, height: 2.5,
    backgroundColor: colors.primary[500],
    transform: [{ rotate: '-50deg' }, { translateX: -9 }, { translateY: 7 }],
    borderRadius: 2,
  },
  successTitle: {
    fontSize: 28,
    color: colors.ink[800],
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  successBody: {
    fontSize: 14,
    color: colors.ink[700],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
});
