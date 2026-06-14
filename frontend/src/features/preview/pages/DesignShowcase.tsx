import { useState, useEffect, type CSSProperties } from 'react'

/* ------------------------------------------------------------------ */
/*  Theme definitions — each captures the UNIQUE visual DNA per MD    */
/* ------------------------------------------------------------------ */

interface ThemeConfig {
  name: string
  nativeDark: boolean
  desc: string
  cssVars: Record<string, string>
  hero: {
    bg: string
    headline: string
    subtitle: string
    headlineStyle: CSSProperties
    subtitleStyle: CSSProperties
  }
  btn: {
    primary: { style: CSSProperties; label: string }
    secondary: { style: CSSProperties; label: string }
    ghost: { style: CSSProperties; label: string }
  }
  card: { style: CSSProperties; elevated?: CSSProperties }
  input: { style: CSSProperties }
  shadowDemo: {
    flat: CSSProperties
    subtle: CSSProperties
    elevated: CSSProperties
    label: string
  }
  badge: {
    primary: CSSProperties
    success: CSSProperties
    outline: CSSProperties
  }
  statCard: { style: CSSProperties; numberStyle: CSSProperties }
  tableRow: { style: CSSProperties; hover: CSSProperties }
}

const THEMES: Record<string, ThemeConfig> = {
  linear: {
    name: 'Linear',
    nativeDark: true,
    desc: 'Near-black canvas · Translucent white borders rgba(255,255,255,0.08) · Luminance-stepping surfaces · Weight 510 · Multi-layer inset shadows · Brand indigo #5e6ad2',
    cssVars: {
      bg: '#08090a', panel: '#0f1011', surface: '#191a1b', surfaceLight: '#28282c',
      text: '#f7f8f8', textSecondary: '#d0d6e0', textTertiary: '#8a8f98',
      textQuaternary: '#62666d', brand: '#5e6ad2', accent: '#7170ff', accentHover: '#828fff',
      border: 'rgba(255,255,255,0.08)', borderSubtle: 'rgba(255,255,255,0.05)',
    },
    hero: {
      bg: '#08090a',
      headline: 'Build software\nbetter',
      subtitle: 'Purpose-built for modern product teams to plan, track, and manage their work.',
      headlineStyle: { fontFamily: 'Inter, -apple-system, system-ui, sans-serif', fontSize: '64px', fontWeight: 510, lineHeight: 1.00, letterSpacing: '-1.408px', color: '#f7f8f8', fontFeatureSettings: '"cv01", "ss03"', whiteSpace: 'pre-line' },
      subtitleStyle: { fontFamily: 'Inter, -apple-system, system-ui, sans-serif', fontSize: '18px', fontWeight: 400, lineHeight: 1.60, letterSpacing: '-0.165px', color: '#8a8f98' },
    },
    btn: {
      primary: { style: { background: '#5e6ad2', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 510, fontFamily: 'Inter, sans-serif', fontFeatureSettings: '"cv01", "ss03"', border: 'none', cursor: 'pointer' } as CSSProperties, label: 'Start building' },
      secondary: { style: { background: 'rgba(255,255,255,0.02)', color: '#e2e4e7', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 510, fontFamily: 'Inter, sans-serif', border: '1px solid rgb(36, 40, 44)', cursor: 'pointer' } as CSSProperties, label: 'Documentation' },
      ghost: { style: { background: 'transparent', color: '#8a8f98', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 510, fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer' } as CSSProperties, label: 'Changelog' },
    },
    card: {
      style: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '24px' },
      elevated: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '24px', boxShadow: 'rgba(0,0,0,0.2) 0px 0px 0px 1px, rgba(0,0,0,0.4) 0px 2px 4px' },
    },
    input: { style: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '10px 14px', color: '#d0d6e0', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none' } },
    shadowDemo: {
      flat: { background: '#08090a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '20px' },
      subtle: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px', boxShadow: 'rgba(0,0,0,0.03) 0px 1.2px 0px' },
      elevated: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', boxShadow: 'rgba(0,0,0,0) 0px 8px 2px, rgba(0,0,0,0.01) 0px 5px 2px, rgba(0,0,0,0.04) 0px 3px 2px, rgba(0,0,0,0.07) 0px 1px 1px, rgba(0,0,0,0.08) 0px 0px 1px' },
      label: 'Luminance-stepping: surface opacity 0.02 → 0.04 → 0.05 + semi-transparent white borders',
    },
    badge: {
      primary: { background: 'rgba(94,106,210,0.15)', color: '#828fff', borderRadius: '9999px', padding: '0px 10px 0px 5px', fontSize: '12px', fontWeight: 510, fontFamily: 'Inter, sans-serif', border: '1px solid rgba(94,106,210,0.2)', display: 'inline-flex', alignItems: 'center' },
      success: { background: 'transparent', color: '#d0d6e0', borderRadius: '9999px', padding: '0px 10px 0px 5px', fontSize: '12px', fontWeight: 510, fontFamily: 'Inter, sans-serif', border: '1px solid rgb(35, 37, 42)', display: 'inline-flex', alignItems: 'center' },
      outline: { background: 'rgba(255,255,255,0.05)', color: '#f7f8f8', borderRadius: '2px', padding: '0px 8px 0px 2px', fontSize: '10px', fontWeight: 510, fontFamily: 'Inter, sans-serif', border: '1px solid rgba(255,255,255,0.05)', display: 'inline-flex', alignItems: 'center' },
    },
    statCard: { style: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px', textAlign: 'center' }, numberStyle: { fontSize: '32px', fontWeight: 590, fontFamily: 'Inter, sans-serif', fontFeatureSettings: '"cv01", "ss03"' } },
    tableRow: { style: { borderBottom: '1px solid rgba(255,255,255,0.05)' }, hover: { background: 'rgba(255,255,255,0.02)' } },
  },

  vercel: {
    name: 'Vercel',
    nativeDark: false,
    desc: 'Shadow-as-border (0px 0px 0px 1px) · Multi-layer shadow stacks · Geist font with -2.4px tracking · Near-black #171717 text · Gallery emptiness',
    cssVars: {
      bg: '#ffffff', panel: '#ffffff', surface: '#fafafa', surfaceLight: '#ebebeb',
      text: '#171717', textSecondary: '#4d4d4d', textTertiary: '#666666',
      textQuaternary: '#808080', brand: '#171717', accent: '#0072f5', accentHover: '#0062d6',
      border: '#ebebeb', borderSubtle: '#fafafa',
    },
    hero: {
      bg: '#ffffff',
      headline: 'Develop.\nPreview.\nShip.',
      subtitle: "Vercel's frontend cloud gives developers frameworks, workflows, and infrastructure to build a faster, more personalized web.",
      headlineStyle: { fontFamily: 'Geist, -apple-system, system-ui, sans-serif', fontSize: '64px', fontWeight: 600, lineHeight: 1.00, letterSpacing: '-2.88px', color: '#171717', whiteSpace: 'pre-line' },
      subtitleStyle: { fontFamily: 'Geist, -apple-system, system-ui, sans-serif', fontSize: '18px', fontWeight: 400, lineHeight: 1.56, color: '#4d4d4d' },
    },
    btn: {
      primary: { style: { background: '#171717', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 500, fontFamily: 'Geist, sans-serif', border: 'none', cursor: 'pointer' } as CSSProperties, label: 'Start Deploying' },
      secondary: { style: { background: '#ffffff', color: '#171717', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 500, fontFamily: 'Geist, sans-serif', boxShadow: 'rgb(235, 235, 235) 0px 0px 0px 1px', border: 'none', cursor: 'pointer' } as CSSProperties, label: 'Get a Demo' },
      ghost: { style: { background: 'transparent', color: '#666666', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 500, fontFamily: 'Geist, sans-serif', border: 'none', cursor: 'pointer' } as CSSProperties, label: 'Documentation' },
    },
    card: {
      style: { background: '#ffffff', border: 'none', borderRadius: '8px', padding: '24px', boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 2px' },
      elevated: { background: '#ffffff', border: 'none', borderRadius: '12px', padding: '24px', boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 2px, rgba(0,0,0,0.04) 0px 8px 8px -8px, #fafafa 0px 0px 0px 1px' },
    },
    input: { style: { background: '#ffffff', border: 'none', borderRadius: '6px', padding: '10px 14px', color: '#171717', fontSize: '15px', fontFamily: 'Geist, sans-serif', outline: 'none', boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' } },
    shadowDemo: {
      flat: { background: '#ffffff', border: 'none', borderRadius: '8px', padding: '20px' },
      subtle: { background: '#ffffff', border: 'none', borderRadius: '8px', padding: '20px', boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' },
      elevated: { background: '#ffffff', border: 'none', borderRadius: '12px', padding: '20px', boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 2px, rgba(0,0,0,0.04) 0px 8px 8px -8px, #fafafa 0px 0px 0px 1px' },
      label: 'Shadow-as-border: 0px 0px 0px 1px replaces CSS border. Multi-layer stacks: border + elevation + ambient + inner glow',
    },
    badge: {
      primary: { background: '#ebf5ff', color: '#0068d6', borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 500, fontFamily: 'Geist, sans-serif', border: 'none', display: 'inline-flex', alignItems: 'center' },
      success: { background: '#f0fdf4', color: '#166534', borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 500, fontFamily: 'Geist, sans-serif', border: 'none', display: 'inline-flex', alignItems: 'center' },
      outline: { background: '#ffffff', color: '#666666', borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 500, fontFamily: 'Geist, sans-serif', boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px', display: 'inline-flex', alignItems: 'center' },
    },
    statCard: { style: { background: '#ffffff', border: 'none', borderRadius: '8px', padding: '20px', textAlign: 'center', boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 2px' }, numberStyle: { fontSize: '32px', fontWeight: 600, fontFamily: 'Geist, sans-serif', letterSpacing: '-1.28px' } },
    tableRow: { style: { boxShadow: 'rgba(0,0,0,0.04) 0px -1px 0px 0px inset' }, hover: { background: '#fafafa' } },
  },

  clickhouse: {
    name: 'ClickHouse',
    nativeDark: true,
    desc: 'Pure black #000 canvas · Neon yellow-green #faff69 · Inter Black 900 · Inset pressed shadows · Uppercase wide-tracked labels · Maximum contrast',
    cssVars: {
      bg: '#000000', panel: '#000000', surface: '#141414', surfaceLight: '#1e1e1e',
      text: '#ffffff', textSecondary: '#a0a0a0', textTertiary: '#585858',
      textQuaternary: '#3a3a3a', brand: '#faff69', accent: '#faff69', accentHover: '#f4f692',
      border: 'rgba(65,65,65,0.8)', borderSubtle: '#343434',
    },
    hero: {
      bg: '#000000',
      headline: 'THE FASTEST\nOPEN-SOURCE\nDATABASE',
      subtitle: 'ClickHouse is a real-time analytics DBMS for big data — query billions of rows in milliseconds.',
      headlineStyle: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: '72px', fontWeight: 900, lineHeight: 1.00, letterSpacing: 'normal', color: '#ffffff', textTransform: 'uppercase', whiteSpace: 'pre-line' },
      subtitleStyle: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: '18px', fontWeight: 400, lineHeight: 1.56, color: '#a0a0a0' },
    },
    btn: {
      primary: { style: { background: '#faff69', color: '#151515', padding: '12px 16px', borderRadius: '4px', fontSize: '16px', fontWeight: 700, fontFamily: 'Inter, sans-serif', border: '1px solid #faff69', cursor: 'pointer', boxShadow: '0px 0px 20px rgba(250,255,105,0.3)' } as CSSProperties, label: 'Get Started' },
      secondary: { style: { background: '#166534', color: '#ffffff', padding: '12px 16px', borderRadius: '4px', fontSize: '16px', fontWeight: 700, fontFamily: 'Inter, sans-serif', border: '1px solid #141414', cursor: 'pointer', boxShadow: 'inset 0px 1px 0px rgba(255,255,255,0.1)' } as CSSProperties, label: 'Try Free' },
      ghost: { style: { background: 'transparent', color: '#ffffff', padding: '12px 32px', borderRadius: '4px', fontSize: '16px', fontWeight: 400, fontFamily: 'Inter, sans-serif', border: '1px solid #4f5100', cursor: 'pointer' } as CSSProperties, label: 'View Docs' },
    },
    card: {
      style: { background: '#141414', border: '1px solid rgba(65,65,65,0.8)', borderRadius: '8px', padding: '24px' },
      elevated: { background: '#141414', border: '1px solid #faff69', borderRadius: '8px', padding: '24px', boxShadow: '0px 0px 20px rgba(250,255,105,0.15), inset 0px 1px 0px rgba(255,255,255,0.03)' },
    },
    input: { style: { background: '#1a1a1a', border: '1px solid rgba(65,65,65,0.8)', borderRadius: '4px', padding: '10px 14px', color: '#ffffff', fontSize: '15px', fontFamily: 'Inter, sans-serif', outline: 'none', boxShadow: 'inset 0px 1px 0px rgba(255,255,255,0.03)' } },
    shadowDemo: {
      flat: { background: '#141414', border: '1px solid rgba(65,65,65,0.8)', borderRadius: '8px', padding: '20px' },
      subtle: { background: '#141414', border: '1px solid rgba(65,65,65,0.8)', borderRadius: '8px', padding: '20px', boxShadow: 'rgba(0,0,0,0.1) 0px 1px 3px, rgba(0,0,0,0.1) 0px 1px 2px -1px' },
      elevated: { background: '#141414', border: '1px solid #faff69', borderRadius: '8px', padding: '20px', boxShadow: '0px 0px 20px rgba(250,255,105,0.15), rgba(0,0,0,0.14) 0px 4px 25px inset' },
      label: 'Neon border highlight + inset pressed shadow. Glow shadows use rgba(250,255,105,0.3). Active states: 0px 4px 25px rgba(0,0,0,0.14) inset',
    },
    badge: {
      primary: { background: 'rgba(250,255,105,0.15)', color: '#faff69', borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif', border: '1px solid rgba(250,255,105,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center' },
      success: { background: 'rgba(22,101,52,0.2)', color: '#3ecf8e', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif', border: 'none', display: 'inline-flex', alignItems: 'center' },
      outline: { background: '#1e1e1e', color: '#a0a0a0', borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif', border: '1px solid rgba(65,65,65,0.8)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center' },
    },
    statCard: { style: { background: '#141414', border: '1px solid rgba(65,65,65,0.8)', borderRadius: '8px', padding: '20px', textAlign: 'center' }, numberStyle: { fontSize: '48px', fontWeight: 900, fontFamily: 'Inter, sans-serif' } },
    tableRow: { style: { borderBottom: '1px solid rgba(65,65,65,0.4)' }, hover: { background: '#1a1a1a' } },
  },

  stripe: {
    name: 'Stripe',
    nativeDark: false,
    desc: 'Blue-tinted shadows rgba(50,50,93,0.25) · Weight 300 headlines · sohne-var ss01 · Deep navy #061b31 headings · Conservative radius 4-8px · Purple #533afd brand',
    cssVars: {
      bg: '#ffffff', panel: '#ffffff', surface: '#f6f9fc', surfaceLight: '#e3e8ee',
      text: '#061b31', textSecondary: '#273951', textTertiary: '#64748d',
      textQuaternary: '#8a9bae', brand: '#533afd', accent: '#533afd', accentHover: '#4434d4',
      border: '#e3e8ee', borderSubtle: '#e5edf5',
    },
    hero: {
      bg: '#ffffff',
      headline: 'Financial\ninfrastructure for\nthe internet',
      subtitle: 'Millions of companies use Stripe to accept payments, grow their revenue, and accelerate new business opportunities.',
      headlineStyle: { fontFamily: '-apple-system, system-ui, sans-serif', fontSize: '56px', fontWeight: 300, lineHeight: 1.03, letterSpacing: '-1.4px', color: '#061b31' } as CSSProperties,
      subtitleStyle: { fontFamily: '-apple-system, system-ui, sans-serif', fontSize: '18px', fontWeight: 300, lineHeight: 1.40, color: '#64748d' },
    },
    btn: {
      primary: { style: { background: '#533afd', color: '#ffffff', padding: '8px 16px', borderRadius: '4px', fontSize: '16px', fontWeight: 400, fontFamily: '-apple-system, sans-serif', border: 'none', cursor: 'pointer', boxShadow: 'rgba(50,50,93,0.25) 0px 6px 12px -2px, rgba(0,0,0,0.1) 0px 3px 7px -3px' } as CSSProperties, label: 'Start now' },
      secondary: { style: { background: 'transparent', color: '#533afd', padding: '8px 16px', borderRadius: '4px', fontSize: '16px', fontWeight: 400, fontFamily: '-apple-system, sans-serif', border: '1px solid #b9b9f9', cursor: 'pointer' } as CSSProperties, label: 'Contact sales' },
      ghost: { style: { background: 'transparent', color: '#64748d', padding: '8px 16px', borderRadius: '4px', fontSize: '14px', fontWeight: 400, fontFamily: '-apple-system, sans-serif', border: 'none', cursor: 'pointer' } as CSSProperties, label: 'Documentation' },
    },
    card: {
      style: { background: '#ffffff', border: '1px solid #e3e8ee', borderRadius: '6px', padding: '24px', boxShadow: 'rgba(23,23,23,0.06) 0px 3px 6px' },
      elevated: { background: '#ffffff', border: '1px solid #e3e8ee', borderRadius: '8px', padding: '24px', boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px' },
    },
    input: { style: { background: '#ffffff', border: '1px solid #e3e8ee', borderRadius: '4px', padding: '10px 14px', color: '#061b31', fontSize: '15px', fontFamily: '-apple-system, sans-serif', outline: 'none', boxShadow: 'inset 0px 1px 1px rgba(50,50,93,0.05)' } },
    shadowDemo: {
      flat: { background: '#ffffff', border: '1px solid #e3e8ee', borderRadius: '6px', padding: '20px' },
      subtle: { background: '#ffffff', border: '1px solid #e3e8ee', borderRadius: '6px', padding: '20px', boxShadow: 'rgba(23,23,23,0.08) 0px 15px 35px' },
      elevated: { background: '#ffffff', border: '1px solid #e3e8ee', borderRadius: '8px', padding: '20px', boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px' },
      label: 'Blue-tinted shadows: rgba(50,50,93,0.25) — elevation feels brand-colored. Multi-layer: blue far + neutral near for depth parallax',
    },
    badge: {
      primary: { background: '#e8e5ff', color: '#4a3adb', borderRadius: '4px', padding: '1px 6px', fontSize: '11px', fontWeight: 300, fontFamily: '-apple-system, sans-serif', border: 'none', display: 'inline-flex', alignItems: 'center' },
      success: { background: 'rgba(21,190,83,0.2)', color: '#108c3d', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', fontWeight: 300, fontFamily: '-apple-system, sans-serif', border: '1px solid rgba(21,190,83,0.4)', display: 'inline-flex', alignItems: 'center' },
      outline: { background: 'transparent', color: '#64748d', borderRadius: '4px', padding: '1px 6px', fontSize: '11px', fontWeight: 400, fontFamily: '-apple-system, sans-serif', border: '1px solid #e3e8ee', display: 'inline-flex', alignItems: 'center' },
    },
    statCard: { style: { background: '#ffffff', border: '1px solid #e3e8ee', borderRadius: '6px', padding: '20px', textAlign: 'center', boxShadow: 'rgba(23,23,23,0.06) 0px 3px 6px' }, numberStyle: { fontSize: '32px', fontWeight: 300, fontFamily: '-apple-system, sans-serif', letterSpacing: '-0.64px' } },
    tableRow: { style: { borderBottom: '1px solid #e3e8ee' }, hover: { background: '#f6f9fc' } },
  },

  supabase: {
    name: 'Supabase',
    nativeDark: true,
    desc: 'Dark-mode-native #171717 · NO shadows — border-defined depth · Pill CTAs 9999px · Emerald green #3ecf8e sparingly · Circular font weight 400 only · Hero line-height 1.00',
    cssVars: {
      bg: '#0f0f0f', panel: '#171717', surface: '#171717', surfaceLight: '#242424',
      text: '#fafafa', textSecondary: '#b4b4b4', textTertiary: '#898989',
      textQuaternary: '#4d4d4d', brand: '#3ecf8e', accent: '#00c573', accentHover: '#3ecf8e',
      border: '#2e2e2e', borderSubtle: '#242424',
    },
    hero: {
      bg: '#0f0f0f',
      headline: 'Build in a\nweekend\nScale to\nmillions',
      subtitle: 'Supabase is an open source Firebase alternative. Start your project with a Postgres database, Authentication, and APIs.',
      headlineStyle: { fontFamily: 'Circular, -apple-system, system-ui, sans-serif', fontSize: '72px', fontWeight: 400, lineHeight: 1.00, letterSpacing: 'normal', color: '#fafafa', whiteSpace: 'pre-line' },
      subtitleStyle: { fontFamily: 'Circular, -apple-system, system-ui, sans-serif', fontSize: '16px', fontWeight: 400, lineHeight: 1.50, color: '#898989' },
    },
    btn: {
      primary: { style: { background: '#0f0f0f', color: '#fafafa', padding: '8px 32px', borderRadius: '9999px', fontSize: '14px', fontWeight: 500, fontFamily: 'Circular, sans-serif', border: '1px solid #fafafa', cursor: 'pointer', boxShadow: 'none' } as CSSProperties, label: 'Start your project' },
      secondary: { style: { background: '#0f0f0f', color: '#fafafa', padding: '8px 32px', borderRadius: '9999px', fontSize: '14px', fontWeight: 500, fontFamily: 'Circular, sans-serif', border: '1px solid #2e2e2e', cursor: 'pointer', opacity: 0.8 } as CSSProperties, label: 'Request a demo' },
      ghost: { style: { background: 'transparent', color: '#898989', padding: '8px', borderRadius: '6px', fontSize: '14px', fontWeight: 500, fontFamily: 'Circular, sans-serif', border: '1px solid transparent', cursor: 'pointer' } as CSSProperties, label: 'Documentation' },
    },
    card: {
      style: { background: '#171717', border: '1px solid #2e2e2e', borderRadius: '16px', padding: '24px', boxShadow: 'none' },
      elevated: { background: '#171717', border: '1px solid #363636', borderRadius: '16px', padding: '24px', boxShadow: 'none' },
    },
    input: { style: { background: '#171717', border: '1px solid #2e2e2e', borderRadius: '6px', padding: '10px 14px', color: '#fafafa', fontSize: '15px', fontFamily: 'Circular, sans-serif', outline: 'none', boxShadow: 'none' } },
    shadowDemo: {
      flat: { background: '#171717', border: '1px solid #2e2e2e', borderRadius: '16px', padding: '20px', boxShadow: 'none' },
      subtle: { background: '#171717', border: '1px solid #363636', borderRadius: '16px', padding: '20px', boxShadow: 'none' },
      elevated: { background: '#171717', border: '1px solid rgba(62, 207, 142, 0.3)', borderRadius: '16px', padding: '20px', boxShadow: 'none' },
      label: 'NO shadows. Depth = border hierarchy: #242424 → #2e2e2e → #363636. Elevated = green accent border rgba(62,207,142,0.3)',
    },
    badge: {
      primary: { background: 'rgba(62,207,142,0.1)', color: '#3ecf8e', borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 400, fontFamily: 'Circular, sans-serif', border: '1px solid rgba(62,207,142,0.3)', display: 'inline-flex', alignItems: 'center' },
      success: { background: 'rgba(62,207,142,0.1)', color: '#3ecf8e', borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 400, fontFamily: 'Circular, sans-serif', border: 'none', display: 'inline-flex', alignItems: 'center' },
      outline: { background: 'transparent', color: '#b4b4b4', borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 400, fontFamily: 'Circular, sans-serif', border: '1px solid #363636', display: 'inline-flex', alignItems: 'center' },
    },
    statCard: { style: { background: '#171717', border: '1px solid #2e2e2e', borderRadius: '16px', padding: '20px', textAlign: 'center', boxShadow: 'none' }, numberStyle: { fontSize: '32px', fontWeight: 400, fontFamily: 'Circular, sans-serif' } },
    tableRow: { style: { borderBottom: '1px solid #2e2e2e' }, hover: { background: '#1a1a1a' } },
  },

  sentry: {
    name: 'Sentry',
    nativeDark: true,
    desc: 'Deep purple-black #1f1633 · Inset button shadows (tactile press) · Frosted glass blur(18px) · Lime green #c2ef4e accent · Warm purple spectrum · Rubik font · Uppercase labels',
    cssVars: {
      bg: '#150f23', panel: '#1f1633', surface: '#231a3a', surfaceLight: '#2a2044',
      text: '#ffffff', textSecondary: '#e5e7eb', textTertiary: '#c4b5d4',
      textQuaternary: '#8a7fa3', brand: '#c2ef4e', accent: '#6a5fc1', accentHover: '#8a72a0',
      border: '#362d59', borderSubtle: '#2a2044',
    },
    hero: {
      bg: '#150f23',
      headline: 'Code breaks.\nFix it faster.',
      subtitle: 'Sentry provides self-hosted and cloud-based error monitoring that helps all software teams find and fix bugs in real time.',
      headlineStyle: { fontFamily: 'Rubik, -apple-system, system-ui, sans-serif', fontSize: '72px', fontWeight: 700, lineHeight: 1.10, letterSpacing: 'normal', color: '#ffffff' },
      subtitleStyle: { fontFamily: 'Rubik, -apple-system, system-ui, sans-serif', fontSize: '18px', fontWeight: 400, lineHeight: 1.50, color: '#c4b5d4' },
    },
    btn: {
      primary: { style: { background: '#79628c', color: '#ffffff', padding: '10px 20px', borderRadius: '13px', fontSize: '14px', fontWeight: 700, fontFamily: 'Rubik, sans-serif', border: '1px solid #584674', cursor: 'pointer', textTransform: 'uppercase' as const, letterSpacing: '0.2px', boxShadow: 'rgba(0, 0, 0, 0.1) 0px 1px 3px 0px inset' } as CSSProperties, label: 'Get Started' },
      secondary: { style: { background: 'rgba(255,255,255,0.18)', color: '#ffffff', padding: '8px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, fontFamily: 'Rubik, sans-serif', border: 'none', cursor: 'pointer', backdropFilter: 'blur(18px) saturate(180%)', boxShadow: 'rgba(0, 0, 0, 0.08) 0px 2px 8px' } as CSSProperties, label: 'Product Tour' },
      ghost: { style: { background: 'transparent', color: '#8a7fa3', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, fontFamily: 'Rubik, sans-serif', border: 'none', cursor: 'pointer' } as CSSProperties, label: 'Docs' },
    },
    card: {
      style: { background: '#1f1633', border: '1px solid #362d59', borderRadius: '12px', padding: '24px', boxShadow: 'rgba(0,0,0,0.1) 0px 10px 15px -3px' },
      elevated: { background: 'rgba(255,255,255,0.05)', border: '1px solid #362d59', borderRadius: '12px', padding: '24px', boxShadow: 'rgba(0,0,0,0.1) 0px 10px 15px -3px', backdropFilter: 'blur(18px) saturate(180%)' },
    },
    input: { style: { background: '#231a3a', border: '1px solid #362d59', borderRadius: '6px', padding: '10px 14px', color: '#e5e7eb', fontSize: '15px', fontFamily: 'Rubik, sans-serif', outline: 'none' } },
    shadowDemo: {
      flat: { background: '#1f1633', border: '1px solid #362d59', borderRadius: '12px', padding: '20px' },
      subtle: { background: '#1f1633', border: '1px solid #362d59', borderRadius: '12px', padding: '20px', boxShadow: 'rgba(0,0,0,0.08) 0px 2px 8px' },
      elevated: { background: 'rgba(255,255,255,0.05)', border: '1px solid #362d59', borderRadius: '12px', padding: '20px', boxShadow: 'rgba(0,0,0,0.1) 0px 10px 15px -3px, rgba(22,15,36,0.9) 0px 4px 4px 9px', backdropFilter: 'blur(18px) saturate(180%)' },
      label: 'Inset shadows on buttons = tactile pressed feel. Frosted glass: blur(18px) saturate(180%). Ambient glow: rgba(22,15,36,0.9) bioluminescent purple',
    },
    badge: {
      primary: { background: 'rgba(194,239,78,0.15)', color: '#c2ef4e', borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, fontFamily: 'Rubik, sans-serif', border: '1px solid rgba(194,239,78,0.25)', display: 'inline-flex', alignItems: 'center' },
      success: { background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 400, fontFamily: 'Rubik, sans-serif', border: 'none', display: 'inline-flex', alignItems: 'center' },
      outline: { background: 'transparent', color: '#8a7fa3', borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 500, fontFamily: 'Rubik, sans-serif', border: '1px solid #362d59', display: 'inline-flex', alignItems: 'center' },
    },
    statCard: { style: { background: '#1f1633', border: '1px solid #362d59', borderRadius: '12px', padding: '20px', textAlign: 'center', boxShadow: 'rgba(0,0,0,0.1) 0px 10px 15px -3px' }, numberStyle: { fontSize: '32px', fontWeight: 600, fontFamily: 'Rubik, sans-serif' } },
    tableRow: { style: { borderBottom: '1px solid #362d59' }, hover: { background: 'rgba(255,255,255,0.04)' } },
  },

  cursor: {
    name: 'Cursor',
    nativeDark: false,
    desc: 'Warm cream #f2f1ed · Warm near-black #26251e · Warm orange #f54e00 · oklab borders · Pill elements 9999px · Hover → warm crimson #cf2d56 · 8px spacing',
    cssVars: {
      bg: '#f2f1ed', panel: '#ebeae5', surface: '#e6e5e0', surfaceLight: '#e1e0db',
      text: '#26251e', textSecondary: 'rgba(38,37,30,0.6)', textTertiary: '#737268',
      textQuaternary: 'rgba(38,37,30,0.3)', brand: '#f54e00', accent: '#f54e00', accentHover: '#cf2d56',
      border: 'rgba(38,37,30,0.1)', borderSubtle: 'rgba(38,37,30,0.06)',
    },
    hero: {
      bg: '#f2f1ed',
      headline: 'The AI-first\ncode editor',
      subtitle: 'Cursor is the AI-first code editor built for pair-programming with AI. Write, edit, and understand code faster.',
      headlineStyle: { fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '72px', fontWeight: 400, lineHeight: 1.10, letterSpacing: '-2.16px', color: '#26251e' },
      subtitleStyle: { fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '17px', fontWeight: 400, lineHeight: 1.35, color: 'rgba(38,37,30,0.55)' },
    },
    btn: {
      primary: { style: { background: '#ebeae5', color: '#26251e', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 400, fontFamily: 'system-ui, sans-serif', border: 'none', cursor: 'pointer' } as CSSProperties, label: 'Download' },
      secondary: { style: { background: '#e6e5e0', color: 'rgba(38,37,30,0.6)', padding: '3px 8px', borderRadius: '9999px', fontSize: '14px', fontWeight: 400, fontFamily: 'system-ui, sans-serif', border: 'none', cursor: 'pointer' } as CSSProperties, label: 'Features' },
      ghost: { style: { background: 'rgba(38,37,30,0.06)', color: 'rgba(38,37,30,0.55)', padding: '6px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: 400, fontFamily: 'system-ui, sans-serif', border: 'none', cursor: 'pointer' } as CSSProperties, label: 'Docs' },
    },
    card: {
      style: { background: '#ffffff', border: '1px solid rgba(38,37,30,0.1)', borderRadius: '8px', padding: '24px' },
      elevated: { background: '#e6e5e0', border: '1px solid rgba(38,37,30,0.2)', borderRadius: '10px', padding: '24px', boxShadow: 'rgba(0,0,0,0.14) 0px 28px 70px, rgba(0,0,0,0.1) 0px 14px 32px, rgba(38,37,30,0.1) 0px 0px 0px 1px' },
    },
    input: { style: { background: '#ebeae5', border: '1px solid rgba(38,37,30,0.1)', borderRadius: '8px', padding: '10px 14px', color: '#26251e', fontSize: '15px', fontFamily: 'system-ui, sans-serif', outline: 'none' } },
    shadowDemo: {
      flat: { background: '#ffffff', border: '1px solid rgba(38,37,30,0.1)', borderRadius: '8px', padding: '20px' },
      subtle: { background: '#ebeae5', border: '1px solid rgba(38,37,30,0.1)', borderRadius: '8px', padding: '20px', boxShadow: 'rgba(0,0,0,0.02) 0px 0px 16px, rgba(0,0,0,0.008) 0px 0px 8px' },
      elevated: { background: '#e6e5e0', border: '1px solid rgba(38,37,30,0.2)', borderRadius: '10px', padding: '20px', boxShadow: 'rgba(0,0,0,0.14) 0px 28px 70px, rgba(0,0,0,0.1) 0px 14px 32px, rgba(38,37,30,0.1) 0px 0px 0px 1px' },
      label: 'Warm oklab-space borders. Atmospheric depth: 28px/70px blur with moderate opacity. Cards feel like the page opened a space for them.',
    },
    badge: {
      primary: { background: 'rgba(245,78,0,0.1)', color: '#f54e00', borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 400, fontFamily: 'system-ui, sans-serif', border: '1px solid rgba(245,78,0,0.2)', display: 'inline-flex', alignItems: 'center' },
      success: { background: 'rgba(31,138,101,0.1)', color: '#1f8a65', borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 400, fontFamily: 'system-ui, sans-serif', border: 'none', display: 'inline-flex', alignItems: 'center' },
      outline: { background: 'rgba(38,37,30,0.03)', color: 'rgba(38,37,30,0.6)', borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 400, fontFamily: 'system-ui, sans-serif', border: '1px solid rgba(38,37,30,0.1)', display: 'inline-flex', alignItems: 'center' },
    },
    statCard: { style: { background: '#ffffff', border: '1px solid rgba(38,37,30,0.1)', borderRadius: '8px', padding: '20px', textAlign: 'center' }, numberStyle: { fontSize: '32px', fontWeight: 400, fontFamily: 'system-ui, sans-serif', letterSpacing: '-0.24px' } },
    tableRow: { style: { borderBottom: '1px solid rgba(38,37,30,0.1)' }, hover: { background: 'rgba(38,37,30,0.03)' } },
  },

  notion: {
    name: 'Notion',
    nativeDark: false,
    desc: 'Warm whites #f6f5f4 · Whisper borders rgba(0,0,0,0.1) · Sub-0.05 opacity shadows · Notion Blue #0075de · Weight 400-700 · Warm neutral undertones',
    cssVars: {
      bg: '#ffffff', panel: '#ffffff', surface: '#f6f5f4', surfaceLight: '#e6e6e5',
      text: 'rgba(0,0,0,0.95)', textSecondary: '#31302e', textTertiary: '#615d59',
      textQuaternary: '#a39e98', brand: '#0075de', accent: '#0075de', accentHover: '#005bab',
      border: 'rgba(0,0,0,0.1)', borderSubtle: 'rgba(0,0,0,0.05)',
    },
    hero: {
      bg: '#ffffff',
      headline: 'Write, plan,\nshare.',
      subtitle: 'With AI, Notion is the connected workspace where better, faster work happens.',
      headlineStyle: { fontFamily: '-apple-system, system-ui, sans-serif', fontSize: '64px', fontWeight: 700, lineHeight: 1.00, letterSpacing: '-2.125px', color: 'rgba(0,0,0,0.95)' },
      subtitleStyle: { fontFamily: '-apple-system, system-ui, sans-serif', fontSize: '20px', fontWeight: 600, lineHeight: 1.40, color: '#615d59' },
    },
    btn: {
      primary: { style: { background: '#0075de', color: '#ffffff', padding: '8px 16px', borderRadius: '4px', fontSize: '15px', fontWeight: 600, fontFamily: '-apple-system, sans-serif', border: '1px solid transparent', cursor: 'pointer' } as CSSProperties, label: 'Get Notion free' },
      secondary: { style: { background: 'rgba(0,0,0,0.05)', color: '#000000', padding: '8px 16px', borderRadius: '4px', fontSize: '15px', fontWeight: 600, fontFamily: '-apple-system, sans-serif', border: 'none', cursor: 'pointer' } as CSSProperties, label: 'Try Notion AI' },
      ghost: { style: { background: 'transparent', color: 'rgba(0,0,0,0.95)', padding: '8px 16px', borderRadius: '4px', fontSize: '15px', fontWeight: 600, fontFamily: '-apple-system, sans-serif', border: 'none', cursor: 'pointer', textDecoration: 'underline' } as CSSProperties, label: 'Request a demo' },
    },
    card: {
      style: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', padding: '24px', boxShadow: 'rgba(0,0,0,0.04) 0px 4px 18px, rgba(0,0,0,0.027) 0px 2.025px 7.84688px, rgba(0,0,0,0.02) 0px 0.8px 2.925px, rgba(0,0,0,0.01) 0px 0.175px 1.04062px' },
      elevated: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '16px', padding: '24px', boxShadow: 'rgba(0,0,0,0.01) 0px 1px 3px, rgba(0,0,0,0.02) 0px 3px 7px, rgba(0,0,0,0.02) 0px 7px 15px, rgba(0,0,0,0.04) 0px 14px 28px, rgba(0,0,0,0.05) 0px 23px 52px' },
    },
    input: { style: { background: '#ffffff', border: '1px solid #dddddd', borderRadius: '4px', padding: '6px', color: 'rgba(0,0,0,0.9)', fontSize: '15px', fontFamily: '-apple-system, sans-serif', outline: 'none' } },
    shadowDemo: {
      flat: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', padding: '20px' },
      subtle: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', padding: '20px', boxShadow: 'rgba(0,0,0,0.04) 0px 4px 18px, rgba(0,0,0,0.027) 0px 2.025px 7.85px, rgba(0,0,0,0.02) 0px 0.8px 2.93px, rgba(0,0,0,0.01) 0px 0.175px 1.04px' },
      elevated: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '16px', padding: '20px', boxShadow: 'rgba(0,0,0,0.01) 0px 1px 3px, rgba(0,0,0,0.02) 0px 3px 7px, rgba(0,0,0,0.02) 0px 7px 15px, rgba(0,0,0,0.04) 0px 14px 28px, rgba(0,0,0,0.05) 0px 23px 52px' },
      label: 'Whisper-thin borders (0.1 opacity). 4-5 layer shadows with sub-0.05 individual opacity. Cumulative soft natural elevation — felt not seen.',
    },
    badge: {
      primary: { background: '#f2f9ff', color: '#097fe8', borderRadius: '9999px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, fontFamily: '-apple-system, sans-serif', border: 'none', letterSpacing: '0.125px', display: 'inline-flex', alignItems: 'center' },
      success: { background: '#ecfdf5', color: '#1aae39', borderRadius: '9999px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, fontFamily: '-apple-system, sans-serif', border: 'none', display: 'inline-flex', alignItems: 'center' },
      outline: { background: 'transparent', color: '#615d59', borderRadius: '9999px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, fontFamily: '-apple-system, sans-serif', border: '1px solid rgba(0,0,0,0.1)', display: 'inline-flex', alignItems: 'center' },
    },
    statCard: { style: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', padding: '20px', textAlign: 'center', boxShadow: 'rgba(0,0,0,0.04) 0px 4px 18px' }, numberStyle: { fontSize: '32px', fontWeight: 700, fontFamily: '-apple-system, sans-serif', letterSpacing: '-0.24px' } },
    tableRow: { style: { borderBottom: '1px solid rgba(0,0,0,0.1)' }, hover: { background: '#f6f5f4' } },
  },

  posthog: {
    name: 'PostHog',
    nativeDark: false,
    desc: 'Warm parchment #fdfdf8 · Sage/olive palette · Hidden orange #F54E00 on hover · Dark near-black CTAs #1e1f23 · IBM Plex Sans bold · Sage-tinted borders #bfc1b7',
    cssVars: {
      bg: '#fdfdf8', panel: '#eeefe9', surface: '#e5e7e0', surfaceLight: '#e1e0db',
      text: '#4d4f46', textSecondary: '#65675e', textTertiary: '#9ea096',
      textQuaternary: '#bfc1b7', brand: '#1e1f23', accent: '#F54E00', accentHover: '#F7A501',
      border: '#bfc1b7', borderSubtle: '#b6b7af',
    },
    hero: {
      bg: '#fdfdf8',
      headline: 'Open source\nproduct analytics',
      subtitle: 'Understand your users. Ship better products. PostHog is the open-source platform for product analytics, session replay, and more.',
      headlineStyle: { fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: '48px', fontWeight: 800, lineHeight: 1.20, letterSpacing: '-0.75px', color: '#4d4f46' },
      subtitleStyle: { fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontSize: '16px', fontWeight: 400, lineHeight: 1.50, color: '#65675e' },
    },
    btn: {
      primary: { style: { background: '#1e1f23', color: '#ffffff', padding: '10px 12px', borderRadius: '6px', fontSize: '15px', fontWeight: 700, fontFamily: '"IBM Plex Sans", sans-serif', border: 'none', cursor: 'pointer' } as CSSProperties, label: 'Get started - free' },
      secondary: { style: { background: '#e5e7e0', color: '#4d4f46', padding: '4px', borderRadius: '4px', fontSize: '14px', fontWeight: 400, fontFamily: '"IBM Plex Sans", sans-serif', border: 'none', cursor: 'pointer' } as CSSProperties, label: 'Book a demo' },
      ghost: { style: { background: '#fdfdf8', color: '#4d4f46', padding: '8px 12px', borderRadius: '4px', fontSize: '14px', fontWeight: 400, fontFamily: '"IBM Plex Sans", sans-serif', border: '1px solid transparent', cursor: 'pointer' } as CSSProperties, label: 'Docs' },
    },
    card: {
      style: { background: '#fdfdf8', border: '1px solid #bfc1b7', borderRadius: '6px', padding: '24px' },
      elevated: { background: '#fdfdf8', border: '1px solid #bfc1b7', borderRadius: '6px', padding: '24px', boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)' },
    },
    input: { style: { background: '#eeefe9', border: '1px solid #b6b7af', borderRadius: '4px', padding: '10px 14px', color: '#4d4f46', fontSize: '15px', fontFamily: '"IBM Plex Sans", sans-serif', outline: 'none' } },
    shadowDemo: {
      flat: { background: '#fdfdf8', border: '1px solid #bfc1b7', borderRadius: '6px', padding: '20px' },
      subtle: { background: '#eeefe9', border: '1px solid #bfc1b7', borderRadius: '6px', padding: '20px' },
      elevated: { background: '#fdfdf8', border: '1px solid #bfc1b7', borderRadius: '6px', padding: '20px', boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)' },
      label: 'Minimal shadows. Depth = border containment (#bfc1b7) + surface color shifts (#fdfdf8 → #eeefe9 → #e5e7e0). One shadow for modals: 25px/50px deep',
    },
    badge: {
      primary: { background: 'rgba(245,78,0,0.1)', color: '#F54E00', borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 400, fontFamily: '"IBM Plex Sans", sans-serif', border: 'none', display: 'inline-flex', alignItems: 'center' },
      success: { background: '#ecfdf5', color: '#166534', borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 400, fontFamily: '"IBM Plex Sans", sans-serif', border: 'none', display: 'inline-flex', alignItems: 'center' },
      outline: { background: '#eeefe9', color: '#65675e', borderRadius: '9999px', padding: '4px 10px', fontSize: '12px', fontWeight: 400, fontFamily: '"IBM Plex Sans", sans-serif', border: '1px solid #bfc1b7', display: 'inline-flex', alignItems: 'center' },
    },
    statCard: { style: { background: '#fdfdf8', border: '1px solid #bfc1b7', borderRadius: '6px', padding: '20px', textAlign: 'center' }, numberStyle: { fontSize: '32px', fontWeight: 800, fontFamily: '"IBM Plex Sans", sans-serif' } },
    tableRow: { style: { borderBottom: '1px solid #bfc1b7' }, hover: { background: '#eeefe9' } },
  },
}

const themeKeys = Object.keys(THEMES)

/* ------------------------------------------------------------------ */
/*  Component helpers                                                 */
/* ------------------------------------------------------------------ */

function Section({ title, subtitle, children, style }: { title: string; subtitle?: string; children: React.ReactNode; style?: CSSProperties }) {
  return (
    <section style={{ marginBottom: '48px', ...style }}>
      <div style={{ marginBottom: '8px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.4px', opacity: 0.5 }}>{subtitle}</div>
      <h2 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 600, borderBottom: '1px solid rgba(128,128,128,0.2)', paddingBottom: '8px' }}>{title}</h2>
      {children}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Main showcase                                                     */
/* ------------------------------------------------------------------ */

export default function DesignShowcase() {
  const [key, setKey] = useState('cursor')
  const t = THEMES[key]

  // Each theme auto-sets its native mode
  useEffect(() => {
    document.documentElement.style.removeProperty('color-scheme')
    if (t.nativeDark) {
      document.documentElement.classList.add('dark')
      document.documentElement.style.setProperty('color-scheme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.setProperty('color-scheme', 'light')
    }
  }, [key, t.nativeDark])

  const c = t.cssVars
  const isDark = t.nativeDark

  return (
    <div style={{ background: c.bg, color: isDark ? c.text : c.text, minHeight: '100vh', transition: 'background 0.3s, color 0.3s' }}>
      {/* ---- Header ---- */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${c.border}` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Design System Showcase</h1>
              <p style={{ fontSize: '13px', color: c.textTertiary, marginTop: '2px' }}>选择你最喜欢的设计方向</p>
            </div>
            <span style={{ fontSize: '12px', color: c.textTertiary, background: c.surface, padding: '4px 12px', borderRadius: '4px' }}>
              {isDark ? 'Dark native' : 'Light native'}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {themeKeys.map(k => (
              <button
                key={k}
                onClick={() => setKey(k)}
                style={{
                  padding: '6px 16px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                  background: k === key ? c.brand : 'transparent',
                  color: k === key ? (isDark ? '#fff' : (k === 'clickhouse' ? '#000' : '#fff')) : c.textSecondary,
                  borderRadius: k === 'supabase' || k === 'cursor' ? '9999px' : '6px',
                  border: k === key ? 'none' : `1px solid ${c.border}`,
                }}
              >
                {THEMES[k].name}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: c.textTertiary, marginTop: '10px', lineHeight: 1.5 }}>{t.desc}</p>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>

        {/* ======== HERO ======== */}
        <Section title="Hero / 首页" subtitle="Typography & first impression">
          <div style={{ padding: '64px 0', textAlign: 'center' }}>
            <h1 style={t.hero.headlineStyle}>{t.hero.headline}</h1>
            <p style={{ ...t.hero.subtitleStyle, maxWidth: '560px', margin: '24px auto 32px' }}>{t.hero.subtitle}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button style={t.btn.primary.style}>{t.btn.primary.label}</button>
              <button style={t.btn.secondary.style}>{t.btn.secondary.label}</button>
              <button style={t.btn.ghost.style}>{t.btn.ghost.label}</button>
            </div>
          </div>
        </Section>

        {/* ======== SHADOW PHILOSOPHY ======== */}
        <Section title="Shadow Philosophy / 阴影哲学" subtitle="Depth & elevation system">
          <p style={{ fontSize: '13px', color: c.textTertiary, marginBottom: '16px', lineHeight: 1.6 }}>{t.shadowDemo.label}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {[
              { label: 'Flat (Level 0)', style: t.shadowDemo.flat },
              { label: 'Subtle (Level 1-2)', style: t.shadowDemo.subtle },
              { label: 'Elevated (Level 3+)', style: t.shadowDemo.elevated },
            ].map(item => (
              <div key={item.label} style={{ ...item.style, textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>Aa</div>
                <div style={{ fontSize: '12px', color: c.textTertiary }}>{item.label}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ======== BUTTON CONSTRUCTION ======== */}
        <Section title="Button Construction / 按钮构造" subtitle="Notice shadow, border, radius, and weight differences">
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <button style={t.btn.primary.style}>{t.btn.primary.label}</button>
              <div style={{ fontSize: '11px', color: c.textTertiary, marginTop: '6px' }}>Primary</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button style={t.btn.secondary.style}>{t.btn.secondary.label}</button>
              <div style={{ fontSize: '11px', color: c.textTertiary, marginTop: '6px' }}>Secondary</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button style={t.btn.ghost.style}>{t.btn.ghost.label}</button>
              <div style={{ fontSize: '11px', color: c.textTertiary, marginTop: '6px' }}>Ghost</div>
            </div>
          </div>
        </Section>

        {/* ======== CARD CONSTRUCTION ======== */}
        <Section title="Card Construction / 卡片构造" subtitle="Standard vs Elevated — compare shadow and border treatments">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {/* Stat card */}
            <div style={t.statCard.style}>
              <div style={t.statCard.numberStyle}>128</div>
              <div style={{ fontSize: '13px', color: c.textTertiary, marginTop: '4px' }}>总提交</div>
            </div>
            {/* Standard card */}
            <div style={t.card.style}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>竞赛信息</h3>
              <div style={{ fontSize: '13px', color: c.textTertiary, lineHeight: 1.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>状态</span>
                  <span style={t.badge.success}>Accepted</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>参与人数</span>
                  <span style={{ fontWeight: 600 }}>128 人</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>题目数量</span>
                  <span style={{ fontWeight: 600 }}>5 题</span>
                </div>
              </div>
            </div>
            {/* Elevated card */}
            <div style={t.card.elevated}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>快速操作</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button style={{ ...t.btn.primary.style, width: '100%', textAlign: 'center' }}>创建题目</button>
                <button style={{ ...t.btn.secondary.style, width: '100%', textAlign: 'center' }}>导出数据</button>
              </div>
            </div>
          </div>
        </Section>

        {/* ======== BADGES ======== */}
        <Section title="Badge Construction / 徽章构造" subtitle="Note radius, background opacity, border weight differences">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={t.badge.primary}>Primary</span>
            <span style={t.badge.success}>Accepted</span>
            <span style={t.badge.outline}>Outline</span>
          </div>
        </Section>

        {/* ======== INPUT ======== */}
        <Section title="Input / 输入框" subtitle="Focus ring, border treatment, inner shadow differences">
          <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input placeholder="请输入用户名" style={{ ...t.input.style, width: '100%', boxSizing: 'border-box' }} readOnly />
            <input placeholder="禁用状态" style={{ ...t.input.style, width: '100%', boxSizing: 'border-box', opacity: 0.5, cursor: 'not-allowed' }} readOnly />
          </div>
        </Section>

        {/* ======== TABLE ======== */}
        <Section title="Table / 表格" subtitle="Row borders, hover states, header treatment">
          <div style={{ ...t.card.style, padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: c.surface }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: c.textTertiary }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: c.textTertiary }}>名称</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: c.textTertiary }}>难度</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: c.textTertiary }}>通过率</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: '1001', name: '两数之和', diff: '简单', rate: '78%', badge: 'success' },
                  { id: '1002', name: '反转链表', diff: '中等', rate: '56%', badge: 'primary' },
                  { id: '1003', name: '动态规划', diff: '困难', rate: '23%', badge: 'outline' },
                ].map(r => (
                  <tr key={r.id} style={t.tableRow.style}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{r.id}</td>
                    <td style={{ padding: '12px 16px' }}>{r.name}</td>
                    <td style={{ padding: '12px 16px' }}><span style={t.badge[r.badge as keyof typeof t.badge]}>{r.diff}</span></td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{r.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ======== FORM ======== */}
        <Section title="Form / 表单" subtitle="Complete form with label, input, and action buttons">
          <div style={{ ...t.card.elevated, maxWidth: '560px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>创建题目</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>题目名称</label>
              <input placeholder="请输入题目名称" style={{ ...t.input.style, width: '100%', boxSizing: 'border-box' }} readOnly />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>难度</label>
                <input value="中等 ▾" style={{ ...t.input.style, width: '100%', boxSizing: 'border-box' }} readOnly />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>时间限制</label>
                <input value="1000 ms" style={{ ...t.input.style, width: '100%', boxSizing: 'border-box' }} readOnly />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button style={t.btn.ghost.style}>取消</button>
              <button style={t.btn.primary.style}>创建</button>
            </div>
          </div>
        </Section>

      </main>
    </div>
  )
}
