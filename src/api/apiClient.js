import axios from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'

// 토큰 재발급 중 실패한 요청을 큐에 보관했다가 재시도한다
let isRefreshing = false
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

// 순환 참조 방지를 위해 router를 지연 로드한다
async function getRouter() {
  const module = await import('@/router')
  return module.default
}

// 모든 API 요청에 사용하는 공통 Axios 인스턴스
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  withCredentials: true,  // HttpOnly 쿠키 자동 전송 (rt 쿠키 경로 제한)
  timeout: 15000,
})

// ─── 요청 인터셉터 ────────────────────────────────────────────────────────────
// Authorization 헤더 주입 및 Admin course-scoped 헤더 설정
apiClient.interceptors.request.use((config) => {
  const authStore = useAuthStore()

  // Access Token을 Authorization 헤더에 주입한다
  if (authStore.accessToken) {
    config.headers['Authorization'] = `Bearer ${authStore.accessToken}`
  }

  // Admin이 특정 골프장 대상 API를 호출할 때만 X-Selected-Golf-Course-Id를 전달한다.
  // Manager/Caddy는 백엔드가 JWT의 소속 골프장을 기준으로 판단하므로 보내지 않는다.
  if (authStore.isAdmin) {
    // useGolfCourseStore 구현 후 아래 주석을 해제한다
    // const { useGolfCourseStore } = await import('@/stores/useGolfCourseStore')
    // const golfCourseStore = useGolfCourseStore()
    // if (golfCourseStore.selectedGolfCourseId) {
    //   config.headers['X-Selected-Golf-Course-Id'] = golfCourseStore.selectedGolfCourseId
    // }
  }

  return config
}, (error) => Promise.reject(error))

// ─── 응답 인터셉터 ────────────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status

    // ── 401 Unauthorized: 토큰 만료 처리 ──────────────────────────────────
    if (status === 401 && !originalRequest._retry) {
      // 로그인 API의 401은 비밀번호 오류 — 인터셉터에서 처리하지 않고 View에서 처리한다
      if (originalRequest.url?.includes('/auth/login')) {
        return Promise.reject(error)
      }

      // 재발급 중이면 큐에 추가하고 새 토큰 발급을 기다린다
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`
          return apiClient(originalRequest)
        }).catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const authStore = useAuthStore()

        // 인터셉터 재진입을 막기 위해 raw axios로 재발급 요청한다
        const refreshRes = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/auth/token/refresh`,
          { refreshToken: authStore.refreshToken },
          { withCredentials: true },
        )

        const newToken = refreshRes.data?.data?.accessToken
        authStore.setAuth({ accessToken: newToken })
        processQueue(null, newToken)

        originalRequest.headers['Authorization'] = `Bearer ${newToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        const authStore = useAuthStore()
        authStore.logout()
        const router = await getRouter()
        router.push('/login')
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // ── 403 Forbidden: 비즈니스 에러코드 vs 순수 권한 없음 분기 ──────────
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
