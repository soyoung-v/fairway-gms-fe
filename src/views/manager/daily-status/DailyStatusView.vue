<script setup>
// 일별 근무상태 관리 (UI-M010) — Manager 전용
// 날짜별 가용 캐디 목록 + 근무상태 등록·삭제, 라운딩 완료 처리
import { onMounted, onUnmounted, reactive, ref, computed } from 'vue'
import { useCaddyStore } from '@/stores/useCaddyStore'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const caddyStore = useCaddyStore()

// ─── 날짜 선택 ───────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10)
}

const statusDate = ref(today())

async function loadList() {
  await caddyStore.fetchAvailableCaddies(statusDate.value)
}

// 이름 기준 정렬
const sortedList = computed(() =>
  [...caddyStore.availableCaddies].sort((a, b) => (a.queueNumber ?? 999) - (b.queueNumber ?? 999))
)

// ─── 상태 타입 매핑 ───────────────────────────────────────────────
const STATUS_TYPE_OPTIONS = [
  { value: 'DAY_OFF',         label: '휴무' },
  { value: 'ABSENCE',         label: '결근' },
  { value: 'DUTY',            label: '당번' },
  { value: 'EARLY',           label: '조퇴' },
  { value: 'SPECIAL',         label: '특수근무' },
  { value: 'ASSIGN_EXCLUDED', label: '배정제외' },
]

const PRIORITY_OPTIONS = [
  { value: 'FIRST',  label: '1순위' },
  { value: 'SECOND', label: '2순위' },
]

const STATUS_BADGE = {
  DAY_OFF:         { type: 'disabled', label: '휴무' },
  ABSENCE:         { type: 'danger',   label: '결근' },
  DUTY:            { type: 'warning',  label: '당번' },
  EARLY:           { type: 'warning',  label: '조퇴' },
  SPECIAL:         { type: 'success',  label: '특수근무' },
  ASSIGN_EXCLUDED: { type: 'disabled', label: '배정제외' },
}

function getStatusBadge(type) {
  return STATUS_BADGE[type] ?? { type: 'disabled', label: type }
}

// ─── 근무상태 등록 모달 ───────────────────────────────────────────
const registerTarget = ref(null)
const showRegister   = ref(false)
const registerForm   = reactive({ type: 'DAY_OFF', priority: 'FIRST', note: '' })
const registerError  = ref('')
const registering    = ref(false)

const showPriority = computed(() => registerForm.type === 'DUTY')
const showNote     = computed(() => registerForm.type === 'SPECIAL')

function openRegisterModal(caddie) {
  registerTarget.value  = caddie
  registerForm.type     = 'DAY_OFF'
  registerForm.priority = 'FIRST'
  registerForm.note     = ''
  registerError.value   = ''
  showRegister.value    = true
}

async function handleRegister() {
  registering.value   = true
  registerError.value = ''
  try {
    await caddyStore.addDailyStatus({
      caddieId:   registerTarget.value.caddieId,
      statusDate: statusDate.value,
      type:       registerForm.type,
      priority:   registerForm.type === 'DUTY' ? registerForm.priority : null,
      note:       registerForm.type === 'SPECIAL' ? registerForm.note.trim() || null : null,
    })
    showRegister.value = false
    // 목록 갱신
    await loadList()
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    registerError.value =
      code === 'CADDIE_NOT_FOUND' ? '캐디를 찾을 수 없습니다.' :
      code === 'INVALID_PARAMETER' ? '잘못된 입력값입니다.' :
      '등록에 실패했습니다.'
  } finally {
    registering.value = false
  }
}

// ─── 근무상태 삭제 확인 모달 ─────────────────────────────────────
const deleteTarget  = ref(null)
const showDelete    = ref(false)
const deleting      = ref(false)
const deleteError   = ref('')

function openDeleteModal(caddie) {
  deleteTarget.value = caddie
  deleteError.value  = ''
  showDelete.value   = true
}

