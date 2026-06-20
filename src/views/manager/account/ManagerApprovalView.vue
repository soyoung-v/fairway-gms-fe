<script setup>
// Manager 가입 승인 (UI-M027) — Admin 전용
// Manager 가입 신청 목록 조회·승인·거절
import { onMounted, ref, computed } from 'vue'
import userApi from '@/api/userApi'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'

const list       = ref([])
const loading    = ref(false)
const error      = ref('')
const statusFilter = ref('ALL') // 'ALL' | 'PENDING' | 'ACTIVE' | 'REJECTED'

const filteredList = computed(() => {
  if (statusFilter.value === 'ALL') return list.value
  return list.value.filter(m => m.status === statusFilter.value)
})

// ─── 승인 확인 모달 ──────────────────────────────────────────────
const approveTarget  = ref(null)
const showApprove    = ref(false)
const approving      = ref(false)

function openApproveModal(manager) {
  approveTarget.value = manager
  showApprove.value   = true
}

async function handleApprove() {
  if (!approveTarget.value) return
  approving.value = true
  try {
    await userApi.approveManager(approveTarget.value.userId)
    const idx = list.value.findIndex(m => m.userId === approveTarget.value.userId)
    if (idx !== -1) list.value[idx] = { ...list.value[idx], status: 'ACTIVE' }
    showApprove.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    alert(code === 'ALREADY_PROCESSED' ? '이미 처리된 계정입니다.' : '승인에 실패했습니다.')
  } finally {
    approving.value = false
  }
}

// ─── 거절 모달 ──────────────────────────────────────────────────
const rejectTarget  = ref(null)
const showReject    = ref(false)
const rejectReason  = ref('')
const rejectReasonError = ref('')
const rejecting     = ref(false)

function openRejectModal(manager) {
  rejectTarget.value    = manager
  rejectReason.value    = ''
  rejectReasonError.value = ''
  showReject.value      = true
}

async function handleReject() {
  rejectReasonError.value = ''
  if (!rejectReason.value.trim()) {
    rejectReasonError.value = '거절 사유를 입력해 주세요.'
    return
  }
  rejecting.value = true
  try {
    await userApi.rejectManager(rejectTarget.value.userId, rejectReason.value.trim())
    const idx = list.value.findIndex(m => m.userId === rejectTarget.value.userId)
    if (idx !== -1) list.value[idx] = { ...list.value[idx], status: 'REJECTED' }
    showReject.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    alert(code === 'ALREADY_PROCESSED' ? '이미 처리된 계정입니다.' : '거절에 실패했습니다.')
  } finally {
    rejecting.value = false
  }
}

