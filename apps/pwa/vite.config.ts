import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'Civora — Alerta Vecinal',
        short_name: 'Civora',
        description: 'Reporte y seguimiento comunitario de incidentes con detección explicable de duplicados',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#3F5F8F',
        background_color: '#EDEFF3',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        navigateFallback: '/index.html',
        // Never cache private API endpoints or presigned URLs per Section 9
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//]
      }
    })
  ],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../src/shared')
    }
  },
  server: {
    port: 5173,
    host: true
  }
});

