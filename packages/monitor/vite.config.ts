import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: process.env.MONITOR_SERVER || 'http://localhost:4000',
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.MONITOR_SERVER?.replace(/^http/, 'ws') || 'ws://localhost:4000',
        ws: true,
      },
    },
  },
});
