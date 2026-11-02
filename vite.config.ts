import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// Сайт живёт по адресу https://zoom-koji.github.io/Project_himself/,
// поэтому все пути считаются от /Project_himself/.
const BASE = '/Project_himself/'

export default defineConfig({
  base: BASE,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Зачётка — органайзер студента',
        short_name: 'Зачётка',
        description: 'Расписание, задания, предметы и внеучебка в одном месте',
        lang: 'ru',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#5B3FD9',
        background_color: '#EEF0F8',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Долгое нажатие на иконку приложения → быстрые действия
        shortcuts: [
          { name: 'Расписание', short_name: 'Пары', url: `${BASE}#/schedule`, icons: [{ src: 'shortcut-schedule.png', sizes: '96x96', type: 'image/png' }] },
          { name: 'Новое задание', short_name: 'Задание', url: `${BASE}#/tasks?new=1`, icons: [{ src: 'shortcut-task.png', sizes: '96x96', type: 'image/png' }] },
          { name: 'Новый конспект', short_name: 'Конспект', url: `${BASE}#/study/notes/new`, icons: [{ src: 'shortcut-note.png', sizes: '96x96', type: 'image/png' }] },
        ],
      },
      workbox: {
        // Кэшируем всё приложение целиком, чтобы оно открывалось без интернета.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Греческий и вьетнамский варианты шрифта не нужны — не кладём их в офлайн-кэш.
        globIgnores: ['**/*-greek-*', '**/*-vietnamese-*'],
        // Страница возврата после входа в Яндекс — отдельная, не подменять её главной.
        navigateFallbackDenylist: [/oauth\.html/],
      },
    }),
  ],
})
