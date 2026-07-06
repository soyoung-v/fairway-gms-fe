<script setup>
// 캐디 목록 (UI-M007) — Admin/Manager 공용, 등록은 Manager 전용
import { onMounted, reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useCaddyStore } from '@/stores/useCaddyStore'
import { getCaddieGroups, assignCaddieGroup } from '@/api/caddieApi'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'

const router     = useRouter()
const authStore  = useAuthStore()
const caddyStore = useCaddyStore()

// Manager만 캐디 등록 가능 — Admin은 조회만
const isManager = computed(() => authStore.isManager)

// ─── 필터 ──────────────────────────────────────────────────────────
const keyword      = ref('')
const statusFilter = ref('')

const STATUS_OPTIONS = [
  { value: '',         label: '전체' },
  { value: 'ACTIVE',   label: '재직' },
  { value: 'ON_LEAVE', label: '휴직' },
  { value: 'EXCLUDED', label: '일시제외' },
  { value: 'RESIGNED', label: '퇴사' },
]

async function handleSearch() {
  await caddyStore.fetchCaddies({
    keyword: keyword.value.trim() || undefined,
    status:  statusFilter.value   || undefined,
  })
}

function handleReset() {
  keyword.value      = ''
  statusFilter.value = ''
  caddyStore.fetchCaddies()
}

// ─── 상태 뱃지 매핑 ────────────────────────────────────────────────
const STATUS_BADGE = {
  ACTIVE:   { type: 'success',  label: '재직' },
  ON_LEAVE: { type: 'warning',  label: '휴직' },
  EXCLUDED: { type: 'warning',  label: '일시제외' },
  RESIGNED: { type: 'disabled', label: '퇴사' },
}

function getBadge(status) {
  return STATUS_BADGE[status] ?? { type: 'disabled', label: status }
}

// ─── 캐디 등록 모달 (Manager 전용) ──────────────────────────────────
const showRegister   = ref(false)
const registerForm   = reactive({ caddieNumber: '', name: '', phone: '', hireDate: '' })
const registerErrors = reactive({ caddieNumber: '', name: '' })
const registering    = ref(false)
const registerError  = ref('')

function openRegisterModal() {
  registerForm.caddieNumber   = ''
  registerForm.name           = ''
  registerForm.phone          = ''
  registerForm.hireDate       = ''
  registerErrors.caddieNumber = ''
  registerErrors.name         = ''
  registerError.value         = ''
  showRegister.value          = true
}

function validateRegister() {
  let ok = true
  registerErrors.caddieNumber = registerForm.caddieNumber.trim() ? '' : '캐디 번호를 입력해 주세요.'
  registerErrors.name         = registerForm.name.trim()         ? '' : '이름을 입력해 주세요.'
  Object.values(registerErrors).forEach(e => { if (e) ok = false })
  return ok
}

async function handleRegister() {
  if (!validateRegister()) return
  registering.value   = true
  registerError.value = ''
  try {
    await caddyStore.createCaddie({
      caddieNumber: registerForm.caddieNumber.trim(),
      name:         registerForm.name.trim(),
      phone:        registerForm.phone.trim() || undefined,
      hireDate:     registerForm.hireDate     || undefined,
    })
    showRegister.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    registerError.value =
      code === 'DUPLICATE_CADDIE_NUMBER'
        ? '이미 사용 중인 캐디 번호입니다.'
        : '등록에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    registering.value = false
  }
}

// ─── 캐디 그룹 (ADR-005) — Manager 전용 인라인 지정 ─────────────────
const groups = ref([])

async function loadGroups() {
  if (!isManager.value) return // 그룹 API는 MANAGER 전용
  try {
    groups.value = await getCaddieGroups() ?? []
  } catch { }
}

async function handleGroupChange(caddie, event) {
  const value = event.target.value
  const groupId = value ? Number(value) : null
  try {
    await assignCaddieGroup(caddie.id, groupId)
    await caddyStore.fetchCaddies()
  } catch {
    alert('그룹 변경에 실패했습니다.')
    event.target.value = caddie.caddieGroupId ?? ''
  }
}

// ─── 상세 이동 ─────────────────────────────────────────────────────
function goToDetail(caddie) {
  router.push(`/admin/caddies/${caddie.id}`)
}

onMounted(() => Promise.all([caddyStore.fetchCaddies(), loadGroups()]))
</script>

