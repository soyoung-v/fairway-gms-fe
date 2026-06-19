<script setup>
// Manager/Admin Web 운영 화면 레이아웃 — 사이드바 + 상단 헤더 구조
import { computed, provide, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGolfCourseStore } from '@/stores/useGolfCourseStore'

const route      = useRoute()
const router     = useRouter()
const authStore       = useAuthStore()
const golfCourseStore = useGolfCourseStore()

// ─── 헤더: 날짜 및 골프장 정보 ────────────────────────────────────────────────

const todayStr = computed(() => {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${days[d.getDay()]})`
})

// Admin은 선택 골프장, Manager는 소속 골프장 이름을 표시한다
const currentGolfCourseName = computed(() => {
  if (authStore.isAdmin) {
    return golfCourseStore.selectedGolfCourseName || '골프장 미선택'
  }
  return authStore.golfCourseName || '소속 골프장'
})

const topbarSub = computed(() => `${todayStr.value} / ${currentGolfCourseName.value}`)

// ─── 헤더 액션: 현재 화면의 대표 액션(등록 모달 등)을 연결한다 ──────────────────
// 자식 View가 inject('registerOpenModal')로 자신의 모달 열기 함수를 등록한다
const openModalFn = ref(null)

provide('registerOpenModal', (fn) => {
  openModalFn.value = fn
})

function handleHeaderAction() {
  openModalFn.value?.()
}

// ─── 사이드바 메뉴 정의 ────────────────────────────────────────────────────────
// 순서가 사이드바 표시 순서가 된다. item.roles 없으면 모든 역할 허용.
const menuDefinitions = [
  {
    label: 'MAIN',
    items: [
      { label: '대시보드', path: 'dashboard', icon: 'grid' },
    ],
  },
  {
    label: 'OPERATION',
    items: [
      { label: '일일 운영 현황', path: 'daily-status',         icon: 'calendar', roles: ['MANAGER'] },
      { label: '대기 순번 관리', path: 'queues',               icon: 'list',     roles: ['MANAGER'] },
      { label: '운영 설정',      path: 'operation/settings',   icon: 'settings', roles: ['MANAGER'] },
      { label: '티타임 관리',    path: 'operation/tee-times',  icon: 'clock',    roles: ['MANAGER'] },
      { label: '예약팀 조회',    path: 'operation/reservation-teams', icon: 'team', roles: ['MANAGER'] },
    ],
  },
  {
    label: 'ASSIGNMENT',
    items: [
      { label: '캐디 배정',      path: 'assignment',         icon: 'assign',   roles: ['MANAGER'] },
      { label: '배정 이력',      path: 'assignment/history', icon: 'history',  roles: ['MANAGER'] },
      { label: '카트 배정',      path: 'assignment/carts',   icon: 'cart',     roles: ['MANAGER'] },
    ],
  },
  {
    label: 'CADDY',
    items: [
      { label: '캐디 목록',        path: 'caddies',            icon: 'person' },
      { label: '캐디 가입 승인',   path: 'caddie-approvals',   icon: 'check',    roles: ['MANAGER'] },
    ],
  },
  {
    label: 'SETTLEMENT',
    items: [
      { label: '캐디피 정책',    path: 'settlement/fee-policy',  icon: 'money',   roles: ['MANAGER'] },
      { label: '월별 정산',      path: 'settlement/monthly',      icon: 'sheet',   roles: ['MANAGER'] },
      { label: '정산 자료 내보내기', path: 'settlement/export',   icon: 'download', roles: ['MANAGER'] },
    ],
  },
  {
    label: 'BOARD',
    items: [
      { label: '게시판 관리',    path: 'board',              icon: 'board',   roles: ['MANAGER'] },
      { label: '순번교환 관리',  path: 'board/swap-requests', icon: 'swap',   roles: ['MANAGER'] },
    ],
  },
  {
    label: 'ADMIN',
    items: [
      { label: '골프장 관리',    path: 'golf-courses',       icon: 'golf',    roles: ['ADMIN'] },
      { label: '계정 관리',      path: 'accounts',           icon: 'account', roles: ['ADMIN'] },
      { label: 'Manager 승인',  path: 'manager-approvals',  icon: 'approve', roles: ['ADMIN'] },
    ],
  },
  {
    label: 'MY',
    items: [
      { label: '내 정보',        path: 'my-info',            icon: 'user' },
    ],
  },
]

// 현재 로그인 역할로 볼 수 없는 메뉴 항목을 필터링하고 절대 경로를 붙인다
const visibleMenuGroups = computed(() => {
  return menuDefinitions
    .map(group => ({
      ...group,
      items: group.items
        .filter(item => !item.roles || item.roles.includes(authStore.userRole))
        .map(item => ({ ...item, to: `/admin/${item.path}` })),
    }))
    .filter(group => group.items.length > 0)
})

// 현재 경로가 메뉴 경로와 일치하거나 하위 경로인지 확인한다
function isMenuActive(targetPath) {
  return route.path === targetPath || route.path.startsWith(`${targetPath}/`)
}

// ─── 로그아웃 ──────────────────────────────────────────────────────────────────
async function handleLogout() {
  authStore.logout()
  router.push('/login')
}

// ─── 사이드바 접기 ─────────────────────────────────────────────────────────────
const sidebarCollapsed = ref(false)
</script>

<template>
  <div class="manager-layout theme-manager">
    <!-- 사이드바 -->
    <aside class="manager-layout__sidebar" :class="{ 'is-collapsed': sidebarCollapsed }">
      <!-- 로고 -->
      <div class="sidebar__logo">
        <span class="sidebar__logo-text">FairwayGMS</span>
      </div>

      <!-- 메뉴 그룹 -->
      <nav class="sidebar__nav">
        <template v-for="group in visibleMenuGroups" :key="group.label">
          <span class="sidebar__group-label">{{ group.label }}</span>
          <RouterLink
            v-for="menu in group.items"
            :key="menu.to"
            :to="menu.to"
            class="sidebar__link"
            :class="{ 'is-active': isMenuActive(menu.to) }"
          >
            {{ menu.label }}
          </RouterLink>
        </template>
      </nav>

      <!-- 하단 로그아웃 -->
      <div class="sidebar__footer">
        <button class="sidebar__logout" type="button" @click="handleLogout">
          로그아웃
        </button>
      </div>
    </aside>

    <!-- 메인 영역 -->
    <div class="manager-layout__main">
      <!-- 상단 헤더 -->
      <header class="manager-layout__header">
        <div class="topbar__left">
          <!-- 현재 페이지 제목 -->
          <h1 class="topbar__title">{{ route.meta.title || 'FairwayGMS' }}</h1>
          <span class="topbar__sub">{{ topbarSub }}</span>
        </div>

        <div class="topbar__right">
          <!-- 화면별 대표 액션 버튼 — View가 registerOpenModal로 함수를 등록하면 표시 -->
          <button
            v-if="openModalFn"
            class="topbar__action-btn"
            type="button"
            @click="handleHeaderAction"
          >
            + 등록
          </button>

          <!-- 사용자 정보 -->
          <span class="topbar__user">{{ authStore.name }} ({{ authStore.userRole }})</span>
        </div>
      </header>

      <!-- 본문 -->
      <main class="manager-layout__content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* ─── 전체 레이아웃 ─────────────────────────────── */
.manager-layout {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg-page);
}

/* ─── 사이드바 ──────────────────────────────────── */
.manager-layout__sidebar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-sidebar-bg);
  color: var(--color-sidebar-text);
  transition: width var(--transition-normal);
  overflow: hidden;
}

.manager-layout__sidebar.is-collapsed {
  width: 60px;
}

.sidebar__logo {
  padding: var(--space-20) var(--space-16);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.sidebar__logo-text {
  font-size: var(--font-size-body);
  font-weight: 700;
  color: var(--color-sidebar-active-text);
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.sidebar__nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-12) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.sidebar__group-label {
  display: block;
  padding: var(--space-8) var(--space-16) var(--space-4);
  font-size: var(--font-size-detail);
  font-weight: 700;
  color: rgba(216, 243, 220, 0.45);
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.sidebar__link {
  display: block;
  padding: var(--space-8) var(--space-16);
  font-size: var(--font-size-body-sm);
  color: var(--color-sidebar-text);
  border-radius: var(--radius-6);
  margin: 0 var(--space-8);
  transition: background var(--transition-fast), color var(--transition-fast);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__link:hover {
  background: var(--color-sidebar-hover-bg);
}

.sidebar__link.is-active {
  background: var(--color-sidebar-active-bg);
  color: var(--color-sidebar-active-text);
  font-weight: 600;
}

.sidebar__footer {
  padding: var(--space-16);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.sidebar__logout {
  width: 100%;
  padding: var(--space-8) var(--space-12);
  font-size: var(--font-size-body-sm);
  color: var(--color-sidebar-text);
  border-radius: var(--radius-6);
  text-align: left;
  transition: background var(--transition-fast);
}

.sidebar__logout:hover {
  background: var(--color-sidebar-hover-bg);
}

/* ─── 메인 영역 ─────────────────────────────────── */
.manager-layout__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ─── 상단 헤더 ─────────────────────────────────── */
.manager-layout__header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-24);
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-small);
  flex-shrink: 0;
}

.topbar__left {
  display: flex;
  align-items: baseline;
  gap: var(--space-12);
}

.topbar__title {
  font-size: var(--font-size-heading-3);
  font-weight: 600;
  color: var(--color-text-primary);
}

.topbar__sub {
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
}

.topbar__right {
  display: flex;
  align-items: center;
  gap: var(--space-16);
}

.topbar__action-btn {
  padding: var(--space-8) var(--space-16);
  background: var(--manager-primary);
  color: var(--manager-primary-contrast);
  border-radius: var(--radius-8);
  font-size: var(--font-size-body-sm);
  font-weight: 600;
  transition: background var(--transition-fast);
}

.topbar__action-btn:hover {
  background: var(--manager-primary-hover);
}

.topbar__user {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}

/* ─── 본문 ──────────────────────────────────────── */
.manager-layout__content {
  flex: 1;
  padding: var(--space-24);
  overflow-y: auto;
}
</style>
