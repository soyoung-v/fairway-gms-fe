// 백그라운드 FCM 메시지 수신용 서비스 워커
// 앱이 닫혀 있거나 백그라운드 상태일 때 푸시 알림을 처리한다
// Vite 환경변수(import.meta.env)는 서비스 워커에서 사용 불가 — 값을 직접 넣는다
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey:            'AIzaSyDitLYx7npnqo1xhoIm4yzr9_3Cx9AQgT4',
  authDomain:        'fairway-gms.firebaseapp.com',
  projectId:         'fairway-gms',
  storageBucket:     'fairway-gms.firebasestorage.app',
  messagingSenderId: '454843999443',
  appId:             '1:454843999443:web:140ac5033b12014b7e6026',
})

const messaging = firebase.messaging()

// 백그라운드 메시지 수신 — FCM이 자동으로 시스템 알림을 표시한다
// payload.notification이 없으면 data-only 메시지이므로 직접 알림을 생성해야 한다
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'FairwayGMS'
  const body  = payload.notification?.body  ?? '새 알림이 있습니다.'
  const icon  = '/favicon.ico'

  self.registration.showNotification(title, { body, icon })
})
