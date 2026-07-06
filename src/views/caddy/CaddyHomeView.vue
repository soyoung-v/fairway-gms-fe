<script setup>
// 내 배정 홈 (UI-C002) — Caddy 전용
// 오늘/내일 내 배정 목록 조회 (API-518 /api/assignment/me — CONFIRMED/COMPLETED만 노출), 미읽음 알림 배지
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/useAuthStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { getMyAssignments } from '@/api/assignmentApi'
import BaseLoading from '@/components/common/BaseLoading.vue'

const router = useRouter()
const authStore = useAuthStore()
const { name } = storeToRefs(authStore)

const notificationStore = useNotificationStore()
const { unreadCount } = storeToRefs(notificationStore)

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function formatMonthDay(d) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

const today        = new Date()
const tomorrowDate = new Date(today)
tomorrowDate.setDate(today.getDate() + 1)
const todayStr    = toDateStr(today)
const tomorrowStr = toDateStr(tomorrowDate)

const activeTab    = ref('today')
const selectedDate = computed(() => activeTab.value === 'today' ? todayStr : tomorrowStr)

const assignments = ref([])
const loading     = ref(false)
const error       = ref('')

const STATUS_LABEL = {
  CONFIRMED:   '배정 확정',
  IN_PROGRESS: '진행 중',
  COMPLETED:   '완료',
  CANCELLED:   '취소',
}
const STATUS_CLASS = {
  CONFIRMED:   'badge--info',
  IN_PROGRESS: 'badge--primary',
  COMPLETED:   'badge--success',
  CANCELLED:   'badge--muted',
}

async function loadAssignments() {
  loading.value = true
  error.value   = ''
  try {
    assignments.value = await getMyAssignments(selectedDate.value) ?? []
  } catch {
    error.value = '배정 정보를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    loadAssignments(),
    notificationStore.fetchUnreadCount(),
  ])
})
</script>

<template>
  <div class="home-view">
    <!-- 상단 인사 영역 -->
    <div class="greeting-row">
      <div>
        <p class="greeting-sub">안녕하세요,</p>
        <p class="greeting-name">{{ name }} 캐디님</p>
      </div>
      <button class="notif-btn" @click="router.push('/caddy/notifications')">
        <svg class="notif-icon" viewBox="0 0 24 24" fill="none">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
            stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
      </button>
    </div>

    <!-- 날짜 탭 -->
    <div class="date-tabs">
      <button class="date-tab" :class="{ 'is-active': activeTab === 'today' }"
        @click="activeTab = 'today'; loadAssignments()">
        오늘 <span class="date-label">{{ formatMonthDay(today) }}</span>
      </button>
      <button class="date-tab" :class="{ 'is-active': activeTab === 'tomorrow' }"
        @click="activeTab = 'tomorrow'; loadAssignments()">
        내일 <span class="date-label">{{ formatMonthDay(tomorrowDate) }}</span>
      </button>
    </div>

    <!-- 배정 목록 -->
    <BaseLoading v-if="loading" />
    <p v-else-if="error" class="page-error">{{ error }}</p>
    <template v-else>
      <div v-if="!assignments.length" class="empty-card">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.8"/>
          <path d="M8 9h8M8 13h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <p>{{ activeTab === 'today' ? '오늘' : '내일' }} 배정이 없습니다.</p>
      </div>

      <div v-for="a in assignments" :key="a.assignmentId"
        class="assignment-card"
        @click="router.push(`/caddy/assignment/${a.assignmentId}`)">
        <div class="card-header">
          <span class="team-name">{{ a.teamName }}</span>
          <span class="badge" :class="STATUS_CLASS[a.status]">{{ STATUS_LABEL[a.status] ?? a.status }}</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <svg class="info-icon" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/>
              <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            <span>{{ a.teeTime?.slice(0, 5) ?? '—' }}</span>
          </div>
          <div class="info-row">
            <svg class="info-icon" viewBox="0 0 24 24" fill="none">
              <path d="M3 17h18M5 17V7l7-4 7 4v10" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
            </svg>
            <span>{{ a.courseName ?? '—' }}</span>
          </div>
        </div>
        <div v-if="a.isLocked || a.isHalfBack" class="card-footer">
          <span v-if="a.isLocked" class="tag-badge">지정</span>
          <span v-if="a.isHalfBack" class="tag-badge">하프백</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
  padding: var(--space-16);
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px) + var(--space-16));
}

.greeting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-8) 0;
}

.greeting-sub  { font-size: var(--font-size-body-sm); color: var(--color-text-secondary); }
.greeting-name { font-size: 22px; font-weight: 700; color: var(--color-text-primary); margin-top: 2px; }

.notif-btn {
  position: relative;
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  -webkit-tap-highlight-color: transparent;
}

.notif-icon  { width: 20px; height: 20px; color: var(--color-text-primary); }

.notif-badge {
  position: absolute; top: -4px; right: -4px;
  min-width: 18px; height: 18px; padding: 0 4px;
  background: var(--color-danger); color: #fff;
  font-size: 10px; font-weight: 700;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
}

.date-tabs { display: flex; gap: var(--space-8); }

.date-tab {
  flex: 1;
  padding: var(--space-10) var(--space-4);
  font-size: var(--font-size-body-sm); font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  -webkit-tap-highlight-color: transparent;
  transition: all var(--transition-fast);
}

.date-tab.is-active {
  background: var(--caddy-primary);
  border-color: var(--caddy-primary);
  color: #fff;
}

.date-label { font-size: var(--font-size-detail); font-weight: 400; }

.page-error {
  color: var(--color-danger); font-size: var(--font-size-body-sm);
  padding: var(--space-12); background: var(--color-danger-bg); border-radius: var(--radius-8);
}

.empty-card {
  display: flex; flex-direction: column; align-items: center; gap: var(--space-12);
  padding: var(--space-40) var(--space-20);
  color: var(--color-text-secondary); font-size: var(--font-size-body-sm);
}

.empty-icon { width: 40px; height: 40px; opacity: 0.4; }

.assignment-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-12);
  padding: var(--space-16);
  display: flex; flex-direction: column; gap: var(--space-10);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: box-shadow var(--transition-fast);
}

.assignment-card:active { opacity: 0.85; }

.card-header { display: flex; align-items: center; justify-content: space-between; }
.team-name { font-size: var(--font-size-body); font-weight: 700; color: var(--color-text-primary); }

.badge {
  font-size: var(--font-size-detail); font-weight: 600;
  padding: 2px 8px; border-radius: var(--radius-4);
}
.badge--info    { background: #e0f0ff; color: #0066cc; }
.badge--primary { background: var(--caddy-primary-bg, #e8f5e9); color: var(--caddy-primary); }
.badge--success { background: var(--color-success-bg); color: var(--color-success); }
.badge--muted   { background: var(--color-bg-page); color: var(--color-text-secondary); border: 1px solid var(--color-border); }

.card-body { display: flex; flex-direction: column; gap: var(--space-6); }

.info-row {
  display: flex; align-items: center; gap: var(--space-6);
  font-size: var(--font-size-body-sm); color: var(--color-text-secondary);
}

.info-icon { width: 16px; height: 16px; flex-shrink: 0; }

.card-footer { display: flex; gap: var(--space-6); }

.tag-badge {
  font-size: var(--font-size-detail); padding: 2px 6px; border-radius: var(--radius-4);
  background: var(--color-warning-bg, #fff8e1); color: var(--color-warning); font-weight: 500;
}
</style>
