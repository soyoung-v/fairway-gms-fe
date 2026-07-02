<script setup>
// 캐디 배정 (UI-M014) — Manager 전용
// 일일 배정표 조회, 자동/수동 배정, 재배정/취소/완료/잠금해제/교환
import { onMounted, ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGolfCourseStore } from '@/stores/useGolfCourseStore'
import { useAssignmentStore } from '@/stores/useAssignmentStore'
import { getOperationSetting } from '@/api/operationApi'
import { getAvailableCaddies } from '@/api/caddieApi'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const authStore        = useAuthStore()
const golfCourseStore  = useGolfCourseStore()
const assignmentStore  = useAssignmentStore()

const { role, golfCourseId: myGolfCourseId } = storeToRefs(authStore)
const { selectedGolfCourseId } = storeToRefs(golfCourseStore)
const { assignments, unassignedTeams, schedule, loading, error } = storeToRefs(assignmentStore)

// Manager는 소속 골프장 기준으로 동작한다
const targetGolfCourseId = computed(() =>
  role.value === 'ADMIN' ? selectedGolfCourseId.value : myGolfCourseId.value
)

// ─── 날짜 선택 ──────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10)
const selectedDate = ref(today)

async function fetchData() {
  if (!targetGolfCourseId.value) return
  assignmentStore.reset()
  await assignmentStore.fetchDailyData(selectedDate.value, targetGolfCourseId.value)
}

watch(selectedDate, fetchData)
onMounted(fetchData)

// ─── 배정 상태 표시 ─────────────────────────────────────────────
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

function scheduleBadgeType(s) {
  return { DRAFT: 'warning', CONFIRMED: 'success', COMPLETED: 'disabled' }[s] || 'disabled'
}

function scheduleLabel(s) {
  return { DRAFT: '임시저장', CONFIRMED: '확정됨', COMPLETED: '완료' }[s] || s
}

// ─── 배정표 생성 / 확정 / 완료 ──────────────────────────────────
const scheduleLoading = ref(false)
const scheduleError   = ref('')

async function handleCreateSchedule() {
  scheduleLoading.value = true
  scheduleError.value   = ''
  try {
    await assignmentStore.createSchedule(selectedDate.value)
  } catch (err) {
    scheduleError.value = err.response?.data?.error?.code === 'SCHEDULE_ALREADY_EXISTS'
      ? '이미 배정표가 존재합니다.'
      : '배정표 생성에 실패했습니다.'
  } finally {
    scheduleLoading.value = false
  }
}

async function handleConfirmSchedule() {
  scheduleLoading.value = true
  scheduleError.value   = ''
  try {
    await assignmentStore.confirmSchedule()
  } catch {
    scheduleError.value = '배정표 확정에 실패했습니다.'
  } finally {
    scheduleLoading.value = false
  }
}

async function handleCancelConfirm() {
  scheduleLoading.value = true
  scheduleError.value   = ''
  try {
    await assignmentStore.cancelConfirmSchedule()
  } catch {
    scheduleError.value = '배정표 확정 취소에 실패했습니다.'
  } finally {
    scheduleLoading.value = false
  }
}

async function handleCompleteSchedule() {
  scheduleLoading.value = true
  scheduleError.value   = ''
  try {
    await assignmentStore.completeSchedule()
  } catch {
    scheduleError.value = '배정표 완료 처리에 실패했습니다.'
  } finally {
    scheduleLoading.value = false
  }
}

// ─── 자동배정 모달 ──────────────────────────────────────────────
// 자동배정은 periodId가 필수이므로 해당 월 운영 설정에서 부 목록을 불러온다
const showAutoAssign   = ref(false)
const autoAssigning    = ref(false)
const autoAssignError  = ref('')
const periods          = ref([])
const selectedPeriodId = ref(null)
const periodOptions    = computed(() => periods.value.map(p => ({
  value: p.periodId,
  label: `${p.periodNumber}부 — ${p.courseName} (${p.startTime} ~ ${p.endTime})`,
})))