async function handleDelete() {
  deleting.value     = true
  deleteError.value  = ''
  try {
    await caddyStore.removeDailyStatus(deleteTarget.value.dailyStatus.statusId)
    showDelete.value = false
    await loadList()
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    deleteError.value = code === 'STATUS_NOT_FOUND' ? '이미 삭제된 상태입니다.' : '삭제에 실패했습니다.'
  } finally {
    deleting.value = false
  }
}

// ─── 라운딩 완료 처리 모달 ───────────────────────────────────────
const roundTarget    = ref(null)
const showRound      = ref(false)
const roundCompletedAt = ref('')
const roundError     = ref('')
const rounding       = ref(false)

function openRoundModal(caddie) {
  roundTarget.value      = caddie
  // 현재 날짜·시간을 기본값으로
  roundCompletedAt.value = new Date().toISOString().slice(0, 16)
  roundError.value       = ''
  showRound.value        = true
}

async function handleRoundComplete() {
  if (!roundCompletedAt.value) {
    roundError.value = '완료 시각을 입력해 주세요.'
    return
  }
  rounding.value   = true
  roundError.value = ''
  try {
    await caddyStore.finishRound(roundTarget.value.caddieId, roundCompletedAt.value)
    showRound.value = false
    await loadList()
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    roundError.value = code === 'CADDIE_NOT_FOUND' ? '캐디를 찾을 수 없습니다.' : '처리에 실패했습니다.'
  } finally {
    rounding.value = false
  }
}

onMounted(loadList)
onUnmounted(() => { caddyStore.availableCaddies = [] })
</script>

