<script setup>
// 캐디 그룹 관리 (ADR-005) — Manager 전용
// 자동배정 그룹(하우스/우선배정/세션고정) CRUD. 첫 조회 시 기본 하우스캐디 그룹 자동 생성
import { onMounted, reactive, ref } from 'vue'
import {
  getCaddieGroups, createCaddieGroup, updateCaddieGroup, deleteCaddieGroup,
} from '@/api/caddieApi'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const groups  = ref([])
const loading = ref(false)
const error   = ref('')

const TYPE_OPTIONS = [
  { value: 'HOUSE',          label: '하우스 (기본 풀 — 자동배정 기본 대상)' },
  { value: 'PRIORITY_FIRST', label: '우선배정 (배정 순서 맨 앞 — 예: 주말반)' },
  { value: 'SESSION_FIXED',  label: '세션고정 (부 첫 팀부터 수동 배치 — 예: 주중2부반)' },
]

const TYPE_BADGE = {
  HOUSE:          { type: 'success', label: '하우스' },
  PRIORITY_FIRST: { type: 'info',    label: '우선배정' },
  SESSION_FIXED:  { type: 'warning', label: '세션고정' },
}

async function loadGroups() {
  loading.value = true
  error.value   = ''
  try {
    groups.value = await getCaddieGroups() ?? []
  } catch {
    error.value = '그룹 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

// ─── 등록/수정 모달 (editingId=null이면 신규) ─────────────────────
const showForm    = ref(false)
const editingId   = ref(null)
const form        = reactive({ name: '', assignmentType: 'HOUSE' })
const formError   = ref('')
const submitting  = ref(false)

function openCreate() {
  editingId.value     = null
  form.name           = ''
  form.assignmentType = 'HOUSE'
  formError.value     = ''
  showForm.value      = true
}

function openEdit(group) {
  editingId.value     = group.groupId
  form.name           = group.name
  form.assignmentType = group.assignmentType
  formError.value     = ''
  showForm.value      = true
}

async function handleSubmit() {
  if (!form.name.trim()) { formError.value = '그룹명을 입력해 주세요.'; return }
  submitting.value = true
  formError.value  = ''
  try {
    const payload = { name: form.name.trim(), assignmentType: form.assignmentType }
    if (editingId.value) await updateCaddieGroup(editingId.value, payload)
    else await createCaddieGroup(payload)
    showForm.value = false
    await loadGroups()
  } catch {
    formError.value = '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    submitting.value = false
  }
}

// ─── 삭제 ─────────────────────────────────────────────────────────
const deleteTarget = ref(null)
const deleting     = ref(false)
const deleteError  = ref('')

function openDelete(group) {
  deleteTarget.value = group
  deleteError.value  = ''
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleting.value    = true
  deleteError.value = ''
  try {
    await deleteCaddieGroup(deleteTarget.value.groupId)
    deleteTarget.value = null
    await loadGroups()
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    deleteError.value = code === 'CADDIE_GROUP_HAS_CADDIES'
      ? '소속 캐디가 있는 그룹은 삭제할 수 없습니다. 캐디를 다른 그룹으로 이동한 뒤 삭제해 주세요.'
      : '삭제에 실패했습니다.'
  } finally {
    deleting.value = false
  }
}

onMounted(loadGroups)
</script>

<template>
  <div class="group-view">
    <div class="page-header">
      <h1 class="page-header__title">캐디 그룹 관리</h1>
      <BaseButton variant="primary" size="sm" @click="openCreate">+ 그룹 추가</BaseButton>
    </div>

    <p class="page-desc">
      자동배정 그룹을 관리합니다. 그룹별로 순번이 독립적으로 이월되며,
      <strong>세션고정</strong> 그룹은 자동배정 대신 "그룹 일괄 배정"으로 수동 배치합니다.
    </p>

    <BaseLoading v-if="loading" />
    <p v-else-if="error" class="page-error">{{ error }}</p>

    <div v-else-if="groups.length" class="table-wrap">
      <table class="group-table">
        <thead>
          <tr>
            <th>그룹명</th>
            <th>배정 유형</th>
            <th>소속 캐디</th>
            <th class="th-actions">관리</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in groups" :key="g.groupId">
            <td class="group-table__name">{{ g.name }}</td>
            <td>
              <BaseBadge :type="TYPE_BADGE[g.assignmentType]?.type ?? 'disabled'">
                {{ TYPE_BADGE[g.assignmentType]?.label ?? g.assignmentType }}
              </BaseBadge>
            </td>
            <td>{{ g.caddieCount }}명</td>
            <td class="td-actions">
              <BaseButton variant="ghost" size="sm" @click="openEdit(g)">수정</BaseButton>
              <BaseButton variant="danger" size="sm" :disabled="g.caddieCount > 0" @click="openDelete(g)">삭제</BaseButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseEmpty v-else message="등록된 그룹이 없습니다." />

    <!-- 등록/수정 모달 -->
    <BaseModal :visible="showForm" :title="editingId ? '그룹 수정' : '그룹 추가'" hide-footer @close="showForm = false">
      <form class="modal-form" @submit.prevent="handleSubmit">
        <div class="modal-form__field">
          <label class="modal-form__label">그룹명 <span class="required">*</span></label>
          <BaseInput v-model="form.name" placeholder="예: 주말반, 주중2부반" maxlength="50" />
        </div>

        <div class="modal-form__field">
          <label class="modal-form__label">배정 유형 <span class="required">*</span></label>
          <select v-model="form.assignmentType" class="modal-form__select">
            <option v-for="opt in TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <p v-if="formError" class="modal-form__submit-error">{{ formError }}</p>

        <div class="modal-form__actions">
          <BaseButton type="button" variant="ghost" @click="showForm = false">취소</BaseButton>
          <BaseButton type="submit" variant="primary" :loading="submitting">저장</BaseButton>
        </div>
      </form>
    </BaseModal>

    <!-- 삭제 확인 -->
    <ConfirmModal
      :visible="!!deleteTarget"
      :title="deleteTarget ? `'${deleteTarget.name}' 그룹을 삭제하시겠습니까?` : ''"
      :subtitle="deleteError || '삭제 후 되돌릴 수 없습니다.'"
      :subtitle-color="deleteError ? 'danger' : ''"
      confirm-text="삭제"
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>

<style scoped>
.group-view {
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
  font-size: var(--font-size-heading-3);
  font-weight: 700;
  color: var(--color-text-primary);
}

.page-desc {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  padding: var(--space-12) var(--space-16);
}

.page-error {
  color: var(--color-danger);
  font-size: var(--font-size-body-sm);
  padding: var(--space-16);
  background: var(--color-danger-bg);
  border-radius: var(--radius-8);
}

.table-wrap {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  overflow: hidden;
}

.group-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-body-sm);
}

.group-table th {
  background: var(--color-bg-page);
  padding: var(--space-12) var(--space-16);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.group-table td {
  padding: var(--space-12) var(--space-16);
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border);
}

.group-table tr:last-child td { border-bottom: none; }

.group-table__name { font-weight: 600; }

.th-actions, .td-actions { text-align: right; white-space: nowrap; }
.td-actions { display: flex; justify-content: flex-end; gap: var(--space-8); }

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

.modal-form__select {
  padding: var(--space-8) var(--space-12);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-6);
  font-size: var(--font-size-body-sm);
  color: var(--color-text-primary);
  background: var(--color-bg-input);
  height: 38px;
}

.modal-form__select:focus {
  outline: none;
  border-color: var(--color-border-focus);
}

.modal-form__submit-error {
  font-size: var(--font-size-body-sm);
  color: var(--color-danger);
  padding: var(--space-8) var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-6);
}

.modal-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-8);
  padding-top: var(--space-8);
}
</style>
