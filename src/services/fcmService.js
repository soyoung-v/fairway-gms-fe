import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging'

// Firebase 앱을 초기화한다 — 중복 초기화 방지를 위해 기존 앱이 있으면 재사용한다
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const messaging = getMessaging(app)

// FCM 토큰을 발급한다 — 알림 권한 요청 후 성공 시 토큰 문자열 반환, 실패 시 null 반환
// VAPID 키가 없으면 토큰 발급이 불가능하다 (Firebase Console → 클라우드 메시징 → 웹 푸시 인증서)
export async function requestFcmToken() {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
  if (!vapidKey) {
    console.warn('[FCM] VAPID 키가 설정되지 않았습니다.')
    return null
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.info('[FCM] 알림 권한이 거부되었습니다.')
      return null
    }

    const token = await getToken(messaging, { vapidKey })
    return token ?? null
  } catch (err) {
    console.error('[FCM] 토큰 발급 실패:', err)
    return null
  }
}

// FCM 토큰을 삭제한다 — 로그아웃 시 서버 해제 API 호출 전에 실행한다
export async function revokeFcmToken() {
  try {
    await deleteToken(messaging)
  } catch (err) {
    console.error('[FCM] 토큰 삭제 실패:', err)
  }
}

// 앱이 포그라운드 상태일 때 FCM 메시지를 수신해 콜백으로 전달한다
// 백그라운드 수신은 public/firebase-messaging-sw.js 서비스 워커가 처리한다
export function onForegroundMessage(callback) {
  return onMessage(messaging, (payload) => {
    callback(payload)
  })
}
