import { defineStore } from 'pinia'
import { ref } from 'vue'
import notificationApi from '@/api/notificationApi'
import { requestFcmToken, revokeFcmToken } from '@/services/fcmService'

// FCM 토큰을 localStorage에 저장하는 키 — 로그아웃 시 복구하여 서버에서 해제한다
const FCM_TOKEN_KEY = 'gms_fcm_token'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([])
  const unreadCount   = ref(0)
  const settings      = ref(null) // NotificationSettingRes
  const hasNextPage   = ref(false)
  const currentPage   = ref(0)
  const loading       = ref(false)
  const error         = ref('')

  // 알림 목록을 불러온다 (첫 페이지)
  async function fetchNotifications() {
    loading.value = true
    error.value   = ''
    currentPage.value = 0
    try {
      const page = await notificationApi.getNotifications({ page: 0, size: 20 })
      notifications.value = page?.content ?? []
      hasNextPage.value   = !page?.last
    } catch {
      error.value = '알림 목록을 불러오지 못했습니다.'
    } finally {
      loading.value = false
    }
  }

  // 미읽음 알림 수를 조회한다 — 레이아웃 배지 표시용
  async function fetchUnreadCount() {
    try {
      const data    = await notificationApi.getUnreadCount()
      unreadCount.value = data?.unreadCount ?? 0
    } catch {
      // 미읽음 수 조회 실패는 조용히 무시한다
    }
  }

  // 단건 읽음 처리 후 로컬 상태를 갱신한다
  async function readOne(notificationId) {
    const updated = await notificationApi.markAsRead(notificationId)
    const idx = notifications.value.findIndex(n => n.notificationId === notificationId)
    if (idx !== -1) notifications.value[idx] = updated
    if (unreadCount.value > 0) unreadCount.value--
    return updated
  }

  // 전체 읽음 처리
  async function readAll() {
    await notificationApi.markAllAsRead()
    notifications.value = notifications.value.map(n => ({ ...n, isRead: true }))
    unreadCount.value   = 0
  }

  // 알림 설정을 불러온다
  async function fetchSettings() {
    try {
      settings.value = await notificationApi.getSettings()
    } catch {
      error.value = '알림 설정을 불러오지 못했습니다.'
    }
  }

  // 알림 설정을 수정한다
  async function saveSettings(payload) {
    settings.value = await notificationApi.updateSettings(payload)
    return settings.value
  }

  // FCM 토큰을 발급하고 서버에 등록한다 — Caddy 로그인 성공 후 호출
  // 브라우저 알림 권한 요청 → 토큰 발급 → 서버 등록 → localStorage 저장
  async function registerFcmToken() {
    const token = await requestFcmToken()
    if (!token) return

    try {
      await notificationApi.registerFcmToken({ token, deviceType: 'MOBILE' })
      localStorage.setItem(FCM_TOKEN_KEY, token)
    } catch {
      // 토큰 서버 등록 실패 시 로컬도 저장하지 않는다
      console.warn('[FCM] 토큰 서버 등록 실패')
    }
  }

  // FCM 토큰을 해제한다 — 로그아웃 직전 호출
  // Firebase SDK에서 토큰 삭제 + 서버에서도 해제
  async function unregisterFcmToken() {
    const token = localStorage.getItem(FCM_TOKEN_KEY)

    // Firebase SDK 토큰 폐기
    await revokeFcmToken()

    // 서버 토큰 해제 — 토큰이 있는 경우에만 시도
    if (token) {
      try {
        await notificationApi.deleteFcmToken(token)
      } catch {
        // 서버 해제 실패는 무시 — 토큰 만료 등으로 이미 해제된 경우
      }
      localStorage.removeItem(FCM_TOKEN_KEY)
    }
  }

  function $reset() {
    notifications.value = []
    unreadCount.value   = 0
    settings.value      = null
    hasNextPage.value   = false
    currentPage.value   = 0
    loading.value       = false
    error.value         = ''
  }

  return {
    notifications,
    unreadCount,
    settings,
    hasNextPage,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    readOne,
    readAll,
    fetchSettings,
    saveSettings,
    registerFcmToken,
    unregisterFcmToken,
    $reset,
  }
})
