/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // shadcn/ui CSS variable colors
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        // OJ Status colors (CSS variables)
        status: {
          accepted: 'hsl(var(--status-accepted))',
          wrong: 'hsl(var(--status-wrong))',
          pending: 'hsl(var(--status-pending))',
          tle: 'hsl(var(--status-tle))',
          re: 'hsl(var(--status-re))',
          error: 'hsl(var(--status-error))',
        },

        // OJ Difficulty colors (CSS variables)
        difficulty: {
          easy: 'hsl(var(--difficulty-easy))',
          medium: 'hsl(var(--difficulty-medium))',
          hard: 'hsl(var(--difficulty-hard))',
        },

        // Scene-specific tokens
        scene: {
          warm: {
            bg: 'hsl(var(--scene-warm-bg))',
            text: 'hsl(var(--scene-warm-text))',
          },
        },
      },
      fontFamily: {
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Fira Code', 'SF Mono', 'Monaco', 'Courier New', 'monospace'],
      },
      fontSize: {
        xs: '0.75rem',      // 12px
        sm: '0.8125rem',    // 13px — Linear default body size
        base: '0.875rem',   // 14px — denser than typical
        lg: '1rem',         // 16px
        xl: '1.125rem',     // 18px
        '2xl': '1.5rem',    // 24px
        '3xl': '2rem',      // 32px
        '4xl': '2.5rem',    // 40px
      },
      letterSpacing: {
        tight: '-0.02em',
      },
      borderRadius: {
        DEFAULT: '0.375rem', // 6px
        lg: '0.5rem',       // 8px
        xl: '0.75rem',      // 12px
        '2xl': '1rem',      // 16px
        full: '9999px',     // pill
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
        md: '0 4px 12px rgba(0, 0, 0, 0.4)',
        lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
        primary: '0 4px 14px rgba(94, 106, 210, 0.39)',
      },
      maxWidth: {
        md: '28rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
