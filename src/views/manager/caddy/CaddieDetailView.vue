<script setup>
// 캐디 상세/수정 (UI-M008) — 기본정보·상태·계정·지정카트·근무패턴 탭, Admin=조회, Manager=조회+수정
import { onMounted, onUnmounted, reactive, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useCaddyStore } from '@/stores/useCaddyStore'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const route      = useRoute()
const router     = useRouter()
const authStore  = useAuthStore()
const caddyStore = useCaddyStore()

const caddieId  = Number(route.params.caddieId)
const isManager = computed(() => authStore.isManager)

// ─── 탭 ──────────────────────────────────────────────────────────
const TABS = ['기본정보', '상태변경', '계정연동', '지정카트', '근무패턴']
const activeTab = ref('기본정보')

// ─── 캐디 데이터 참조 ─────────────────────────────────────────────
const caddie = computed(() => caddyStore.currentCaddie)

// ─── 상태 뱃지 ────────────────────────────────────────────────────
const STATUS_MAP = {
  ACTIVE:   { type: 'success',  label: '재직' },
  ON_LEAVE: { type: 'warning',  label: '휴직' },
  EXCLUDED: { type: 'warning',  label: '일시제외' },
  RESIGNED: { type: 'disabled', label: '퇴사' },
}

function getBadge(status) {
  return STATUS_MAP[status] ?? { type: 'disabled', label: status }
}

// ─────────────────────────────────────────────────────────────────
// 탭 1 : 기본정보 수정
// ─────────────────────────────────────────────────────────────────
const infoEditing = ref(false)
const infoForm    = reactive({ caddieNumber: '', phone: '', hireDate: '' })
const infoErrors  = reactive({ caddieNumber: '' })
const infoSaving  = ref(false)
const infoError   = ref('')
const infoSuccess = ref('')

function startInfoEdit() {
  infoForm.caddieNumber = caddie.value?.caddieNumber ?? ''
  infoForm.phone        = caddie.value?.phone        ?? ''
  infoForm.hireDate     = caddie.value?.hireDate     ?? ''
  infoErrors.caddieNumber = ''
  infoError.value   = ''
  infoSuccess.value = ''
  infoEditing.value = true
}

function cancelInfoEdit() {
  infoEditing.value = false
}

async function saveInfo() {
  infoErrors.caddieNumber = infoForm.caddieNumber.trim() ? '' : '캐디 번호를 입력해 주세요.'
  if (infoErrors.caddieNumber) return
  infoSaving.value  = true
  infoError.value   = ''
  infoSuccess.value = ''
  try {
    await caddyStore.editCaddie(caddieId, {
      caddieNumber: infoForm.caddieNumber.trim(),
      phone:        infoForm.phone.trim()    || undefined,
      hireDate:     infoForm.hireDate        || undefined,
    })
    infoEditing.value = false
    infoSuccess.value = '기본정보가 수정되었습니다.'
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    infoError.value =
      code === 'DUPLICATE_CADDIE_NUMBER'
        ? '이미 사용 중인 캐디 번호입니다.'
        : '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    infoSaving.value = false
  }
}

// ─────────────────────────────────────────────────────────────────
// 탭 2 : 상태 변경
// ─────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'ACTIVE',   label: '재직' },
  { value: 'ON_LEAVE', label: '휴직' },
  { value: 'EXCLUDED', label: '일시제외' },
  { value: 'RESIGNED', label: '퇴사' },
]

const statusTarget       = ref('')
const showStatusConfirm  = ref(false)
const statusSaving       = ref(false)
const statusError        = ref('')
const statusSuccess      = ref('')

function openStatusConfirm(status) {
  statusTarget.value      = status
  showStatusConfirm.value = true
}

async function confirmStatusChange() {
  statusSaving.value  = true
  statusError.value   = ''
  statusSuccess.value = ''
  try {
    await caddyStore.changeCaddieStatus(caddieId, statusTarget.value)
    const label = STATUS_MAP[statusTarget.value]?.label ?? statusTarget.value
    statusSuccess.value = `상태가 '${label}'(으)로 변경되었습니다.`
  } catch (err) {
    statusError.value = err.response?.data?.error?.message || '상태 변경에 실패했습니다.'
  } finally {
    statusSaving.value      = false
    showStatusConfirm.value = false
  }
}

// ─────────────────────────────────────────────────────────────────
// 탭 3 : 계정 연동
// ─────────────────────────────────────────────────────────────────
const accountUserId  = ref('')
const accountSaving  = ref(false)
const accountError   = ref('')
const accountSuccess = ref('')

