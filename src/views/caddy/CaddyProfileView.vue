<script setup>
// 내 정보 (UI-C011) — Caddy 전용
// 기본정보 조회 + 비밀번호 변경 + 로그아웃 (FCM 토큰 해제 포함)
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import caddieApi from '@/api/caddieApi'
import { changePassword } from '@/api/authApi'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'

const router    = useRouter()
const authStore = useAuthStore()

const caddieInfo = ref(null)
const loading    = ref(false)
const loadError  = ref('')

const STATUS_LABEL = {
  ACTIVE:    '활성',
  ON_LEAVE:  '휴직',
  RESIGNED:  '퇴직',
  EXCLUDED:  '제외',
}

const PERIOD_LABEL = {
  NO_LIMIT:   '제한 없음',
  ONE_ONLY:   '1부만',
  TWO_ONLY:   '2부만',
  THREE_ONLY: '3부만',
}

onMounted(async () => {
  loading.value   = true
  loadError.value = ''
  try {
    caddieInfo.value = await caddieApi.getMyInfo()
  } catch {
    loadError.value = '내 정보를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
})

// ─── 비밀번호 변경 ─────────────────────────────────────────────
const PW_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,30}$/

const showPwForm = ref(false)
const pwForm     = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const pwSaving   = ref(false)
const pwError    = ref('')
const pwSuccess  = ref(false)

function openPwForm() {
  pwForm.value   = { currentPassword: '', newPassword: '', confirmPassword: '' }
  pwError.value  = ''
  pwSuccess.value = false
  showPwForm.value = true
}

async function handleChangePassword() {
  pwError.value   = ''
  pwSuccess.value = false
  if (!pwForm.value.currentPassword)            { pwError.value = '현재 비밀번호를 입력해 주세요.'; return }
  if (!PW_REGEX.test(pwForm.value.newPassword)) { pwError.value = '비밀번호는 8~30자이며 영문·숫자·특수문자를 각 1개 이상 포함해야 합니다.'; return }
  if (pwForm.value.newPassword !== pwForm.value.confirmPassword) { pwError.value = '새 비밀번호가 일치하지 않습니다.'; return }
  pwSaving.value = true
  try {
    await changePassword({ currentPassword: pwForm.value.currentPassword, newPassword: pwForm.value.newPassword })
    pwSuccess.value  = true
    pwForm.value     = { currentPassword: '', newPassword: '', confirmPassword: '' }
    showPwForm.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    pwError.value =
      code === 'INVALID_PASSWORD'  ? '현재 비밀번호가 올바르지 않습니다.' :
      code === 'SAME_AS_CURRENT'   ? '새 비밀번호가 현재 비밀번호와 동일합니다.' :
      '비밀번호 변경에 실패했습니다.'
  } finally {
    pwSaving.value = false
  }
}

// ─── 로그아웃 ─────────────────────────────────────────────────
const loggingOut = ref(false)

async function handleLogout() {
  if (!confirm('로그아웃 하시겠습니까?')) return
  loggingOut.value = true
  await authStore.logout()
  router.replace('/caddy/login')
}
</script>

<template>
  <div class="profile-view">
    <BaseLoading v-if="loading" />
    <p v-else-if="loadError" class="page-error">{{ loadError }}</p>

    <template v-else>
      <!-- 기본 정보 카드 -->
      <div class="info-card" v-if="caddieInfo">
        <div class="avatar-row">
          <div class="avatar">{{ caddieInfo.name?.charAt(0) ?? '캐' }}</div>
          <div>
            <p class="caddie-name">{{ caddieInfo.name }}</p>
            <p class="caddie-number">캐디번호 {{ caddieInfo.caddieNumber }}</p>
          </div>
          <span class="status-badge" :class="`status--${caddieInfo.status?.toLowerCase()}`">
            {{ STATUS_LABEL[caddieInfo.status] ?? caddieInfo.status }}
          </span>
        </div>

        <div class="info-rows" v-if="caddieInfo.workPattern">
          <div class="info-row">
            <span class="info-label">평일 근무</span>
            <span class="info-value">{{ caddieInfo.workPattern.canWeekday ? '가능' : '불가' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">주말 근무</span>
            <span class="info-value">{{ caddieInfo.workPattern.canWeekend ? '가능' : '불가' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">부 제한</span>
            <span class="info-value">{{ PERIOD_LABEL[caddieInfo.workPattern.periodLimit] ?? caddieInfo.workPattern.periodLimit }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">1순위 수동</span>
            <span class="info-value">{{ caddieInfo.workPattern.isFirstWaitManual ? '적용' : '자동' }}</span>
          </div>
        </div>
      </div>

      <!-- 메뉴 목록 -->
      <div class="menu-card">
        <button class="menu-item" @click="openPwForm">
          <span class="menu-label">비밀번호 변경</span>
          <svg class="menu-chevron" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <RouterLink to="/caddy/settings/notification" class="menu-item">
          <span class="menu-label">알림 설정</span>
          <svg class="menu-chevron" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </RouterLink>
      </div>

      <!-- 로그아웃 -->
      <div class="logout-section">
        <BaseButton variant="ghost" :loading="loggingOut" @click="handleLogout" class="logout-btn">
          로그아웃
        </BaseButton>
      </div>
    </template>

    <!-- 비밀번호 변경 시트 -->
    <div v-if="showPwForm" class="pw-sheet-overlay" @click.self="showPwForm = false">
      <div class="pw-sheet">
        <div class="pw-sheet-header">
          <span class="pw-sheet-title">비밀번호 변경</span>
          <button class="pw-close-btn" @click="showPwForm = false">
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <p class="pw-desc">8~30자, 영문·숫자·특수문자 각 1개 이상</p>
        <div class="pw-form">
          <BaseInput v-model="pwForm.currentPassword" type="password" placeholder="현재 비밀번호" :disabled="pwSaving" autocomplete="current-password" />
          <BaseInput v-model="pwForm.newPassword"     type="password" placeholder="새 비밀번호" :disabled="pwSaving" autocomplete="new-password" />
          <BaseInput v-model="pwForm.confirmPassword" type="password" placeholder="새 비밀번호 확인" :disabled="pwSaving" autocomplete="new-password" />
          <p v-if="pwError"   class="form-error">{{ pwError }}</p>
          <p v-if="pwSuccess" class="form-success">비밀번호가 변경되었습니다.</p>
          <BaseButton variant="primary" :loading="pwSaving" @click="handleChangePassword" class="pw-submit-btn">
            변경
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
  padding: var(--space-16);
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px) + var(--space-16));
}

.page-error {
  color: var(--color-danger); font-size: var(--font-size-body-sm);
  padding: var(--space-12); background: var(--color-danger-bg); border-radius: var(--radius-8);
}

/* 기본 정보 카드 */
.info-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-12);
  padding: var(--space-20);
  display: flex; flex-direction: column; gap: var(--space-16);
}

