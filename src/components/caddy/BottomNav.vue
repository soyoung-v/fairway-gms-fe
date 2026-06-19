<script setup>
// Caddy Mobile PWA 하단 탭 내비게이션
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  {
    label: '홈',
    to: '/caddy',
    icon: 'home',
    // 정확히 /caddy인 경우에만 활성
    isActive: (path) => path === '/caddy',
  },
  {
    label: '배정',
    to: '/caddy/assignment',
    icon: 'assignment',
    isActive: (path) => path.startsWith('/caddy/assignment'),
  },
  {
    label: '대기',
    to: '/caddy/queue',
    icon: 'queue',
    isActive: (path) => path.startsWith('/caddy/queue'),
  },
  {
    label: '게시판',
    to: '/caddy/board',
    icon: 'board',
    isActive: (path) => path.startsWith('/caddy/board'),
  },
  {
    label: '내 정보',
    to: '/caddy/profile',
    icon: 'profile',
    isActive: (path) => path.startsWith('/caddy/profile'),
  },
]

// 현재 경로에서 활성 탭을 확인한다
const activePath = computed(() => route.path)
</script>

<template>
  <nav class="bottom-nav" role="navigation" aria-label="하단 탭 네비게이션">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="bottom-nav__item"
      :class="{ 'is-active': tab.isActive(activePath) }"
    >
      <!-- 홈 -->
      <svg v-if="tab.icon === 'home'" class="bottom-nav__icon" viewBox="0 0 24 24" fill="none">
        <path d="M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"
          stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <!-- 배정 -->
      <svg v-else-if="tab.icon === 'assignment'" class="bottom-nav__icon" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.8"/>
        <path d="M8 9h8M8 13h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <!-- 대기 -->
      <svg v-else-if="tab.icon === 'queue'" class="bottom-nav__icon" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
        <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <!-- 게시판 -->
      <svg v-else-if="tab.icon === 'board'" class="bottom-nav__icon" viewBox="0 0 24 24" fill="none">
        <path d="M4 6h16M4 10h16M4 14h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <!-- 내 정보 -->
      <svg v-else-if="tab.icon === 'profile'" class="bottom-nav__icon" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>

      <span class="bottom-nav__label">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  height: 64px;
  display: flex;
  align-items: stretch;
  background: var(--color-bg-card);
  border-top: 1px solid var(--color-border);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  z-index: 100;
}

.bottom-nav__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--color-text-disabled);
  transition: color var(--transition-fast);
  padding: var(--space-8) 0;
  -webkit-tap-highlight-color: transparent;
}

.bottom-nav__item.is-active {
  color: var(--caddy-primary);
}

.bottom-nav__item:active {
  opacity: 0.7;
}

.bottom-nav__icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.bottom-nav__label {
  font-size: var(--font-size-detail);
  font-weight: 500;
  line-height: 1;
}
</style>
