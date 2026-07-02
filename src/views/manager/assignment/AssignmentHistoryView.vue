<script setup>
// 배정 이력 조회 (UI-M015) — Admin + Manager
// 날짜/캐디 ID 필터로 배정 변경 이력을 조회한다
import { onMounted, ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGolfCourseStore } from '@/stores/useGolfCourseStore'
import { getHistory } from '@/api/assignmentApi'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseInput from '@/components/common/BaseInput.vue'

const authStore       = useAuthStore()
const golfCourseStore = useGolfCourseStore()

const { role, golfCourseId: myGolfCourseId } = storeToRefs(authStore)
const { selectedGolfCourseId } = storeToRefs(golfCourseStore)

const targetGolfCourseId = computed(() =>
  role.value === 'ADMIN' ? selectedGolfCourseId.value : myGolfCourseId.value
)

const today          = new Date().toISOString().slice(0, 10)
const filterDate     = ref(today)
const filterCaddieId = ref('')

const list    = ref([])
const loading = ref(false)
const error   = ref('')

const CHANGE_TYPE_LABEL = {
  ASSIGNED:      '배정',
  REASSIGNED:    '재배정',
  CANCELLED:     '취소',
  COMPLETED:     '완료',
  AUTO_ASSIGNED: '자동배정',
  LOCK_RELEASED: '잠금해제',
  SWAPPED:       '교환',
}

function changeTypeBadge(type) {
  return {
    ASSIGNED:      'success',
    REASSIGNED:    'warning',
    CANCELLED:     'danger',
    COMPLETED:     'disabled',
    AUTO_ASSIGNED: 'info',
    LOCK_RELEASED: 'warning',
    SWAPPED:       'info',
  }[type] || 'disabled'
}

function formatDateTime(dt) {
  if (!dt) return '—'
  return String(dt).replace('T', ' ').slice(0, 16)
}

async function fetchHistory() {
  loading.value = true
  error.value   = ''
  list.value    = []
  try {
    const params = {
      assignmentDate: filterDate.value,
      golfCourseId:   targetGolfCourseId.value || undefined,
    }
    if (filterCaddieId.value) params.caddieId = Number(filterCaddieId.value)
    list.value = await getHistory(params) ?? []
  } catch {
    error.value = '배정 이력을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchHistory)
</script>

<template>
  <div class="history-view">
    <div class="page-header">
      <h1 class="page-header__title">배정 이력</h1>
    </div>

    <!-- 필터 영역 -->
    <div class="filter-bar">
      <div class="filter-row">
        <label class="filter-label">날짜</label>
        <input type="date" v-model="filterDate" class="date-input" />
      </div>
      <div class="filter-row">
        <label class="filter-label">캐디 ID</label>
        <BaseInput
          v-model="filterCaddieId"
          type="number"
          placeholder="캐디 ID (선택)"
          style="width: 140px;"
        />
      </div>
      <BaseButton variant="primary" size="sm" @click="fetchHistory">조회</BaseButton>
    </div>

    <BaseLoading v-if="loading" />
    <p v-else-if="error" class="page-error">{{ error }}</p>
    <BaseEmpty v-else-if="!list.length" message="조회된 배정 이력이 없습니다." />

    <div v-else class="table-wrap">
      <table class="gms-table">
        <thead>
          <tr>
            <th>이력 ID</th>
            <th>배정 ID</th>
            <th>변경 유형</th>
            <th>이전 캐디</th>
            <th>변경 후 캐디</th>
            <th>사유</th>
            <th>처리자</th>
            <th>변경 시각</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in list" :key="h.id">
            <td class="td-id">{{ h.id }}</td>
            <td class="td-id">{{ h.assignmentId }}</td>
            <td>
              <BaseBadge :type="changeTypeBadge(h.changeType)">
                {{ CHANGE_TYPE_LABEL[h.changeType] ?? h.changeType }}
              </BaseBadge>
            </td>
            <td class="td-caddie">{{ h.beforeCaddieName ?? '—' }}</td>
            <td class="td-caddie">{{ h.afterCaddieName ?? '—' }}</td>
            <td class="td-reason">{{ h.reason ?? '—' }}</td>
            <td>{{ h.changedByName }}</td>
            <td class="td-time">{{ formatDateTime(h.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.history-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-header__title {
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--color-text-primary);
}

.page-error {
  color: var(--color-danger);
  font-size: var(--font-size-body-sm);
  padding: var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-8);
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: var(--space-16);
  padding: var(--space-12) var(--space-16);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  flex-wrap: wrap;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.filter-label {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.date-input {
  padding: var(--space-6) var(--space-10);
  font-size: var(--font-size-body-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  background: var(--color-bg-input);
  color: var(--color-text-primary);
  outline: none;
}

.date-input:focus { border-color: var(--color-border-focus); }

.table-wrap {
  overflow-x: auto;
  border-radius: var(--radius-8);
  border: 1px solid var(--color-border);
}

.gms-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-body-sm);
}

.gms-table th {
  background: var(--color-bg-page);
  padding: var(--space-12) var(--space-16);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.gms-table td {
  padding: var(--space-12) var(--space-16);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
  vertical-align: middle;
}

.gms-table tbody tr:last-child td { border-bottom: none; }
.gms-table tbody tr:hover { background: var(--color-bg-page); }

.td-id     { color: var(--color-text-secondary); font-size: var(--font-size-detail); width: 80px; }
.td-caddie { font-weight: 500; }
.td-reason { color: var(--color-text-secondary); font-size: var(--font-size-detail); max-width: 200px; }
.td-time   { color: var(--color-text-secondary); font-size: var(--font-size-detail); white-space: nowrap; }
</style>