.avatar-row {
  display: flex; align-items: center; gap: var(--space-14, 14px);
}

.avatar {
  width: 52px; height: 52px;
  border-radius: 50%;
  background: var(--caddy-primary);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 700;
  flex-shrink: 0;
}

.caddie-name   { font-size: 18px; font-weight: 700; color: var(--color-text-primary); }
.caddie-number { font-size: var(--font-size-detail); color: var(--color-text-secondary); margin-top: 2px; }

.status-badge {
  margin-left: auto;
  font-size: var(--font-size-detail); font-weight: 600;
  padding: 3px 10px; border-radius: var(--radius-4);
}

.status--active   { background: var(--color-success-bg); color: var(--color-success); }
.status--on_leave { background: var(--color-warning-bg, #fff8e1); color: var(--color-warning); }
.status--resigned,
.status--excluded { background: var(--color-bg-page); color: var(--color-text-secondary); border: 1px solid var(--color-border); }

.info-rows {
  display: flex; flex-direction: column; gap: var(--space-10);
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-14, 14px);
}

.info-row { display: flex; align-items: center; gap: var(--space-12); font-size: var(--font-size-body-sm); }
.info-label { min-width: 80px; color: var(--color-text-secondary); font-weight: 500; }
.info-value { color: var(--color-text-primary); font-weight: 500; }

/* 메뉴 카드 */
.menu-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-12);
  overflow: hidden;
}

.menu-item {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%;
  padding: var(--space-16);
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-body-sm);
  color: var(--color-text-primary);
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition: background var(--transition-fast);
}

.menu-item:last-child { border-bottom: none; }
.menu-item:active     { background: var(--color-bg-page); }

.menu-label { font-weight: 500; }
.menu-chevron { width: 18px; height: 18px; color: var(--color-text-secondary); }

/* 로그아웃 */
.logout-section { display: flex; justify-content: center; padding-top: var(--space-8); }
.logout-btn { color: var(--color-danger) !important; width: 100%; }

/* 비밀번호 변경 바텀시트 */
.pw-sheet-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: flex-end; justify-content: center;
}

.pw-sheet {
  width: 100%; max-width: 430px;
  background: var(--color-bg-card);
  border-radius: var(--radius-16, 16px) var(--radius-16, 16px) 0 0;
  padding: var(--space-20) var(--space-20) calc(var(--space-20) + env(safe-area-inset-bottom, 0px));
  display: flex; flex-direction: column; gap: var(--space-16);
}

.pw-sheet-header {
  display: flex; align-items: center; justify-content: space-between;
}

.pw-sheet-title { font-size: var(--font-size-body); font-weight: 700; color: var(--color-text-primary); }
.pw-close-btn   { color: var(--color-text-secondary); -webkit-tap-highlight-color: transparent; }
.pw-desc        { font-size: var(--font-size-detail); color: var(--color-text-secondary); margin-top: calc(-1 * var(--space-8)); }

.pw-form { display: flex; flex-direction: column; gap: var(--space-12); }

.form-error   { font-size: var(--font-size-detail); color: var(--color-danger); }
.form-success { font-size: var(--font-size-detail); color: var(--color-success); }

.pw-submit-btn { width: 100%; margin-top: var(--space-4); }
</style>
