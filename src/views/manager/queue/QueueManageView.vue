<script setup>
// 대기 순번 관리 (UI-M009) — Manager 전용
// 날짜별 캐디 대기 순번 조회·전체 초기화·개별 수동 조정
import { onMounted, reactive, ref, computed } from 'vue'
import { useCaddyStore } from '@/stores/useCaddyStore'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const caddyStore = useCaddyStore()

// ─── 날짜 선택 ───────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10)
}

const queueDate = ref(today())

async function loadQueues() {
  await caddyStore.fetchQueues(queueDate.value)
}

// 순번 기준 정렬
const sortedQueues = computed(() =>
  [...caddyStore.queues].sort((a, b) => (a.queueNumber ?? 0) - (b.queueNumber ?? 0))
)

// ─── 전체 초기화 모달 ─────────────────────────────────────────────
const showResetConfirm = ref(false)
const resetting        = ref(false)
const resetError       = ref('')

async function handleReset() {
  resetting.value  = true
  resetError.value = ''
  try {
    await caddyStore.resetQueues(queueDate.value)
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    resetError.value =
      code === 'INVALID_DATE' ? '유효하지 않은 날짜입니다.' : '초기화에 실패했습니다.'
  } finally {
    resetting.value      = false
    showResetConfirm.value = false
  }
}

// ─── 개별 순번 수동 조정 모달 ─────────────────────────────────────
const adjustTarget = ref(null)
const showAdjust   = ref(false)
const adjustForm   = reactive({ queueNumber: '', reason: '' })
const adjustErrors = reactive({ queueNumber: '', reason: '' })
const adjusting    = ref(false)
const adjustError  = ref('')

function openAdjustModal(queue) {
  adjustTarget.value       = queue
  adjustForm.queueNumber   = String(queue.queueNumber ?? '')
  adjustForm.reason        = ''
  adjustErrors.queueNumber = ''
  adjustErrors.reason      = ''
  adjustError.value        = ''
  showAdjust.value         = true
}

function validateAdjust() {
  let ok = true
  const n = Number(adjustForm.queueNumber)
  adjustErrors.queueNumber =
    !adjustForm.queueNumber.trim()   ? '순번을 입력해 주세요.' :
    isNaN(n) || n < 1               ? '1 이상의 정수를 입력해 주세요.' : ''
  adjustErrors.reason = adjustForm.reason.trim() ? '' : '조정 사유를 입력해 주세요.'
  Object.values(adjustErrors).forEach(e => { if (e) ok = false })
  return ok
}

async function handleAdjust() {
  if (!validateAdjust()) return
  adjusting.value   = true
  adjustError.value = ''
  try {
    await caddyStore.updateQueue(adjustTarget.value.caddieId, {
      queueDate:   queueDate.value,
      queueNumber: Number(adjustForm.queueNumber),
      reason:      adjustForm.reason.trim(),
    })
    showAdjust.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    adjustError.value =
      code === 'REASON_REQUIRED'    ? '조정 사유가 필요합니다.' :
      code === 'CADDIE_NOT_FOUND'   ? '캐디를 찾을 수 없습니다.' :
      '순번 조정에 실패했습니다.'
  } finally {
    adjusting.value = false
  }
}

onMounted(loadQueues)
</script>

