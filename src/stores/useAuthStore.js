import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const STORAGE_KEY = 'gms_auth'

// 인증 사용자 정보, 토큰, 역할을 관리하는 전역 스토어
export const useAuthStore = defineStore('auth', () => {
  // ─── state ───────────────────────────────────────────
  const userId        = ref(null)
  const email         = ref('')
  const name          = ref('')
  const role          = ref('')         // 'ADMIN' | 'MANAGER' | 'CADDY'
  const status        = ref('')         // 'ACTIVE' | 'PENDING' | 'REJECTED' | 'WITHDRAWN'
  const golfCourseId  = ref(null)       // MANAGER/CADDY 소속 골프장 ID
  const golfCourseName = ref('')
  const accessToken   = ref('')
  const refreshToken  = ref('')

  // ─── computed ─────────────────────────────────────────
  const isAuthenticated = computed(() => !!accessToken.value)
  const isAdmin         = computed(() => role.value === 'ADMIN')
  const isManager       = computed(() => role.value === 'MANAGER')
  const isCaddy         = computed(() => role.value === 'CADDY')
  // 라우터·인터셉터에서 역할 문자열을 직접 참조할 때 사용한다
  const userRole        = computed(() => role.value)

  // ─── actions ──────────────────────────────────────────

  // 로그인 성공 후 사용자 정보와 토큰을 저장하고 localStorage에 영속화한다
  function login(userInfo, tokens) {
    userId.value       = userInfo.userId
    email.value        = userInfo.email || ''
    name.value         = userInfo.name  || ''
    role.value         = userInfo.role  || ''
    status.value       = userInfo.status || ''
    golfCourseId.value  = userInfo.golfCourseId  ?? null
    golfCourseName.value = userInfo.golfCourseName || ''
    accessToken.value  = tokens.accessToken  || ''
    refreshToken.value = tokens.refreshToken || ''

    _persist()
  }

  // Access Token만 갱신한다 — 401 재발급 후 인터셉터에서 호출한다
  function setAuth({ accessToken: newToken }) {
    accessToken.value = newToken
    _persist()
  }

  // 로그아웃 — 상태와 localStorage를 모두 초기화한다
  function logout() {
    userId.value        = null
    email.value         = ''
    name.value          = ''
    role.value          = ''
    status.value        = ''
    golfCourseId.value  = null
    golfCourseName.value = ''
    accessToken.value   = ''
    refreshToken.value  = ''
    localStorage.removeItem(STORAGE_KEY)
  }

  // 앱 초기화 시 localStorage에서 인증 정보를 복원한다
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
      accessToken.value   = saved.accessToken   || ''
      refreshToken.value  = saved.refreshToken  || ''
    } catch {
      // 손상된 데이터는 무시하고 초기 상태 유지
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // 계정 상태만 갱신한다 — 승인 대기 화면 폴링에서 호출한다
  function setStatus(newStatus) {
    status.value = newStatus
    _persist()
  }

  // localStorage에 현재 상태를 직렬화해 저장한다
  function _persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      userId:       userId.value,
      email:        email.value,
      name:         name.value,
      role:         role.value,
      status:       status.value,
      golfCourseId: golfCourseId.value,
      golfCourseName: golfCourseName.value,
      accessToken:  accessToken.value,
      refreshToken: refreshToken.value,
    }))
  }

  return {
    // state
    userId, email, name, role, status,
    golfCourseId, golfCourseName,
    accessToken, refreshToken,
    // computed
    isAuthenticated, isAdmin, isManager, isCaddy, userRole,
    // actions
    login, logout, restoreAuth, setAuth, setStatus,
  }
})
