import CaddyLayout from '@/layouts/CaddyLayout.vue'

const caddyMeta = {
  requiresAuth: true,
  roles: ['CADDY'],
  layout: 'caddy',
}

// Caddy Mobile PWA 화면 — /caddy prefix
export default [
  {
    path: '/caddy',
    component: CaddyLayout,
    meta: caddyMeta,
    children: [
      {
        path: '',
        component: () => import('@/views/caddy/CaddyHomeView.vue'),
        meta: { ...caddyMeta, title: '홈', uiId: 'UI-C002' },
      },
      {
        path: 'assignment/:assignmentId',
        component: () => import('@/views/caddy/CaddyAssignmentDetailView.vue'),
        meta: { ...caddyMeta, title: '배정 상세', uiId: 'UI-C003' },
      },
      {
        path: 'queue',
        component: () => import('@/views/caddy/CaddyQueueView.vue'),
        meta: { ...caddyMeta, title: '대기 순번', uiId: 'UI-C004' },
      },
      {
        path: 'schedule',
        component: () => import('@/views/caddy/CaddyScheduleView.vue'),
        meta: { ...caddyMeta, title: '운영 시간표', uiId: 'UI-C005' },
      },
      {
        path: 'board',
        component: () => import('@/views/caddy/CaddyBoardListView.vue'),
        meta: { ...caddyMeta, title: '공지 게시판', uiId: 'UI-C006' },
      },
      {
        path: 'board/:postId',
        component: () => import('@/views/caddy/CaddyBoardDetailView.vue'),
        meta: { ...caddyMeta, title: '게시글 상세', uiId: 'UI-C007' },
      },
      {
        path: 'notifications',
        component: () => import('@/views/caddy/CaddyNotificationView.vue'),
        meta: { ...caddyMeta, title: '알림', uiId: 'UI-C008' },
      },
      {
        path: 'settings/notification',
        component: () => import('@/views/caddy/CaddyNotificationSettingView.vue'),
        meta: { ...caddyMeta, title: '알림 설정', uiId: 'UI-C009' },
      },
      {
        path: 'swap-requests',
        component: () => import('@/views/caddy/CaddySwapRequestView.vue'),
        meta: { ...caddyMeta, title: '순번교환', uiId: 'UI-C010' },
      },
      {
        path: 'profile',
        component: () => import('@/views/caddy/CaddyProfileView.vue'),
        meta: { ...caddyMeta, title: '내 정보', uiId: 'UI-C011' },
      },

      // 승인 대기 화면
      {
        path: 'pending',
        component: () => import('@/views/common/PendingPage.vue'),
        meta: { requiresAuth: true, roles: ['CADDY'], layout: 'auth', title: '승인 대기' },
      },
    ],
  },
]