async function openAutoAssignModal() {
  autoAssignError.value  = ''
  selectedPeriodId.value = null
  periods.value          = []
  showAutoAssign.value   = true

  const yearMonth = selectedDate.value.slice(0, 7) // YYYY-MM
  try {
    const setting = await getOperationSetting(yearMonth)
    periods.value = (setting?.periods ?? []).filter(p => p.isActive)
    if (periods.value.length) selectedPeriodId.value = periods.value[0].periodId
  } catch {
    autoAssignError.value = '운영 설정을 불러오지 못했습니다. 먼저 운영 설정을 등록해 주세요.'
  }
}

async function handleAutoAssign() {
  if (!selectedPeriodId.value) { autoAssignError.value = '부를 선택해 주세요.'; return }
  autoAssigning.value = true
  autoAssignError.value = ''
  try {
    const result = await assignmentStore.runAutoAssign({
      assignmentDate: selectedDate.value,
      periodId: selectedPeriodId.value,
    })
    showAutoAssign.value = false
    await fetchData() // 배정 결과 반영
    alert(`자동배정 완료 — 배정: ${result.assignedCount}팀, 제외: ${result.skippedCount}팀`)
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    autoAssignError.value = code === 'INVALID_PARAMETER' ? '유효하지 않은 배정 요청입니다.' : '자동배정에 실패했습니다.'
  } finally {
    autoAssigning.value = false
  }
}

// ─── 수동배정 모달 ──────────────────────────────────────────────
const showManual     = ref(false)
const manualLoading  = ref(false)
const manualError    = ref('')
const caddies        = ref([])
const manualForm     = ref({ reservationTeamId: null, caddieId: null, isLocked: false, isHalfBack: false, reason: '' })

const teamOptions = computed(() => unassignedTeams.value.map(t => ({
  value: t.teamId,
  label: `[${t.periodNumber}부] ${t.teamName} (${t.teeTime})`,
})))

const caddyOptions = computed(() => caddies.value.map(c => ({
  value: c.caddieId ?? c.id,
  label: `${c.name} (순번: ${c.queueNumber ?? '—'})`,
})))

async function openManualModal() {
  manualError.value = ''
  manualForm.value  = { reservationTeamId: null, caddieId: null, isLocked: false, isHalfBack: false, reason: '' }
  caddies.value     = []
  showManual.value  = true

  try {
    caddies.value = await getAvailableCaddies(selectedDate.value) ?? []
  } catch {
    manualError.value = '가용 캐디 목록을 불러오지 못했습니다.'
  }
}

async function handleManualAssign() {
  if (!manualForm.value.reservationTeamId) { manualError.value = '배정할 팀을 선택해 주세요.'; return }
  if (!manualForm.value.caddieId)          { manualError.value = '캐디를 선택해 주세요.'; return }
  manualLoading.value = true
  manualError.value   = ''
  try {
    await assignmentStore.addAssignment({
      reservationTeamId: manualForm.value.reservationTeamId,
      caddieId:          manualForm.value.caddieId,
      isLocked:          manualForm.value.isLocked,
      isHalfBack:        manualForm.value.isHalfBack,
      reason:            manualForm.value.reason,
    })
    showManual.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    manualError.value =
      code === 'DUPLICATE_ASSIGNMENT' ? '이미 배정된 팀입니다.' :
      code === 'CADDIE_NOT_FOUND'     ? '캐디를 찾을 수 없습니다.' :
      code === 'TEAM_NOT_FOUND'       ? '예약팀을 찾을 수 없습니다.' :
      '수동배정에 실패했습니다.'
  } finally {
    manualLoading.value = false
  }
}

// ─── 재배정 모달 ────────────────────────────────────────────────
const showReassign   = ref(false)
const reassigning    = ref(false)
const reassignTarget = ref(null)
const reassignForm   = ref({ newCaddieId: null, reason: '' })
const reassignError  = ref('')
const reassignCaddies = ref([])

