<script setup>
// 월별 정산 (UI-M019) — Manager 전용
// 월별 캐디 근무횟수/수입 집계, 캐디피 수동 조정, 월 마감 확정/취소
import { onMounted, ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettlementStore } from '@/stores/useSettlementStore'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseInput from '@/components/common/BaseInput.vue'

const store = useSettlementStore()
const { roundSummary, incomeSummary, monthlyStatus, loading, error } = storeToRefs(store)

// 이번 달 기본 선택
const now = new Date()
const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const selectedMonth = ref(thisMonth)

const activeTab = ref('rounds') // 'rounds' | 'income'

const isConfirmed = computed(() => monthlyStatus.value?.status === 'CONFIRMED')

function formatFee(val) {
  if (val == null) return '—'
  return Number(val).toLocaleString('ko-KR') + '원'
}

onMounted(() => store.fetchMonthlySummary(selectedMonth.value))

// ─── 월 마감 확정 / 취소 ─────────────────────────────────────────
const confirming  = ref(false)
const confirmError = ref('')

async function handleConfirm() {
  if (!confirm(`${selectedMonth.value} 월 마감을 확정하시겠습니까? 확정 후 수동 조정이 불가합니다.`)) return
  confirming.value  = true
  confirmError.value = ''
  try {
    await store.confirmMonth(selectedMonth.value)
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    confirmError.value = code === 'ALREADY_CONFIRMED' ? '이미 확정된 월입니다.' : '월 마감 확정에 실패했습니다.'
  } finally {
    confirming.value = false
  }
}

async function handleCancelConfirm() {
  if (!confirm(`${selectedMonth.value} 월 마감 확정을 취소하시겠습니까?`)) return
  confirming.value  = true
  confirmError.value = ''
  try {
    await store.cancelConfirm(selectedMonth.value)
  } catch {
    confirmError.value = '월 마감 취소에 실패했습니다.'
  } finally {
    confirming.value = false
  }
}

// ─── 캐디피 수동 조정 모달 ──────────────────────────────────────
const showAdjust   = ref(false)
const adjustTarget = ref(null)
const adjustForm   = ref({ adjustedFee: '', reason: '' })
const adjusting    = ref(false)
const adjustError  = ref('')

function openAdjustModal(row) {
  adjustTarget.value = row
  adjustForm.value   = { adjustedFee: row.adjustedFee ?? row.totalFee ?? '', reason: '' }
  adjustError.value  = ''
  showAdjust.value   = true
}

async function handleAdjust() {
  if (!adjustForm.value.adjustedFee) { adjustError.value = '조정 금액을 입력해 주세요.'; return }
  if (!adjustForm.value.reason.trim()) { adjustError.value = '조정 사유를 입력해 주세요.'; return }
  adjusting.value = true
  adjustError.value = ''
  try {
    await store.adjustFee(adjustTarget.value.caddieId, {
      yearMonth:   selectedMonth.value,
      adjustedFee: Number(adjustForm.value.adjustedFee),
      reason:      adjustForm.value.reason.trim(),
    })
    showAdjust.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    adjustError.value =
      code === 'REASON_REQUIRED'    ? '조정 사유를 입력해 주세요.' :
      code === 'ALREADY_CONFIRMED'  ? '확정된 월은 수정할 수 없습니다.' :
      code === 'CADDIE_NOT_FOUND'   ? '캐디를 찾을 수 없습니다.' :
      '캐디피 조정에 실패했습니다.'
  } finally {
    adjusting.value = false
  }
}
</script>