async function linkAccount() {
  const uid = Number(accountUserId.value)
  if (!uid || isNaN(uid)) {
    accountError.value = '유효한 사용자 ID를 입력해 주세요.'
    return
  }
  accountSaving.value  = true
  accountError.value   = ''
  accountSuccess.value = ''
  try {
    await caddyStore.linkCaddieAccount(caddieId, uid)
    accountSuccess.value = '계정이 연동되었습니다.'
    accountUserId.value  = ''
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    accountError.value =
      code === 'ALREADY_LINKED'   ? '이미 연동된 계정입니다.' :
      code === 'USER_NOT_FOUND'   ? '해당 사용자를 찾을 수 없습니다.' :
      code === 'CADDIE_NOT_FOUND' ? '캐디를 찾을 수 없습니다.' :
      '계정 연동에 실패했습니다.'
  } finally {
    accountSaving.value = false
  }
}

// ─────────────────────────────────────────────────────────────────
// 탭 4 : 지정카트
// ─────────────────────────────────────────────────────────────────
const cartId               = ref('')
const cartSaving           = ref(false)
const cartError            = ref('')
const cartSuccess          = ref('')
const showCartRemoveConfirm = ref(false)
const cartRemoving         = ref(false)

async function setCart() {
  const id = Number(cartId.value)
  if (!id || isNaN(id)) {
    cartError.value = '유효한 카트 ID를 입력해 주세요.'
    return
  }
  cartSaving.value  = true
  cartError.value   = ''
  cartSuccess.value = ''
  try {
    await caddyStore.assignDesignatedCart(caddieId, id)
    await caddyStore.fetchCaddie(caddieId)
    cartSuccess.value = '지정카트가 설정되었습니다.'
    cartId.value      = ''
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    cartError.value =
      code === 'CART_NOT_FOUND' ? '해당 카트를 찾을 수 없습니다.' : '지정카트 설정에 실패했습니다.'
  } finally {
    cartSaving.value = false
  }
}

async function removeCart() {
  cartRemoving.value = true
  cartError.value    = ''
  cartSuccess.value  = ''
  try {
    await caddyStore.clearDesignatedCart(caddieId)
    await caddyStore.fetchCaddie(caddieId)
    cartSuccess.value = '지정카트가 해제되었습니다.'
  } catch (err) {
    cartError.value = err.response?.data?.error?.message || '지정카트 해제에 실패했습니다.'
  } finally {
    cartRemoving.value          = false
    showCartRemoveConfirm.value = false
  }
}

// ─────────────────────────────────────────────────────────────────
// 탭 5 : 근무 패턴
// ─────────────────────────────────────────────────────────────────
const patternEditing = ref(false)
const patternForm    = reactive({
  canWeekday:        true,
  canWeekend:        true,
  periodLimit:       null,
  isFirstWaitManual: false,
})
const patternSaving  = ref(false)
const patternError   = ref('')
const patternSuccess = ref('')

const PERIOD_LIMIT_OPTIONS = [
  { value: null, label: '제한 없음' },
  { value: 1,    label: '1부' },
  { value: 2,    label: '2부' },
]

function startPatternEdit() {
  const wp = caddie.value?.workPattern
  patternForm.canWeekday        = wp?.canWeekday        ?? true
  patternForm.canWeekend        = wp?.canWeekend        ?? true
  patternForm.periodLimit       = wp?.periodLimit       ?? null
  patternForm.isFirstWaitManual = wp?.isFirstWaitManual ?? false
  patternError.value   = ''
  patternSuccess.value = ''
  patternEditing.value = true
}

function cancelPatternEdit() {
  patternEditing.value = false
}

async function savePattern() {
  patternSaving.value  = true
  patternError.value   = ''
  patternSuccess.value = ''
  try {
    await caddyStore.editWorkPattern(caddieId, {
      canWeekday:        patternForm.canWeekday,
      canWeekend:        patternForm.canWeekend,
      periodLimit:       patternForm.periodLimit,
      isFirstWaitManual: patternForm.isFirstWaitManual,
    })
    patternEditing.value = false
    patternSuccess.value = '근무 패턴이 저장되었습니다.'
  } catch (err) {
    patternError.value = err.response?.data?.error?.message || '저장에 실패했습니다.'
  } finally {
    patternSaving.value = false
  }
}

// ─── 초기 조회 ───────────────────────────────────────────────────
onMounted(() => caddyStore.fetchCaddie(caddieId))
onUnmounted(() => { caddyStore.currentCaddie = null })
</script>

