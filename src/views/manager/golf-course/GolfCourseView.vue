<script setup>
// 골프장 관리 (UI-M004) — Admin 전용
// 골프장 목록 조회·등록·수정, Admin 작업 골프장 선택
import { onMounted, reactive, ref } from 'vue'
import golfCourseApi from '@/api/golfCourseApi'
import { useGolfCourseStore } from '@/stores/useGolfCourseStore'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'

const golfCourseStore = useGolfCourseStore()

const list    = ref([])
const loading = ref(false)
const error   = ref('')

// ─── 등록 모달 ──────────────────────────────────────────────────
const showRegister  = ref(false)
const registerForm  = reactive({ name: '', address: '', phone: '' })
const registerErrors = reactive({ name: '', address: '', phone: '' })
const registering   = ref(false)
const registerError = ref('')

function openRegisterModal() {
  registerForm.name    = ''
  registerForm.address = ''
  registerForm.phone   = ''
  registerErrors.name = registerErrors.address = registerErrors.phone = ''
  registerError.value  = ''
  showRegister.value   = true
}

function validateRegisterForm() {
  let ok = true
  registerErrors.name    = registerForm.name.trim()    ? '' : '골프장 이름을 입력해 주세요.'
  registerErrors.address = registerForm.address.trim() ? '' : '주소를 입력해 주세요.'
  registerErrors.phone   = registerForm.phone.trim()   ? '' : '연락처를 입력해 주세요.'
  Object.values(registerErrors).forEach(e => { if (e) ok = false })
  return ok
}

async function handleRegister() {
  registerError.value = ''
  if (!validateRegisterForm()) return
  registering.value = true
  try {
    const newCourse = await golfCourseApi.createGolfCourse({
      name:    registerForm.name.trim(),
      address: registerForm.address.trim(),
      phone:   registerForm.phone.trim(),
    })
    list.value.unshift(newCourse)
    golfCourseStore.setGolfCourseList(list.value)
    showRegister.value = false
  } catch (err) {
    registerError.value = '등록에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    registering.value = false
  }
}

// ─── 수정 모달 ──────────────────────────────────────────────────
const showEdit    = ref(false)
const editTarget  = ref(null)
const editForm    = reactive({ name: '', address: '', phone: '' })
const editErrors  = reactive({ name: '', address: '', phone: '' })
const editing     = ref(false)
const editError   = ref('')

function openEditModal(course) {
  editTarget.value   = course
  editForm.name      = course.name    || ''
  editForm.address   = course.address || ''
  editForm.phone     = course.phone   || ''
  editErrors.name = editErrors.address = editErrors.phone = ''
  editError.value    = ''
  showEdit.value     = true
}

function validateEditForm() {
  let ok = true
  editErrors.name    = editForm.name.trim()    ? '' : '골프장 이름을 입력해 주세요.'
  editErrors.address = editForm.address.trim() ? '' : '주소를 입력해 주세요.'
  editErrors.phone   = editForm.phone.trim()   ? '' : '연락처를 입력해 주세요.'
  Object.values(editErrors).forEach(e => { if (e) ok = false })
  return ok
}

async function handleEdit() {
  editError.value = ''
  if (!validateEditForm()) return
  editing.value = true
  try {
    const updated = await golfCourseApi.updateGolfCourse(editTarget.value.golfCourseId, {
      name:    editForm.name.trim(),
      address: editForm.address.trim(),
      phone:   editForm.phone.trim(),
    })
    const idx = list.value.findIndex(c => c.golfCourseId === editTarget.value.golfCourseId)
    if (idx !== -1) list.value[idx] = { ...list.value[idx], ...updated }
    golfCourseStore.setGolfCourseList(list.value)
    showEdit.value = false
  } catch (err) {
    editError.value = '수정에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    editing.value = false
  }
}

// ─── 골프장 선택 (Admin 컨텍스트) ────────────────────────────
const selectingId = ref(null)

function handleSelect(course) {
  selectingId.value = course.golfCourseId
  golfCourseStore.selectGolfCourse(course.golfCourseId, course.name)
  selectingId.value = null
}

