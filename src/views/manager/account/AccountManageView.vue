<script setup>
// 계정 관리 (UI-M003) — Admin 전용
// Manager 계정 목록 조회, ACTIVE Manager 퇴사 처리
import { onMounted, ref, computed } from 'vue'
import userApi from '@/api/userApi'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'

const list         = ref([])
const loading      = ref(false)
const error        = ref('')
const statusFilter = ref('ALL')

// 탭 필터는 클라이언트 사이드 — 전체를 한 번 불러온 뒤 role이 MANAGER인 계정만 표시
const filteredList = computed(() => {
  const managers = list.value.filter(u => u.role === 'MANAGER')
  if (statusFilter.value === 'ALL') return managers
  return managers.filter(m => m.status === statusFilter.value)
})

// ─── 퇴사 처리 확인 모달 ─────────────────────────────────────────
const withdrawTarget  = ref(null)
const showWithdraw    = ref(false)
const withdrawing     = ref(false)

function openWithdrawModal(manager) {
  withdrawTarget.value = manager
  showWithdraw.value   = true
}

async function handleWithdraw() {
  if (!withdrawTarget.value) return
  withdrawing.value = true
  try {
    await userApi.withdrawManager(withdrawTarget.value.userId)
    const idx = list.value.findIndex(m => m.userId === withdrawTarget.value.userId)
    if (idx !== -1) list.value[idx] = { ...list.value[idx], status: 'WITHDRAWN' }
    showWithdraw.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    alert(code === 'USER_NOT_FOUND' ? '사용자를 찾을 수 없습니다.' : '퇴사 처리에 실패했습니다.')
  } finally {
    withdrawing.value = false
  }
}

// ─── 목록 로드 ──────────────────────────────────────────────────
async function fetchList() {
  loading.value = true
  error.value   = ''
  try {
    const data = await userApi.getUsers()
    list.value = Array.isArray(data) ? data : (data?.content ?? [])
  } catch {
    error.value = '계정 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

function badgeType(status) {
  const map = { ACTIVE: 'success', PENDING: 'warning', REJECTED: 'danger', WITHDRAWN: 'disabled' }
  return map[status] || 'disabled'
}

function statusLabel(status) {
  const map = { ACTIVE: '활성', PENDING: '승인 대기', REJECTED: '거절됨', WITHDRAWN: '퇴사' }
  return map[status] || status
}

function roleLabel(role) {
  const map = { ADMIN: 'Admin', MANAGER: 'Manager', CADDY: 'Caddy' }
  return map[role] || role
}

onMounted(fetchList)
</script>

<template>
  <div class="account-manage-view">
    <div class="account-manage-view__header">
      <h1 class="account-manage-view__title">계정 관리</h1>
    </div>

    <!-- 상태 필터 탭 -->
    <div class="status-tabs" role="tablist">
      <button
        v-for="tab in [
          { value: 'ALL',      label: '전체' },
          { value: 'ACTIVE',   label: '활성' },
          { value: 'PENDING',  label: '승인 대기' },
          { value: 'REJECTED', label: '거절됨' },
          { value: 'WITHDRAWN', label: '퇴사' },
        ]"
        :key="tab.value"
        class="status-tab"
        :class="{ 'is-active': statusFilter === tab.value }"
        role="tab"
        @click="statusFilter = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 로딩 -->
    <BaseLoading v-if="loading" />

    <!-- 에러 -->
    <p v-else-if="error" class="account-error">{{ error }}</p>

    <!-- 빈 목록 -->
    <BaseEmpty v-else-if="!filteredList.length" message="해당하는 계정이 없습니다." />

    <!-- 계정 테이블 -->
    <div v-else class="account-table-wrap">
      <table class="gms-table">
        <thead>
          <tr>
            <th>이름</th>
            <th>이메일</th>
            <th>역할</th>
            <th>상태</th>
            <th>소속 골프장</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="manager in filteredList" :key="manager.userId">
            <td class="td-name">{{ manager.name }}</td>
            <td class="td-email">{{ manager.email }}</td>
            <td>
              <span class="role-chip">{{ roleLabel(manager.role) }}</span>
            </td>
            <td>
              <BaseBadge :type="badgeType(manager.status)">
                {{ statusLabel(manager.status) }}
              </BaseBadge>
            </td>
            <td>{{ manager.golfCourseName || '-' }}</td>
            <td class="td-actions">
              <BaseButton
                v-if="manager.status === 'ACTIVE'"
                variant="danger"
                size="sm"
                @click="openWithdrawModal(manager)"
              >
                퇴사 처리
              </BaseButton>
              <span v-else class="no-action">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 퇴사 처리 확인 모달 -->
    <ConfirmModal
      :visible="showWithdraw"
      title="Manager를 퇴사 처리하시겠습니까?"
      subtitle="퇴사 처리 후에는 해당 계정으로 로그인할 수 없습니다."
      :item-name="withdrawTarget?.name"
      item-label="대상"
      confirm-text="퇴사 처리"
      confirm-type="danger"
      :loading="withdrawing"
      @confirm="handleWithdraw"
      @cancel="showWithdraw = false"
    />
  </div>
</template>

<style scoped>
.account-manage-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

.account-manage-view__header {
  display: flex;
  align-items: center;
}

.account-manage-view__title {
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--color-text-primary);
}

/* ─── 상태 탭 ─── */
.status-tabs {
  display: flex;
  gap: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.status-tab {
  padding: var(--space-8) var(--space-16);
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}

.status-tab.is-active {
  color: var(--manager-primary);
  border-bottom-color: var(--manager-primary);
}

/* ─── 에러 ─── */
.account-error {
  color: var(--color-danger);
  font-size: var(--font-size-body-sm);
  padding: var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-8);
}

/* ─── 테이블 ─── */
.account-table-wrap {
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
.td-actions { white-space: nowrap; }

.role-chip {
  display: inline-block;
  padding: 2px var(--space-8);
  border-radius: var(--radius-4);
  background: var(--color-bg-disabled);
  color: var(--color-text-secondary);
  font-size: var(--font-size-detail);
  font-weight: 600;
}

.no-action {
  color: var(--color-text-secondary);
  font-size: var(--font-size-detail);
}
</style>
