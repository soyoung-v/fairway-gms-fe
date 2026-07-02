<script setup>
// 운영 시간표 (UI-C005) — Caddy 전용
// 백엔드 GET /api/caddie/me/schedule 미구현 (CaddieMobileController에 없음)
// → 구현될 때 periodNumber, startTime, endTime, courseName 표시 예정
// 현재는 schedules/daily를 통해 내 배정 코스 정보를 시간표 형태로 보여준다
import { onMounted, ref } from 'vue'
import caddieApi from '@/api/caddieApi'
import { getDailyAssignments } from '@/api/assignmentApi'
import BaseLoading from '@/components/common/BaseLoading.vue'

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const today        = new Date()
const selectedDate = ref(toDateStr(today))

const scheduleRows = ref([])
const loading      = ref(false)
const error        = ref('')
const myCaddieId   = ref(null)

async function loadSchedule() {
  if (!myCaddieId.value) return
  loading.value = true
  error.value   = ''
  try {
    // /api/caddie/me/schedule 미구현 — 일일 배정에서 내 코스/시간 정보를 대체 표시
    const list = await getDailyAssignments({ assignmentDate: selectedDate.value })
    scheduleRows.value = (list ?? [])
      .filter(a => a.caddieId === myCaddieId.value)
      .map(a => ({
        teeTime:    a.teeTime?.slice(0, 5) ?? '—',
        courseName: a.courseName ?? '—',
        teamName:   a.teamName  ?? '—',
        status:     a.status,
      }))
      .sort((a, b) => a.teeTime.localeCompare(b.teeTime))
  } catch {
    error.value = '시간표를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const me = await caddieApi.getMyInfo()
    myCaddieId.value = me?.caddieId
  } catch { }
  await loadSchedule()
})
</script>

<template>
  <div class="schedule-view">
    <h1 class="page-title">운영 시간표</h1>

    <!-- 날짜 선택 -->
    <div class="date-row">
      <input type="date" v-model="selectedDate" class="date-input" @change="loadSchedule" />
    </div>

    <!-- 백엔드 미구현 안내 -->
    <div class="gap-notice">
      <svg class="notice-icon" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
        <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <span>공식 시간표 API 구현 전까지 내 배정 기반으로 표시됩니다.</span>
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
            <span class="time-text">{{ row.teeTime }}</span>
          </div>
          <div class="schedule-content">
            <p class="course-name">{{ row.courseName }}</p>
            <p class="team-name">{{ row.teamName }}</p>
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