// ─── 목록 로드 ──────────────────────────────────────────────────
async function fetchList() {
  loading.value = true
  error.value   = ''
  try {
    const data = await golfCourseApi.getGolfCourses()
    list.value = Array.isArray(data) ? data : (data?.content ?? [])
    golfCourseStore.setGolfCourseList(list.value)
  } catch {
    error.value = '골프장 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)
</script>

<template>
  <div class="golf-course-view">
    <!-- 페이지 헤더 -->
    <div class="golf-course-view__header">
      <div class="golf-course-view__header-left">
        <h1 class="golf-course-view__title">골프장 관리</h1>
        <p v-if="golfCourseStore.selectedGolfCourseName" class="golf-course-view__selected">
          현재 선택: <strong>{{ golfCourseStore.selectedGolfCourseName }}</strong>
        </p>
      </div>
      <BaseButton variant="primary" size="sm" @click="openRegisterModal">
        + 골프장 등록
      </BaseButton>
    </div>

    <!-- 로딩 -->
    <BaseLoading v-if="loading" />

    <!-- 에러 -->
    <p v-else-if="error" class="golf-course-view__error">{{ error }}</p>

    <!-- 빈 목록 -->
    <BaseEmpty v-else-if="!list.length" message="등록된 골프장이 없습니다." />

    <!-- 골프장 테이블 -->
    <div v-else class="golf-course-view__table-wrap">
      <table class="gms-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>골프장명</th>
            <th>주소</th>
            <th>연락처</th>
            <th>상태</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="course in list"
            :key="course.golfCourseId"
            :class="{ 'is-selected': golfCourseStore.selectedGolfCourseId === course.golfCourseId }"
          >
            <td class="td-id">{{ course.golfCourseId }}</td>
            <td class="td-name">{{ course.name }}</td>
            <td class="td-address">{{ course.address || '-' }}</td>
            <td>{{ course.phone || '-' }}</td>
            <td>
              <span class="gms-status" :class="`gms-status--${course.status === 'ACTIVE' ? 'active' : 'inactive'}`">
                {{ course.status === 'ACTIVE' ? '운영중' : (course.status || '-') }}
              </span>
            </td>
            <td class="td-actions">
              <BaseButton
                variant="outline"
                size="sm"
                @click="openEditModal(course)"
              >
                수정
              </BaseButton>
              <BaseButton
                :variant="golfCourseStore.selectedGolfCourseId === course.golfCourseId ? 'success' : 'primary'"
                size="sm"
                :disabled="selectingId === course.golfCourseId"
                @click="handleSelect(course)"
              >
                {{ golfCourseStore.selectedGolfCourseId === course.golfCourseId ? '선택됨' : '선택' }}
              </BaseButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 등록 모달 -->
    <BaseModal
      :visible="showRegister"
      title="골프장 등록"
      @close="showRegister = false"
    >
      <div class="golf-form">
        <div class="golf-form__field">
          <label class="golf-form__label">골프장 이름 <span class="required">*</span></label>
          <BaseInput v-model="registerForm.name" placeholder="골프장 이름" :error="registerErrors.name" :disabled="registering" />
        </div>
        <div class="golf-form__field">
          <label class="golf-form__label">주소 <span class="required">*</span></label>
          <BaseInput v-model="registerForm.address" placeholder="주소" :error="registerErrors.address" :disabled="registering" />
        </div>
        <div class="golf-form__field">
          <label class="golf-form__label">연락처 <span class="required">*</span></label>
          <BaseInput v-model="registerForm.phone" placeholder="연락처 (예: 031-000-0000)" :error="registerErrors.phone" :disabled="registering" />
        </div>
        <p v-if="registerError" class="golf-form__error">{{ registerError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="outline" :disabled="registering" @click="showRegister = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="registering" @click="handleRegister">등록</BaseButton>
      </template>
    </BaseModal>

    <!-- 수정 모달 -->
    <BaseModal
      :visible="showEdit"
      title="골프장 수정"
      @close="showEdit = false"
    >
      <div class="golf-form">
        <div class="golf-form__field">
          <label class="golf-form__label">골프장 이름 <span class="required">*</span></label>
          <BaseInput v-model="editForm.name" placeholder="골프장 이름" :error="editErrors.name" :disabled="editing" />
        </div>
        <div class="golf-form__field">
          <label class="golf-form__label">주소 <span class="required">*</span></label>
          <BaseInput v-model="editForm.address" placeholder="주소" :error="editErrors.address" :disabled="editing" />
        </div>
        <div class="golf-form__field">
          <label class="golf-form__label">연락처 <span class="required">*</span></label>
          <BaseInput v-model="editForm.phone" placeholder="연락처" :error="editErrors.phone" :disabled="editing" />
        </div>
        <p v-if="editError" class="golf-form__error">{{ editError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="outline" :disabled="editing" @click="showEdit = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="editing" @click="handleEdit">저장</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.golf-course-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

.golf-course-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-12);
}

.golf-course-view__header-left {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.golf-course-view__title {
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--color-text-primary);
}

.golf-course-view__selected {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}

.golf-course-view__selected strong {
  color: var(--manager-primary);
}

.golf-course-view__error {
  color: var(--color-danger);
  font-size: var(--font-size-body-sm);
  padding: var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-8);
}

/* ─── 테이블 ─── */
.golf-course-view__table-wrap {
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

.gms-table tbody tr.is-selected {
  background: var(--color-primary-light, rgba(34, 197, 94, 0.06));
}

.gms-table tbody tr:hover { background: var(--color-bg-page); }

.td-id      { width: 60px; color: var(--color-text-secondary); font-size: var(--font-size-detail); }
.td-name    { font-weight: 600; }
.td-address { color: var(--color-text-secondary); }

.td-actions {
  display: flex;
  gap: var(--space-8);
}

/* ─── 상태 표시 ─── */
.gms-status {
  display: inline-block;
  padding: 2px var(--space-8);
  border-radius: var(--radius-full);
  font-size: var(--font-size-detail);
  font-weight: 600;
}

.gms-status--active   { background: var(--color-success-bg); color: var(--color-success); }
.gms-status--inactive { background: var(--color-bg-disabled); color: var(--color-text-secondary); }

/* ─── 폼 ─── */
.golf-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.golf-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.golf-form__label {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.required { color: var(--color-danger); }

.golf-form__error {
  font-size: var(--font-size-body-sm);
  color: var(--color-danger);
  padding: var(--space-8) var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-6);
}
</style>