async function openReassignModal(a) {
  reassignTarget.value = a
  reassignForm.value   = { newCaddieId: null, reason: '' }
  reassignError.value  = ''
  reassignCaddies.value = []
  showReassign.value   = true

  try {
    reassignCaddies.value = await getAvailableCaddies(selectedDate.value) ?? []
  } catch {
    reassignError.value = '가용 캐디 목록을 불러오지 못했습니다.'
  }
}

const reassignCaddyOptions = computed(() => reassignCaddies.value.map(c => ({
  value: c.caddieId ?? c.id,
  label: `${c.name} (순번: ${c.queueNumber ?? '—'})`,
})))

async function handleReassign() {
  if (!reassignForm.value.newCaddieId) { reassignError.value = '새 캐디를 선택해 주세요.'; return }
  reassigning.value = true
  reassignError.value = ''
  try {
    await assignmentStore.updateCaddie(reassignTarget.value.id, {
      newCaddieId: reassignForm.value.newCaddieId,
      reason:      reassignForm.value.reason,
    })
    showReassign.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    reassignError.value = code === 'CADDIE_NOT_FOUND' ? '캐디를 찾을 수 없습니다.' : '재배정에 실패했습니다.'
  } finally {
    reassigning.value = false
  }
}

// ─── 취소 확인 모달 ─────────────────────────────────────────────
const showCancel    = ref(false)
const cancelling    = ref(false)
const cancelTarget  = ref(null)
const cancelReason  = ref('')
const cancelError   = ref('')

function openCancelModal(a) {
  cancelTarget.value = a
  cancelReason.value = ''
  cancelError.value  = ''
  showCancel.value   = true
}

async function handleCancel() {
  cancelling.value = true
  cancelError.value = ''
  try {
    await assignmentStore.removeAssignment(cancelTarget.value.id, cancelReason.value)
    showCancel.value = false
  } catch {
    cancelError.value = '배정 취소에 실패했습니다.'
  } finally {
    cancelling.value = false
  }
}

// ─── 잠금 해제 모달 ─────────────────────────────────────────────
const showUnlock    = ref(false)
const unlocking     = ref(false)
const unlockTarget  = ref(null)
const unlockReason  = ref('')
const unlockError   = ref('')

function openUnlockModal(a) {
  unlockTarget.value = a
  unlockReason.value = ''
  unlockError.value  = ''
  showUnlock.value   = true
}

async function handleUnlock() {
  if (!unlockReason.value.trim()) { unlockError.value = '해제 사유를 입력해 주세요.'; return }
  unlocking.value = true
  unlockError.value = ''
  try {
    await assignmentStore.unlock(unlockTarget.value.id, unlockReason.value.trim())
    showUnlock.value = false
  } catch {
    unlockError.value = '잠금 해제에 실패했습니다.'
  } finally {
    unlocking.value = false
  }
}

// ─── 교환 모달 ──────────────────────────────────────────────────
// 교환은 두 배정을 선택하여 캐디를 서로 맞바꾼다
const showSwap    = ref(false)
const swapping    = ref(false)
const swapTarget  = ref(null)  // 교환 시작 배정
const swapPairId  = ref(null)  // 교환 대상 배정 ID
const swapReason  = ref('')
const swapError   = ref('')

const swapPairOptions = computed(() => assignments.value
  .filter(a => a.id !== swapTarget.value?.id && a.status !== 'CANCELLED')
  .map(a => ({ value: a.id, label: `배정 #${a.id} — ${a.caddieName}` }))
)

function openSwapModal(a) {
  swapTarget.value = a
  swapPairId.value = null
  swapReason.value = ''
  swapError.value  = ''
  showSwap.value   = true
}

