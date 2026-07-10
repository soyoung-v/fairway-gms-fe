<script setup>
// 대시보드 (UI-M002) — Admin + Manager 공용
// 일일 운영 현황을 아이콘 통계 카드 + 배정 진행률 + 빠른 작업으로 표시한다
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOperationStore } from '@/stores/useOperationStore'
import { getDashboard } from '@/api/operationApi'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import StatsCards from '@/components/manager/StatsCards.vue'
import VueApexCharts from 'vue3-apexcharts'

const router = useRouter()
const operationStore = useOperationStore()

function today() {
  return new Date().toISOString().slice(0, 10)
}

const targetDate = ref(today())

async function loadDashboard() {
  await Promise.all([
    operationStore.fetchDashboard(targetDate.value),
    loadWeeklyTrend(),
  ])
}

// ─── 주간 추이 차트 — 기준일 포함 최근 7일 대시보드 API를 병렬 조회 ──
// v-if/v-else로 로딩↔차트를 전환하면 apex가 마운트 직후 언마운트돼 "Element not found"가 난다.
// 그래서 로딩 토글 없이 series가 채워졌을 때만 차트를 한 번 렌더한다.
const weeklyLabels = ref([])
const weeklySeries = ref([])

async function loadWeeklyTrend() {
  const base = new Date(targetDate.value)
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })
  const results = await Promise.all(dates.map(d => getDashboard(d).catch(() => null)))
  weeklyLabels.value = dates.map(d => d.slice(5).replace('-', '/'))
  weeklySeries.value = [
    { name: '예약팀', data: results.map(r => r?.totalTeams ?? 0) },
    { name: '배정 완료', data: results.map(r => Math.max((r?.totalTeams ?? 0) - (r?.unassignedTeams ?? 0), 0)) },
  ]
}

const chartOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: ['#B7C9BE', '#2D6A4F'],
  plotOptions: { bar: { columnWidth: '45%', borderRadius: 4 } },
  dataLabels: { enabled: false },
  xaxis: { categories: weeklyLabels.value, labels: { style: { colors: '#718096' } } },
  yaxis: { labels: { style: { colors: '#718096' } }, forceNiceScale: true, min: 0 },
  grid: { borderColor: '#E2E8F0' },
  legend: { position: 'top', horizontalAlign: 'right' },
  tooltip: { y: { formatter: v => `${v}팀` } },
}))

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

      <!-- 주간 배정 추이 차트 — series가 준비된 뒤 한 번만 마운트 (apex 언마운트 경합 방지) -->
      <section v-if="weeklySeries.length" class="chart-section">
        <h2 class="chart-section__title">주간 배정 추이 <span class="chart-section__desc">(기준일 포함 최근 7일)</span></h2>
        <VueApexCharts
          type="bar"
          height="260"
          :options="chartOptions"
          :series="weeklySeries"
        />
      </section>

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

/* ─── 주간 추이 차트 ─── */
.chart-section {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-12);
  box-shadow: var(--shadow-small);
  padding: var(--space-20) var(--space-24);
}

.chart-section__title {
  font-size: var(--font-size-body);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-8);
}

.chart-section__desc {
  font-size: var(--font-size-detail);
  font-weight: 400;
  color: var(--color-text-secondary);
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
