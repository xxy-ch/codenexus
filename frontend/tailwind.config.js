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
        white: '#ffffff',
        black: '#000000',
        primary: {
          DEFAULT: '#0d59f2',
          hover: '#0a47c9',
          light: '#3b82f6',
        },
        secondary: '#6366f1',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        background: {
          light: '#f5f6f8',
          dark: '#101622',
        },
        surface: {
          light: '#ffffff',
          dark: '#1e2433',
        },
        border: {
          light: '#e2e8f0',
          dark: '#334155',
        },
        text: {
          muted: '#6b7280',
          primary: {
            light: '#1f2937',
            dark: '#f3f4f6',
          },
          secondary: {
            light: '#6b7280',
            dark: '#9ca3af',
          },
        },
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        mono: ['Fira Code', 'Monaco', 'Courier New', 'monospace'],
      },
      spacing: {
        0: '0px',
        1: '0.25rem',
        2: '0.5rem',
        3: '0.75rem',
        4: '1rem',
        5: '1.25rem',
        6: '1.5rem',
        8: '2rem',
        10: '2.5rem',
        11: '2.75rem',
        12: '3rem',
        14: '3.5rem',
        16: '4rem',
        20: '5rem',
        24: '6rem',
        32: '8rem',
        40: '10rem',
        64: '16rem',
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(15, 23, 42, 0.08)',
        md: '0 6px 18px 0 rgba(15, 23, 42, 0.10)',
        lg: '0 10px 30px 0 rgba(15, 23, 42, 0.14)',
        'primary': '0 4px 14px 0 rgba(13, 89, 242, 0.39)',
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
