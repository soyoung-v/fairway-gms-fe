<script setup>
// 카트 배정 (UI-M016) — Manager 전용
// 날짜별 카트 배정 목록 조회, 자동/수동 배정, 카트 변경, 반납, 취소
import { onMounted, ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGolfCourseStore } from '@/stores/useGolfCourseStore'
import {
  getCartAssignments,
  autoAssignCarts,
  assignCart,
  changeCart,
  returnCartAssignment,
  cancelCartAssignment,
} from '@/api/assignmentApi'
import { getCarts } from '@/api/cartApi'
import { getTeeTimes } from '@/api/operationApi'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'

const authStore       = useAuthStore()
const golfCourseStore = useGolfCourseStore()

const { role, golfCourseId: myGolfCourseId } = storeToRefs(authStore)
const { selectedGolfCourseId } = storeToRefs(golfCourseStore)

const targetGolfCourseId = computed(() =>
  role.value === 'ADMIN' ? selectedGolfCourseId.value : myGolfCourseId.value
)

const today       = new Date().toISOString().slice(0, 10)
const selectedDate = ref(today)

const cartAssignments = ref([])
const loading         = ref(false)
const error           = ref('')

function statusBadgeType(status) {
  return { ASSIGNED: 'success', IN_PROGRESS: 'warning', RETURNED: 'disabled', CANCELLED: 'danger' }[status] || 'disabled'
}

function statusLabel(status) {
  return { ASSIGNED: '배정됨', IN_PROGRESS: '운행중', RETURNED: '반납완료', CANCELLED: '취소' }[status] || status
}

