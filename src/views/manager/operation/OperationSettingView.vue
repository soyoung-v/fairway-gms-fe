<script setup>
// 운영 설정 (UI-M011) — Manager 전용
// 월별 부 시간표(운영 설정) 등록·수정, 우천취소 정책 upsert, 특별 운영일 등록·삭제
import { ref, reactive, computed, onMounted } from 'vue'
import { useOperationStore } from '@/stores/useOperationStore'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const operationStore = useOperationStore()

// ─── 월 선택 ─────────────────────────────────────────────────────
function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const selectedMonth = ref(currentMonth())

async function loadSetting() {
  await Promise.all([
    operationStore.fetchOperationSetting(selectedMonth.value),
    operationStore.fetchRainPolicy(),
    operationStore.fetchSpecialDays(selectedMonth.value),
  ])
}

onMounted(loadSetting)

// ─── 운영 설정 등록 모달 ──────────────────────────────────────────
const showCreateModal = ref(false)
const creating        = ref(false)
const createError     = ref('')

// 기본 1부 형태로 시작, 사용자가 부를 추가할 수 있다
const createForm = reactive({
  periods: [
    { courseId: '', periodNumber: 1, startTime: '08:00:00', endTime: '12:00:00', teeTimeInterval: 10 },
  ],
})

function openCreateModal() {
  createForm.periods = [
    { courseId: '', periodNumber: 1, startTime: '08:00:00', endTime: '12:00:00', teeTimeInterval: 10 },
  ]
  createError.value   = ''
  showCreateModal.value = true
}

function addPeriodRow() {
  const next = createForm.periods.length + 1
  createForm.periods.push({ courseId: '', periodNumber: next, startTime: '', endTime: '', teeTimeInterval: 10 })
}

function removePeriodRow(idx) {
  createForm.periods.splice(idx, 1)
  // periodNumber 재정렬
  createForm.periods.forEach((p, i) => { p.periodNumber = i + 1 })
}

async function handleCreate() {
  const invalid = createForm.periods.some(p => !p.courseId || !p.startTime || !p.endTime)
  if (invalid) { createError.value = '코스 ID, 시작·종료 시간은 필수입니다.'; return }

  creating.value    = true
  createError.value = ''
  try {
    await operationStore.createOperationSetting({
      yearMonth: selectedMonth.value,
      periods: createForm.periods.map(p => ({
        courseId:       Number(p.courseId),
        periodNumber:   p.periodNumber,
        startTime:      p.startTime.length === 5 ? p.startTime + ':00' : p.startTime,
        endTime:        p.endTime.length === 5   ? p.endTime   + ':00' : p.endTime,
        teeTimeInterval: Number(p.teeTimeInterval),
      })),
    })
    showCreateModal.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    createError.value =
      code === 'SETTING_ALREADY_EXISTS' ? '이미 해당 월의 운영 설정이 존재합니다.' :
      err.response?.data?.error?.message || '등록에 실패했습니다.'
  } finally {
    creating.value = false
  }
}

// ─── 운영 설정 수정 모달 ──────────────────────────────────────────
const showEditModal = ref(false)
const editing       = ref(false)
const editError     = ref('')
const editPeriods   = ref([])

function openEditModal() {
  // 현재 설정의 period 목록을 복사해 편집 폼으로 사용
  editPeriods.value = (operationStore.operationSetting?.periods || []).map(p => ({ ...p }))
  editError.value   = ''
  showEditModal.value = true
}

async function handleEdit() {
  const invalid = editPeriods.value.some(p => !p.startTime || !p.endTime)
  if (invalid) { editError.value = '시작·종료 시간은 필수입니다.'; return }

  editing.value   = true
  editError.value = ''
  try {
    await operationStore.editOperationSetting(operationStore.operationSetting.settingId, {
      periods: editPeriods.value.map(p => ({
        periodId:        p.periodId,
        startTime:       p.startTime.length === 5 ? p.startTime + ':00' : p.startTime,
        endTime:         p.endTime.length === 5   ? p.endTime   + ':00' : p.endTime,
        teeTimeInterval: Number(p.teeTimeInterval),
        isActive:        p.isActive,
      })),
    })
    showEditModal.value = false
  } catch (err) {
    editError.value = err.response?.data?.error?.message || '수정에 실패했습니다.'
  } finally {
    editing.value = false
  }
}

