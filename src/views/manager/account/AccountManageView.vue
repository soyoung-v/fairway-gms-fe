<script setup>
// 계정 관리 (UI-M003) — Admin 전용
// Manager 계정 목록 조회·역할 변경·소속 골프장 변경
import { onMounted, ref, computed, reactive } from 'vue'
import userApi from '@/api/userApi'
import golfCourseApi from '@/api/golfCourseApi'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'

const list         = ref([])
const golfCourses  = ref([])
const loading      = ref(false)
const error        = ref('')
const statusFilter = ref('ALL')

const filteredList = computed(() => {
  if (statusFilter.value === 'ALL') return list.value
  return list.value.filter(m => m.status === statusFilter.value)
})

// ─── 역할 변경 모달 ──────────────────────────────────────────────
const showRole      = ref(false)
const roleTarget    = ref(null)
const roleValue     = ref('MANAGER')
const roleError     = ref('')
const changingRole  = ref(false)

const ROLES = [
  { value: 'ADMIN',   label: '플랫폼 관리자 (Admin)' },
  { value: 'MANAGER', label: '매니저 (Manager)' },
]

function openRoleModal(manager) {
  roleTarget.value = manager
  roleValue.value  = manager.role || 'MANAGER'
  roleError.value  = ''
  showRole.value   = true
}

async function handleRoleChange() {
  roleError.value = ''
  changingRole.value = true
  try {
    await userApi.updateUserRole(roleTarget.value.userId, roleValue.value)
    const idx = list.value.findIndex(m => m.userId === roleTarget.value.userId)
    if (idx !== -1) list.value[idx] = { ...list.value[idx], role: roleValue.value }
    showRole.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    roleError.value = code === 'INVALID_ROLE'
      ? '유효하지 않은 역할입니다.'
      : '역할 변경에 실패했습니다. 백엔드 구현을 확인해 주세요.'
  } finally {
    changingRole.value = false
  }
}

// ─── 골프장 소속 변경 모달 ───────────────────────────────────────
const showCourse      = ref(false)
const courseTarget    = ref(null)
const courseValue     = ref('')
const courseError     = ref('')
const changingCourse  = ref(false)

function openCourseModal(manager) {
  courseTarget.value = manager
  courseValue.value  = manager.golfCourseId ? String(manager.golfCourseId) : ''
  courseError.value  = ''
  showCourse.value   = true
}

async function handleCourseChange() {
  courseError.value = ''
  if (!courseValue.value.trim()) {
    courseError.value = '골프장 ID를 입력해 주세요.'
    return
  }
  changingCourse.value = true
  try {
    await userApi.updateUserGolfCourse(courseTarget.value.userId, Number(courseValue.value))
    const idx = list.value.findIndex(m => m.userId === courseTarget.value.userId)
    if (idx !== -1) {
      const matched = golfCourses.value.find(c => c.golfCourseId === Number(courseValue.value))
      list.value[idx] = {
        ...list.value[idx],
        golfCourseId:   Number(courseValue.value),
        golfCourseName: matched?.name || courseValue.value,
      }
    }
    showCourse.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    if (code === 'GOLF_COURSE_NOT_FOUND') {
      courseError.value = '존재하지 않는 골프장 ID입니다.'
    } else if (code === 'USER_NOT_FOUND') {
      courseError.value = '사용자를 찾을 수 없습니다.'
    } else {
      courseError.value = '소속 변경에 실패했습니다. 백엔드 구현을 확인해 주세요.'
    }
  } finally {
    changingCourse.value = false
  }
}

