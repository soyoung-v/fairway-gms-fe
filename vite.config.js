import { fileURLToPath, URL } from 'node:url'
import { writeFileSync } from 'node:fs'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// 서비스 워커는 Vite 번들러를 거치지 않아 import.meta.env 사용 불가
// 빌드/개발 시작 시 .env 값을 읽어 public/firebase-messaging-sw.js 를 자동 생성한다
function firebaseSwPlugin(env) {
  return {
    name: 'firebase-sw-generator',
    buildStart() {
      const swContent = `// 자동 생성 파일 — 직접 수정 금지 (vite.config.js에서 .env 값으로 생성)
// 앱이 닫혀 있거나 백그라운드 상태일 때 FCM 푸시 알림을 처리한다
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey:            '${env.VITE_FIREBASE_API_KEY}',
  authDomain:        '${env.VITE_FIREBASE_AUTH_DOMAIN}',
  projectId:         '${env.VITE_FIREBASE_PROJECT_ID}',
  storageBucket:     '${env.VITE_FIREBASE_STORAGE_BUCKET}',
  messagingSenderId: '${env.VITE_FIREBASE_MESSAGING_SENDER_ID}',
  appId:             '${env.VITE_FIREBASE_APP_ID}',
})

const messaging = firebase.messaging()

// payload.notification이 없으면 data-only 메시지 — 직접 알림을 생성한다
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'FairwayGMS'
  const body  = payload.notification?.body  ?? '새 알림이 있습니다.'
  const icon  = '/favicon.ico'
  self.registration.showNotification(title, { body, icon })
})
`
      writeFileSync(
        fileURLToPath(new URL('./public/firebase-messaging-sw.js', import.meta.url)),
        swContent,
      )
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      firebaseSwPlugin(env),
      // NFR-008: 캐디 모바일 PWA — firebase-messaging-sw.js는 FCM 전용 스코프로 별도 등록되어 공존한다
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: { enabled: false },
        manifest: {
          name: 'FairwayGMS',
          short_name: 'FairwayGMS',
          description: '골프장 캐디 배정 관리 시스템',
          theme_color: '#52B788',
          background_color: '#FFFFFF',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          lang: 'ko',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // SPA 라우팅 fallback — API/파이어베이스 SW 경로는 제외
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/, /^\/firebase-messaging-sw\.js/],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // 배정/알림은 실시간성이 중요해 런타임 캐싱은 두지 않는다
          runtimeCaching: [],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
