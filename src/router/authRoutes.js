import AuthLayout from '@/layouts/AuthLayout.vue'

// 로그인·회원가입·비밀번호 재설정 — 인증 불필요 화면
export default [
  {
    path: '/',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/views/auth/login/LoginView.vue'),
        meta: { requiresAuth: false, layout: 'auth', title: '로그인' },
      },
      // Admin 전용 로그인 — Manager의 /login과 분리된 플랫폼 관리자 진입점
      {
        path: 'admin/login',
        name: 'admin-login',
        component: () => import('@/views/auth/login/LoginView.vue'),
        meta: { requiresAuth: false, layout: 'auth', title: '관리자 로그인', adminLogin: true },
      },
      // Caddy 전용 로그인 (UI-C001) — Manager/Admin의 /login과 분리된 PWA 진입점
      // authFull: AuthLayout 중앙정렬·배경 없이 자체 풀스크린으로 렌더링한다
      {
        path: 'caddy/login',
        name: 'caddy-login',
        component: () => import('@/views/auth/login/CaddyLoginView.vue'),
        meta: { requiresAuth: false, layout: 'auth', title: '캐디 로그인', authFull: true },
      },
      {
        path: 'signup',
        name: 'signup',
        component: () => import('@/views/auth/signup/SignupView.vue'),
        meta: { requiresAuth: false, layout: 'auth', title: 'Manager 회원가입' },
      },
      {
        path: 'signup/caddy',
        name: 'signup-caddy',
        component: () => import('@/views/auth/signup/CaddySignupView.vue'),
        meta: { requiresAuth: false, layout: 'auth', title: 'Caddy 회원가입' },
      },
      {
        path: 'password-reset',
        name: 'password-reset',
        component: () => import('@/views/auth/password/PasswordResetView.vue'),
        meta: { requiresAuth: false, layout: 'auth', title: '비밀번호 재설정' },
      },
      // 소셜 로그인 콜백 — 백엔드가 status(login/signup/pending/error)로 리다이렉트한다
      // authFull: 자체 풀스크린으로 렌더링
      {
        path: 'oauth/callback',
        name: 'oauth-callback',
        component: () => import('@/views/auth/login/OAuthCallbackView.vue'),
        meta: { requiresAuth: false, layout: 'auth', title: '소셜 로그인', authFull: true },
      },
      // 승인 대기 / 거절 안내 — 사이드바 없이 AuthLayout에서 렌더링한다
      {
        path: 'admin/pending',
        name: 'admin-pending',
        component: () => import('@/views/common/PendingPage.vue'),
        meta: { requiresAuth: true, roles: ['ADMIN', 'MANAGER'], layout: 'auth', title: '승인 대기' },
      },
      {
        path: 'caddy/pending',
        name: 'caddy-pending',
        component: () => import('@/views/common/PendingPage.vue'),
        meta: { requiresAuth: true, roles: ['CADDY'], layout: 'auth', title: '승인 대기' },
      },
    ],
  },
]
