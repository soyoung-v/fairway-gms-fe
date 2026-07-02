<script setup>
// 카트 관리 (UI-M006) — Admin + Manager
// 카트 목록 조회, 등록, 정보 수정, 상태 변경
import { onMounted, ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGolfCourseStore } from '@/stores/useGolfCourseStore'
import { useCartStore } from '@/stores/useCartStore'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'

const authStore       = useAuthStore()
const golfCourseStore = useGolfCourseStore()
const cartStore       = useCartStore()

const { role, golfCourseId: myGolfCourseId } = storeToRefs(authStore)
const { selectedGolfCourseId } = storeToRefs(golfCourseStore)
const { carts, loading, error } = storeToRefs(cartStore)

// Admin: 선택된 골프장, Manager: 소속 골프장
const targetGolfCourseId = computed(() =>
  role.value === 'ADMIN' ? selectedGolfCourseId.value : myGolfCourseId.value
)

const statusFilter = ref('ALL')

// 상태 탭 필터 — 클라이언트 사이드
const filteredCarts = computed(() => {
  if (statusFilter.value === 'ALL') return carts.value
  return carts.value.filter(c => c.status === statusFilter.value)
})

const CART_TYPE_OPTIONS = [
  { value: 'ELECTRIC', label: '전동 카트' },
  { value: 'MANUAL',   label: '일반 카트' },
]

const STATUS_TABS = [
  { value: 'ALL',         label: '전체' },
  { value: 'AVAILABLE',   label: '사용 가능' },
  { value: 'IN_USE',      label: '사용 중' },
  { value: 'MAINTENANCE', label: '점검 중' },
  { value: 'DISABLED',    label: '사용 불가' },
]

const STATUS_CHANGE_OPTIONS = [
  { value: 'AVAILABLE',   label: '사용 가능' },
  { value: 'MAINTENANCE', label: '점검 중' },
  { value: 'DISABLED',    label: '사용 불가' },
]

function statusBadgeType(status) {
  return { AVAILABLE: 'success', IN_USE: 'warning', MAINTENANCE: 'disabled', DISABLED: 'danger' }[status] || 'disabled'
}

function statusLabel(status) {
  return { AVAILABLE: '사용 가능', IN_USE: '사용 중', MAINTENANCE: '점검 중', DISABLED: '사용 불가' }[status] || status
}

function cartTypeLabel(type) {
  return { ELECTRIC: '전동', MANUAL: '일반' }[type] || type
}

// ─── 목록 로드 ──────────────────────────────────────────────────
async function fetchList() {
  if (!targetGolfCourseId.value) return
  await cartStore.fetchCarts(targetGolfCourseId.value)
}

// ─── 등록 모달 ──────────────────────────────────────────────────
const showCreate  = ref(false)
const creating    = ref(false)
const createForm  = ref({ cartNumber: '', cartType: 'ELECTRIC' })
const createError = ref('')

function openCreateModal() {
  createForm.value  = { cartNumber: '', cartType: 'ELECTRIC' }
  createError.value = ''
  showCreate.value  = true
}

async function handleCreate() {
  createError.value = ''
  if (!createForm.value.cartNumber.trim()) { createError.value = '카트 번호를 입력해 주세요.'; return }
  creating.value = true
  try {
    await cartStore.addCart(targetGolfCourseId.value, {
      cartNumber: createForm.value.cartNumber.trim(),
      cartType:   createForm.value.cartType,
    })
    showCreate.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    createError.value = code === 'DUPLICATE_CART_NUMBER' ? '이미 사용 중인 카트 번호입니다.' : '등록에 실패했습니다.'
  } finally {
    creating.value = false
  }
}

// ─── 수정 모달 ──────────────────────────────────────────────────
const showEdit   = ref(false)
const editing    = ref(false)
const editTarget = ref(null)
const editForm   = ref({ cartNumber: '', cartType: 'ELECTRIC', note: '' })
const editError  = ref('')

function openEditModal(cart) {
  editTarget.value = cart
  editForm.value   = { cartNumber: cart.cartNumber, cartType: cart.cartType, note: cart.note || '' }
  editError.value  = ''
  showEdit.value   = true
}

async function handleEdit() {
  editError.value = ''
  if (!editForm.value.cartNumber.trim()) { editError.value = '카트 번호를 입력해 주세요.'; return }
  editing.value = true
  try {
    await cartStore.editCart(editTarget.value.cartId, {
      cartNumber: editForm.value.cartNumber.trim(),
      cartType:   editForm.value.cartType,
      note:       editForm.value.note.trim(),
    })
    showEdit.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    editError.value = code === 'CART_NOT_FOUND' ? '카트를 찾을 수 없습니다.' : '수정에 실패했습니다.'
  } finally {
    editing.value = false
  }
}

// ─── 상태 변경 모달 ──────────────────────────────────────────────
// IN_USE 카트는 배정 시스템에서 관리되므로 수동 상태 변경 대상에서 제외한다
const showStatus     = ref(false)
const changingStatus = ref(false)
const statusTarget   = ref(null)
const newStatus      = ref('AVAILABLE')
const statusError    = ref('')

function openStatusModal(cart) {
  statusTarget.value = cart
  newStatus.value    = 'AVAILABLE'
  statusError.value  = ''
  showStatus.value   = true
}

