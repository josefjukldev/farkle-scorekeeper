import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Dices with Friends',
        short_name: 'Dices',
        description: 'Farkle scorekeeper for the table. Works offline.',
        lang: 'cs',
        display: 'standalone',
        start_url: './',
        scope: './',
        background_color: '#F2F4F7',
        theme_color: '#1D5FD6',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] }
    })
  ],
  test: { environment: 'node', include: ['tests/**/*.test.ts'] }
});