<template>
  <div class="caddie-detail-view">
    <!-- 로딩 -->
    <BaseLoading v-if="caddyStore.loading && !caddie" />

    <!-- 로드 에러 -->
    <p v-else-if="caddyStore.error && !caddie" class="page-error">{{ caddyStore.error }}</p>

    <template v-else-if="caddie">
      <!-- 헤더 -->
      <div class="page-header">
        <div class="page-header__left">
          <button class="back-btn" @click="router.back()">← 목록으로</button>
          <h1 class="page-header__title page-header__title--keep">
            {{ caddie.name }}
            <BaseBadge :type="getBadge(caddie.status).type" class="header-badge">
              {{ getBadge(caddie.status).label }}
            </BaseBadge>
          </h1>
          <span class="caddie-number"># {{ caddie.caddieNumber }}</span>
        </div>
      </div>

      <!-- 탭 바 -->
      <div class="tab-bar">
        <button
          v-for="tab in TABS"
          :key="tab"
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === tab }"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>

      <!-- ── 탭 1 : 기본정보 ── -->
      <div v-if="activeTab === '기본정보'" class="tab-panel">
        <div class="section-header">
          <h2 class="section-title">기본정보</h2>
          <BaseButton
            v-if="isManager && !infoEditing"
            variant="ghost"
            size="sm"
            @click="startInfoEdit"
          >수정</BaseButton>
        </div>

        <p v-if="infoSuccess" class="feedback-ok">{{ infoSuccess }}</p>
        <p v-if="infoError"   class="feedback-err">{{ infoError }}</p>

        <!-- 조회 모드 -->
        <dl v-if="!infoEditing" class="info-grid">
          <div class="info-row">
            <dt>캐디 번호</dt>
            <dd>{{ caddie.caddieNumber || '—' }}</dd>
          </div>
          <div class="info-row">
            <dt>이름</dt>
            <dd>{{ caddie.name }}</dd>
          </div>
          <div class="info-row">
            <dt>연락처</dt>
            <dd>{{ caddie.phone || '—' }}</dd>
          </div>
          <div class="info-row">
            <dt>입사일</dt>
            <dd>{{ caddie.hireDate || '—' }}</dd>
          </div>
          <div class="info-row">
            <dt>현재 대기 순번</dt>
            <dd>{{ caddie.currentQueueNumber ?? '미배정' }}</dd>
          </div>
        </dl>

        <!-- 수정 모드 (Manager 전용) -->
        <form v-else class="edit-form" @submit.prevent="saveInfo">
          <div class="edit-form__field">
            <label class="edit-form__label">캐디 번호 <span class="required">*</span></label>
            <BaseInput
              v-model="infoForm.caddieNumber"
              maxlength="20"
              :error="infoErrors.caddieNumber"
            />
            <p v-if="infoErrors.caddieNumber" class="field-error">{{ infoErrors.caddieNumber }}</p>
          </div>
          <div class="edit-form__field">
            <label class="edit-form__label">연락처</label>
            <BaseInput v-model="infoForm.phone" placeholder="010-0000-0000" maxlength="20" />
          </div>
          <div class="edit-form__field">
            <label class="edit-form__label">입사일</label>
            <BaseInput v-model="infoForm.hireDate" type="date" />
          </div>
          <div class="edit-form__actions">
            <BaseButton type="button" variant="ghost" @click="cancelInfoEdit">취소</BaseButton>
            <BaseButton type="submit" variant="primary" :loading="infoSaving">저장</BaseButton>
          </div>
        </form>
      </div>

      <!-- ── 탭 2 : 상태 변경 ── -->
      <div v-else-if="activeTab === '상태변경'" class="tab-panel">
        <h2 class="section-title">상태 변경</h2>

        <p class="current-status-label">
          현재 상태:
          <BaseBadge :type="getBadge(caddie.status).type">{{ getBadge(caddie.status).label }}</BaseBadge>
        </p>

        <p v-if="statusSuccess" class="feedback-ok">{{ statusSuccess }}</p>
        <p v-if="statusError"   class="feedback-err">{{ statusError }}</p>

        <!-- Manager 전용 변경 버튼 -->
        <div v-if="isManager" class="status-buttons">
          <BaseButton
            v-for="opt in STATUS_OPTIONS"
            :key="opt.value"
            :variant="caddie.status === opt.value ? 'primary' : 'ghost'"
            size="sm"
            :disabled="caddie.status === opt.value || statusSaving"
            @click="openStatusConfirm(opt.value)"
          >
            {{ opt.label }}
          </BaseButton>
        </div>
        <p v-else class="read-only-note">상태 변경은 Manager만 가능합니다.</p>

        <!-- 상태 변경 확인 모달 -->
        <ConfirmModal
          v-if="showStatusConfirm"
          :message="`상태를 '${STATUS_MAP[statusTarget]?.label}'(으)로 변경하시겠습니까?`"
          confirm-label="변경"
          @confirm="confirmStatusChange"
          @cancel="showStatusConfirm = false"
        />
      </div>

      <!-- ── 탭 3 : 계정 연동 ── -->
      <div v-else-if="activeTab === '계정연동'" class="tab-panel">
        <h2 class="section-title">계정 연동</h2>

        <dl class="info-grid">
          <div class="info-row">
            <dt>연동된 계정 ID</dt>
            <dd>{{ caddie.userId ?? '—' }}</dd>
          </div>
        </dl>

        <p v-if="accountSuccess" class="feedback-ok">{{ accountSuccess }}</p>
        <p v-if="accountError"   class="feedback-err">{{ accountError }}</p>

        <!-- Manager 전용 연동 폼 -->
        <template v-if="isManager">
          <form class="edit-form" @submit.prevent="linkAccount">
            <div class="edit-form__field">
              <label class="edit-form__label">연동할 사용자 ID</label>
              <BaseInput
                v-model="accountUserId"
                type="number"
                placeholder="사용자 ID 입력"
                min="1"
              />
            </div>
            <div class="edit-form__actions">
              <BaseButton type="submit" variant="primary" :loading="accountSaving">계정 연동</BaseButton>
            </div>
          </form>
        </template>
        <p v-else class="read-only-note">계정 연동은 Manager만 가능합니다.</p>
      </div>

      <!-- ── 탭 4 : 지정카트 ── -->
      <div v-else-if="activeTab === '지정카트'" class="tab-panel">
        <h2 class="section-title">지정카트</h2>

        <dl class="info-grid">
          <div class="info-row">
            <dt>현재 지정카트 ID</dt>
            <dd>{{ caddie.designatedCartId ?? '—' }}</dd>
          </div>
        </dl>

        <p v-if="cartSuccess" class="feedback-ok">{{ cartSuccess }}</p>
        <p v-if="cartError"   class="feedback-err">{{ cartError }}</p>

        <!-- Manager 전용 조작 -->
        <template v-if="isManager">
          <form class="edit-form" @submit.prevent="setCart">
            <div class="edit-form__field">
              <label class="edit-form__label">카트 ID 설정</label>
              <BaseInput
                v-model="cartId"
                type="number"
                placeholder="카트 ID 입력"
                min="1"
              />
            </div>
            <div class="edit-form__actions">
              <BaseButton
                v-if="caddie.designatedCartId"
                type="button"
                variant="danger"
                size="sm"
                :loading="cartRemoving"
                @click="showCartRemoveConfirm = true"
              >지정 해제</BaseButton>
              <BaseButton type="submit" variant="primary" :loading="cartSaving">지정 설정</BaseButton>
            </div>
          </form>
        </template>
        <p v-else class="read-only-note">지정카트 변경은 Manager만 가능합니다.</p>

        <!-- 지정 해제 확인 모달 -->
        <ConfirmModal
          v-if="showCartRemoveConfirm"
          message="지정카트를 해제하시겠습니까?"
          confirm-label="해제"
          @confirm="removeCart"
          @cancel="showCartRemoveConfirm = false"
        />
      </div>

      <!-- ── 탭 5 : 근무패턴 ── -->
      <div v-else-if="activeTab === '근무패턴'" class="tab-panel">
        <div class="section-header">
          <h2 class="section-title">근무 패턴</h2>
          <BaseButton
            v-if="isManager && !patternEditing"
            variant="ghost"
            size="sm"
            @click="startPatternEdit"
          >수정</BaseButton>
        </div>

        <p v-if="patternSuccess" class="feedback-ok">{{ patternSuccess }}</p>
        <p v-if="patternError"   class="feedback-err">{{ patternError }}</p>

        <!-- 조회 모드 -->
        <template v-if="!patternEditing">
          <dl v-if="caddie.workPattern" class="info-grid">
            <div class="info-row">
              <dt>주중 근무 가능</dt>
              <dd>{{ caddie.workPattern.canWeekday ? '가능' : '불가' }}</dd>
            </div>
            <div class="info-row">
              <dt>주말 근무 가능</dt>
              <dd>{{ caddie.workPattern.canWeekend ? '가능' : '불가' }}</dd>
            </div>
            <div class="info-row">
              <dt>부제한</dt>
              <dd>
                {{
                  caddie.workPattern.periodLimit === 1 ? '1부' :
                  caddie.workPattern.periodLimit === 2 ? '2부' :
                  '제한 없음'
                }}
              </dd>
            </div>
            <div class="info-row">
              <dt>첫 대기 수동 배정</dt>
              <dd>{{ caddie.workPattern.isFirstWaitManual ? '수동' : '자동' }}</dd>
            </div>
          </dl>
          <p v-else class="read-only-note">근무 패턴이 등록되지 않았습니다.</p>
        </template>

        <!-- 수정 모드 (Manager 전용) -->
        <form v-else class="edit-form" @submit.prevent="savePattern">
          <div class="edit-form__field edit-form__field--row">
            <label class="edit-form__label">주중 근무 가능</label>
            <input v-model="patternForm.canWeekday" type="checkbox" class="checkbox" />
          </div>
          <div class="edit-form__field edit-form__field--row">
            <label class="edit-form__label">주말 근무 가능</label>
            <input v-model="patternForm.canWeekend" type="checkbox" class="checkbox" />
          </div>
          <div class="edit-form__field">
            <label class="edit-form__label">부제한</label>
            <select v-model="patternForm.periodLimit" class="field-select">
              <option
                v-for="opt in PERIOD_LIMIT_OPTIONS"
                :key="String(opt.value)"
                :value="opt.value"
              >{{ opt.label }}</option>
            </select>
          </div>
          <div class="edit-form__field edit-form__field--row">
            <label class="edit-form__label">첫 대기 수동 배정</label>
            <input v-model="patternForm.isFirstWaitManual" type="checkbox" class="checkbox" />
          </div>
          <div class="edit-form__actions">
            <BaseButton type="button" variant="ghost" @click="cancelPatternEdit">취소</BaseButton>
            <BaseButton type="submit" variant="primary" :loading="patternSaving">저장</BaseButton>
          </div>
        </form>
      </div>
    </template>
  </div>
