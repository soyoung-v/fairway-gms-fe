<script setup>
// Caddy Mobile PWA 화면 레이아웃 — max-width 430px 모바일 셸 + 하단 BottomNav
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

// TODO: 아래 컴포넌트·서비스는 구현 후 주석 해제한다
// import BottomNav from '@/components/caddy/BottomNav.vue'
// import NotificationToast from '@/components/notification/NotificationToast.vue'
// import notificationSocketService from '@/services/notificationSocketService'
// import { startForegroundMessageListener } from '@/services/fcmService'
// import { useNotificationStore } from '@/stores/useNotificationStore'
// import { onMounted, onUnmounted } from 'vue'

const route = useRoute()

// 게시글 상세처럼 몰입형 화면에서는 하단 네비게이션을 숨긴다
const hideBottomNav = computed(() => {
  if (route.path.includes('/board/') && route.params.postId) return true
  return false
})

// 하단 네비가 있을 때 본문 하단 패딩을 확보한다 (safe-area 포함)
const mainPaddingBottom = computed(() => {
  return hideBottomNav.value
    ? '0px'
    : 'calc(64px + env(safe-area-inset-bottom, 0px))'
})

// TODO: BottomNav 구현 후 아래 생명주기 활성화
// const notificationStore = useNotificationStore()
// onMounted(() => {
//   notificationStore.fetchUnreadCount()
//   notificationSocketService.connect()
//   startForegroundMessageListener().catch(err => {
//     console.error('[CaddyLayout] FCM foreground listener 초기화 실패', err)
//   })
// })
// onUnmounted(() => {
//   notificationSocketService.disconnect()
// })
</script>

<template>
  <div class="caddy-layout theme-caddy">
    <div class="caddy-layout__shell">
      <!-- 본문: 하단 네비 높이만큼 padding-bottom 확보 -->
      <main
        class="caddy-layout__main"
        :style="{ paddingBottom: mainPaddingBottom }"
      >
        <RouterView />
      </main>

      <!-- 하단 네비게이션 — BottomNav 컴포넌트 구현 후 주석 해제 -->
      <!-- <BottomNav v-if="!hideBottomNav" /> -->

      <!-- BottomNav 구현 전 임시 플레이스홀더 -->
      <nav v-if="!hideBottomNav" class="caddy-layout__bottom-nav-placeholder">
        <span class="placeholder-nav__item">홈</span>
        <span class="placeholder-nav__item">대기</span>
        <span class="placeholder-nav__item">공지</span>
        <span class="placeholder-nav__item">알림</span>
        <span class="placeholder-nav__item">MY</span>
      </nav>
    </div>
  </div>

  <!-- 알림 토스트 — NotificationToast 구현 후 주석 해제 -->
  <!-- <NotificationToast /> -->
</template>

<style scoped>
/* 데스크톱에서도 모바일 앱처럼 중앙에 셸을 표시한다 */
.caddy-layout {
  display: flex;
  justify-content: center;
  min-height: 100vh;
  background: #F2FAF5;
}

.caddy-layout__shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 430px;
  min-height: 100vh;
  background: var(--color-bg-card);
  position: relative;
}

/* 데스크톱에서는 셸 주변에 여백과 그림자를 준다 */
@media (min-width: 431px) {
  .caddy-layout {
    padding: var(--space-24);
    background: #E8F5E9;
  }

  .caddy-layout__shell {
    border-radius: var(--radius-12);
    overflow: hidden;
    box-shadow: var(--shadow-large);
    min-height: auto;
    height: calc(100vh - var(--space-48));
  }
}

.caddy-layout__main {
  flex: 1;
  overflow-y: auto;
}

/* BottomNav 구현 전 임시 스타일 */
.caddy-layout__bottom-nav-placeholder {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: var(--color-bg-card);
  border-top: 1px solid var(--color-border);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.placeholder-nav__item {
  font-size: var(--font-size-detail);
  color: var(--color-text-disabled);
}
</style>
