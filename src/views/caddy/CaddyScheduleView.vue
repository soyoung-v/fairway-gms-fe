<script setup>
// 운영 시간표 (UI-C005) — Caddy 전용
// API-320 GET /api/caddie/me/schedule — 부별 운영 시작/종료 시간 + 코스명
import { onMounted, ref } from 'vue'
import { getMySchedule } from '@/api/caddieApi'
import BaseLoading from '@/components/common/BaseLoading.vue'

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const today        = new Date()
const selectedDate = ref(toDateStr(today))

const scheduleRows = ref([])
const loading      = ref(false)
const error        = ref('')

async function loadSchedule() {
  loading.value = true
  error.value   = ''
  try {
    const list = await getMySchedule(selectedDate.value)
    scheduleRows.value = (list ?? [])
      .map(p => ({
        periodNumber: p.periodNumber,
        timeRange:    `${p.startTime?.slice(0, 5) ?? '—'} ~ ${p.endTime?.slice(0, 5) ?? '—'}`,
        courseName:   p.courseName ?? '—',
      }))
      .sort((a, b) => (a.periodNumber ?? 0) - (b.periodNumber ?? 0) || a.courseName.localeCompare(b.courseName))
  } catch {
    error.value = '시간표를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(loadSchedule)
</script>

<template>
  <div class="schedule-view">
    <h1 class="page-title">운영 시간표</h1>

    <!-- 날짜 선택 -->
    <div class="date-row">
      <input type="date" v-model="selectedDate" class="date-input" @change="loadSchedule" />
    </div>

    <BaseLoading v-if="loading" />
    <p v-else-if="error" class="page-error">{{ error }}</p>

    <template v-else>
      <div v-if="!scheduleRows.length" class="empty-card">
        <p>{{ selectedDate }} 시간표가 없습니다.</p>
      </div>

      <div v-else class="schedule-list">
        <div v-for="(row, i) in scheduleRows" :key="i" class="schedule-item">
          <div class="time-col">
            <span class="time-text">{{ row.periodNumber != null ? `${row.periodNumber}부` : '—' }}</span>
          </div>
          <div class="schedule-content">
            <p class="course-name">{{ row.courseName }}</p>
            <p class="team-name">{{ row.timeRange }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.schedule-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
  padding: var(--space-16);
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px) + var(--space-16));
}

.page-title {
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--color-text-primary);
  padding: var(--space-8) 0;
}

.date-row { display: flex; justify-content: flex-end; }

.date-input {
  padding: var(--space-8) var(--space-12);
  font-size: var(--font-size-body-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  background: var(--color-bg-input);
  color: var(--color-text-primary);
  outline: none;
}

.date-input:focus { border-color: var(--caddy-primary); }

.gap-notice {
  display: flex; align-items: flex-start; gap: var(--space-8);
  padding: var(--space-12);
  background: var(--color-bg-page);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-8);
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.notice-icon { width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px; }

.page-error {
  color: var(--color-danger); font-size: var(--font-size-body-sm);
  padding: var(--space-12); background: var(--color-danger-bg); border-radius: var(--radius-8);
}

.empty-card {
  display: flex; justify-content: center; padding: var(--space-40) var(--space-20);
  color: var(--color-text-secondary); font-size: var(--font-size-body-sm);
}

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--color-border);
  border-radius: var(--radius-12);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.schedule-item {
  display: flex;
  align-items: center;
  gap: var(--space-12);
  background: var(--color-bg-card);
  padding: var(--space-14, 14px) var(--space-16);
}

.time-col { min-width: 52px; }

.time-text {
  font-size: var(--font-size-body-sm);
  font-weight: 700;
  color: var(--caddy-primary);
}

.schedule-content { display: flex; flex-direction: column; gap: 2px; }
.course-name { font-size: var(--font-size-body-sm); font-weight: 600; color: var(--color-text-primary); }
.team-name   { font-size: var(--font-size-detail); color: var(--color-text-secondary); }
</style>