</template>

<style scoped>
.caddie-detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

/* ─── 헤더 ─── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-header__left {
  display: flex;
  align-items: center;
  gap: var(--space-12);
  flex-wrap: wrap;
}

.back-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-body-sm);
  cursor: pointer;
  padding: 0;
}

.back-btn:hover { color: var(--manager-primary); }

.page-header__title {
  font-size: var(--font-size-heading-3);
  font-weight: 700;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.header-badge { flex-shrink: 0; }

.caddie-number {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}

/* ─── 탭 바 ─── */
.tab-bar {
  display: flex;
  gap: var(--space-4);
  border-bottom: 2px solid var(--color-border);
  overflow-x: auto;
}

.tab-btn {
  padding: var(--space-8) var(--space-16);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}

.tab-btn:hover { color: var(--manager-primary); }

.tab-btn--active {
  color: var(--manager-primary);
  border-bottom-color: var(--manager-primary);
  font-weight: 700;
}

/* ─── 탭 패널 ─── */
.tab-panel {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  padding: var(--space-24);
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: var(--font-size-body-lg);
  font-weight: 700;
  color: var(--color-text-primary);
}

/* ─── 정보 그리드 ─── */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-12);
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-12);
  background: var(--color-bg-page);
  border-radius: var(--radius-6);
}