// ─── 우천취소 정책 ────────────────────────────────────────────────
const RAIN_POLICY_OPTIONS = [
  { value: 'KEEP_ORDER',  label: '순서 유지 — 기존 예약 순서를 그대로 유지' },
  { value: 'RESEQUENCE',  label: '순번 재조정 — 우천취소 후 전체 순번 재조정' },
]

const policyForm   = reactive({ policyType: 'KEEP_ORDER' })
const savingPolicy = ref(false)
const policyMsg    = ref('')

// 기존 정책이 있으면 폼에 반영
const rainPolicyLabel = computed(() => {
  const opt = RAIN_POLICY_OPTIONS.find(o => o.value === operationStore.rainPolicy?.policyType)
  return opt?.label ?? '미설정'
})

async function handleSavePolicy() {
  savingPolicy.value = true
  policyMsg.value    = ''
  try {
    await operationStore.saveRainPolicy(policyForm.policyType)
    policyMsg.value = '정책이 저장되었습니다.'
  } catch (err) {
    policyMsg.value = err.response?.data?.error?.message || '정책 저장에 실패했습니다.'
  } finally {
    savingPolicy.value = false
  }
}

// ─── 특별 운영일 등록 모달 ────────────────────────────────────────
const showSpecialDayModal  = ref(false)
const specialDayForm       = reactive({ operationDate: '', note: '' })
const addingSpecialDay     = ref(false)
const specialDayError      = ref('')

function openSpecialDayModal() {
  specialDayForm.operationDate = new Date().toISOString().slice(0, 10)
  specialDayForm.note          = ''
  specialDayError.value        = ''
  showSpecialDayModal.value    = true
}

async function handleAddSpecialDay() {
  if (!specialDayForm.operationDate) { specialDayError.value = '날짜를 선택해 주세요.'; return }

  addingSpecialDay.value = true
  specialDayError.value  = ''
  try {
    await operationStore.addSpecialDay({
      operationDate: specialDayForm.operationDate,
      note:          specialDayForm.note.trim() || null,
    })
    showSpecialDayModal.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    specialDayError.value =
      code === 'SPECIAL_DAY_ALREADY_EXISTS' ? '이미 등록된 날짜입니다.' :
      err.response?.data?.error?.message || '등록에 실패했습니다.'
  } finally {
    addingSpecialDay.value = false
  }
}

// ─── 특별 운영일 삭제 확인 ────────────────────────────────────────
const deleteSpecialDayTarget = ref(null)
const showDeleteSpecialDay   = ref(false)
const deletingSpecialDay     = ref(false)

function openDeleteSpecialDayModal(day) {
  deleteSpecialDayTarget.value = day
  showDeleteSpecialDay.value   = true
}

async function handleDeleteSpecialDay() {
  deletingSpecialDay.value = true
  try {
    await operationStore.removeSpecialDay(deleteSpecialDayTarget.value.specialDayId)
    showDeleteSpecialDay.value = false
  } catch (err) {
    // 삭제 실패는 ConfirmModal 재사용 — 닫고 에러 토스트 대신 단순 alert
    alert(err.response?.data?.error?.message || '삭제에 실패했습니다.')
    showDeleteSpecialDay.value = false
  } finally {
    deletingSpecialDay.value = false
  }
}
</script>

