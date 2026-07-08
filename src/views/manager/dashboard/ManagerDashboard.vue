<script setup>
// 대시보드 (UI-M002) — Admin + Manager 공용
// 일일 운영 현황을 아이콘 통계 카드 + 배정 진행률 + 빠른 작업으로 표시한다
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOperationStore } from '@/stores/useOperationStore'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import StatsCards from '@/components/manager/StatsCards.vue'

const router = useRouter()
const operationStore = useOperationStore()

function today() {
  return new Date().toISOString().slice(0, 10)
}

const targetDate = ref(today())

async function loadDashboard() {
  await operationStore.fetchDashboard(targetDate.value)
}

// 대시보드 응답 → StatsCards 항목으로 변환
const stats = computed(() => {
  const d = operationStore.dashboard
  if (!d) return []

  const total      = d.totalTeams ?? 0
  const unassigned = d.unassignedTeams ?? 0
  const assigned   = Math.max(total - unassigned, 0)
  const rate       = total > 0 ? Math.round((assigned / total) * 100) : 0

  return [
    {
      label: '총 예약팀', value: total, unit: '팀', icon: 'teams',
      desc: `운영 코스 ${d.operatingCourses ?? 0}개 기준`,
    },
    {
      label: '배정 완료', value: assigned, unit: '팀', icon: 'check', tone: 'success',
      progress: rate, desc: `배정률 ${rate}%`,
    },
    {
      label: '미배정 예약팀', value: unassigned, unit: '팀', icon: 'alert',
      tone: unassigned > 0 ? 'danger' : 'success',
      desc: unassigned > 0 ? '배정 처리가 필요합니다' : '모든 팀 배정 완료',
    },
    {
      label: '가용 캐디', value: d.availableCaddies ?? 0, unit: '명', icon: 'caddie',
      desc: '휴무·결근·배정제외 제외',
    },
    {
      label: '가용 카트', value: d.availableCarts ?? 0, unit: '대', icon: 'cart',
      desc: '점검·사용중지 제외',
    },
    {
      label: '운영 코스', value: d.operatingCourses ?? 0, unit: '개', icon: 'course',
      desc: '티타임 OPEN 기준',
    },
  ]
})

// 빠른 작업 바로가기
const QUICK_ACTIONS = [
  { label: '캐디 배정',   desc: '자동/수동 배정 실행',      path: '/admin/assignment',                 icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11' },
  { label: '예약팀 관리', desc: '등록·수정·엑셀 업로드',     path: '/admin/operation/reservation-teams', icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
  { label: '대기 순번',   desc: '순번 조회·초기화·조정',     path: '/admin/queues',                     icon: 'M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: '캐디 그룹',   desc: '자동배정 그룹 관리',        path: '/admin/caddie-groups',              icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87' },
]

onMounted(loadDashboard)
</script>

<template>
  <div class="dashboard-view">
    <div class="page-header">
      <div>
        <h1 class="page-header__title">대시보드</h1>
        <p class="page-header__subtitle">{{ targetDate }} 운영 현황</p>
      </div>
      <div class="page-header__actions">
        <input
          v-model="targetDate"
          type="date"
          class="date-input"
          @change="loadDashboard"
        />
        <BaseButton variant="primary" size="sm" @click="loadDashboard">조회</BaseButton>
      </div>
    </div>

    <BaseLoading v-if="operationStore.loading" />

    <p v-else-if="operationStore.error" class="feedback-err">{{ operationStore.error }}</p>

    <template v-else-if="operationStore.dashboard">
      <!-- 현황 카드 -->
      <StatsCards :stats="stats" />

      <!-- 미배정 경고 배너 -->
      <div v-if="operationStore.dashboard.unassignedTeams > 0" class="alert-banner">
        <svg class="alert-banner__icon" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="alert-banner__text">
          <strong>{{ operationStore.dashboard.unassignedTeams }}팀</strong>이 아직 배정되지 않았습니다.
        </span>
        <BaseButton variant="primary" size="sm" @click="router.push('/admin/assignment')">
          배정하러 가기
        </BaseButton>
      </div>

      <!-- 빠른 작업 -->
      <section class="quick-section">
        <h2 class="quick-section__title">빠른 작업</h2>
        <div class="quick-grid">
          <button
            v-for="action in QUICK_ACTIONS"
            :key="action.path"
            class="quick-card"
            @click="router.push(action.path)"
          >
            <span class="quick-card__icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path :d="action.icon" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <span class="quick-card__body">
              <span class="quick-card__label">{{ action.label }}</span>
              <span class="quick-card__desc">{{ action.desc }}</span>
            </span>
            <svg class="quick-card__arrow" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </section>
    </template>

    <p v-else class="empty-msg">대시보드 데이터를 불러올 수 없습니다.</p>
  </div>
</template>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-24);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-12);
}

.page-header__title {
  font-size: var(--font-size-heading-3);
  font-weight: 700;
  color: var(--color-text-primary);
}

.page-header__subtitle {
  margin-top: 2px;
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
}

.page-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.date-input {
  padding: var(--space-8) var(--space-12);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-6);
  font-size: var(--font-size-body-sm);
  color: var(--color-text-primary);
  background: var(--color-bg-input);
  height: 38px;
}

.date-input:focus {
  outline: none;
  border-color: var(--color-border-focus);
}

/* ─── 미배정 경고 배너 ─── */
.alert-banner {
  display: flex;
  align-items: center;
  gap: var(--space-12);
  padding: var(--space-12) var(--space-16);
  background: var(--color-danger-bg);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-8);
}

.alert-banner__icon {
  width: 20px;
  height: 20px;
  color: var(--color-danger);
  flex-shrink: 0;
}

.alert-banner__text {
  flex: 1;
  font-size: var(--font-size-body-sm);
  color: var(--color-text-primary);
}

/* ─── 빠른 작업 ─── */
.quick-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
}

.quick-section__title {
  font-size: var(--font-size-body);
  font-weight: 700;
  color: var(--color-text-primary);
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: var(--space-16);
}

.quick-card {
  display: flex;
  align-items: center;
  gap: var(--space-12);
  padding: var(--space-16) var(--space-20);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-12);
  box-shadow: var(--shadow-small);
  text-align: left;
  transition: box-shadow var(--transition-normal), transform var(--transition-normal), border-color var(--transition-normal);
}

.quick-card:hover {
  box-shadow: var(--shadow-medium);
  transform: translateY(-2px);
  border-color: var(--manager-primary);
}

.quick-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-10);
  background: var(--manager-primary-light);
  color: var(--manager-primary);
  flex-shrink: 0;
}

.quick-card__icon svg {
  width: 20px;
  height: 20px;
}

.quick-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.quick-card__label {
  font-size: var(--font-size-body-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.quick-card__desc {
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
}

.quick-card__arrow {
  width: 16px;
  height: 16px;
  color: var(--color-text-disabled);
  flex-shrink: 0;
}

/* ─── 피드백 ─── */
.feedback-err {
  font-size: var(--font-size-body-sm);
  color: var(--color-danger);
  padding: var(--space-8) var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-6);
}

.empty-msg {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  text-align: center;
  padding: var(--space-40) 0;
}
</style>