async function handleSwap() {
  if (!swapPairId.value) { swapError.value = '교환 대상 배정을 선택해 주세요.'; return }
  swapping.value = true
  swapError.value = ''
  try {
    await assignmentStore.swap({
      assignmentId1: swapTarget.value.id,
      assignmentId2: swapPairId.value,
      reason:        swapReason.value,
    })
    showSwap.value = false
    await fetchData()
  } catch {
    swapError.value = '배정 교환에 실패했습니다.'
  } finally {
    swapping.value = false
  }
}

// ─── 단건 완료 처리 ─────────────────────────────────────────────
const completingId = ref(null)

async function handleComplete(a) {
  completingId.value = a.id
  try {
    await assignmentStore.markComplete(a.id)
  } catch {
    alert('완료 처리에 실패했습니다.')
  } finally {
    completingId.value = null
  }
}
</script>

<template>
  <div class="assignment-view">
    <div class="page-header">
      <h1 class="page-header__title">캐디 배정</h1>
      <div class="header-actions">
        <input type="date" v-model="selectedDate" class="date-input" />
        <BaseButton variant="secondary" size="sm" @click="openAutoAssignModal" :disabled="!targetGolfCourseId">
          자동배정
        </BaseButton>
        <BaseButton variant="primary" size="sm" @click="openManualModal" :disabled="!targetGolfCourseId">
          수동배정
        </BaseButton>
      </div>
    </div>

    <!-- Admin 골프장 미선택 안내 -->
    <p v-if="!targetGolfCourseId" class="page-notice">
      Admin 계정은 상단 드롭다운에서 골프장을 선택해 주세요.
    </p>

    <template v-else>
      <!-- 배정표 상태 카드 -->
      <div class="schedule-card">
        <div class="schedule-card__info">
          <span class="schedule-card__label">배정표</span>
          <template v-if="schedule">
            <BaseBadge :type="scheduleBadgeType(schedule.status)">{{ scheduleLabel(schedule.status) }}</BaseBadge>
            <span class="schedule-card__date">{{ schedule.scheduleDate }}</span>
            <span v-if="schedule.confirmedByName" class="schedule-card__confirmer">
              확정: {{ schedule.confirmedByName }}
            </span>
          </template>
          <span v-else class="schedule-card__empty">배정표 없음</span>
        </div>
        <div class="schedule-card__actions">
          <BaseButton v-if="!schedule" variant="ghost" size="sm" :loading="scheduleLoading" @click="handleCreateSchedule">
            배정표 생성
          </BaseButton>
          <template v-else>
            <BaseButton
              v-if="schedule.status === 'DRAFT'"
              variant="primary" size="sm" :loading="scheduleLoading" @click="handleConfirmSchedule"
            >
              배정 확정
            </BaseButton>
            <BaseButton
              v-if="schedule.status === 'CONFIRMED'"
              variant="ghost" size="sm" :loading="scheduleLoading" @click="handleCancelConfirm"
            >
              확정 취소
            </BaseButton>
            <BaseButton
              v-if="schedule.status === 'CONFIRMED'"
              variant="secondary" size="sm" :loading="scheduleLoading" @click="handleCompleteSchedule"
            >
              배정 완료
            </BaseButton>
          </template>
        </div>
        <p v-if="scheduleError" class="schedule-error">{{ scheduleError }}</p>
      </div>

      <!-- 요약 정보 -->
      <div class="summary-bar">
        <span class="summary-item">배정 완료 <strong>{{ assignments.length }}</strong>팀</span>
        <span class="summary-divider">|</span>
        <span class="summary-item summary-item--warn">미배정 <strong>{{ unassignedTeams.length }}</strong>팀</span>
      </div>

      <BaseLoading v-if="loading" />
      <p v-else-if="error" class="page-error">{{ error }}</p>

      <template v-else>
        <!-- 미배정 팀 목록 -->
        <div v-if="unassignedTeams.length" class="unassigned-section">
          <h2 class="section-title section-title--warn">미배정 팀</h2>
          <div class="unassigned-list">
            <div v-for="t in unassignedTeams" :key="t.teamId" class="unassigned-item">
              <span class="unassigned-item__name">{{ t.teamName }}</span>
              <span class="unassigned-item__meta">{{ t.courseName }} · {{ t.periodNumber }}부 · {{ t.teeTime }}</span>
            </div>
          </div>
        </div>

        <!-- 배정 테이블 -->
        <div class="section-title-wrap">
          <h2 class="section-title">배정 목록</h2>
        </div>

        <BaseEmpty v-if="!assignments.length" message="배정된 팀이 없습니다." />

        <div v-else class="table-wrap">
          <table class="gms-table">
            <thead>
              <tr>
                <th>티타임</th>
                <th>코스</th>
                <th>팀명</th>
                <th>캐디</th>
                <th>상태</th>
                <th>지정</th>
                <th>하프백</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in assignments" :key="a.id">
                <td class="td-time">{{ a.teeTime ?? '—' }}</td>
                <td class="td-course">{{ a.courseName ?? '—' }}</td>
                <td class="td-team">{{ a.teamName }}</td>
                <td class="td-caddie">{{ a.caddieName }}</td>
                <td>
                  <BaseBadge :type="statusBadgeType(a.status)">{{ statusLabel(a.status) }}</BaseBadge>
                </td>
                <td>
                  <BaseBadge v-if="a.isLocked" type="warning">지정</BaseBadge>
                  <span v-else class="text-secondary">—</span>
                </td>
                <td>
                  <BaseBadge v-if="a.isHalfBack" type="info">하프백</BaseBadge>
                  <span v-else class="text-secondary">—</span>
                </td>
                <td class="td-actions">
                  <BaseButton
                    v-if="a.status !== 'COMPLETED' && a.status !== 'CANCELLED'"
                    variant="ghost" size="sm" @click="openReassignModal(a)"
                  >재배정</BaseButton>
                  <BaseButton
                    v-if="a.status !== 'COMPLETED' && a.status !== 'CANCELLED'"
                    variant="ghost" size="sm" @click="openSwapModal(a)"
                  >교환</BaseButton>
                  <BaseButton
                    v-if="a.status === 'ASSIGNED'"
                    variant="ghost" size="sm" :loading="completingId === a.id" @click="handleComplete(a)"
                  >완료</BaseButton>
                  <BaseButton
                    v-if="a.isLocked"
                    variant="ghost" size="sm" @click="openUnlockModal(a)"
                  >잠금해제</BaseButton>
                  <BaseButton
                    v-if="a.status !== 'COMPLETED' && a.status !== 'CANCELLED'"
                    variant="danger" size="sm" @click="openCancelModal(a)"
                  >취소</BaseButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>

    <!-- 자동배정 모달 -->
    <BaseModal :visible="showAutoAssign" title="자동배정 실행" @close="showAutoAssign = false">
      <div class="form">
        <p class="form-desc">배정일: <strong>{{ selectedDate }}</strong></p>
        <div class="form-row">
          <label class="form-label">대상 부 <span class="required">*</span></label>
          <BaseSelect
            v-model="selectedPeriodId"
            :options="periodOptions"
            placeholder="부를 선택해 주세요"
            :disabled="autoAssigning || !periodOptions.length"
          />
        </div>
        <p v-if="autoAssignError" class="form-error">{{ autoAssignError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" :disabled="autoAssigning" @click="showAutoAssign = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="autoAssigning" :disabled="!periodOptions.length" @click="handleAutoAssign">
          배정 실행
        </BaseButton>
      </template>
    </BaseModal>

    <!-- 수동배정 모달 -->
    <BaseModal :visible="showManual" title="수동배정" @close="showManual = false">
      <div class="form">
        <div class="form-row">
          <label class="form-label">예약팀 <span class="required">*</span></label>
          <BaseSelect
            v-model="manualForm.reservationTeamId"
            :options="teamOptions"
            placeholder="배정할 팀 선택"
            :disabled="manualLoading"
          />
        </div>
        <div class="form-row">
          <label class="form-label">캐디 <span class="required">*</span></label>
          <BaseSelect
            v-model="manualForm.caddieId"
            :options="caddyOptions"
            placeholder="캐디 선택"
            :disabled="manualLoading"
          />
        </div>
        <div class="form-row form-row--check">
          <label class="form-check">
            <input type="checkbox" v-model="manualForm.isLocked" :disabled="manualLoading" />
            지정 캐디 (자동배정 대상 제외)
          </label>
          <label class="form-check">
            <input type="checkbox" v-model="manualForm.isHalfBack" :disabled="manualLoading" />
            하프백 (1인 2팀 담당)
          </label>
        </div>
        <div class="form-row">
          <label class="form-label">사유</label>
          <BaseInput v-model="manualForm.reason" placeholder="배정 사유 (선택)" :disabled="manualLoading" />
        </div>
        <p v-if="manualError" class="form-error">{{ manualError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" :disabled="manualLoading" @click="showManual = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="manualLoading" @click="handleManualAssign">배정</BaseButton>
      </template>
    </BaseModal>

    <!-- 재배정 모달 -->
    <BaseModal :visible="showReassign" :title="`재배정 — 배정 #${reassignTarget?.id}`" @close="showReassign = false">
      <div class="form">
        <p class="form-desc">현재 캐디: <strong>{{ reassignTarget?.caddieName }}</strong></p>
        <div class="form-row">
          <label class="form-label">새 캐디 <span class="required">*</span></label>
          <BaseSelect
            v-model="reassignForm.newCaddieId"
            :options="reassignCaddyOptions"
            placeholder="새 캐디 선택"
            :disabled="reassigning"
          />
        </div>
        <div class="form-row">
          <label class="form-label">변경 사유</label>
          <BaseInput v-model="reassignForm.reason" placeholder="변경 사유 (선택)" :disabled="reassigning" />
        </div>
        <p v-if="reassignError" class="form-error">{{ reassignError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" :disabled="reassigning" @click="showReassign = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="reassigning" @click="handleReassign">변경</BaseButton>
      </template>
    </BaseModal>

    <!-- 배정 취소 모달 -->
    <BaseModal :visible="showCancel" :title="`배정 취소 — #${cancelTarget?.id}`" @close="showCancel = false">
      <div class="form">
        <p class="form-desc">캐디 <strong>{{ cancelTarget?.caddieName }}</strong>의 배정을 취소합니다.</p>
        <div class="form-row">
          <label class="form-label">취소 사유</label>
          <BaseInput v-model="cancelReason" placeholder="취소 사유 (선택)" :disabled="cancelling" />
        </div>
        <p v-if="cancelError" class="form-error">{{ cancelError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" :disabled="cancelling" @click="showCancel = false">닫기</BaseButton>
        <BaseButton variant="danger" :loading="cancelling" @click="handleCancel">배정 취소</BaseButton>
      </template>
    </BaseModal>

    <!-- 잠금 해제 모달 -->
    <BaseModal :visible="showUnlock" :title="`지정 캐디 잠금 해제 — #${unlockTarget?.id}`" @close="showUnlock = false">
      <div class="form">
        <p class="form-desc">캐디 <strong>{{ unlockTarget?.caddieName }}</strong>의 지정 잠금을 해제합니다.</p>
        <div class="form-row">
          <label class="form-label">해제 사유 <span class="required">*</span></label>
          <BaseInput v-model="unlockReason" placeholder="해제 사유 입력" :disabled="unlocking" />
        </div>
        <p v-if="unlockError" class="form-error">{{ unlockError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" :disabled="unlocking" @click="showUnlock = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="unlocking" @click="handleUnlock">해제</BaseButton>
      </template>
    </BaseModal>

    <!-- 교환 모달 -->
    <BaseModal :visible="showSwap" :title="`배정 교환 — #${swapTarget?.id}`" @close="showSwap = false">
      <div class="form">
        <p class="form-desc">캐디 <strong>{{ swapTarget?.caddieName }}</strong>와 교환할 배정을 선택합니다.</p>
        <div class="form-row">
          <label class="form-label">교환 대상 <span class="required">*</span></label>
          <BaseSelect
            v-model="swapPairId"
            :options="swapPairOptions"
            placeholder="교환할 배정 선택"
            :disabled="swapping"
          />
        </div>
        <div class="form-row">
          <label class="form-label">교환 사유</label>
          <BaseInput v-model="swapReason" placeholder="교환 사유 (선택)" :disabled="swapping" />
        </div>
        <p v-if="swapError" class="form-error">{{ swapError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" :disabled="swapping" @click="showSwap = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="swapping" @click="handleSwap">교환</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.assignment-view {
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
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--color-text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-8);
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

.date-input:focus {
  border-color: var(--color-border-focus);
}

.page-notice,
.page-error {
  font-size: var(--font-size-body-sm);
  padding: var(--space-16);
  border-radius: var(--radius-8);
  border: 1px solid var(--color-border);
}

.page-notice { color: var(--color-text-secondary); background: var(--color-bg-page); }
.page-error  { color: var(--color-danger); background: var(--color-danger-bg); border-color: var(--color-danger); }

/* ─── 배정표 카드 ─── */
.schedule-card {
  display: flex;
  align-items: center;
  gap: var(--space-16);
  padding: var(--space-12) var(--space-16);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  flex-wrap: wrap;
}

.schedule-card__info {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  flex: 1;
}

.schedule-card__label {
  font-weight: 600;
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}

.schedule-card__empty {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}

.schedule-card__date,
.schedule-card__confirmer {
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
}

.schedule-card__actions {
  display: flex;
  gap: var(--space-8);
}

.schedule-error {
  width: 100%;
  font-size: var(--font-size-detail);
  color: var(--color-danger);
}

/* ─── 요약 바 ─── */
.summary-bar {
  display: flex;
  align-items: center;
  gap: var(--space-12);
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}

.summary-item strong { color: var(--color-text-primary); font-weight: 700; }
.summary-item--warn strong { color: var(--color-warning); }
.summary-divider { color: var(--color-border); }

/* ─── 미배정 섹션 ─── */
.unassigned-section {
  background: var(--color-warning-bg, #fff8e1);
  border: 1px solid var(--color-warning, #f59e0b);
  border-radius: var(--radius-8);
  padding: var(--space-12) var(--space-16);
}

.section-title {
  font-size: var(--font-size-body);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-8);
}

.section-title--warn { color: var(--color-warning); }

.section-title-wrap {
  margin-top: var(--space-4);
}

.unassigned-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
}

.unassigned-item {
  display: flex;
  flex-direction: column;
  padding: var(--space-6) var(--space-10);
  background: white;
  border-radius: var(--radius-6);
  font-size: var(--font-size-detail);
}

.unassigned-item__name { font-weight: 600; color: var(--color-text-primary); }
.unassigned-item__meta { color: var(--color-text-secondary); margin-top: var(--space-2); }

/* ─── 테이블 ─── */
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

.td-time   { color: var(--color-text-secondary); font-size: var(--font-size-detail); white-space: nowrap; width: 80px; }
.td-course { color: var(--color-text-secondary); font-size: var(--font-size-detail); }
.td-team   { font-weight: 600; }
.td-caddie { color: var(--color-text-primary); }
.td-actions { display: flex; gap: var(--space-4); flex-wrap: wrap; }

.text-secondary { color: var(--color-text-secondary); }

/* ─── 폼 ─── */
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.form-row--check {
  flex-direction: row;
  gap: var(--space-16);
  flex-wrap: wrap;
}

.form-label {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.form-check {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  font-size: var(--font-size-body-sm);
  color: var(--color-text-primary);
  cursor: pointer;
}

.form-desc {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}

.form-error {
  font-size: var(--font-size-detail);
  color: var(--color-danger);
}

.required { color: var(--color-danger); }
</style>
