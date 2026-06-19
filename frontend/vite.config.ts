import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

function vendorChunk(id: string) {
  const normalizedId = id.split(path.sep).join('/')
  if (!normalizedId.includes('/node_modules/')) return

  if (normalizedId.includes('/node_modules/@monaco-editor/')) {
    return 'vendor-monaco'
  }

  if (normalizedId.includes('/node_modules/monaco-editor/')) {
    return 'vendor-monaco'
  }

  if (
    normalizedId.includes('/node_modules/@codemirror/') ||
    normalizedId.includes('/node_modules/@lezer/')
  ) {
    return 'vendor-codemirror'
  }

  if (
    normalizedId.includes('/node_modules/recharts/') ||
    normalizedId.includes('/node_modules/d3-') ||
    normalizedId.includes('/node_modules/victory-vendor/')
  ) {
    return 'vendor-charts'
  }

  if (normalizedId.includes('/node_modules/@xyflow/')) {
    return 'vendor-flow'
  }

  if (
    normalizedId.includes('/node_modules/react/') ||
    normalizedId.includes('/node_modules/react-dom/') ||
    normalizedId.includes('/node_modules/scheduler/') ||
    normalizedId.includes('/node_modules/react-router') ||
    normalizedId.includes('/node_modules/@tanstack/react-query/')
  ) {
    return 'vendor-react'
  }
}

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
    chunkSizeWarningLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
})
