/**
 * Yoss Beauty Salon — Design System
 * Fuente oficial: Cormorant Garamond (títulos) + DM Sans (cuerpo)
 * Paleta: Olive · Beige · Ink — espejo exacto del sitio web.
 */

export const theme = {
  colors: {
    primary: {
      50:  '#F5F3E8',
      100: '#E8E4CF',
      200: '#D1C89E',
      300: '#B3A96D',
      400: '#8A8B4A',
      500: '#6B6F35', // Brand Primary — CTA, enlaces, badges
      600: '#555831', // Pressed / hover
      700: '#404229',
      800: '#2D2F1F',
      900: '#1A1C12',
    },
    beige: {
      50:  '#FAF6EF', // Fondo general de pantalla
      100: '#F3ECDC', // Fondo de sección
      200: '#E8DCC0', // Bordes de tarjetas
      300: '#D4BF8E',
      400: '#B89968',
      500: '#8C7345',
    },
    ink: {
      50:  '#F5F4EE',
      100: '#E0DFD6',
      700: '#4A4940',
      800: '#1F2418', // Headings principales
      900: '#14180F',
      950: '#0A0C08',
    },
    status: {
      warningBg:     '#FFFBEB',
      warningBorder: '#FDE68A',
      warningText:   '#B45309',
      warningIcon:   '#F59E0B',
      errorBg:       'rgba(211, 47, 47, 0.07)',
      error:         '#C62828',
      successBg:     'rgba(56, 142, 60, 0.08)',
      success:       '#2E7D32',
    },
    white:       '#FFFFFF',
    transparent: 'transparent',
  },
  fonts: {
    title:     'CormorantGaramond_500Medium',
    titleItalic: 'CormorantGaramond_500Medium_Italic',
    titleLight: 'CormorantGaramond_300Light',
    body:      'DMSans_400Regular',
    bodyMedium: 'DMSans_500Medium',
    bodySemiBold: 'DMSans_600SemiBold',
  },
  /** Fallbacks en caso de que las fuentes no hayan cargado aún */
  fontFallback: {
    title: 'serif',
    body:  'system-ui',
  },
  borderRadius: {
    sm:     8,
    card:   16,
    button: 16,
    pill:   9999,
  },
  shadow: {
    card: {
      shadowColor:   '#1F2418',
      shadowOffset:  { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius:  3,
      elevation:     2,
    },
    button: {
      shadowColor:   '#6B6F35',
      shadowOffset:  { width: 0, height: 4 },
      shadowOpacity: 0.32,
      shadowRadius:  12,
      elevation:     5,
    },
    elevated: {
      shadowColor:   '#1F2418',
      shadowOffset:  { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius:  16,
      elevation:     8,
    },
  },
  spacing: {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  32,
    xxl: 48,
  },
} as const;

export type Theme = typeof theme;

// ── Retrocompatibilidad ────────────────────────────────────────────────────────
export const YossColors = {
  primary:       theme.colors.primary[500],
  primaryDark:   theme.colors.ink[800],
  primaryMuted:  theme.colors.primary[50],
  bgPrimary:     theme.colors.beige[50],
  textPrimary:   theme.colors.ink[800],
  textSecondary: theme.colors.ink[700],
  textMuted:     theme.colors.beige[400],
  textOnPrimary: theme.colors.white,
};

export const YossTypography = {
  h1: 28,
  h2: 22,
  body: 16,
  small: 14,
  tiny: 12,
};

export const YossRadius = {
  sm: theme.borderRadius.sm,
  md: theme.borderRadius.card,
  lg: theme.borderRadius.card,
  pill: theme.borderRadius.pill,
};

export const YossShadow = theme.shadow;
export const YossSpacing = theme.spacing;
