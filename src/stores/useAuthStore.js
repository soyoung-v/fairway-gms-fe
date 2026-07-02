import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const STORAGE_KEY = 'gms_auth'

// 인증 사용자 정보와 역할을 관리하는 전역 스토어
// 토큰은 HttpOnly Cookie로 관리되므로 JS에서 직접 저장·참조하지 않는다
export const useAuthStore = defineStore('auth', () => {
  // ─── state ───────────────────────────────────────────
  const userId         = ref(null)
  const email          = ref('')
  const name           = ref('')
  const role           = ref('')    // 'ADMIN' | 'MANAGER' | 'CADDY'
  const status         = ref('')    // 'ACTIVE' | 'PENDING' | 'REJECTED' | 'WITHDRAWN'
  const golfCourseId   = ref(null)  // MANAGER/CADDY 소속 골프장 ID
  const golfCourseName = ref('')

  // ─── computed ─────────────────────────────────────────
  // 로그인 여부는 userId 존재 여부로 판단한다 (토큰은 쿠키에 있으므로 JS에서 확인 불가)
  const isAuthenticated = computed(() => !!userId.value)
  const isAdmin         = computed(() => role.value === 'ADMIN')
  const isManager       = computed(() => role.value === 'MANAGER')
  const isCaddy         = computed(() => role.value === 'CADDY')
  const userRole        = computed(() => role.value)

  // ─── actions ──────────────────────────────────────────

  // 로그인 성공 후 서버 응답의 사용자 정보를 저장한다. 토큰은 쿠키로 자동 관리된다.
  function login(userInfo) {
    userId.value        = userInfo.userId
    email.value         = userInfo.email         || ''
    name.value          = userInfo.name          || ''
    role.value          = userInfo.role          || ''
    status.value        = userInfo.status        || ''
    golfCourseId.value  = userInfo.golfCourseId  ?? null
    golfCourseName.value = userInfo.golfCourseName || ''
    _persist()
  }

  // 로그아웃 — FCM 토큰 해제(Caddy) → 서버 로그아웃 → 로컬 상태 초기화
  async function logout() {
    // Caddy 역할인 경우 FCM 토큰을 먼저 해제한다 (실패 시 무시)
    if (role.value === 'CADDY') {
      try {
        const { useNotificationStore } = await import('@/stores/useNotificationStore')
        await useNotificationStore().unregisterFcmToken()
      } catch {
        // FCM 해제 실패는 로그아웃 흐름을 막지 않는다
      }
    }
    try {
      const apiClient = (await import('@/api/apiClient')).default
      await apiClient.post('/api/auth/logout')
    } catch {
      // 서버 로그아웃 실패 시에도 로컬 상태는 반드시 초기화한다
    }
    _clear()
  }

  // 앱 초기화 시 localStorage에서 사용자 정보를 복원한다
  // 실제 인증 유효성은 첫 API 호출 시 서버가 쿠키로 검증한다
  function restoreAuth() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      userId.value        = saved.userId        ?? null
      email.value         = saved.email         || ''
      name.value          = saved.name          || ''
      role.value          = saved.role          || ''
      status.value        = saved.status        || ''
      golfCourseId.value  = saved.golfCourseId  ?? null
      golfCourseName.value = saved.golfCourseName || ''
    } catch {
      // 손상된 데이터는 무시하고 초기 상태 유지
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // 계정 상태만 갱신한다 — 승인 대기 화면 폴링에서 호출한다
  // store와 localStorage를 함께 갱신해야 새로고침 후에도 상태가 유지된다
  function setStatus(newStatus) {
    status.value = newStatus
    _persist()
  }

  // localStorage에 사용자 정보를 저장한다 (토큰은 포함하지 않는다)
  function _persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      userId:       userId.value,
      email:        email.value,
      name:         name.value,
      role:         role.value,
      status:       status.value,
      golfCourseId: golfCourseId.value,
      golfCourseName: golfCourseName.value,
    }))
  }

  function _clear() {
    userId.value        = null
    email.value         = ''
    name.value          = ''
    role.value          = ''
    status.value        = ''
    golfCourseId.value  = null
    golfCourseName.value = ''
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    // state
    userId, email, name, role, status, golfCourseId, golfCourseName,
    // computed
    isAuthenticated, isAdmin, isManager, isCaddy, userRole,
    // actions
    login, logout, restoreAuth, setStatus,
  }
})
