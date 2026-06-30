<script setup>
// 티타임 관리 (UI-M012) — Manager 전용
// 날짜별 티타임 목록 조회, 자동 생성(월 단위), 수동 추가, 마감, 재생성
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useOperationStore } from '@/stores/useOperationStore'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const operationStore = useOperationStore()

// ─── 날짜/필터 ───────────────────────────────────────────────────
function today() { return new Date().toISOString().slice(0, 10) }

const playDate    = ref(today())
const filterCourseId    = ref('')
const filterPeriodNumber = ref('')

async function loadTeeTimes() {
  const params = { playDate: playDate.value }
  if (filterCourseId.value)     params.courseId     = Number(filterCourseId.value)
  if (filterPeriodNumber.value) params.periodNumber = Number(filterPeriodNumber.value)
  await operationStore.fetchTeeTimes(params)
}

onMounted(loadTeeTimes)
onUnmounted(() => { operationStore.teeTimes = [] })

// ─── 티타임 자동 생성 모달 ───────────────────────────────────────
function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const showGenerateModal = ref(false)
const generateForm      = reactive({ yearMonth: currentMonth(), courseId: '' })
const generating        = ref(false)
const generateResult    = ref(null) // { generatedCount, yearMonth }
const generateError     = ref('')

function openGenerateModal() {
  generateForm.yearMonth = currentMonth()
  generateForm.courseId  = ''
  generateResult.value   = null
  generateError.value    = ''
  showGenerateModal.value = true
}

async function handleGenerate() {
  generating.value    = true
  generateError.value = ''
  try {
    const result = await operationStore.generateTeeTimes({
      yearMonth: generateForm.yearMonth,
      courseId:  generateForm.courseId ? Number(generateForm.courseId) : null,
    })
    generateResult.value = result
    await loadTeeTimes()
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    generateError.value =
      code === 'SETTING_NOT_FOUND' ? '해당 월의 운영 설정이 없습니다. 먼저 운영 설정을 등록하세요.' :
      err.response?.data?.error?.message || '티타임 생성에 실패했습니다.'
  } finally {
    generating.value = false
  }
}

// ─── 티타임 재생성 확인 ──────────────────────────────────────────
const showRegenerateConfirm = ref(false)
const regenForm             = reactive({ yearMonth: currentMonth(), courseId: '' })
const regenerating          = ref(false)

function openRegenerateConfirm() {
  regenForm.yearMonth = currentMonth()
  regenForm.courseId  = ''
  showRegenerateConfirm.value = true
}

async function handleRegenerate() {
  regenerating.value = true
  try {
    await operationStore.regenerateTeeTimes({
      yearMonth: regenForm.yearMonth,
      courseId:  regenForm.courseId ? Number(regenForm.courseId) : null,
    })
    showRegenerateConfirm.value = false
    await loadTeeTimes()
  } catch (err) {
    alert(err.response?.data?.error?.message || '재생성에 실패했습니다.')
    showRegenerateConfirm.value = false
  } finally {
    regenerating.value = false
  }
}

// ─── 티타임 수동 추가 모달 ──────────────────────────────────────
const showAddModal = ref(false)
const addForm      = reactive({ courseId: '', startTime: '', periodNumber: 1 })
const adding       = ref(false)
const addError     = ref('')

function openAddModal() {
  addForm.courseId     = ''
  addForm.startTime    = ''
  addForm.periodNumber = 1
  addError.value       = ''
  showAddModal.value   = true
}

async function handleAdd() {
  if (!addForm.courseId || !addForm.startTime) {
    addError.value = '코스 ID와 시작 시간은 필수입니다.'
    return
  }
  adding.value   = true
  addError.value = ''
  try {
    await operationStore.addTeeTime({
      courseId:     Number(addForm.courseId),
      playDate:     playDate.value,
      startTime:    addForm.startTime.length === 5 ? addForm.startTime + ':00' : addForm.startTime,
      periodNumber: Number(addForm.periodNumber),
    })
    showAddModal.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    addError.value =
      code === 'DUPLICATE_TEE_TIME' ? '동일 날짜/코스/시간의 티타임이 이미 존재합니다.' :
      err.response?.data?.error?.message || '추가에 실패했습니다.'
  } finally {
    adding.value = false
  }
}