.info-row dt {
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
}

.info-row dd {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

/* ─── 수정 폼 ─── */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
  max-width: 480px;
}

.edit-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.edit-form__field--row {
  flex-direction: row;
  align-items: center;
  gap: var(--space-12);
}

.edit-form__label {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.required { color: var(--color-danger); }

.field-error {
  font-size: var(--font-size-detail);
  color: var(--color-danger);
}

.field-select {
  padding: var(--space-8) var(--space-12);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-6);
  font-size: var(--font-size-body-sm);
  color: var(--color-text-primary);
  background: var(--color-bg-input);
  height: 38px;
}

.field-select:focus {
  outline: none;
  border-color: var(--color-border-focus);
}

.checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--manager-primary);
}

.edit-form__actions {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding-top: var(--space-8);
}

/* ─── 상태 변경 ─── */
.current-status-label {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.status-buttons {
  display: flex;
  gap: var(--space-8);
  flex-wrap: wrap;
}

/* ─── 피드백 ─── */
.feedback-ok {
  font-size: var(--font-size-body-sm);
  color: var(--color-success);
  padding: var(--space-8) var(--space-12);
  background: var(--color-success-bg);
  border-radius: var(--radius-6);
}

.feedback-err {
  font-size: var(--font-size-body-sm);
  color: var(--color-danger);
  padding: var(--space-8) var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-6);
}

.read-only-note {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  font-style: italic;
}

.page-error {
  color: var(--color-danger);
  padding: var(--space-16);
  background: var(--color-danger-bg);
  border-radius: var(--radius-8);
  font-size: var(--font-size-body-sm);
}
</style>
