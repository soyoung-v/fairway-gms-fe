<script setup>
// 코스 관리 (UI-M005) — Admin + Manager
// 코스 목록 조회, 등록 모달, 수정 모달
import { onMounted, ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGolfCourseStore } from '@/stores/useGolfCourseStore'
import courseApi from '@/api/courseApi'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const authStore      = useAuthStore()
const golfCourseStore = useGolfCourseStore()
const { role, golfCourseId: myGolfCourseId } = storeToRefs(authStore)
const { selectedGolfCourseId } = storeToRefs(golfCourseStore)

// Admin: 선택된 골프장, Manager: 소속 골프장
const targetGolfCourseId = computed(() =>
  role.value === 'ADMIN' ? selectedGolfCourseId.value : myGolfCourseId.value
)

const list    = ref([])
const loading = ref(false)
const error   = ref('')

const HOLE_OPTIONS = [
  { value: 9,  label: '9홀' },
  { value: 18, label: '18홀' },
  { value: 27, label: '27홀' },
]

// ─── 목록 로드 ──────────────────────────────────────────────────
async function fetchList() {
  if (!targetGolfCourseId.value) {
    error.value = 'Admin은 골프장을 먼저 선택해 주세요.'
    return
  }
  loading.value = true
  error.value   = ''
  try {
    const data = await courseApi.getCourses(targetGolfCourseId.value)
    list.value = Array.isArray(data) ? data : []
  } catch {
    error.value = '코스 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

// ─── 등록 모달 ──────────────────────────────────────────────────
const showCreate  = ref(false)
const creating    = ref(false)
const createForm  = ref({ name: '', holeCount: 18, sortOrder: 1 })
const createError = ref('')

function openCreateModal() {
  createForm.value  = { name: '', holeCount: 18, sortOrder: list.value.length + 1 }
  createError.value = ''
  showCreate.value  = true
}

async function handleCreate() {
  createError.value = ''
  if (!createForm.value.name.trim()) { createError.value = '코스명을 입력해 주세요.'; return }
  creating.value = true
  try {
    const created = await courseApi.createCourse(targetGolfCourseId.value, {
      name:      createForm.value.name.trim(),
      holeCount: Number(createForm.value.holeCount),
      sortOrder: Number(createForm.value.sortOrder),
    })
    list.value = [...list.value, created].sort((a, b) => a.sortOrder - b.sortOrder)
    showCreate.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    createError.value = code === 'INVALID_HOLE_COUNT' ? '홀 수는 9/18/27만 허용됩니다.' : '등록에 실패했습니다.'
  } finally {
    creating.value = false
  }
}

// ─── 수정 모달 ──────────────────────────────────────────────────
const showEdit   = ref(false)
const editing    = ref(false)
const editTarget = ref(null)
const editForm   = ref({ name: '', holeCount: 18, sortOrder: 1, isActive: true })
const editError  = ref('')

function openEditModal(course) {
  editTarget.value = course
  editForm.value   = {
    name:      course.name,
    holeCount: course.holeCount,
    sortOrder: course.sortOrder,
    isActive:  course.isActive,
  }
  editError.value = ''
  showEdit.value  = true
}

async function handleEdit() {
  editError.value = ''
  if (!editForm.value.name.trim()) { editError.value = '코스명을 입력해 주세요.'; return }
  editing.value = true
  try {
    const updated = await courseApi.updateCourse(editTarget.value.courseId, {
      name:      editForm.value.name.trim(),
      holeCount: Number(editForm.value.holeCount),
      sortOrder: Number(editForm.value.sortOrder),
      isActive:  editForm.value.isActive,
    })
    const idx = list.value.findIndex(c => c.courseId === editTarget.value.courseId)
    if (idx !== -1) list.value[idx] = updated
    list.value = [...list.value].sort((a, b) => a.sortOrder - b.sortOrder)
    showEdit.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    editError.value = code === 'COURSE_NOT_FOUND' ? '코스를 찾을 수 없습니다.' : '수정에 실패했습니다.'
  } finally {
    editing.value = false
  }
}

onMounted(fetchList)
</script>

<template>
  <div class="course-manage-view">
    <div class="page-header">
      <h1 class="page-header__title">코스 관리</h1>
      <BaseButton variant="primary" size="sm" :disabled="!targetGolfCourseId" @click="openCreateModal">
        + 코스 등록
      </BaseButton>
    </div>

    <!-- Admin 골프장 미선택 안내 -->
    <p v-if="!targetGolfCourseId" class="page-notice">
      Admin 계정은 상단 드롭다운에서 골프장을 선택해 주세요.
    </p>

    <!-- 로딩 -->
    <BaseLoading v-else-if="loading" />

    <!-- 에러 -->
    <p v-else-if="error" class="page-error">{{ error }}</p>

    <!-- 빈 목록 -->
    <BaseEmpty v-else-if="!list.length" message="등록된 코스가 없습니다." />

    <!-- 코스 테이블 -->
    <div v-else class="table-wrap">
      <table class="gms-table">
        <thead>
          <tr>
            <th>순서</th>
            <th>코스명</th>
            <th>홀 수</th>
            <th>운영 여부</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="course in list" :key="course.courseId">
            <td class="td-order">{{ course.sortOrder }}</td>
            <td class="td-name">{{ course.name }}</td>
            <td>{{ course.holeCount }}홀</td>
            <td>
              <BaseBadge :type="course.isActive ? 'success' : 'disabled'">
                {{ course.isActive ? '운영 중' : '운영 중지' }}
              </BaseBadge>
            </td>
            <td>
              <BaseButton variant="ghost" size="sm" @click="openEditModal(course)">수정</BaseButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 코스 등록 모달 -->
    <BaseModal :visible="showCreate" title="코스 등록" @close="showCreate = false">
      <div class="form">
        <div class="form-row">
          <label class="form-label">코스명 <span class="required">*</span></label>
          <BaseInput v-model="createForm.name" placeholder="예: A코스" :disabled="creating" />
        </div>
        <div class="form-row">
          <label class="form-label">홀 수 <span class="required">*</span></label>
          <BaseSelect v-model="createForm.holeCount" :options="HOLE_OPTIONS" :disabled="creating" />
        </div>
        <div class="form-row">
          <label class="form-label">표시 순서 <span class="required">*</span></label>
          <BaseInput v-model.number="createForm.sortOrder" type="number" min="1" :disabled="creating" />
        </div>
        <p v-if="createError" class="form-error">{{ createError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" :disabled="creating" @click="showCreate = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="creating" @click="handleCreate">등록</BaseButton>
      </template>
    </BaseModal>

    <!-- 코스 수정 모달 -->
    <BaseModal :visible="showEdit" title="코스 수정" @close="showEdit = false">
      <div class="form">
        <div class="form-row">
          <label class="form-label">코스명 <span class="required">*</span></label>
          <BaseInput v-model="editForm.name" :disabled="editing" />
        </div>
        <div class="form-row">
          <label class="form-label">홀 수 <span class="required">*</span></label>
          <BaseSelect v-model="editForm.holeCount" :options="HOLE_OPTIONS" :disabled="editing" />
        </div>
        <div class="form-row">
          <label class="form-label">표시 순서 <span class="required">*</span></label>
          <BaseInput v-model.number="editForm.sortOrder" type="number" min="1" :disabled="editing" />
        </div>
        <div class="form-row form-row--toggle">
          <label class="form-label">운영 여부</label>
          <label class="toggle">
            <input type="checkbox" v-model="editForm.isActive" :disabled="editing" />
            <span class="toggle__track"></span>
            <span class="toggle__label">{{ editForm.isActive ? '운영 중' : '운영 중지' }}</span>
          </label>
        </div>
        <p v-if="editError" class="form-error">{{ editError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" :disabled="editing" @click="showEdit = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="editing" @click="handleEdit">저장</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.course-manage-view {
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

.td-order { color: var(--color-text-secondary); width: 60px; }
.td-name  { font-weight: 600; }

/* ─── 폼 ─── */
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

.form-row--toggle {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.form-label {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.form-error {
  font-size: var(--font-size-detail);
  color: var(--color-danger);
}

.required { color: var(--color-danger); }

/* ─── 토글 ─── */
.toggle {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  cursor: pointer;
}

.toggle input { display: none; }

.toggle__track {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: var(--color-bg-disabled);
  position: relative;
  transition: background var(--transition-fast);
  flex-shrink: 0;
}

.toggle__track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform var(--transition-fast);
}

.toggle input:checked + .toggle__track {
  background: var(--manager-primary);
}

.toggle input:checked + .toggle__track::after {
  transform: translateX(18px);
}

.toggle__label {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}
</style>