// ─── 목록 로드 ──────────────────────────────────────────────────
async function fetchList() {
  loading.value = true
  error.value   = ''
  try {
    const [managerData, courseData] = await Promise.all([
      userApi.getManagers({ size: 100 }),
      golfCourseApi.getGolfCourses(),
    ])
    list.value        = Array.isArray(managerData) ? managerData : (managerData?.content ?? [])
    golfCourses.value = Array.isArray(courseData)  ? courseData  : (courseData?.content  ?? [])
  } catch {
    error.value = '계정 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

// 상태·역할 표시 헬퍼
function badgeType(status) {
  const map = { ACTIVE: 'success', PENDING: 'warning', REJECTED: 'danger', WITHDRAWN: 'disabled' }
  return map[status] || 'disabled'
}

function statusLabel(status) {
  const map = { ACTIVE: '활성', PENDING: '승인 대기', REJECTED: '거절됨', WITHDRAWN: '탈퇴' }
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
                variant="outline"
                size="sm"
                @click="openRoleModal(manager)"
              >
                역할 변경
              </BaseButton>
              <BaseButton
                variant="outline"
                size="sm"
                @click="openCourseModal(manager)"
              >
                골프장 변경
              </BaseButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 역할 변경 모달 -->
    <BaseModal
      :visible="showRole"
      title="역할 변경"
      :subtitle="roleTarget ? `${roleTarget.name} (${roleTarget.email})` : ''"
      @close="showRole = false"
    >
      <div class="change-form">
        <label class="change-form__label">변경할 역할</label>
        <div class="change-form__radio-group">
          <label
            v-for="r in ROLES"
            :key="r.value"
            class="change-form__radio"
          >
            <input
              v-model="roleValue"
              type="radio"
              :value="r.value"
              :disabled="changingRole"
            />
            {{ r.label }}
          </label>
        </div>
        <p v-if="roleError" class="change-form__error">{{ roleError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="outline" :disabled="changingRole" @click="showRole = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="changingRole" @click="handleRoleChange">변경</BaseButton>
      </template>
    </BaseModal>

    <!-- 골프장 소속 변경 모달 -->
    <BaseModal
      :visible="showCourse"
      title="소속 골프장 변경"
      :subtitle="courseTarget ? `${courseTarget.name} (${courseTarget.email})` : ''"
      @close="showCourse = false"
    >
      <div class="change-form">
        <label class="change-form__label">골프장 ID <span class="required">*</span></label>
        <BaseInput
          v-model="courseValue"
          type="number"
          placeholder="골프장 ID (숫자)"
          :error="courseError"
          :disabled="changingCourse"
        />
        <div v-if="golfCourses.length" class="change-form__hint">
          <p class="change-form__hint-label">등록된 골프장:</p>
          <ul class="change-form__golf-list">
            <li
              v-for="c in golfCourses"
              :key="c.golfCourseId"
              class="change-form__golf-item"
              @click="courseValue = String(c.golfCourseId)"
            >
              <span class="golf-id">{{ c.golfCourseId }}</span>
              <span>{{ c.name }}</span>
            </li>
          </ul>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="outline" :disabled="changingCourse" @click="showCourse = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="changingCourse" @click="handleCourseChange">변경</BaseButton>
      </template>
    </BaseModal>
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

.td-actions {
  display: flex;
  gap: var(--space-8);
}

.role-chip {
  display: inline-block;
  padding: 2px var(--space-8);
  border-radius: var(--radius-4);
  background: var(--color-bg-disabled);
  color: var(--color-text-secondary);
  font-size: var(--font-size-detail);
  font-weight: 600;
}

/* ─── 변경 폼 ─── */
.change-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
}

.change-form__label {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.change-form__radio-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.change-form__radio {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  font-size: var(--font-size-body-sm);
  color: var(--color-text-primary);
  cursor: pointer;
}

.change-form__error {
  font-size: var(--font-size-body-sm);
  color: var(--color-danger);
  padding: var(--space-8) var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-6);
}

.change-form__hint {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  padding: var(--space-12);
}

.change-form__hint-label {
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-8);
}

.change-form__golf-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-height: 160px;
  overflow-y: auto;
}

.change-form__golf-item {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-6) var(--space-8);
  border-radius: var(--radius-6);
  font-size: var(--font-size-body-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.change-form__golf-item:hover { background: var(--color-bg-page); }

.golf-id {
  color: var(--color-text-secondary);
  font-size: var(--font-size-detail);
  min-width: 24px;
}

.required { color: var(--color-danger); }
</style>
