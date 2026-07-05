import { fileURLToPath, URL } from 'node:url'
import { writeFileSync } from 'node:fs'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

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
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
