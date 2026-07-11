import axios from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGolfCourseStore } from '@/stores/useGolfCourseStore'

// 토큰 재발급 중 실패한 요청을 큐에 보관했다가 재시도한다
let isRefreshing = false
let failedQueue = []

function processQueue(error) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve()
  })
  failedQueue = []
}

// 순환 참조 방지를 위해 router를 지연 로드한다
async function getRouter() {
  const module = await import('@/router')
  return module.default
}

// 모든 API 요청에 사용하는 공통 Axios 인스턴스
// 인증은 HttpOnly Cookie로 처리된다 — withCredentials: true 하나로 충분
//
// prod에서는 상대경로('')로 호출한다. 프론트(vercel)와 백엔드(duckdns)가 다른 도메인이면
// 인증 쿠키가 서드파티 쿠키가 되어 시크릿창/사파리에서 차단된다.
// vercel.json 프록시(/api → 백엔드)로 same-origin 호출하면 쿠키가 1st-party가 되어 어디서든 동작한다.
// dev(localhost)는 프록시가 없으므로 VITE_API_BASE_URL(=http://localhost:8080)을 그대로 쓴다.
const API_BASE = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080')

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 15000,
})

// ─── 요청 인터셉터 ────────────────────────────────────────────────────────────
// Authorization 헤더는 설정하지 않는다. at 쿠키가 자동 전송된다.
// Admin이 course-scoped API를 호출할 때만 X-Selected-Golf-Course-Id를 추가한다.
apiClient.interceptors.request.use((config) => {
  const authStore = useAuthStore()

  // Admin의 course-scoped API 호출 시 선택된 골프장 ID를 헤더로 전달한다.
  // Manager/Caddy는 백엔드가 JWT 소속 골프장 기준으로 처리하므로 보내지 않는다.
  if (authStore.isAdmin) {
    const golfCourseStore = useGolfCourseStore()
    if (golfCourseStore.selectedGolfCourseId) {
      config.headers['X-Selected-Golf-Course-Id'] = golfCourseStore.selectedGolfCourseId
    }
  }

  return config
}, (error) => Promise.reject(error))

// ─── 응답 인터셉터 ────────────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status

    // ── 401 Unauthorized: at 쿠키 만료 — rt 쿠키로 재발급 시도 ──────────────
    if (status === 401 && !originalRequest._retry) {
      // 로그인 API의 401은 비밀번호 오류 — 인터셉터에서 처리하지 않고 View에서 처리한다
      if (originalRequest.url?.includes('/auth/login')) {
        return Promise.reject(error)
      }

      // 재발급 중이면 큐에 추가하고 새 쿠키 발급을 기다린다
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // rt 쿠키는 withCredentials: true로 자동 전송된다. 요청 바디 불필요.
        // 인터셉터 재진입을 막기 위해 raw axios 인스턴스로 호출한다.
        await axios.post(
          `${API_BASE}/api/auth/token/refresh`,
          {},
          { withCredentials: true },
        )

        // 재발급 성공 — 새 at 쿠키가 Set-Cookie로 설정됨. 큐 해제 후 원래 요청 재시도.
        processQueue(null)
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)
        const authStore = useAuthStore()
        // 로그아웃으로 role이 지워지기 전에 Admin 여부를 저장한다
        const wasAdmin = authStore.isAdmin
        await authStore.logout()
        const router = await getRouter()
        // /caddy 계열 → 캐디 로그인, Admin → 관리자 로그인, 그 외 → Manager 로그인
        const currentPath = router.currentRoute?.value?.path || ''
        const loginPath = currentPath.startsWith('/caddy')
          ? '/caddy/login'
          : (wasAdmin ? '/admin/login' : '/login')
        router.push(loginPath)
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // ── 403 Forbidden: 비즈니스 에러코드 vs 순수 권한 없음 분기 ──────────────
    if (status === 403) {
      const errorCode = error.response?.data?.error?.code ?? ''
      // 비즈니스 에러코드 패턴: /^[A-Z]+_\d+_\d+$/ (예: CADDY_403_01)
      const isBusinessError = /^[A-Z]+_\d+_\d+$/.test(errorCode)

      if (!isBusinessError) {
        // 순수 권한 없음 → /forbidden 페이지로 이동
        const router = await getRouter()
        router.push('/forbidden')
      }
      // 비즈니스 에러코드는 reject해서 View의 catch에서 직접 처리한다
      return Promise.reject(error)
    }

    // 그 외 (404, 409, 422 등) — View의 catch에서 맥락에 맞게 처리한다
    return Promise.reject(error)
  },
)

export default apiClient
