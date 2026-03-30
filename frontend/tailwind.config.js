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
        // Primary colors (blue theme from reference)
        primary: {
          DEFAULT: '#003d9b',
          container: '#0052cc',
          fixed: '#dae2ff',
          'fixed-dim': '#b2c5ff',
          'on-primary': '#ffffff',
          'on-primary-container': '#c4d2ff',
          'on-primary-fixed': '#001848',
          'on-primary-fixed-variant': '#0040a2',
        },
        // Secondary colors (slate theme)
        secondary: {
          DEFAULT: '#515f74',
          container: '#d5e3fc',
          fixed: '#d5e3fc',
          'fixed-dim': '#b9c7df',
          'on-secondary': '#ffffff',
          'on-secondary-container': '#57657a',
          'on-secondary-fixed': '#0d1c2e',
          'on-secondary-fixed-variant': '#3a485b',
        },
        // Tertiary colors (green theme)
        tertiary: {
          DEFAULT: '#004e34',
          container: '#006847',
          fixed: '#85f8c4',
          'fixed-dim': '#68dba9',
          'on-tertiary': '#ffffff',
          'on-tertiary-container': '#75e8b5',
          'on-tertiary-fixed': '#002114',
          'on-tertiary-fixed-variant': '#005137',
        },
        // Error colors
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
          'on-error': '#ffffff',
          'on-error-container': '#93000a',
        },
        // Surface colors
        surface: {
          DEFAULT: '#faf8ff',
          tint: '#0c56d0',
          variant: '#dae2fd',
          dim: '#d2d9f4',
          bright: '#faf8ff',
          'container-low': '#f2f3ff',
          'container-lowest': '#ffffff',
          container: '#eaedff',
          'container-high': '#e2e7ff',
          'container-highest': '#dae2fd',
        },
        // Inverse colors
        'inverse-surface': '#283044',
        'inverse-on-surface': '#eef0ff',
        'inverse-primary': '#b2c5ff',
        // Text colors
        'on-background': '#131b2e',
        'on-surface': '#131b2e',
        'on-surface-variant': '#434654',
        // Border colors
        outline: '#737685',
        'outline-variant': '#c3c6d6',
        // Background
        background: '#faf8ff',
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
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
      boxShadow: {
        sm: '0 1px 2px 0 rgba(15, 23, 42, 0.08)',
        md: '0 6px 18px 0 rgba(15, 23, 42, 0.10)',
        lg: '0 10px 30px 0 rgba(15, 23, 42, 0.14)',
        primary: '0 4px 14px 0 rgba(13, 89, 242, 0.39)',
        // Reference design shadows
        panel: '0 24px 60px rgba(19, 27, 46, 0.06)',
        'panel-soft': '0 18px 38px rgba(0, 61, 155, 0.08)',
        button: '0 16px 30px rgba(0, 61, 155, 0.18)',
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
