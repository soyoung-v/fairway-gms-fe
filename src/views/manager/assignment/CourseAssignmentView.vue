<script setup>
// 코스별 배정표 (UI-M017) — Manager 전용
// 날짜 + 코스 선택 후 해당 코스의 배정표를 조회한다 (API-512)
import { onMounted, ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGolfCourseStore } from '@/stores/useGolfCourseStore'
import { getAssignmentsByCourse } from '@/api/assignmentApi'
import { getCourses } from '@/api/courseApi'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'

const authStore       = useAuthStore()
const golfCourseStore = useGolfCourseStore()

const { role, golfCourseId: myGolfCourseId } = storeToRefs(authStore)
const { selectedGolfCourseId } = storeToRefs(golfCourseStore)

const targetGolfCourseId = computed(() =>
  role.value === 'ADMIN' ? selectedGolfCourseId.value : myGolfCourseId.value
)

const today        = new Date().toISOString().slice(0, 10)
const selectedDate = ref(today)
const selectedCourseId = ref(null)

const courses      = ref([])
const list         = ref([])
const loading      = ref(false)
const error        = ref('')

const courseOptions = computed(() => courses.value.map(c => ({
  value: c.courseId ?? c.id,
  label: `${c.name} (${c.holeCount}홀)`,
})))

function statusBadgeType(status) {
  return {
    PRE_ASSIGNED:  'warning',
    ASSIGNED:      'success',
    COMPLETED:     'disabled',
    CANCELLED:     'danger',
  }[status] || 'disabled'
}

function statusLabel(status) {
  return {
    PRE_ASSIGNED: '배정예정',
    ASSIGNED:     '배정완료',
    COMPLETED:    '라운드완료',
    CANCELLED:    '취소',
  }[status] || status
}

// 코스 목록 로드 — golfCourseId 기준
async function loadCourses() {
  if (!targetGolfCourseId.value) return
  try {
    const data = await getCourses(targetGolfCourseId.value)
    courses.value = Array.isArray(data) ? data.filter(c => c.isActive) : []
    if (courses.value.length) {
      selectedCourseId.value = courses.value[0].courseId ?? courses.value[0].id
    }
  } catch {
    error.value = '코스 목록을 불러오지 못했습니다.'
  }
}

// 코스별 배정표 조회
async function fetchList() {
  if (!targetGolfCourseId.value || !selectedCourseId.value) return
  loading.value = true
  error.value   = ''
  list.value    = []
  try {
    list.value = await getAssignmentsByCourse({
      assignmentDate: selectedDate.value,
      courseId:       selectedCourseId.value,
      golfCourseId:   targetGolfCourseId.value,
    }) ?? []
  } catch {
    error.value = '코스별 배정표를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

watch([selectedDate, selectedCourseId], fetchList)

onMounted(async () => {
  await loadCourses()
  if (selectedCourseId.value) await fetchList()
})
</script>

<template>
  <div class="course-assignment-view">
    <div class="page-header">
      <h1 class="page-header__title">코스별 배정표</h1>
    </div>

    <p v-if="!targetGolfCourseId" class="page-notice">
      Admin 계정은 상단 드롭다운에서 골프장을 선택해 주세요.
    </p>

    <template v-else>
      <!-- 필터 영역 -->
      <div class="filter-bar">
        <div class="filter-row">
          <label class="filter-label">날짜</label>
          <input type="date" v-model="selectedDate" class="date-input" />
        </div>
        <div class="filter-row">
          <label class="filter-label">코스</label>
          <BaseSelect
            v-model="selectedCourseId"
            :options="courseOptions"
            placeholder="코스 선택"
            style="width: 200px;"
          />
        </div>
        <BaseButton variant="primary" size="sm" @click="fetchList">조회</BaseButton>
      </div>

      <BaseLoading v-if="loading" />
      <p v-else-if="error" class="page-error">{{ error }}</p>
      <BaseEmpty v-else-if="!list.length" message="해당 코스의 배정 내역이 없습니다." />

      <div v-else class="table-wrap">
        <table class="gms-table">
          <thead>
            <tr>
              <th>부</th>
              <th>티타임</th>
              <th>팀명</th>
              <th>캐디</th>
              <th>카트</th>
              <th>상태</th>
              <th>지정</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in list" :key="a.assignmentId">
              <td class="td-period">{{ a.periodNumber }}부</td>
              <td class="td-time">{{ a.teeTime }}</td>
              <td class="td-team">{{ a.teamName }}</td>
              <td class="td-caddie">{{ a.caddieName }}</td>
              <td class="td-cart">{{ a.cartNumber ?? '—' }}</td>
              <td>
                <BaseBadge :type="statusBadgeType(a.status)">{{ statusLabel(a.status) }}</BaseBadge>
              </td>
              <td>
                <BaseBadge v-if="a.isLocked" type="warning">지정</BaseBadge>
                <span v-else class="text-secondary">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.course-assignment-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

.page-header__title {
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--color-text-primary);
}

.page-notice {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  padding: var(--space-16);
  background: var(--color-bg-page);
  border-radius: var(--radius-8);
  border: 1px solid var(--color-border);
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

.td-period { color: var(--color-text-secondary); font-size: var(--font-size-detail); width: 48px; }
.td-time   { color: var(--color-text-secondary); font-size: var(--font-size-detail); white-space: nowrap; width: 80px; }
.td-team   { font-weight: 600; }
.td-caddie { color: var(--color-text-primary); }
.td-cart   { color: var(--color-text-secondary); font-size: var(--font-size-detail); }

.text-secondary { color: var(--color-text-secondary); }
</style>