<template>
  <div class="queue-manage-view">
    <!-- 페이지 헤더 -->
    <div class="page-header">
      <h1 class="page-header__title">대기 순번 관리</h1>
      <BaseButton
        variant="danger"
        size="sm"
        :disabled="caddyStore.loading || !caddyStore.queues.length"
        @click="showResetConfirm = true"
      >
        전체 초기화
      </BaseButton>
    </div>

    <!-- 날짜 선택 -->
    <div class="date-bar">
      <BaseInput
        v-model="queueDate"
        type="date"
        class="date-bar__input"
      />
      <BaseButton variant="primary" size="sm" @click="loadQueues">조회</BaseButton>
    </div>

    <!-- 초기화 에러 -->
    <p v-if="resetError" class="feedback-err">{{ resetError }}</p>

    <!-- 로딩 -->
    <BaseLoading v-if="caddyStore.loading" />

    <!-- 에러 -->
    <p v-else-if="caddyStore.error" class="feedback-err">{{ caddyStore.error }}</p>

    <!-- 빈 상태 -->
    <BaseEmpty v-else-if="!caddyStore.queues.length" message="해당 날짜에 등록된 대기 순번이 없습니다." />

    <!-- 순번 테이블 -->
    <div v-else class="table-wrap">
      <table class="queue-table">
        <thead>
          <tr>
            <th class="th-rank">순번</th>
            <th>캐디 이름</th>
            <th>캐디 ID</th>
            <th>조정</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="queue in sortedQueues" :key="queue.caddieId" class="queue-table__row">
            <td class="td-rank">{{ queue.queueNumber ?? '—' }}</td>
            <td class="td-name">{{ queue.caddieName }}</td>
            <td class="td-id">{{ queue.caddieId }}</td>
            <td>
              <BaseButton variant="ghost" size="sm" @click="openAdjustModal(queue)">
                수동 조정
              </BaseButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 전체 초기화 확인 모달 -->
    <ConfirmModal
      v-if="showResetConfirm"
      :message="`${queueDate} 대기 순번을 캐디 번호 오름차순으로 전체 초기화하시겠습니까?`"
      confirm-label="초기화"
      @confirm="handleReset"
      @cancel="showResetConfirm = false"
    />

    <!-- 개별 순번 조정 모달 -->
    <BaseModal
      v-if="showAdjust"
      :title="`순번 수동 조정 — ${adjustTarget?.caddieName}`"
      @close="showAdjust = false"
    >
      <form class="adjust-form" @submit.prevent="handleAdjust">
        <div class="adjust-form__field">
          <label class="adjust-form__label">변경할 순번 <span class="required">*</span></label>
          <BaseInput
            v-model="adjustForm.queueNumber"
            type="number"
            placeholder="순번 입력"
            min="1"
            :error="adjustErrors.queueNumber"
          />
          <p v-if="adjustErrors.queueNumber" class="field-error">{{ adjustErrors.queueNumber }}</p>
        </div>
        <div class="adjust-form__field">
          <label class="adjust-form__label">조정 사유 <span class="required">*</span></label>
          <BaseInput
            v-model="adjustForm.reason"
            placeholder="조정 사유를 입력해 주세요"
            :error="adjustErrors.reason"
          />
          <p v-if="adjustErrors.reason" class="field-error">{{ adjustErrors.reason }}</p>
        </div>
        <p v-if="adjustError" class="feedback-err">{{ adjustError }}</p>
        <div class="adjust-form__actions">
          <BaseButton type="button" variant="ghost" @click="showAdjust = false">취소</BaseButton>
          <BaseButton type="submit" variant="primary" :loading="adjusting">저장</BaseButton>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<style scoped>
.queue-manage-view {
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

.date-bar__input {
  width: 180px;
}

/* ─── 테이블 ─── */
.table-wrap {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  overflow: hidden;
}

.queue-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-body-sm);
}

.queue-table th {
  background: var(--color-bg-page);
  padding: var(--space-12) var(--space-16);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.th-rank { width: 80px; text-align: center; }

.queue-table td {
  padding: var(--space-12) var(--space-16);
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border);
}

.queue-table__row:last-child td { border-bottom: none; }
.queue-table__row:hover { background: var(--manager-primary-light); }

.td-rank {
  text-align: center;
  font-size: var(--font-size-body-lg);
  font-weight: 700;
  color: var(--manager-primary);
  width: 80px;
}

.td-name { font-weight: 600; }
.td-id   { color: var(--color-text-secondary); font-size: var(--font-size-detail); }

/* ─── 조정 폼 ─── */
.adjust-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.adjust-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.adjust-form__label {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.required { color: var(--color-danger); }

.field-error {
  font-size: var(--font-size-detail);
  color: var(--color-danger);
}

.adjust-form__actions {
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
