<script setup>
// 순번교환 승인 (UI-M022) — Manager 전용
// 캐디 순번교환 요청 목록 조회, 승인/거절 처리
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useBoardStore } from '@/stores/useBoardStore'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'

const store = useBoardStore()
const { swapRequests, swapPage, loading, error } = storeToRefs(store)

const STATUS_OPTIONS = [
  { value: '',         label: '전체' },
  { value: 'REQUESTED', label: '요청' },
  { value: 'APPROVED',  label: '승인' },
  { value: 'REJECTED',  label: '거절' },
]

const STATUS_BADGE = { REQUESTED: 'warning', APPROVED: 'success', REJECTED: 'danger' }
const STATUS_LABEL = { REQUESTED: '요청', APPROVED: '승인', REJECTED: '거절' }

const selectedStatus = ref('')

function formatDate(str) {
  if (!str) return '—'
  return typeof str === 'string' && str.length === 10 ? str : str.slice(0, 10)
}

async function loadList(page = 0) {
  await store.fetchSwapRequests({ status: selectedStatus.value || undefined, page })
}

onMounted(() => loadList())

// ─── 승인 ──────────────────────────────────────────────────────
const approving = ref(null) // 처리 중인 requestId

async function handleApprove(requestId) {
  if (!confirm('이 순번교환 요청을 승인하시겠습니까?')) return
  approving.value = requestId
  try {
    await store.approveSwapRequest(requestId)
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    alert(code === 'ALREADY_PROCESSED' ? '이미 처리된 요청입니다.' : '승인에 실패했습니다.')
  } finally {
    approving.value = null
  }
}

// ─── 거절 모달 ─────────────────────────────────────────────────
const showReject     = ref(false)
const rejectTarget   = ref(null)
const rejectReason   = ref('')
const rejecting      = ref(false)
const rejectError    = ref('')

function openReject(row) {
  rejectTarget.value = row
  rejectReason.value = ''
  rejectError.value  = ''
  showReject.value   = true
}

async function handleReject() {
  if (!rejectReason.value.trim()) { rejectError.value = '거절 사유를 입력해 주세요.'; return }
  rejecting.value = true
  rejectError.value = ''
  try {
    await store.rejectSwapRequest(rejectTarget.value.requestId, { rejectReason: rejectReason.value.trim() })
    showReject.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    rejectError.value = code === 'ALREADY_PROCESSED' ? '이미 처리된 요청입니다.' : '거절에 실패했습니다.'
  } finally {
    rejecting.value = false
  }
}
</script>

<template>
  <div class="swap-view">
    <div class="page-header">
      <h1 class="page-header__title">순번교환 승인</h1>
    </div>

    <!-- 상태 필터 -->
    <div class="filter-row">
      <div class="tab-group">
        <button
          v-for="opt in STATUS_OPTIONS"
          :key="opt.value"
          class="tab"
          :class="{ 'is-active': selectedStatus === opt.value }"
          @click="selectedStatus = opt.value; loadList()"
        >{{ opt.label }}</button>
      </div>
    </div>

    <BaseLoading v-if="loading" />
    <p v-else-if="error" class="page-error">{{ error }}</p>

    <template v-else>
      <BaseEmpty v-if="!swapRequests.length" message="해당 조건의 순번교환 요청이 없습니다." />
      <div v-else class="table-wrap">
        <table class="gms-table">
          <thead>
            <tr>
              <th>요청자</th>
              <th>대상자</th>
              <th>요청일</th>
              <th>상태</th>
              <th>거절 사유</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in swapRequests" :key="r.requestId">
              <td class="td-name">{{ r.requesterName }}</td>
              <td class="td-name">{{ r.targetName }}</td>
              <td>{{ formatDate(r.requestDate) }}</td>
              <td>
                <BaseBadge :type="STATUS_BADGE[r.status] ?? 'default'">
                  {{ STATUS_LABEL[r.status] ?? r.status }}
                </BaseBadge>
              </td>
              <td class="td-reason">{{ r.rejectReason ?? '—' }}</td>
              <td class="td-actions">
                <template v-if="r.status === 'REQUESTED'">
                  <BaseButton
                    variant="primary" size="sm"
                    :loading="approving === r.requestId"
                    @click="handleApprove(r.requestId)"
                  >승인</BaseButton>
                  <BaseButton
                    variant="ghost" size="sm"
                    :disabled="approving === r.requestId"
                    @click="openReject(r)"
                  >거절</BaseButton>
                </template>
                <span v-else class="text-secondary">처리 완료</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 페이지네이션 -->
        <div v-if="swapPage.totalPages > 1" class="pagination">
          <BaseButton variant="ghost" size="sm" :disabled="swapPage.number === 0" @click="loadList(swapPage.number - 1)">이전</BaseButton>
          <span class="page-info">{{ swapPage.number + 1 }} / {{ swapPage.totalPages }}</span>
          <BaseButton variant="ghost" size="sm" :disabled="swapPage.number >= swapPage.totalPages - 1" @click="loadList(swapPage.number + 1)">다음</BaseButton>
        </div>
      </div>
    </template>

    <!-- 거절 사유 입력 모달 -->
    <BaseModal
      :visible="showReject"
      :title="`거절 — ${rejectTarget?.requesterName} → ${rejectTarget?.targetName}`"
      @close="showReject = false"
    >
      <div class="form">
        <div class="form-row">
          <label class="form-label">거절 사유 <span class="required">*</span></label>
          <BaseInput
            v-model="rejectReason"
            placeholder="거절 사유를 입력해 주세요"
            :disabled="rejecting"
            @keyup.enter="handleReject"
          />
        </div>
        <p v-if="rejectError" class="form-error">{{ rejectError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" :disabled="rejecting" @click="showReject = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="rejecting" @click="handleReject">거절 확정</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.swap-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

.page-header__title {
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--color-text-primary);
}

.filter-row { display: flex; align-items: center; gap: var(--space-8); }

.tab-group {
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

.page-error {
  color: var(--color-danger);
  font-size: var(--font-size-body-sm);
  padding: var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-8);
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
.td-reason   { color: var(--color-text-secondary); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td-actions  { display: flex; gap: var(--space-4); align-items: center; }
.text-secondary { color: var(--color-text-secondary); font-size: var(--font-size-detail); }

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-12);
  padding: var(--space-12);
  border-top: 1px solid var(--color-border);
}

.page-info { font-size: var(--font-size-body-sm); color: var(--color-text-secondary); }

.form { display: flex; flex-direction: column; gap: var(--space-16); }
.form-row { display: flex; flex-direction: column; gap: var(--space-6); }
.form-label { font-size: var(--font-size-body-sm); font-weight: 500; color: var(--color-text-primary); }
.form-error { font-size: var(--font-size-detail); color: var(--color-danger); }
.required { color: var(--color-danger); }
</style>