// ─── 티타임 마감 확인 ────────────────────────────────────────────
const closeTarget      = ref(null)
const showCloseConfirm = ref(false)
const closing          = ref(false)

function openCloseConfirm(teeTime) {
  closeTarget.value      = teeTime
  showCloseConfirm.value = true
}

async function handleClose() {
  closing.value = true
  try {
    await operationStore.closeTeeTime(closeTarget.value.teeTimeId)
    showCloseConfirm.value = false
  } catch (err) {
    alert(err.response?.data?.error?.message || '마감에 실패했습니다.')
    showCloseConfirm.value = false
  } finally {
    closing.value = false
  }
}

// 상태 뱃지 매핑
const STATUS_BADGE = {
  OPEN:   { type: 'success',  label: 'OPEN' },
  CLOSED: { type: 'disabled', label: '마감' },
}
function getStatusBadge(status) {
  return STATUS_BADGE[status] ?? { type: 'disabled', label: status }
}
</script>

<template>
  <div class="tee-time-view">
    <div class="page-header">
      <h1 class="page-header__title">티타임 관리</h1>
      <div class="page-header__actions">
        <BaseButton variant="ghost"   size="sm" @click="openGenerateModal">자동 생성</BaseButton>
        <BaseButton variant="ghost"   size="sm" @click="openRegenerateConfirm">재생성</BaseButton>
        <BaseButton variant="primary" size="sm" @click="openAddModal">+ 수동 추가</BaseButton>
      </div>
    </div>

    <!-- 날짜·필터 바 -->
    <div class="filter-bar">
      <BaseInput v-model="playDate" type="date" class="filter-bar__date" />
      <BaseInput v-model="filterCourseId" type="number" placeholder="코스 ID" class="filter-bar__short" />
      <BaseInput v-model="filterPeriodNumber" type="number" placeholder="부 번호" class="filter-bar__short" />
      <BaseButton variant="primary" size="sm" @click="loadTeeTimes">조회</BaseButton>
    </div>

    <BaseLoading v-if="operationStore.loading" />
    <p v-else-if="operationStore.error" class="feedback-err">{{ operationStore.error }}</p>
    <BaseEmpty v-else-if="!operationStore.teeTimes.length" message="해당 날짜의 티타임이 없습니다." />

    <div v-else class="table-wrap">
      <table class="tee-table">
        <thead>
          <tr>
            <th>부</th>
            <th>코스</th>
            <th>시작 시간</th>
            <th>상태</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="tt in operationStore.teeTimes"
            :key="tt.teeTimeId"
            class="tee-table__row"
          >
            <td>{{ tt.periodNumber }}부</td>
            <td>{{ tt.courseName }}</td>
            <td class="td-time">{{ tt.startTime }}</td>
            <td>
              <BaseBadge :type="getStatusBadge(tt.status).type">
                {{ getStatusBadge(tt.status).label }}
              </BaseBadge>
            </td>
            <td>
              <BaseButton
                v-if="tt.status === 'OPEN'"
                variant="ghost"
                size="sm"
                @click="openCloseConfirm(tt)"
              >마감</BaseButton>
              <span v-else class="text-muted">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 자동 생성 모달 -->
    <BaseModal
      v-if="showGenerateModal"
      title="티타임 자동 생성"
      @close="showGenerateModal = false"
    >
      <div class="modal-form">
        <p class="modal-hint">운영 설정 기준으로 해당 월 전체 티타임을 생성합니다. 이미 있는 슬롯은 스킵됩니다.</p>
        <div class="field-col">
          <label class="field-label">연월 <span class="required">*</span></label>
          <input v-model="generateForm.yearMonth" type="month" class="field-input" />
        </div>
        <div class="field-col">
          <label class="field-label">코스 ID (비워두면 전체 코스)</label>
          <BaseInput v-model="generateForm.courseId" type="number" placeholder="전체" />
        </div>

        <div v-if="generateResult" class="generate-result">
          ✓ {{ generateResult.yearMonth }} — {{ generateResult.generatedCount }}개 생성 완료
        </div>
        <p v-if="generateError" class="feedback-err">{{ generateError }}</p>

        <div class="modal-actions">
          <BaseButton variant="ghost" @click="showGenerateModal = false">닫기</BaseButton>
          <BaseButton variant="primary" :loading="generating" @click="handleGenerate">생성</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- 재생성 확인 모달 -->
    <BaseModal
      v-if="showRegenerateConfirm"
      title="티타임 재생성"
      @close="showRegenerateConfirm = false"
    >
      <div class="modal-form">
        <p class="modal-hint warn-text">기존 티타임을 삭제하고 다시 생성합니다. 예약팀이 없는 경우에만 사용하세요.</p>
        <div class="field-col">
          <label class="field-label">연월 <span class="required">*</span></label>
          <input v-model="regenForm.yearMonth" type="month" class="field-input" />
        </div>
        <div class="field-col">
          <label class="field-label">코스 ID (비워두면 전체)</label>
          <BaseInput v-model="regenForm.courseId" type="number" placeholder="전체" />
        </div>
        <div class="modal-actions">
          <BaseButton variant="ghost" @click="showRegenerateConfirm = false">취소</BaseButton>
          <BaseButton variant="danger" :loading="regenerating" @click="handleRegenerate">재생성 실행</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- 수동 추가 모달 -->
    <BaseModal
      v-if="showAddModal"
      title="티타임 수동 추가"
      @close="showAddModal = false"
    >
      <div class="modal-form">
        <p class="modal-hint">날짜: <strong>{{ playDate }}</strong></p>
        <div class="field-col">
          <label class="field-label">코스 ID <span class="required">*</span></label>
          <BaseInput v-model="addForm.courseId" type="number" placeholder="예: 1" />
        </div>
        <div class="field-col">
          <label class="field-label">시작 시간 <span class="required">*</span></label>
          <BaseInput v-model="addForm.startTime" type="time" />
        </div>
        <div class="field-col">
          <label class="field-label">부 번호</label>
          <BaseInput v-model="addForm.periodNumber" type="number" placeholder="1" />
        </div>
        <p v-if="addError" class="feedback-err">{{ addError }}</p>
        <div class="modal-actions">
          <BaseButton variant="ghost" @click="showAddModal = false">취소</BaseButton>
          <BaseButton variant="primary" :loading="adding" @click="handleAdd">추가</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- 마감 확인 -->
    <ConfirmModal
      v-if="showCloseConfirm"
      :message="`${closeTarget?.startTime} ${closeTarget?.courseName} 티타임을 마감하시겠습니까?`"
      confirm-label="마감"
      @confirm="handleClose"
      @cancel="showCloseConfirm = false"
    />
  </div>
