import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
// Force restart
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: process.env.VITE_WS_PROXY_TARGET || process.env.VITE_API_BASE_URL || 'ws://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    target: 'chrome109',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (
            id.includes('@tanstack/react-query') ||
            id.includes('/axios/') ||
            id.includes('/zustand/')
          ) {
            return 'data-core'
          }

          if (id.includes('/lucide-react/')) {
            return 'icon-kit'
          }

          if (id.includes('/recharts/')) {
            return 'charts-kit'
          }

          if (
            id.includes('@monaco-editor/') ||
            id.includes('/monaco-editor/') ||
            id.includes('@codemirror/')
          ) {
            return 'editor-core'
          }

          if (
            id.includes('/react-markdown/') ||
            id.includes('/remark-gfm/') ||
            id.includes('/dompurify/')
          ) {
            return 'markdown-core'
          }

          if (id.includes('/react-syntax-highlighter/')) {
            return 'syntax-highlight'
          }

          if (
            id.includes('/react-hook-form/') ||
            id.includes('/zod/') ||
            id.includes('@hookform/resolvers')
          ) {
            return 'form-core'
          }
        },
      },
    },
  },
})