async function fetchList() {
  if (!targetGolfCourseId.value) return
  loading.value = true
  error.value   = ''
  try {
    cartAssignments.value = await getCartAssignments({
      assignmentDate: selectedDate.value,
      golfCourseId:   targetGolfCourseId.value,
    }) ?? []
  } catch {
    error.value = '카트 배정 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

watch(selectedDate, fetchList)
onMounted(fetchList)

// ─── 자동 카트 배정 ─────────────────────────────────────────────
const autoAssigning   = ref(false)
const autoAssignError = ref('')

async function handleAutoAssign() {
  if (!confirm(`${selectedDate.value} 카트 자동배정을 실행하시겠습니까?`)) return
  autoAssigning.value   = true
  autoAssignError.value = ''
  try {
    const result = await autoAssignCarts(selectedDate.value)
    await fetchList()
    alert(`카트 자동배정 완료 — 배정: ${result.assignedCount}건, 제외: ${result.skippedCount}건`)
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    autoAssignError.value = code === 'INVALID_PARAMETER' ? '유효하지 않은 요청입니다.' : '카트 자동배정에 실패했습니다.'
  } finally {
    autoAssigning.value = false
  }
}

// ─── 수동 카트 배정 모달 ────────────────────────────────────────
const showAssign    = ref(false)
const assigning     = ref(false)
const assignError   = ref('')
const availableCarts    = ref([])
const availableTeeTimes = ref([])
const assignForm = ref({ cartId: null, teeTimeId: null })

const cartOptions = computed(() => availableCarts.value.map(c => ({
  value: c.cartId ?? c.id,
  label: `${c.cartNumber} (${c.cartType === 'ELECTRIC' ? '전동' : '일반'})`,
})))

const teeTimeOptions = computed(() => availableTeeTimes.value.map(t => ({
  value: t.teeTimeId ?? t.id,
  label: `${t.startTime} — ${t.courseName ?? ''} ${t.periodNumber ?? ''}부`,
})))

async function openAssignModal() {
  assignError.value = ''
  assignForm.value  = { cartId: null, teeTimeId: null }
  showAssign.value  = true

  try {
    const [cList, tList] = await Promise.all([
      getCarts(targetGolfCourseId.value, { status: 'AVAILABLE' }),
      getTeeTimes({ playDate: selectedDate.value }),
    ])
    availableCarts.value    = cList ?? []
    availableTeeTimes.value = tList ?? []
  } catch {
    assignError.value = '카트 또는 티타임 목록을 불러오지 못했습니다.'
  }
}

async function handleAssign() {
  if (!assignForm.value.cartId)    { assignError.value = '카트를 선택해 주세요.'; return }
  if (!assignForm.value.teeTimeId) { assignError.value = '티타임을 선택해 주세요.'; return }
  assigning.value = true
  assignError.value = ''
  try {
    const created = await assignCart({
      cartId:         assignForm.value.cartId,
      teeTimeId:      assignForm.value.teeTimeId,
      assignmentDate: selectedDate.value,
    })
    cartAssignments.value = [...cartAssignments.value, created]
    showAssign.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    assignError.value = code === 'DUPLICATE_CART' ? '이미 배정된 카트입니다.' : '카트 배정에 실패했습니다.'
  } finally {
    assigning.value = false
  }
}

// ─── 카트 변경 모달 ─────────────────────────────────────────────
const showChange    = ref(false)
const changing      = ref(false)
const changeTarget  = ref(null)
const newCartId     = ref(null)
const changeError   = ref('')
const changeCarts   = ref([])

const changeCartOptions = computed(() => changeCarts.value.map(c => ({
  value: c.cartId ?? c.id,
  label: `${c.cartNumber} (${c.cartType === 'ELECTRIC' ? '전동' : '일반'})`,
})))

async function openChangeModal(ca) {
  changeTarget.value = ca
  newCartId.value    = null
  changeError.value  = ''
  showChange.value   = true

  try {
    changeCarts.value = await getCarts(targetGolfCourseId.value, { status: 'AVAILABLE' }) ?? []
  } catch {
    changeError.value = '사용 가능한 카트 목록을 불러오지 못했습니다.'
  }
}

async function handleChange() {
  if (!newCartId.value) { changeError.value = '새 카트를 선택해 주세요.'; return }
  changing.value = true
  changeError.value = ''
  try {
    const updated = await changeCart(changeTarget.value.id, newCartId.value)
    _sync(changeTarget.value.id, updated)
    showChange.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    changeError.value =
      code === 'CART_ASSIGNMENT_NOT_FOUND' ? '배정 정보를 찾을 수 없습니다.' :
      code === 'DUPLICATE_CART'            ? '이미 배정된 카트입니다.' :
      '카트 변경에 실패했습니다.'
  } finally {
    changing.value = false
  }
}

// ─── 반납 / 취소 ────────────────────────────────────────────────
const processingId = ref(null)

async function handleReturn(ca) {
  if (!confirm(`카트 ${ca.cartNumber}를 반납 처리하시겠습니까?`)) return
  processingId.value = ca.id
  try {
    const updated = await returnCartAssignment(ca.id)
    _sync(ca.id, updated)
  } catch {
    alert('반납 처리에 실패했습니다.')
  } finally {
    processingId.value = null
  }
}

async function handleCancel(ca) {
  if (!confirm(`카트 배정 #${ca.id}을 취소하시겠습니까?`)) return
  processingId.value = ca.id
  try {
    await cancelCartAssignment(ca.id)
    cartAssignments.value = cartAssignments.value.filter(c => c.id !== ca.id)
  } catch {
    alert('카트 배정 취소에 실패했습니다.')
  } finally {
    processingId.value = null
  }
}

function _sync(id, updated) {
  const idx = cartAssignments.value.findIndex(c => c.id === id)
  if (idx !== -1) cartAssignments.value[idx] = updated
}
</script>

<template>
  <div class="cart-assignment-view">
    <div class="page-header">
      <h1 class="page-header__title">카트 배정</h1>
      <div class="header-actions">
        <input type="date" v-model="selectedDate" class="date-input" />
        <BaseButton variant="secondary" size="sm" :loading="autoAssigning" :disabled="!targetGolfCourseId" @click="handleAutoAssign">
          카트 자동배정
        </BaseButton>
        <BaseButton variant="primary" size="sm" :disabled="!targetGolfCourseId" @click="openAssignModal">
          카트 수동배정
        </BaseButton>
      </div>
    </div>

    <p v-if="!targetGolfCourseId" class="page-notice">
      Admin 계정은 상단 드롭다운에서 골프장을 선택해 주세요.
    </p>

    <template v-else>
      <p v-if="autoAssignError" class="page-error">{{ autoAssignError }}</p>

      <BaseLoading v-if="loading" />
      <p v-else-if="error" class="page-error">{{ error }}</p>
      <BaseEmpty v-else-if="!cartAssignments.length" message="카트 배정 내역이 없습니다." />

      <div v-else class="table-wrap">
        <table class="gms-table">
          <thead>
            <tr>
              <th>배정 ID</th>
              <th>카트 번호</th>
              <th>티타임 ID</th>
              <th>배정일</th>
              <th>상태</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ca in cartAssignments" :key="ca.id">
              <td class="td-id">{{ ca.id }}</td>
              <td class="td-cart">{{ ca.cartNumber }}</td>
              <td class="td-id">{{ ca.teeTimeId }}</td>
              <td>{{ ca.assignmentDate }}</td>
              <td>
                <BaseBadge :type="statusBadgeType(ca.status)">{{ statusLabel(ca.status) }}</BaseBadge>
              </td>
              <td class="td-actions">
                <BaseButton
                  v-if="ca.status === 'ASSIGNED'"
                  variant="ghost" size="sm" @click="openChangeModal(ca)"
                >카트 변경</BaseButton>
                <BaseButton
                  v-if="ca.status === 'IN_PROGRESS'"
                  variant="ghost" size="sm"
                  :loading="processingId === ca.id"
                  @click="handleReturn(ca)"
                >반납</BaseButton>
                <BaseButton
                  v-if="ca.status !== 'RETURNED' && ca.status !== 'CANCELLED'"
                  variant="danger" size="sm"
                  :loading="processingId === ca.id"
                  @click="handleCancel(ca)"
                >취소</BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- 수동 배정 모달 -->
    <BaseModal :visible="showAssign" title="카트 수동 배정" @close="showAssign = false">
      <div class="form">
        <div class="form-row">
          <label class="form-label">카트 <span class="required">*</span></label>
          <BaseSelect
            v-model="assignForm.cartId"
            :options="cartOptions"
            placeholder="사용 가능한 카트 선택"
            :disabled="assigning"
          />
        </div>
        <div class="form-row">
          <label class="form-label">티타임 <span class="required">*</span></label>
          <BaseSelect
            v-model="assignForm.teeTimeId"
            :options="teeTimeOptions"
            placeholder="티타임 선택"
            :disabled="assigning"
          />
        </div>
        <p v-if="assignError" class="form-error">{{ assignError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" :disabled="assigning" @click="showAssign = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="assigning" @click="handleAssign">배정</BaseButton>
      </template>
    </BaseModal>

    <!-- 카트 변경 모달 -->
    <BaseModal :visible="showChange" :title="`카트 변경 — 배정 #${changeTarget?.id}`" @close="showChange = false">
      <div class="form">
        <p class="form-desc">현재 카트: <strong>{{ changeTarget?.cartNumber }}</strong></p>
        <div class="form-row">
          <label class="form-label">새 카트 <span class="required">*</span></label>
          <BaseSelect
            v-model="newCartId"
            :options="changeCartOptions"
            placeholder="새 카트 선택"
            :disabled="changing"
          />
        </div>
        <p v-if="changeError" class="form-error">{{ changeError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" :disabled="changing" @click="showChange = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="changing" @click="handleChange">변경</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.cart-assignment-view {
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

.date-input:focus { border-color: var(--color-border-focus); }

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

.td-id      { color: var(--color-text-secondary); font-size: var(--font-size-detail); width: 80px; }
.td-cart    { font-weight: 600; }
.td-actions { display: flex; gap: var(--space-4); flex-wrap: wrap; }

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