<template>
  <div class="daily-status-view">
    <!-- 페이지 헤더 -->
    <div class="page-header">
      <h1 class="page-header__title">일별 근무상태 관리</h1>
    </div>

    <!-- 날짜 선택 -->
    <div class="date-bar">
      <BaseInput v-model="statusDate" type="date" class="date-bar__input" />
      <BaseButton variant="primary" size="sm" @click="loadList">조회</BaseButton>
    </div>

    <!-- 로딩 -->
    <BaseLoading v-if="caddyStore.loading" />

    <!-- 에러 -->
    <p v-else-if="caddyStore.error" class="feedback-err">{{ caddyStore.error }}</p>

    <!-- 빈 상태 -->
    <BaseEmpty v-else-if="!caddyStore.availableCaddies.length" message="해당 날짜에 조회된 캐디가 없습니다." />

    <!-- 목록 테이블 -->
    <div v-else class="table-wrap">
      <table class="status-table">
        <thead>
          <tr>
            <th class="th-seq">대기순번</th>
            <th>이름</th>
            <th>오늘 상태</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="caddie in sortedList"
            :key="caddie.caddieId"
            class="status-table__row"
          >
            <td class="td-seq">{{ caddie.queueNumber ?? '—' }}</td>
            <td class="td-name">{{ caddie.name }}</td>
            <td>
              <BaseBadge
                v-if="caddie.dailyStatus"
                :type="getStatusBadge(caddie.dailyStatus.type).type"
              >
                {{ getStatusBadge(caddie.dailyStatus.type).label }}
                <template v-if="caddie.dailyStatus.priority">
                  · {{ caddie.dailyStatus.priority === 'FIRST' ? '1순위' : '2순위' }}
                </template>
              </BaseBadge>
              <span v-else class="no-status">정상 출근</span>
            </td>
            <td class="td-actions">
              <!-- 근무상태 없으면 등록, 있으면 삭제 -->
              <BaseButton
                v-if="!caddie.dailyStatus"
                variant="ghost"
                size="sm"
                @click="openRegisterModal(caddie)"
              >상태 등록</BaseButton>
              <BaseButton
                v-else
                variant="danger"
                size="sm"
                @click="openDeleteModal(caddie)"
              >상태 삭제</BaseButton>

              <!-- 라운딩 완료 처리 -->
              <BaseButton
                variant="ghost"
                size="sm"
                @click="openRoundModal(caddie)"
              >라운딩 완료</BaseButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 근무상태 등록 모달 -->
    <BaseModal
      v-if="showRegister"
      :title="`근무상태 등록 — ${registerTarget?.name}`"
      @close="showRegister = false"
    >
      <form class="modal-form" @submit.prevent="handleRegister">
        <div class="modal-form__field">
          <label class="modal-form__label">상태 유형 <span class="required">*</span></label>
          <select v-model="registerForm.type" class="field-select">
            <option
              v-for="opt in STATUS_TYPE_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >{{ opt.label }}</option>
          </select>
        </div>

        <!-- 당번일 때만 표시 -->
        <div v-if="showPriority" class="modal-form__field">
          <label class="modal-form__label">순위 <span class="required">*</span></label>
          <select v-model="registerForm.priority" class="field-select">
            <option
              v-for="opt in PRIORITY_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >{{ opt.label }}</option>
          </select>
        </div>

        <!-- 특수근무일 때만 표시 -->
        <div v-if="showNote" class="modal-form__field">
          <label class="modal-form__label">비고</label>
          <BaseInput
            v-model="registerForm.note"
            placeholder="특수근무 내용 입력"
          />
        </div>

        <p v-if="registerError" class="feedback-err">{{ registerError }}</p>

        <div class="modal-form__actions">
          <BaseButton type="button" variant="ghost" @click="showRegister = false">취소</BaseButton>
          <BaseButton type="submit" variant="primary" :loading="registering">등록</BaseButton>
        </div>
      </form>
    </BaseModal>

    <!-- 삭제 확인 모달 -->
    <ConfirmModal
      v-if="showDelete"
      :message="`${deleteTarget?.name}의 근무상태(${getStatusBadge(deleteTarget?.dailyStatus?.type).label})를 삭제하시겠습니까?`"
      confirm-label="삭제"
      @confirm="handleDelete"
      @cancel="showDelete = false"
    />

    <!-- 라운딩 완료 모달 -->
    <BaseModal
      v-if="showRound"
      :title="`라운딩 완료 처리 — ${roundTarget?.name}`"
      @close="showRound = false"
    >
      <div class="modal-form">
        <div class="modal-form__field">
          <label class="modal-form__label">완료 시각 <span class="required">*</span></label>
          <BaseInput v-model="roundCompletedAt" type="datetime-local" />
        </div>
        <p v-if="roundError" class="feedback-err">{{ roundError }}</p>
        <div class="modal-form__actions">
          <BaseButton variant="ghost" @click="showRound = false">취소</BaseButton>
          <BaseButton variant="primary" :loading="rounding" @click="handleRoundComplete">완료 처리</BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.daily-status-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

/* ─── 헤더 ─── */
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

/* ─── 날짜 바 ─── */
.date-bar {
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.date-bar__input { width: 180px; }

/* ─── 테이블 ─── */
.table-wrap {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  overflow: hidden;
}

.status-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-body-sm);
}

.status-table th {
  background: var(--color-bg-page);
  padding: var(--space-12) var(--space-16);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.th-seq { width: 80px; text-align: center; }

.status-table td {
  padding: var(--space-12) var(--space-16);
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.status-table__row:last-child td { border-bottom: none; }
.status-table__row:hover { background: var(--manager-primary-light); }

.td-seq {
  text-align: center;
  font-weight: 700;
  color: var(--manager-primary);
}

.td-name { font-weight: 600; }

.td-actions {
  display: flex;
  gap: var(--space-8);
  flex-wrap: wrap;
}

.no-status {
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
}

/* ─── 모달 폼 ─── */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.modal-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.modal-form__label {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.required { color: var(--color-danger); }

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

.modal-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-8);
  padding-top: var(--space-8);
}

/* ─── 피드백 ─── */
.feedback-err {
  font-size: var(--font-size-body-sm);
  color: var(--color-danger);
  padding: var(--space-8) var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-6);
}
</style>
