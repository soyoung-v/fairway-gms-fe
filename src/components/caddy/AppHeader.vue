<script setup>
// Caddy Mobile PWA 상단 헤더 — 페이지 타이틀 + 알림 뱃지
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route  = useRoute()
const router = useRouter()

// 현재 라우트의 title 메타를 표시한다
const pageTitle = computed(() => route.meta?.title || 'FairwayGMS')

// TODO: useNotificationStore 구현 후 실제 미읽음 수 연결
// const notificationStore = useNotificationStore()
// const unreadCount = computed(() => notificationStore.unreadCount)
const unreadCount = 0  // placeholder

defineProps({
  showBack: { type: Boolean, default: false },
})

const emit = defineEmits(['back'])

function handleBack() {
  emit('back')
  if (window.history.length > 1) router.back()
}
</script>

<template>
  <header class="app-header">
    <!-- 뒤로가기 버튼 (showBack이 true일 때만 표시) -->
    <button
      v-if="showBack"
      class="app-header__back"
      type="button"
      aria-label="뒤로가기"
      @click="handleBack"
    >
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <!-- 페이지 타이틀 -->
    <h1 class="app-header__title">{{ pageTitle }}</h1>

    <!-- 알림 버튼 + 미읽음 뱃지 -->
    <RouterLink to="/caddy/notifications" class="app-header__notif" aria-label="알림">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-5-5.9V5a1 1 0 00-2 0v.1A6 6 0 006 11v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 01-6 0v-1m6 0H9"
          stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <!-- 미읽음 수 뱃지 — useNotificationStore 연결 전 placeholder -->
      <span v-if="unreadCount > 0" class="app-header__badge">
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </RouterLink>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 var(--space-16);
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border);
  gap: var(--space-12);
}

.app-header__back {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-primary);
  border-radius: var(--radius-8);
  -webkit-tap-highlight-color: transparent;
}

.app-header__back svg {
  width: 22px;
  height: 22px;
}

.app-header__title {
  flex: 1;
  font-size: var(--font-size-body);
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-header__notif {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-primary);
  position: relative;
  -webkit-tap-highlight-color: transparent;
}

.app-header__notif svg {
  width: 22px;
  height: 22px;
}

.app-header__badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: var(--color-danger);
  color: var(--color-text-inverse);
  font-size: 10px;
  font-weight: 700;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
</style>
