<script setup>
// 알림 목록 (UI-C008) — Caddy 전용
// 알림 목록 조회, 단건/전체 읽음 처리
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useNotificationStore } from '@/stores/useNotificationStore'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseButton from '@/components/common/BaseButton.vue'

const store = useNotificationStore()
const { notifications, loading, error } = storeToRefs(store)

const filterTab = ref('all') // 'all' | 'unread'

const filtered = computed(() =>
  filterTab.value === 'unread'
    ? notifications.value.filter(n => !n.isRead)
    : notifications.value
)

const TYPE_LABEL = {
  ASSIGNMENT_CONFIRMED: '배정 확정',
  BOARD_POST:           '새 공지',
  SWAP_REQUEST:         '순번교환',
  SWAP_APPROVED:        '교환 승인',
  SWAP_REJECTED:        '교환 거절',
}

function formatDate(str) {
  if (!str) return '—'
  return str.replace('T', ' ').slice(0, 16)
}

const readingAll = ref(false)

async function handleReadAll() {
  readingAll.value = true
  try { await store.readAll() } catch { }
  finally { readingAll.value = false }
}

async function handleReadOne(n) {
  if (n.isRead) return
  try { await store.readOne(n.notificationId) } catch { }
}

onMounted(() => store.fetchNotifications())
</script>

<template>
  <div class="notif-view">
    <!-- 필터 탭 + 전체 읽음 -->
    <div class="top-bar">
      <div class="filter-tabs">
        <button class="filter-tab" :class="{ 'is-active': filterTab === 'all' }" @click="filterTab = 'all'">전체</button>
        <button class="filter-tab" :class="{ 'is-active': filterTab === 'unread' }" @click="filterTab = 'unread'">미읽음</button>
      </div>
      <BaseButton variant="ghost" size="sm" :loading="readingAll" @click="handleReadAll">전체 읽음</BaseButton>
    </div>

    <BaseLoading v-if="loading" />
    <p v-else-if="error" class="page-error">{{ error }}</p>

    <template v-else>
      <div v-if="!filtered.length" class="empty-card">
        <p>{{ filterTab === 'unread' ? '미읽음 알림이 없습니다.' : '알림이 없습니다.' }}</p>
      </div>

      <div class="notif-list">
        <div
          v-for="n in filtered"
          :key="n.notificationId"
          class="notif-item"
          :class="{ 'is-unread': !n.isRead }"
          @click="handleReadOne(n)"
        >
          <div class="notif-dot" v-if="!n.isRead" />
          <div class="notif-body">
            <div class="notif-top">
              <span class="notif-type">{{ TYPE_LABEL[n.type] ?? n.type }}</span>
              <span class="notif-date">{{ formatDate(n.createdAt) }}</span>
            </div>
            <p class="notif-title">{{ n.title }}</p>
            <p v-if="n.content" class="notif-content">{{ n.content }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.notif-view {
  display: flex;
  flex-direction: column;
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-12) var(--space-16);
  border-bottom: 1px solid var(--color-border);
}

.filter-tabs { display: flex; gap: var(--space-4); }

.filter-tab {
  padding: var(--space-6) var(--space-14, 14px);
  font-size: var(--font-size-body-sm); font-weight: 500;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  -webkit-tap-highlight-color: transparent;
  transition: all var(--transition-fast);
}

.filter-tab.is-active {
  background: var(--caddy-primary);
  border-color: var(--caddy-primary);
  color: #fff;
}

.page-error {
  margin: var(--space-16);
  color: var(--color-danger); font-size: var(--font-size-body-sm);
  padding: var(--space-12); background: var(--color-danger-bg); border-radius: var(--radius-8);
}

.empty-card {
  display: flex; justify-content: center;
  padding: var(--space-40) var(--space-20);
  color: var(--color-text-secondary); font-size: var(--font-size-body-sm);
}

.notif-list { display: flex; flex-direction: column; }

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-10);
  padding: var(--space-14, 14px) var(--space-16);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background var(--transition-fast);
}

.notif-item.is-unread { background: var(--caddy-primary-bg, #f1faf3); }
.notif-item:active    { background: var(--color-bg-page); }

.notif-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--caddy-primary);
  flex-shrink: 0;
  margin-top: 5px;
}

.notif-body { flex: 1; display: flex; flex-direction: column; gap: var(--space-4); }

.notif-top { display: flex; align-items: center; justify-content: space-between; }

.notif-type {
  font-size: var(--font-size-detail); font-weight: 600;
  color: var(--caddy-primary);
}

.notif-date { font-size: var(--font-size-detail); color: var(--color-text-secondary); }

.notif-title {
  font-size: var(--font-size-body-sm); font-weight: 600;
  color: var(--color-text-primary); line-height: 1.4;
}

.notif-content {
  font-size: var(--font-size-detail); color: var(--color-text-secondary);
  line-height: 1.5;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