</template>

<style scoped>
.tee-time-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
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
  gap: var(--space-8);
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  flex-wrap: wrap;
}

.filter-bar__date  { width: 180px; }
.filter-bar__short { width: 100px; }

.table-wrap {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  overflow: hidden;
}

.tee-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-body-sm);
}

.tee-table th {
  background: var(--color-bg-page);
  padding: var(--space-12) var(--space-16);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.tee-table td {
  padding: var(--space-12) var(--space-16);
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.tee-table__row:last-child td { border-bottom: none; }
.tee-table__row:hover { background: var(--manager-primary-light); }

.td-time { font-weight: 600; font-variant-numeric: tabular-nums; }

.text-muted { color: var(--color-text-secondary); }

/* ─── 모달 ─── */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-14);
}

.modal-hint {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}

.warn-text { color: var(--color-danger); font-weight: 500; }

.field-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.field-label {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.field-input {
  padding: var(--space-8) var(--space-12);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-6);
  font-size: var(--font-size-body-sm);
  color: var(--color-text-primary);
  background: var(--color-bg-input);
  height: 38px;
}

.field-input:focus {
  outline: none;
  border-color: var(--color-border-focus);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-8);
  padding-top: var(--space-8);
}

.generate-result {
  font-size: var(--font-size-body-sm);
  color: var(--color-success);
  padding: var(--space-8) var(--space-12);
  background: var(--color-success-bg);
  border-radius: var(--radius-6);
}

.required { color: var(--color-danger); }

.feedback-err {
  font-size: var(--font-size-body-sm);
  color: var(--color-danger);
  padding: var(--space-8) var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-6);
}
</style>
