import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import authRoutes    from './authRoutes'
import managerRoutes from './managerRoutes'
import caddyRoutes   from './caddyRoutes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 루트 → 역할에 따라 리다이렉트
    { path: '/', redirect: '/login' },

    ...authRoutes,
    ...managerRoutes,
    ...caddyRoutes,

    // 공통 에러 페이지
    { path: '/forbidden', component: () => import('@/views/common/ForbiddenPage.vue') },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/common/NotFoundPage.vue') },
  ],
})

// ─── 역할 접근 권한 확인 헬퍼 ────────────────────────────────────────────────
function canAccess(role, allowedRoles) {
  if (!allowedRoles || allowedRoles.length === 0) return true
  return allowedRoles.includes(role)
}

// ─── 전역 내비게이션 가드 ─────────────────────────────────────────────────────
router.beforeEach((to) => {
  const authStore = useAuthStore()
  const role      = authStore.userRole

  // ── 1. 인증 불필요 화면 ──────────────────────────────────────────────────
  if (!to.meta.requiresAuth) {
    // 이미 로그인된 사용자가 로그인/회원가입 페이지에 오면 역할 홈으로 이동
    const publicPaths = ['/', '/login', '/signup', '/signup/caddy', '/password-reset']
    if (authStore.isAuthenticated && publicPaths.includes(to.path)) {
      if (role === 'CADDY')    return '/caddy'
      if (role === 'MANAGER' || role === 'ADMIN') return '/admin/dashboard'
    }
    return true
  }

  // ── 2. 비인증 사용자 → 로그인 ────────────────────────────────────────────
  if (!authStore.isAuthenticated) {
    return '/login'
  }

  // ── 3. PENDING / REJECTED 계정 → 승인 대기 화면 강제 이동 ────────────────
  const RESTRICTED_STATUSES = ['PENDING', 'REJECTED']
  if (RESTRICTED_STATUSES.includes(authStore.status)) {
    const pendingPath = role === 'CADDY' ? '/caddy/pending' : '/admin/pending'
    if (to.path !== pendingPath) return pendingPath
    return true
  }

  // ── 4. 역할 권한 검사 ────────────────────────────────────────────────────
  if (!canAccess(role, to.meta.roles)) {
    // 접근 불가 → 역할별 홈으로 이동
    if (role === 'CADDY') return '/caddy'
    return '/admin/dashboard'
  }

  return true
})

export default router
