<script setup>
// 대시보드 (UI-M002) — Admin + Manager 공용
// 오늘 일일 운영 현황(총 예약팀/가용 캐디/카트/미배정/운영 코스) 카드 표시, 날짜 선택
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOperationStore } from '@/stores/useOperationStore'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'

const router = useRouter()
const operationStore = useOperationStore()

function today() {
  return new Date().toISOString().slice(0, 10)
}

const targetDate = ref(today())

async function loadDashboard() {
  await operationStore.fetchDashboard(targetDate.value)
}

onMounted(loadDashboard)
</script>

<template>
  <div class="dashboard-view">
    <div class="page-header">
      <h1 class="page-header__title">대시보드</h1>
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
      <!-- 현황 카드 목록 -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-card__label">총 예약팀</span>
          <span class="stat-card__value">{{ operationStore.dashboard.totalTeams }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__label">운영 코스</span>
          <span class="stat-card__value">{{ operationStore.dashboard.operatingCourses }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__label">가용 캐디</span>
          <span class="stat-card__value">{{ operationStore.dashboard.availableCaddies }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__label">가용 카트</span>
          <span class="stat-card__value">{{ operationStore.dashboard.availableCarts }}</span>
        </div>
        <!-- 미배정팀은 배정 도메인 완료 전까지 항상 0 반환 -->
        <div class="stat-card stat-card--highlight">
          <span class="stat-card__label">미배정 예약팀</span>
          <span class="stat-card__value">{{ operationStore.dashboard.unassignedTeams }}</span>
          <BaseButton
            v-if="operationStore.dashboard.unassignedTeams > 0"
            variant="primary"
            size="sm"
            class="stat-card__link"
            @click="router.push('/admin/assignment')"
          >배정 화면 이동</BaseButton>
        </div>
      </div>
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

/* ─── 통계 카드 그리드 ─── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-16);
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  padding: var(--space-20) var(--space-24);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
}

.stat-card--highlight {
  border-color: var(--manager-primary);
  background: var(--manager-primary-light);
}

.stat-card__label {
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.stat-card__value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
}

.stat-card--highlight .stat-card__value {
  color: var(--manager-primary);
}

.stat-card__link {
  align-self: flex-start;
  margin-top: var(--space-4);
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
