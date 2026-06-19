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
    ],
  },
]
