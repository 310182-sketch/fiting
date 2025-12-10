import { defineConfig } from 'vite';
import path from 'node:path';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/fiting/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Fiting',
        short_name: 'Fiting',
        start_url: '/',
        display: 'standalone',
        background_color: '#020617',
        theme_color: '#0f172a',
        icons: []
      }
    })
  ]
});
