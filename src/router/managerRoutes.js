import ManagerLayout from '@/layouts/ManagerLayout.vue'

const managerMeta = {
  requiresAuth: true,
  roles: ['ADMIN', 'MANAGER'],
  layout: 'manager',
}

// Admin/Manager Web 운영 화면 — /admin prefix
export default [
  {
    path: '/admin',
    component: ManagerLayout,
    meta: managerMeta,
    children: [
      { path: '', redirect: '/admin/dashboard' },

      // ── 공통 (Admin + Manager) ──
      {
        path: 'dashboard',
        component: () => import('@/views/manager/dashboard/ManagerDashboard.vue'),
        meta: { ...managerMeta, title: '대시보드', uiId: 'UI-M002' },
      },
      {
        path: 'my-info',
        component: () => import('@/views/manager/my-info/MyInfoView.vue'),
        meta: { ...managerMeta, title: '내 정보', uiId: 'UI-M023' },
      },
      {
        path: 'courses',
        component: () => import('@/views/manager/course/CourseManageView.vue'),
        meta: { ...managerMeta, title: '코스 관리', uiId: 'UI-M005' },
      },
      {
        path: 'carts',
        component: () => import('@/views/manager/cart/CartManageView.vue'),
        meta: { ...managerMeta, title: '카트 관리', uiId: 'UI-M006' },
      },
      {
        path: 'caddies',
        component: () => import('@/views/manager/caddy/CaddieListView.vue'),
        meta: { ...managerMeta, title: '캐디 목록', uiId: 'UI-M007' },
      },
      {
        path: 'caddies/:caddyId',
        component: () => import('@/views/manager/caddy/CaddieDetailView.vue'),
        meta: { ...managerMeta, title: '캐디 상세', uiId: 'UI-M008' },
      },
      {
        path: 'assignment/history',
        component: () => import('@/views/manager/assignment/AssignmentHistoryView.vue'),
        meta: { ...managerMeta, title: '배정 이력', uiId: 'UI-M015' },
      },

      // ── Manager 전용 ──
      {
        path: 'daily-status',
        component: () => import('@/views/manager/daily-status/DailyStatusView.vue'),
        meta: { requiresAuth: true, roles: ['MANAGER'], layout: 'manager', title: '일일 운영 현황', uiId: 'UI-M010' },
      },
      {
        path: 'queues',
        component: () => import('@/views/manager/queue/QueueManageView.vue'),
        meta: { requiresAuth: true, roles: ['MANAGER'], layout: 'manager', title: '대기 순번 관리', uiId: 'UI-M009' },
      },
      {
        path: 'operation/settings',
        component: () => import('@/views/manager/operation/OperationSettingView.vue'),
        meta: { requiresAuth: true, roles: ['MANAGER'], layout: 'manager', title: '운영 설정', uiId: 'UI-M011' },
      },
      {
        path: 'operation/tee-times',
        component: () => import('@/views/manager/operation/TeeTimeView.vue'),
        meta: { requiresAuth: true, roles: ['MANAGER'], layout: 'manager', title: '티타임 관리', uiId: 'UI-M012' },
      },
      {
        path: 'operation/reservation-teams',
        component: () => import('@/views/manager/operation/ReservationTeamView.vue'),
        meta: { requiresAuth: true, roles: ['MANAGER'], layout: 'manager', title: '예약팀 조회', uiId: 'UI-M013' },
      },
      {
        path: 'assignment',
        component: () => import('@/views/manager/assignment/AssignmentView.vue'),
        meta: { requiresAuth: true, roles: ['MANAGER'], layout: 'manager', title: '캐디 배정', uiId: 'UI-M014' },
      },
      {
        path: 'assignment/carts',
        component: () => import('@/views/manager/assignment/CartAssignmentView.vue'),
        meta: { requiresAuth: true, roles: ['MANAGER'], layout: 'manager', title: '카트 배정', uiId: 'UI-M016' },
      },
      {
        path: 'assignment/by-course',
        component: () => import('@/views/manager/assignment/CourseAssignmentView.vue'),
        meta: { requiresAuth: true, roles: ['MANAGER'], layout: 'manager', title: '코스별 배정표', uiId: 'UI-M017' },
      },
      {
        path: 'caddie-approvals',
        component: () => import('@/views/manager/caddy/CaddieApprovalView.vue'),
        meta: { requiresAuth: true, roles: ['MANAGER'], layout: 'manager', title: '캐디 가입 승인', uiId: 'UI-M026' },
      },
      {
        path: 'settlement/fee-policy',
        component: () => import('@/views/manager/settlement/FeePolicyView.vue'),
        meta: { requiresAuth: true, roles: ['MANAGER'], layout: 'manager', title: '캐디피 정책', uiId: 'UI-M018' },
      },
      {
        path: 'settlement/monthly',
        component: () => import('@/views/manager/settlement/MonthlySettlementView.vue'),
        meta: { requiresAuth: true, roles: ['MANAGER'], layout: 'manager', title: '월별 정산', uiId: 'UI-M019' },
      },
      {
        path: 'settlement/export',
        component: () => import('@/views/manager/settlement/SettlementExportView.vue'),
        meta: { requiresAuth: true, roles: ['MANAGER'], layout: 'manager', title: '정산 자료 내보내기', uiId: 'UI-M020' },
      },
      {
        path: 'board',
        component: () => import('@/views/manager/board/BoardManageView.vue'),
        meta: { requiresAuth: true, roles: ['MANAGER'], layout: 'manager', title: '게시판 관리', uiId: 'UI-M021' },
      },
      {
        path: 'board/swap-requests',
        component: () => import('@/views/manager/board/SwapRequestManageView.vue'),
        meta: { requiresAuth: true, roles: ['MANAGER'], layout: 'manager', title: '순번교환 관리', uiId: 'UI-M022' },
      },

      // ── Admin 전용 ──
      {
        path: 'golf-courses',
        component: () => import('@/views/manager/golf-course/GolfCourseView.vue'),
        meta: { requiresAuth: true, roles: ['ADMIN'], layout: 'manager', title: '골프장 관리', uiId: 'UI-M004' },
      },
      {
        path: 'accounts',
        component: () => import('@/views/manager/account/AccountManageView.vue'),
        meta: { requiresAuth: true, roles: ['ADMIN'], layout: 'manager', title: '계정 관리', uiId: 'UI-M003' },
      },
      {
        path: 'manager-approvals',
        component: () => import('@/views/manager/account/ManagerApprovalView.vue'),
        meta: { requiresAuth: true, roles: ['ADMIN'], layout: 'manager', title: 'Manager 가입 승인', uiId: 'UI-M027' },
      },

    ],
  },
]
