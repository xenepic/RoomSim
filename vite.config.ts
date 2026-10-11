/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    // Precache the app shell so it opens offline (e.g. poor signal during a viewing)
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'RoomSim - 家具配置シミュレーター',
        short_name: 'RoomSim',
        description: '間取り図に家具を配置し、内見時の採寸を記録できるアプリ',
        lang: 'ja',
        display: 'standalone',
        start_url: '/',
        background_color: '#f5f5f5',
        theme_color: '#2563EB',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // Vercel Analytics endpoints must reach the network, not the SPA fallback
        navigateFallbackDenylist: [/^\/_vercel/],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
