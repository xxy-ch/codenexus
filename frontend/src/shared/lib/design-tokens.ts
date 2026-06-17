/**
 * CodeNexus Design Tokens
 * Single source of truth for all design values.
 *
 * Architecture: Linear base layer + scene overlays per module.
 * See shared/frontend-skill/*.md for source design systems.
 */

// ─── Status Colors (unified across all pages) ───────────────────────────

export const statusColors = {
  accepted: '#0d9f8e',      // Teal-green (light) / #14b8a6 (dark)
  wrongAnswer: '#d6362a',   // Warm red
  pending: '#9c9a94',       // Neutral gray
  timeLimit: '#e8a317',     // Amber
  runtimeError: '#8b5cf6',  // Violet
  compilationError: '#e8a317',
  systemError: '#88867f',
  memoryLimit: '#e8a317',
} as const

// ─── Difficulty Colors ───────────────────────────────────────────────────

export const difficultyColors = {
  easy: '#0d9f8e',     // Teal-green
  medium: '#e8a317',   // Amber
  hard: '#d6362a',     // Warm red
} as const

// ─── Dark Theme (Linear base) ────────────────────────────────────────────

export const darkTheme = {
  // Backgrounds — warm charcoal, not flat black
  bgPrimary: '#11100e',
  bgSecondary: '#181613',
  bgTertiary: '#1f1d1a',
  bgElevated: '#262420',
  bgHover: '#2a2823',

  // Text hierarchy (5 levels)
  textPrimary: '#f7f8f8',
  textSecondary: '#d0d6e0',
  textTertiary: '#8a8f98',
  textMuted: '#62666d',
  textDisabled: '#3d4048',

  // Borders
  borderSubtle: 'rgba(255, 255, 255, 0.05)',
  borderDefault: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.12)',

  // Brand accent
  accentPrimary: '#e8500f',
  accentPrimaryHover: '#ff5e1a',
  accentSecondary: '#0d9f8e',

  // Shadows
  shadowSm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  shadowMd: '0 4px 12px rgba(0, 0, 0, 0.4)',
  shadowLg: '0 8px 24px rgba(0, 0, 0, 0.5)',
} as const

// ─── Light Theme ─────────────────────────────────────────────────────────

export const lightTheme = {
  bgPrimary: '#ffffff',
  bgSecondary: '#f7f8f8',
  bgTertiary: '#f0f1f3',
  bgElevated: '#ffffff',
  bgHover: '#f0f1f3',

  textPrimary: '#08090a',
  textSecondary: '#3d4048',
  textTertiary: '#62666d',
  textMuted: '#8a8f98',
  textDisabled: '#c0c3c8',

  borderSubtle: 'rgba(0, 0, 0, 0.04)',
  borderDefault: 'rgba(0, 0, 0, 0.08)',
  borderStrong: 'rgba(0, 0, 0, 0.12)',

  accentPrimary: '#5e6ad2',
  accentPrimaryHover: '#4e59c2',
  accentSecondary: '#10b981',

  shadowSm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  shadowMd: '0 4px 12px rgba(0, 0, 0, 0.08)',
  shadowLg: '0 8px 24px rgba(0, 0, 0, 0.12)',
} as const

// ─── Scene Tokens ────────────────────────────────────────────────────────

/** Notion — warm reading for problem descriptions */
export const notionTokens = {
  warmWhite: '#f6f5f4',
  warmBlack: '#31302e',
  warmGray: '#615d59',
  linkBlue: '#0075de',
  borderLight: '1px solid rgba(0, 0, 0, 0.1)',
} as const

/** Supabase — code editor & terminal aesthetics */
export const supabaseTokens = {
  green: '#3ecf8e',
  greenDark: '#00c573',
  greenBorder: 'rgba(62, 207, 142, 0.3)',
  borderDepth1: '#242424',
  borderDepth2: '#2e2e2e',
  borderDepth3: '#363636',
} as const

/** Sentry — submission status panels */
export const sentryTokens = {
  bgPurple: '#1f1633',
  lemonGreen: '#c2ef4e',
  coral: '#ffb287',
  pink: '#fa7faa',
  glassBlur: 'blur(18px) saturate(180%)',
} as const

/** Vercel — data tables & rankings */
export const vercelTokens = {
  shipRed: '#ff5b4f',
  previewPink: '#de1d8d',
  developBlue: '#0a72ef',
  shadowBorder: '0px 0px 0px 1px rgba(0, 0, 0, 0.08)',
} as const

/** ClickHouse — contest live displays */
export const clickhouseTokens = {
  neonYellow: '#faff69',
  pureBlack: '#000000',
  forestGreen: '#166534',
} as const

/** PostHog — user profile warmth */
export const posthogTokens = {
  brandOrange: '#F54E00',
  parchmentBg: '#fdfdf8',
  gold: '#F7A501',
} as const

/** Cursor — problem detail 3-font system */
export const cursorTokens = {
  warmBg: '#f2f1ed',
  errorRed: '#cf2d56',
  accentOrange: '#f54e00',
} as const

// ─── Typography ──────────────────────────────────────────────────────────

export const typography = {
  fontFamily: {
    display: "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'Berkeley Mono', 'Fira Code', 'SF Mono', Monaco, 'Courier New', monospace",
    serif: "'Lora', 'Georgia', serif",
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.8125rem',  // 13px
    base: '0.875rem', // 14px (Linear default, denser than typical)
    lg: '1rem',       // 16px
    xl: '1.125rem',   // 18px
    '2xl': '1.5rem',  // 24px
    '3xl': '2rem',    // 32px
    '4xl': '2.5rem',  // 40px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.02em',
    uppercase: '0.08em',
  },
} as const

// ─── Spacing & Layout ────────────────────────────────────────────────────

export const layout = {
  sidebarWidth: '240px',
  sidebarCollapsedWidth: '56px',
  headerHeight: '48px',
  contentMaxWidth: '1200px',
  borderRadius: {
    sm: '4px',
    default: '6px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },
} as const