// ─── 목록 로드 ──────────────────────────────────────────────────
async function fetchList() {
  loading.value = true
  error.value   = ''
  try {
    const data = await userApi.getManagers({ size: 100 })
    list.value = Array.isArray(data) ? data : (data?.content ?? [])
  } catch {
    error.value = 'Manager 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

// 상태 뱃지 타입 변환
function badgeType(status) {
  const map = { ACTIVE: 'success', PENDING: 'warning', REJECTED: 'danger', WITHDRAWN: 'disabled' }
  return map[status] || 'disabled'
}

function statusLabel(status) {
  const map = { ACTIVE: '승인됨', PENDING: '승인 대기', REJECTED: '거절됨', WITHDRAWN: '탈퇴' }
  return map[status] || status
}

onMounted(fetchList)
</script>

<template>
  <div class="manager-approval-view">
    <div class="manager-approval-view__header">
      <h1 class="manager-approval-view__title">Manager 가입 승인</h1>
    </div>

    <!-- 상태 필터 탭 -->
    <div class="status-tabs" role="tablist">
      <button
        v-for="tab in [
          { value: 'ALL',      label: '전체' },
          { value: 'PENDING',  label: '승인 대기' },
          { value: 'ACTIVE',   label: '승인됨' },
          { value: 'REJECTED', label: '거절됨' },
        ]"
        :key="tab.value"
        class="status-tab"
        :class="{ 'is-active': statusFilter === tab.value }"
        role="tab"
        @click="statusFilter = tab.value"
      >
        {{ tab.label }}
        <span v-if="tab.value === 'PENDING'" class="status-tab__badge">
          {{ list.filter(m => m.status === 'PENDING').length }}
        </span>
      </button>
    </div>

    <!-- 로딩 -->
    <BaseLoading v-if="loading" />

    <!-- 에러 -->
    <p v-else-if="error" class="approval-error">{{ error }}</p>

    <!-- 빈 목록 -->
    <BaseEmpty v-else-if="!filteredList.length" message="해당하는 Manager 신청이 없습니다." />

    <!-- 목록 테이블 -->
    <div v-else class="approval-table-wrap">
      <table class="gms-table">
        <thead>
          <tr>
            <th>이름</th>
            <th>이메일</th>
            <th>소속 골프장</th>
            <th>상태</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="manager in filteredList" :key="manager.userId">
            <td class="td-name">{{ manager.name }}</td>
            <td class="td-email">{{ manager.email }}</td>
            <td>{{ manager.golfCourseName || '-' }}</td>
            <td>
              <BaseBadge :type="badgeType(manager.status)">
                {{ statusLabel(manager.status) }}
              </BaseBadge>
            </td>
            <td class="td-actions">
              <template v-if="manager.status === 'PENDING'">
                <BaseButton
                  variant="success"
                  size="sm"
                  @click="openApproveModal(manager)"
                >
                  승인
                </BaseButton>
                <BaseButton
                  variant="danger"
                  size="sm"
                  @click="openRejectModal(manager)"
                >
                  거절
                </BaseButton>
              </template>
              <span v-else class="no-action">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 승인 확인 모달 -->
    <ConfirmModal
      :visible="showApprove"
      title="Manager 가입을 승인하시겠습니까?"
      subtitle="승인 후 해당 Manager가 시스템에 접속할 수 있습니다."
      :item-name="approveTarget?.name"
      item-label="신청자"
      confirm-text="승인"
      confirm-type="success"
      :loading="approving"
      @confirm="handleApprove"
      @cancel="showApprove = false"
    />

    <!-- 거절 모달 -->
    <BaseModal
      :visible="showReject"
      title="가입 거절"
      :subtitle="rejectTarget ? `${rejectTarget.name} (${rejectTarget.email})` : ''"
      @close="showReject = false"
    >
      <div class="reject-form">
        <label class="reject-form__label">거절 사유 <span class="required">*</span></label>
        <BaseInput
          v-model="rejectReason"
          placeholder="거절 사유를 입력해 주세요"
          :error="rejectReasonError"
          :disabled="rejecting"
        />
      </div>
      <template #footer>
        <BaseButton variant="outline" :disabled="rejecting" @click="showReject = false">취소</BaseButton>
        <BaseButton variant="danger" :loading="rejecting" @click="handleReject">거절</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.manager-approval-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

.manager-approval-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.manager-approval-view__title {
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--color-text-primary);
}

/* ─── 상태 필터 탭 ─── */
.status-tabs {
  display: flex;
  gap: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0;
}

.status-tab {
  padding: var(--space-8) var(--space-16);
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  display: flex;
  align-items: center;
  gap: var(--space-6);
  transition: color var(--transition-fast), border-color var(--transition-fast);
}

.status-tab.is-active {
  color: var(--manager-primary);
  border-bottom-color: var(--manager-primary);
}

.status-tab__badge {
  background: var(--color-warning-bg);
  color: var(--color-warning);
  font-size: var(--font-size-detail);
  font-weight: 700;
  padding: 0 var(--space-6);
  border-radius: var(--radius-full);
  min-width: 18px;
  text-align: center;
}

/* ─── 에러 ─── */
.approval-error {
  color: var(--color-danger);
  font-size: var(--font-size-body-sm);
  padding: var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-8);
}

/* ─── 테이블 ─── */
.approval-table-wrap {
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

.td-name  { font-weight: 600; }
.td-email { color: var(--color-text-secondary); }

.td-actions {
  display: flex;
  gap: var(--space-8);
}

.no-action {
  color: var(--color-text-secondary);
  font-size: var(--font-size-detail);
}

/* ─── 거절 폼 ─── */
.reject-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.reject-form__label {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.required { color: var(--color-danger); }
</style>
