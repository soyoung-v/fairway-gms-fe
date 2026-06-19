<script setup>
// Caddy Mobile PWA 화면 레이아웃 — max-width 430px 모바일 셸 + 상단 헤더 + 하단 BottomNav
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import BottomNav from '@/components/caddy/BottomNav.vue'
import AppHeader from '@/components/caddy/AppHeader.vue'

// TODO: 알림 서비스는 구현 후 주석 해제한다
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

// 일부 상세 화면은 자체 상단 헤더(showBack 등)를 쓰므로 레이아웃 헤더를 숨긴다
const hideAppHeader = computed(() => {
  return !!route.meta?.hideLayoutHeader
})

// 하단 네비가 있을 때 본문 하단 패딩을 확보한다 (safe-area 포함)
const mainPaddingBottom = computed(() => {
  return hideBottomNav.value
    ? '0px'
    : 'calc(64px + env(safe-area-inset-bottom, 0px))'
})

// TODO: 알림 서비스 구현 후 아래 생명주기 활성화
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
      <!-- 상단 헤더 — 라우트 meta.hideLayoutHeader가 true이면 숨긴다 -->
      <AppHeader v-if="!hideAppHeader" />

      <!-- 본문: 하단 네비 높이만큼 padding-bottom 확보 -->
      <main
        class="caddy-layout__main"
        :style="{ paddingBottom: mainPaddingBottom }"
      >
        <RouterView />
      </main>

      <!-- 하단 네비게이션 -->
      <BottomNav v-if="!hideBottomNav" />
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

</style>
