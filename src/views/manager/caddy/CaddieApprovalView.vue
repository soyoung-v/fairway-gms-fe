<script setup>
// 캐디 가입·계정 관리 (UI-M026) — Manager 전용
// PENDING 캐디 목록 조회·승인·거절
import { onMounted, ref } from 'vue'
import userApi from '@/api/userApi'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'

const list    = ref([])
const loading = ref(false)
const error   = ref('')

// ─── 목록 로드 ───────────────────────────────────────────────────
async function fetchList() {
  loading.value = true
  error.value   = ''
  try {
    const data = await userApi.getPendingCaddies({ size: 100 })
    list.value = Array.isArray(data) ? data : (data?.content ?? [])
  } catch {
    error.value = '캐디 가입 신청 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

// ─── 승인 모달 ───────────────────────────────────────────────────
const approveTarget = ref(null)
const showApprove   = ref(false)
const approving     = ref(false)

function openApproveModal(caddie) {
  approveTarget.value = caddie
  showApprove.value   = true
}

async function handleApprove() {
  if (!approveTarget.value) return
  approving.value = true
  try {
    await userApi.approveCaddie(approveTarget.value.userId)
    // 승인 후 목록에서 제거한다 (PENDING → ACTIVE 처리 완료)
    list.value    = list.value.filter(c => c.userId !== approveTarget.value.userId)
    showApprove.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    alert(code === 'ALREADY_PROCESSED' ? '이미 처리된 계정입니다.' : '승인에 실패했습니다.')
  } finally {
    approving.value = false
  }
}

// ─── 거절 모달 ───────────────────────────────────────────────────
const rejectTarget      = ref(null)
const showReject        = ref(false)
const rejectReason      = ref('')
const rejectReasonError = ref('')
const rejecting         = ref(false)

function openRejectModal(caddie) {
  rejectTarget.value      = caddie
  rejectReason.value      = ''
  rejectReasonError.value = ''
  showReject.value        = true
}

async function handleReject() {
  rejectReasonError.value = ''
  if (!rejectReason.value.trim()) {
    rejectReasonError.value = '거절 사유를 입력해 주세요.'
    return
  }
  rejecting.value = true
  try {
    await userApi.rejectCaddie(rejectTarget.value.userId, rejectReason.value.trim())
    // 거절 후 목록에서 제거한다
    list.value   = list.value.filter(c => c.userId !== rejectTarget.value.userId)
    showReject.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    alert(code === 'USER_NOT_FOUND' ? '해당 사용자를 찾을 수 없습니다.' : '거절에 실패했습니다.')
  } finally {
    rejecting.value = false
  }
}

onMounted(fetchList)
</script>

<template>
  <div class="caddie-approval-view">
    <div class="page-header">
      <h1 class="page-header__title">캐디 가입 승인</h1>
      <BaseBadge v-if="list.length" type="warning">대기 {{ list.length }}건</BaseBadge>
    </div>

    <!-- 로딩 -->
    <BaseLoading v-if="loading" />

    <!-- 에러 -->
    <p v-else-if="error" class="page-error">{{ error }}</p>

    <!-- 빈 목록 -->
    <BaseEmpty v-else-if="!list.length" message="승인 대기 중인 캐디 신청이 없습니다." />

    <!-- 목록 테이블 -->
    <div v-else class="table-wrap">
      <table class="gms-table">
        <thead>
          <tr>
            <th>이름</th>
            <th>이메일</th>
            <th>신청일</th>
            <th>상태</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="caddie in list" :key="caddie.userId">
            <td class="td-name">{{ caddie.name }}</td>
            <td class="td-email">{{ caddie.email }}</td>
            <td>{{ caddie.appliedAt ? caddie.appliedAt.slice(0, 10) : '—' }}</td>
            <td>
              <BaseBadge type="warning">승인 대기</BaseBadge>
            </td>
            <td class="td-actions">
              <BaseButton variant="success" size="sm" @click="openApproveModal(caddie)">승인</BaseButton>
              <BaseButton variant="danger"  size="sm" @click="openRejectModal(caddie)">거절</BaseButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 승인 확인 모달 -->
    <ConfirmModal
      :visible="showApprove"
      title="캐디 가입을 승인하시겠습니까?"
      subtitle="승인 후 해당 캐디가 시스템에 접속할 수 있습니다."
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
        <p v-if="rejectReasonError" class="reject-form__error">{{ rejectReasonError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" :disabled="rejecting" @click="showReject = false">취소</BaseButton>
        <BaseButton variant="danger" :loading="rejecting" @click="handleReject">거절</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.caddie-approval-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

.page-header {
  display: flex;
  align-items: center;
  gap: var(--space-12);
}

.page-header__title {
  font-size: var(--font-size-heading-3);
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

.td-name  { font-weight: 600; }
.td-email { color: var(--color-text-secondary); }

.td-actions {
  display: flex;
  gap: var(--space-8);
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

.reject-form__error {
  font-size: var(--font-size-detail);
  color: var(--color-danger);
}

.required { color: var(--color-danger); }
</style>