<template>
  <div class="caddie-list-view">
    <!-- 페이지 헤더 -->
    <div class="page-header">
      <h1 class="page-header__title">캐디 목록</h1>
      <BaseButton v-if="isManager" variant="primary" size="sm" @click="openRegisterModal">
        + 캐디 등록
      </BaseButton>
    </div>

    <!-- 필터 바 -->
    <div class="filter-bar">
      <div class="filter-bar__row">
        <BaseInput
          v-model="keyword"
          placeholder="이름 또는 캐디 번호 검색"
          class="filter-bar__keyword"
          @keyup.enter="handleSearch"
        />
        <select v-model="statusFilter" class="filter-bar__select">
          <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <BaseButton variant="primary" size="sm" @click="handleSearch">검색</BaseButton>
        <BaseButton variant="ghost" size="sm" @click="handleReset">초기화</BaseButton>
      </div>
    </div>

    <!-- 로딩 -->
    <BaseLoading v-if="caddyStore.loading" />

    <!-- 에러 -->
    <p v-else-if="caddyStore.error" class="page-error">{{ caddyStore.error }}</p>

    <!-- 목록 테이블 -->
    <div v-else-if="caddyStore.caddies.length" class="table-wrap">
      <table class="caddie-table">
        <thead>
          <tr>
            <th>캐디 번호</th>
            <th>이름</th>
            <th>연락처</th>
            <th>입사일</th>
            <th>그룹</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="caddie in caddyStore.caddies"
            :key="caddie.id"
            class="caddie-table__row"
            @click="goToDetail(caddie)"
          >
            <td class="caddie-table__number">{{ caddie.caddieNumber }}</td>
            <td class="caddie-table__name">{{ caddie.name }}</td>
            <td>{{ caddie.phone || '—' }}</td>
            <td>{{ caddie.hireDate || '—' }}</td>
            <td @click.stop>
              <select
                v-if="isManager"
                class="group-select"
                :value="caddie.caddieGroupId ?? ''"
                @change="handleGroupChange(caddie, $event)"
              >
                <option value="">하우스 (기본)</option>
                <option v-for="g in groups" :key="g.groupId" :value="g.groupId">{{ g.name }}</option>
              </select>
              <span v-else>{{ caddie.caddieGroupName || '하우스 (기본)' }}</span>
            </td>
            <td>
              <BaseBadge :type="getBadge(caddie.status).type">
                {{ getBadge(caddie.status).label }}
              </BaseBadge>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 빈 상태 -->
    <BaseEmpty v-else message="등록된 캐디가 없습니다." />

    <!-- 캐디 등록 모달 -->
    <BaseModal :visible="showRegister" title="캐디 등록" hide-footer @close="showRegister = false">
      <form class="modal-form" @submit.prevent="handleRegister">
        <div class="modal-form__field">
          <label class="modal-form__label">캐디 번호 <span class="required">*</span></label>
          <BaseInput
            v-model="registerForm.caddieNumber"
            placeholder="예: A01"
            maxlength="20"
            :error="registerErrors.caddieNumber"
          />
          <p v-if="registerErrors.caddieNumber" class="modal-form__error">
            {{ registerErrors.caddieNumber }}
          </p>
        </div>

        <div class="modal-form__field">
          <label class="modal-form__label">이름 <span class="required">*</span></label>
          <BaseInput
            v-model="registerForm.name"
            placeholder="캐디 이름"
            :error="registerErrors.name"
          />
          <p v-if="registerErrors.name" class="modal-form__error">{{ registerErrors.name }}</p>
        </div>

        <div class="modal-form__field">
          <label class="modal-form__label">연락처</label>
          <BaseInput v-model="registerForm.phone" placeholder="010-0000-0000" maxlength="20" />
        </div>

        <div class="modal-form__field">
          <label class="modal-form__label">입사일</label>
          <BaseInput v-model="registerForm.hireDate" type="date" />
        </div>

        <p v-if="registerError" class="modal-form__submit-error">{{ registerError }}</p>

        <div class="modal-form__actions">
          <BaseButton type="button" variant="ghost" @click="showRegister = false">취소</BaseButton>
          <BaseButton type="submit" variant="primary" :loading="registering">등록</BaseButton>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<style scoped>
.caddie-list-view {
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

.filter-bar {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  padding: var(--space-16);
}

.filter-bar__row {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  flex-wrap: wrap;
}

.filter-bar__keyword {
  flex: 1;
  min-width: 200px;
}

.filter-bar__select {
  padding: var(--space-8) var(--space-12);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-6);
  font-size: var(--font-size-body-sm);
  color: var(--color-text-primary);
  background: var(--color-bg-input);
  cursor: pointer;
  height: 38px;
}

.filter-bar__select:focus {
  outline: none;
  border-color: var(--color-border-focus);
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

.caddie-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-body-sm);
}

.caddie-table th {
  background: var(--color-bg-page);
  padding: var(--space-12) var(--space-16);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.caddie-table td {
  padding: var(--space-12) var(--space-16);
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border);
}

.caddie-table__row {
  cursor: pointer;
  transition: background var(--transition-fast);
}

.caddie-table__row:hover { background: var(--manager-primary-light); }
.caddie-table__row:last-child td { border-bottom: none; }

.caddie-table__number {
  font-weight: 600;
  color: var(--manager-primary);
}

.caddie-table__name { font-weight: 500; }

.group-select {
  padding: var(--space-4) var(--space-8);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-6);
  font-size: var(--font-size-body-sm);
  color: var(--color-text-primary);
  background: var(--color-bg-input);
  cursor: pointer;
}

.group-select:focus {
  outline: none;
  border-color: var(--color-border-focus);
}

/* ─── 등록 모달 ─── */
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

.modal-form__error {
  font-size: var(--font-size-detail);
  color: var(--color-danger);
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