<template>
  <div class="operation-setting-view">
    <div class="page-header">
      <h1 class="page-header__title">운영 설정</h1>
    </div>

    <!-- 월 선택 바 -->
    <div class="month-bar">
      <input v-model="selectedMonth" type="month" class="month-input" />
      <BaseButton variant="primary" size="sm" @click="loadSetting">조회</BaseButton>
    </div>

    <BaseLoading v-if="operationStore.loading" />

    <template v-else>
      <!-- ── 운영 설정 (부 시간표) ── -->
      <section class="section-card">
        <div class="section-card__header">
          <h2 class="section-card__title">부 시간표</h2>
          <BaseButton
            v-if="!operationStore.operationSetting"
            variant="primary"
            size="sm"
            @click="openCreateModal"
          >설정 등록</BaseButton>
          <BaseButton
            v-else
            variant="ghost"
            size="sm"
            @click="openEditModal"
          >수정</BaseButton>
        </div>

        <BaseEmpty
          v-if="!operationStore.operationSetting"
          message="이 월의 운영 설정이 없습니다. 등록 버튼으로 시작하세요."
        />

        <table v-else class="setting-table">
          <thead>
            <tr>
              <th>부</th>
              <th>코스</th>
              <th>시작</th>
              <th>종료</th>
              <th>간격(분)</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="period in operationStore.operationSetting.periods"
              :key="period.periodId"
            >
              <td>{{ period.periodNumber }}부</td>
              <td>{{ period.courseName }}</td>
              <td>{{ period.startTime }}</td>
              <td>{{ period.endTime }}</td>
              <td>{{ period.teeTimeInterval }}분</td>
              <td>
                <span :class="['badge', period.isActive ? 'badge--active' : 'badge--inactive']">
                  {{ period.isActive ? '활성' : '비활성' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- ── 우천취소 정책 ── -->
      <section class="section-card">
        <div class="section-card__header">
          <h2 class="section-card__title">우천취소 정책</h2>
        </div>

        <p class="policy-current">
          현재 정책:
          <strong>{{ rainPolicyLabel }}</strong>
        </p>

        <div class="policy-form">
          <select v-model="policyForm.policyType" class="field-select">
            <option
              v-for="opt in RAIN_POLICY_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >{{ opt.label }}</option>
          </select>
          <BaseButton variant="primary" size="sm" :loading="savingPolicy" @click="handleSavePolicy">
            저장
          </BaseButton>
        </div>
        <p v-if="policyMsg" :class="['policy-msg', policyMsg.includes('실패') ? 'policy-msg--err' : 'policy-msg--ok']">
          {{ policyMsg }}
        </p>
      </section>

      <!-- ── 특별 운영일 ── -->
      <section class="section-card">
        <div class="section-card__header">
          <h2 class="section-card__title">특별 운영일</h2>
          <BaseButton variant="ghost" size="sm" @click="openSpecialDayModal">+ 등록</BaseButton>
        </div>

        <BaseEmpty
          v-if="!operationStore.specialDays.length"
          message="등록된 특별 운영일이 없습니다."
        />

        <table v-else class="setting-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>메모</th>
              <th>삭제</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="day in operationStore.specialDays"
              :key="day.specialDayId"
            >
              <td>{{ day.operationDate }}</td>
              <td>{{ day.note ?? '—' }}</td>
              <td>
                <BaseButton variant="danger" size="sm" @click="openDeleteSpecialDayModal(day)">
                  삭제
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <!-- 운영 설정 등록 모달 -->
    <BaseModal
      v-if="showCreateModal"
      title="운영 설정 등록"
      @close="showCreateModal = false"
    >
      <div class="modal-form">
        <p class="modal-hint">연월: <strong>{{ selectedMonth }}</strong></p>

        <div v-for="(period, idx) in createForm.periods" :key="idx" class="period-row">
          <div class="period-row__head">
            <span class="period-row__label">{{ period.periodNumber }}부</span>
            <BaseButton
              v-if="createForm.periods.length > 1"
              variant="danger"
              size="sm"
              @click="removePeriodRow(idx)"
            >삭제</BaseButton>
          </div>
          <div class="period-fields">
            <div class="field-col">
              <label class="field-label">코스 ID <span class="required">*</span></label>
              <BaseInput v-model="period.courseId" type="number" placeholder="예: 1" />
            </div>
            <div class="field-col">
              <label class="field-label">시작 시간 <span class="required">*</span></label>
              <BaseInput v-model="period.startTime" type="time" />
            </div>
            <div class="field-col">
              <label class="field-label">종료 시간 <span class="required">*</span></label>
              <BaseInput v-model="period.endTime" type="time" />
            </div>
            <div class="field-col">
              <label class="field-label">간격(분) <span class="required">*</span></label>
              <BaseInput v-model="period.teeTimeInterval" type="number" placeholder="10" />
            </div>
          </div>
        </div>

        <BaseButton variant="ghost" size="sm" @click="addPeriodRow">+ 부 추가</BaseButton>

        <p v-if="createError" class="feedback-err">{{ createError }}</p>

        <div class="modal-actions">
          <BaseButton variant="ghost" @click="showCreateModal = false">취소</BaseButton>
          <BaseButton variant="primary" :loading="creating" @click="handleCreate">등록</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- 운영 설정 수정 모달 -->
    <BaseModal
      v-if="showEditModal"
      title="운영 설정 수정"
      @close="showEditModal = false"
    >
      <div class="modal-form">
        <div v-for="period in editPeriods" :key="period.periodId" class="period-row">
          <div class="period-row__head">
            <span class="period-row__label">{{ period.periodNumber }}부 — {{ period.courseName }}</span>
            <label class="active-toggle">
              <input v-model="period.isActive" type="checkbox" />
              활성
            </label>
          </div>
          <div class="period-fields">
            <div class="field-col">
              <label class="field-label">시작 시간</label>
              <BaseInput v-model="period.startTime" type="time" />
            </div>
            <div class="field-col">
              <label class="field-label">종료 시간</label>
              <BaseInput v-model="period.endTime" type="time" />
            </div>
            <div class="field-col">
              <label class="field-label">간격(분)</label>
              <BaseInput v-model="period.teeTimeInterval" type="number" />
            </div>
          </div>
        </div>

        <p v-if="editError" class="feedback-err">{{ editError }}</p>

        <div class="modal-actions">
          <BaseButton variant="ghost" @click="showEditModal = false">취소</BaseButton>
          <BaseButton variant="primary" :loading="editing" @click="handleEdit">저장</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- 특별 운영일 등록 모달 -->
    <BaseModal
      v-if="showSpecialDayModal"
      title="특별 운영일 등록"
      @close="showSpecialDayModal = false"
    >
      <div class="modal-form">
        <div class="field-col">
          <label class="field-label">날짜 <span class="required">*</span></label>
          <BaseInput v-model="specialDayForm.operationDate" type="date" />
        </div>
        <div class="field-col">
          <label class="field-label">메모</label>
          <BaseInput v-model="specialDayForm.note" placeholder="예: 현충일" />
        </div>
        <p v-if="specialDayError" class="feedback-err">{{ specialDayError }}</p>
        <div class="modal-actions">
          <BaseButton variant="ghost" @click="showSpecialDayModal = false">취소</BaseButton>
          <BaseButton variant="primary" :loading="addingSpecialDay" @click="handleAddSpecialDay">등록</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- 특별 운영일 삭제 확인 -->
    <ConfirmModal
      v-if="showDeleteSpecialDay"
      :message="`${deleteSpecialDayTarget?.operationDate} 특별 운영일을 삭제하시겠습니까?`"
      confirm-label="삭제"
      @confirm="handleDeleteSpecialDay"
      @cancel="showDeleteSpecialDay = false"
    />
  </div>
</template>

<style scoped>
.operation-setting-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-24);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-header__title {
  font-size: var(--font-size-heading-3);
  font-weight: 700;
  color: var(--color-text-primary);
}

.month-bar {
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.month-input {
  padding: var(--space-8) var(--space-12);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-6);
  font-size: var(--font-size-body-sm);
  color: var(--color-text-primary);
  background: var(--color-bg-input);
  height: 38px;
}

.month-input:focus {
  outline: none;
  border-color: var(--color-border-focus);
}

/* ─── 섹션 카드 ─── */
.section-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  padding: var(--space-20);
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.section-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-card__title {
  font-size: var(--font-size-body-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

/* ─── 테이블 ─── */
.setting-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-body-sm);
}

.setting-table th {
  background: var(--color-bg-page);
  padding: var(--space-10) var(--space-14);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
}

.setting-table td {
  padding: var(--space-10) var(--space-14);
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.setting-table tr:last-child td { border-bottom: none; }

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-detail);
  font-weight: 500;
}

.badge--active   { background: var(--color-success-bg); color: var(--color-success); }
.badge--inactive { background: var(--color-bg-page);     color: var(--color-text-secondary); }

/* ─── 우천취소 정책 ─── */
.policy-current {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}

.policy-form {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  flex-wrap: wrap;
}

.policy-msg {
  font-size: var(--font-size-body-sm);
}

.policy-msg--ok  { color: var(--color-success); }
.policy-msg--err { color: var(--color-danger); }

/* ─── 모달 폼 ─── */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.modal-hint {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}

.period-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  padding: var(--space-12);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-6);
}

.period-row__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.period-row__label {
  font-size: var(--font-size-body-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.period-fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-10);
}

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

.field-select {
  padding: var(--space-8) var(--space-12);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-6);
  font-size: var(--font-size-body-sm);
  color: var(--color-text-primary);
  background: var(--color-bg-input);
  height: 38px;
}

.field-select:focus {
  outline: none;
  border-color: var(--color-border-focus);
}

.active-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: var(--font-size-body-sm);
  color: var(--color-text-primary);
  cursor: pointer;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-8);
  padding-top: var(--space-8);
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