async function handleStatusChange() {
  statusError.value    = ''
  changingStatus.value = true
  try {
    await cartStore.changeCartStatus(statusTarget.value.cartId, newStatus.value)
    showStatus.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    statusError.value = code === 'INVALID_STATUS' ? '허용되지 않는 상태값입니다.' : '상태 변경에 실패했습니다.'
  } finally {
    changingStatus.value = false
  }
}

onMounted(fetchList)
</script>

<template>
  <div class="cart-manage-view">
    <div class="page-header">
      <h1 class="page-header__title">카트 관리</h1>
      <BaseButton variant="primary" size="sm" :disabled="!targetGolfCourseId" @click="openCreateModal">
        + 카트 등록
      </BaseButton>
    </div>

    <!-- Admin 골프장 미선택 안내 -->
    <p v-if="!targetGolfCourseId" class="page-notice">
      Admin 계정은 상단 드롭다운에서 골프장을 선택해 주세요.
    </p>

    <template v-else>
      <!-- 상태 필터 탭 -->
      <div class="status-tabs" role="tablist">
        <button
          v-for="tab in STATUS_TABS"
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
      <p v-else-if="error" class="page-error">{{ error }}</p>

      <!-- 빈 목록 -->
      <BaseEmpty v-else-if="!filteredCarts.length" message="해당하는 카트가 없습니다." />

      <!-- 카트 테이블 -->
      <div v-else class="table-wrap">
        <table class="gms-table">
          <thead>
            <tr>
              <th>카트 번호</th>
              <th>타입</th>
              <th>상태</th>
              <th>비고</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cart in filteredCarts" :key="cart.cartId">
              <td class="td-number">{{ cart.cartNumber }}</td>
              <td>{{ cartTypeLabel(cart.cartType) }}</td>
              <td>
                <BaseBadge :type="statusBadgeType(cart.status)">
                  {{ statusLabel(cart.status) }}
                </BaseBadge>
              </td>
              <td class="td-note">{{ cart.note || '—' }}</td>
              <td class="td-actions">
                <BaseButton variant="ghost" size="sm" @click="openEditModal(cart)">수정</BaseButton>
                <BaseButton
                  v-if="cart.status !== 'IN_USE'"
                  variant="ghost"
                  size="sm"
                  @click="openStatusModal(cart)"
                >
                  상태 변경
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- 카트 등록 모달 -->
    <BaseModal :visible="showCreate" title="카트 등록" @close="showCreate = false">
      <div class="form">
        <div class="form-row">
          <label class="form-label">카트 번호 <span class="required">*</span></label>
          <BaseInput v-model="createForm.cartNumber" placeholder="예: 001" :disabled="creating" />
        </div>
        <div class="form-row">
          <label class="form-label">카트 타입 <span class="required">*</span></label>
          <BaseSelect v-model="createForm.cartType" :options="CART_TYPE_OPTIONS" :disabled="creating" />
        </div>
        <p v-if="createError" class="form-error">{{ createError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" :disabled="creating" @click="showCreate = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="creating" @click="handleCreate">등록</BaseButton>
      </template>
    </BaseModal>

    <!-- 카트 수정 모달 -->
    <BaseModal :visible="showEdit" title="카트 수정" @close="showEdit = false">
      <div class="form">
        <div class="form-row">
          <label class="form-label">카트 번호 <span class="required">*</span></label>
          <BaseInput v-model="editForm.cartNumber" :disabled="editing" />
        </div>
        <div class="form-row">
          <label class="form-label">카트 타입 <span class="required">*</span></label>
          <BaseSelect v-model="editForm.cartType" :options="CART_TYPE_OPTIONS" :disabled="editing" />
        </div>
        <div class="form-row">
          <label class="form-label">비고</label>
          <BaseInput v-model="editForm.note" placeholder="메모 (선택)" :disabled="editing" />
        </div>
        <p v-if="editError" class="form-error">{{ editError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" :disabled="editing" @click="showEdit = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="editing" @click="handleEdit">저장</BaseButton>
      </template>
    </BaseModal>

    <!-- 상태 변경 모달 -->
    <BaseModal
      :visible="showStatus"
      :title="`상태 변경 — ${statusTarget?.cartNumber ?? ''}`"
      @close="showStatus = false"
    >
      <div class="form">
        <p class="form-desc">
          현재 상태: <strong>{{ statusLabel(statusTarget?.status) }}</strong>
        </p>
        <div class="form-row">
          <label class="form-label">변경할 상태 <span class="required">*</span></label>
          <BaseSelect v-model="newStatus" :options="STATUS_CHANGE_OPTIONS" :disabled="changingStatus" />
        </div>
        <p v-if="statusError" class="form-error">{{ statusError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" :disabled="changingStatus" @click="showStatus = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="changingStatus" @click="handleStatusChange">변경</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.cart-manage-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-header__title {
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--color-text-primary);
}

.page-notice {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  padding: var(--space-16);
  background: var(--color-bg-page);
  border-radius: var(--radius-8);
  border: 1px solid var(--color-border);
}

.page-error {
  color: var(--color-danger);
  font-size: var(--font-size-body-sm);
  padding: var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-8);
}

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

.td-number  { font-weight: 600; }
.td-note    { color: var(--color-text-secondary); font-size: var(--font-size-detail); }
.td-actions { display: flex; gap: var(--space-8); white-space: nowrap; }

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