<template>
  <div class="monthly-view">
    <!-- 탭과 우측 컨트롤을 같은 라인에 배치 (페이지 제목은 상단바가 표시) -->
    <div class="page-header">
      <div class="tabs">
        <button class="tab" :class="{ 'is-active': activeTab === 'rounds' }" @click="activeTab = 'rounds'">
          근무 횟수
        </button>
        <button class="tab" :class="{ 'is-active': activeTab === 'income' }" @click="activeTab = 'income'">
          수입 집계
        </button>
      </div>
      <div class="header-actions">
        <input type="month" v-model="selectedMonth" class="month-input" @change="store.fetchMonthlySummary(selectedMonth)" />
        <template v-if="monthlyStatus">
          <BaseBadge :type="isConfirmed ? 'success' : 'warning'">
            {{ isConfirmed ? '마감 확정' : '집계 중' }}
          </BaseBadge>
          <BaseButton v-if="isConfirmed" variant="ghost" size="sm" :loading="confirming" @click="handleCancelConfirm">
            확정 취소
          </BaseButton>
        </template>
        <BaseButton v-if="!isConfirmed" variant="primary" size="sm" :loading="confirming" @click="handleConfirm">
          월 마감 확정
        </BaseButton>
      </div>
    </div>

    <p v-if="confirmError" class="page-error">{{ confirmError }}</p>

    <BaseLoading v-if="loading" />
    <p v-else-if="error" class="page-error">{{ error }}</p>

    <!-- 근무 횟수 탭 -->
    <template v-else-if="activeTab === 'rounds'">
      <BaseEmpty v-if="!roundSummary.length" message="해당 월의 근무 데이터가 없습니다." />
      <div v-else class="table-wrap">
        <table class="gms-table">
          <thead>
            <tr>
              <th>캐디명</th>
              <th>총 배정 라운드</th>
              <th>총 배정 건수</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in roundSummary" :key="r.caddieId">
              <td class="td-name">{{ r.caddieName }}</td>
              <td>{{ r.totalRoundCount }}회</td>
              <td>{{ r.totalAssignmentCount }}건</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- 수입 집계 탭 -->
    <template v-else>
      <BaseEmpty v-if="!incomeSummary.length" message="해당 월의 수입 데이터가 없습니다." />
      <div v-else class="table-wrap">
        <table class="gms-table">
          <thead>
            <tr>
              <th>캐디명</th>
              <th>기본 캐디피</th>
              <th>조정 후 캐디피</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in incomeSummary" :key="s.caddieId">
              <td class="td-name">{{ s.caddieName }}</td>
              <td>{{ formatFee(s.totalFee) }}</td>
              <td :class="{ 'td-adjusted': s.adjustedFee !== s.totalFee }">
                {{ formatFee(s.adjustedFee ?? s.totalFee) }}
              </td>
              <td>
                <BaseButton
                  v-if="!isConfirmed"
                  variant="ghost" size="sm"
                  @click="openAdjustModal(s)"
                >수동 조정</BaseButton>
                <span v-else class="text-secondary">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- 캐디피 수동 조정 모달 -->
    <BaseModal
      :visible="showAdjust"
      :title="`캐디피 조정 — ${adjustTarget?.caddieName}`"
      @close="showAdjust = false"
    >
      <div class="form">
        <p class="form-desc">기본 캐디피: <strong>{{ formatFee(adjustTarget?.totalFee) }}</strong></p>
        <div class="form-row">
          <label class="form-label">조정 금액 (원) <span class="required">*</span></label>
          <BaseInput v-model="adjustForm.adjustedFee" type="number" min="0" :disabled="adjusting" />
        </div>
        <div class="form-row">
          <label class="form-label">조정 사유 <span class="required">*</span></label>
          <BaseInput v-model="adjustForm.reason" placeholder="사유를 입력해 주세요" :disabled="adjusting" />
        </div>
        <p v-if="adjustError" class="form-error">{{ adjustError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" :disabled="adjusting" @click="showAdjust = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="adjusting" @click="handleAdjust">저장</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.monthly-view {
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

.month-input {
  padding: var(--space-6) var(--space-10);
  font-size: var(--font-size-body-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  background: var(--color-bg-input);
  color: var(--color-text-primary);
  outline: none;
}

.month-input:focus { border-color: var(--color-border-focus); }

.page-error {
  color: var(--color-danger);
  font-size: var(--font-size-body-sm);
  padding: var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-8);
}

.tabs {
  display: flex;
  gap: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.tab {
  padding: var(--space-8) var(--space-16);
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}

.tab.is-active {
  color: var(--manager-primary);
  border-bottom-color: var(--manager-primary);
}

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

.td-name     { font-weight: 600; }
.td-adjusted { color: var(--color-warning); font-weight: 600; }
.text-secondary { color: var(--color-text-secondary); }

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

.form-label {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-primary);
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
