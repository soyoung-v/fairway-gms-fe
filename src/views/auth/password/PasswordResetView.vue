<script setup>
// 비밀번호 재설정 화면 (UI-M025 / UI-C014)
// step1: 이메일 입력 → 재설정 링크 발송 요청
// step2: 토큰 + 새 비밀번호 입력 → 재설정 확정
// URL query ?token=xxx 가 있으면 마운트 시 step2로 바로 진입한다
import { onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import authApi from '@/api/authApi'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'

const route  = useRoute()
const router = useRouter()

// 'request' | 'confirm' | 'done'
const step = ref('request')

// Step 1 — 이메일 입력
const emailForm = reactive({ email: '' })
const emailError  = ref('')
const requesting  = ref(false)
const requestDone = ref(false)

// Step 2 — 토큰 + 새 비밀번호
const confirmForm = reactive({
  token:           '',
  newPassword:     '',
  confirmPassword: '',
})
const confirmErrors = reactive({ token: '', newPassword: '', confirmPassword: '' })
const confirming    = ref(false)
const confirmError  = ref('')

onMounted(() => {
  // URL에 token이 있으면 step2(confirm)로 바로 진입한다
  const tokenFromUrl = route.query.token
  if (tokenFromUrl) {
    confirmForm.token = String(tokenFromUrl)
    step.value = 'confirm'
  }
})

// Step 1: 재설정 이메일 발송 요청
async function handleRequest() {
  emailError.value = ''
  if (!emailForm.email.trim()) {
    emailError.value = '이메일을 입력해 주세요.'
    return
  }
  requesting.value = true
  try {
    await authApi.requestPasswordReset(emailForm.email.trim())
    requestDone.value = true
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    if (code === 'USER_NOT_FOUND' || err.response?.status === 404) {
      emailError.value = '등록되지 않은 이메일입니다.'
    } else {
      emailError.value = '요청에 실패했습니다. 잠시 후 다시 시도해 주세요.'
    }
  } finally {
    requesting.value = false
  }
}

// Step 2 유효성 검사
function validateConfirm() {
  let ok = true
  confirmErrors.token           = confirmForm.token.trim()           ? '' : '재설정 토큰을 입력해 주세요.'
  confirmErrors.newPassword     = confirmForm.newPassword.length >= 8 ? '' : '비밀번호는 8자 이상이어야 합니다.'
  confirmErrors.confirmPassword = confirmForm.newPassword === confirmForm.confirmPassword ? '' : '비밀번호가 일치하지 않습니다.'
  Object.values(confirmErrors).forEach(e => { if (e) ok = false })
  return ok
}

// Step 2: 새 비밀번호 설정 확정
async function handleConfirm() {
  confirmError.value = ''
  if (!validateConfirm()) return
  confirming.value = true
  try {
    await authApi.confirmPasswordReset({
      token:       confirmForm.token.trim(),
      newPassword: confirmForm.newPassword,
    })
    step.value = 'done'
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    if (code === 'INVALID_TOKEN' || code === 'EXPIRED_TOKEN') {
      confirmErrors.token = '유효하지 않거나 만료된 토큰입니다. 재설정 이메일을 다시 요청해 주세요.'
    } else {
      confirmError.value = '비밀번호 재설정에 실패했습니다. 잠시 후 다시 시도해 주세요.'
    }
  } finally {
    confirming.value = false
  }
}

function goToLogin() {
  router.push('/login')
}
</script>

<template>
  <div class="password-reset-view">
    <div class="password-reset-card">
      <div class="password-reset-card__logo">FairwayGMS</div>

      <!-- ── Step 1: 이메일 입력 ─────────────────── -->
      <template v-if="step === 'request'">
        <div class="password-reset-card__head">
          <h2 class="password-reset-card__title">비밀번호 재설정</h2>
          <p class="password-reset-card__desc">
            가입 시 등록한 이메일을 입력하면<br>
            비밀번호 재설정 링크를 보내드립니다.
          </p>
        </div>

        <template v-if="!requestDone">
          <form class="password-reset-card__form" @submit.prevent="handleRequest">
            <div class="password-reset-card__field">
              <label class="password-reset-card__label">이메일</label>
              <BaseInput
                v-model="emailForm.email"
                type="email"
                placeholder="가입 시 등록한 이메일"
                :error="emailError"
                :disabled="requesting"
                autocomplete="email"
              />
            </div>
            <BaseButton
              type="submit"
              variant="primary"
              size="lg"
              :loading="requesting"
              class="password-reset-card__btn"
            >
              재설정 링크 발송
            </BaseButton>
          </form>

          <button
            class="password-reset-card__step2-link"
            type="button"
            @click="step = 'confirm'"
          >
            이미 토큰이 있으신가요? 직접 입력
          </button>
        </template>

        <!-- 발송 완료 안내 -->
        <template v-else>
          <div class="password-reset-card__sent">
            <svg class="password-reset-card__sent-icon" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="30" stroke="var(--color-success)" stroke-width="2.5" opacity="0.35"/>
              <circle cx="32" cy="32" r="22" fill="var(--color-success-bg)"/>
              <path d="M22 32l7 7 13-13" stroke="var(--color-success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <p class="password-reset-card__sent-msg">
              <strong>{{ emailForm.email }}</strong>으로<br>
              재설정 링크를 발송했습니다.<br>
              이메일을 확인해 주세요.
            </p>
            <BaseButton variant="outline" size="md" @click="step = 'confirm'">
              토큰 직접 입력
            </BaseButton>
          </div>
        </template>
      </template>

      <!-- ── Step 2: 토큰 + 새 비밀번호 ────────────── -->
      <template v-else-if="step === 'confirm'">
        <div class="password-reset-card__head">
          <h2 class="password-reset-card__title">새 비밀번호 설정</h2>
          <p class="password-reset-card__desc">
            이메일에서 받은 재설정 토큰과<br>
            새 비밀번호를 입력해 주세요.
          </p>
        </div>

        <form class="password-reset-card__form" @submit.prevent="handleConfirm">
          <div class="password-reset-card__field">
            <label class="password-reset-card__label">재설정 토큰</label>
            <BaseInput
              v-model="confirmForm.token"
              placeholder="이메일에서 받은 토큰"
              :error="confirmErrors.token"
              :disabled="confirming"
            />
          </div>
          <div class="password-reset-card__field">
            <label class="password-reset-card__label">새 비밀번호</label>
            <BaseInput
              v-model="confirmForm.newPassword"
              type="password"
              placeholder="새 비밀번호 (8자 이상)"
              :error="confirmErrors.newPassword"
              :disabled="confirming"
            />
          </div>
          <div class="password-reset-card__field">
            <label class="password-reset-card__label">비밀번호 확인</label>
            <BaseInput
              v-model="confirmForm.confirmPassword"
              type="password"
              placeholder="새 비밀번호 재입력"
              :error="confirmErrors.confirmPassword"
              :disabled="confirming"
            />
          </div>

          <p v-if="confirmError" class="password-reset-card__error" role="alert">
            {{ confirmError }}
          </p>

          <BaseButton
            type="submit"
            variant="primary"
            size="lg"
            :loading="confirming"
            class="password-reset-card__btn"
          >
            비밀번호 변경
          </BaseButton>
        </form>

        <button
          class="password-reset-card__step2-link"
          type="button"
          @click="step = 'request'"
        >
          ← 이메일 재발송으로 돌아가기
        </button>
      </template>

      <!-- ── 완료 ────────────────────────────────── -->
      <template v-else>
        <div class="password-reset-card__done">
          <svg class="password-reset-card__done-icon" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" stroke="var(--manager-primary)" stroke-width="2.5" opacity="0.35"/>
            <circle cx="32" cy="32" r="22" fill="var(--color-primary-bg, #e8f5e9)"/>
            <path d="M22 32l7 7 13-13" stroke="var(--manager-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h2 class="password-reset-card__done-title">비밀번호 변경 완료</h2>
          <p class="password-reset-card__done-desc">
            비밀번호가 성공적으로 변경되었습니다.<br>
            새 비밀번호로 로그인해 주세요.
          </p>
          <BaseButton variant="primary" size="lg" class="password-reset-card__btn" @click="goToLogin">
            로그인하기
          </BaseButton>
        </div>
      </template>

      <!-- 로그인 링크 (완료 단계 제외) -->
      <div v-if="step !== 'done'" class="password-reset-card__footer">
        <RouterLink to="/login" class="password-reset-card__link">로그인으로 돌아가기</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.password-reset-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-24);
}

.password-reset-card {
  width: 100%;
  max-width: 400px;
  background: var(--color-bg-card);
  border-radius: var(--radius-16);
  box-shadow: var(--shadow-large);
  padding: var(--space-40) var(--space-32);
  display: flex;
  flex-direction: column;
  gap: var(--space-24);
}

.password-reset-card__logo {
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--manager-primary);
  letter-spacing: 0.04em;
  text-align: center;
}

.password-reset-card__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  text-align: center;
}

.password-reset-card__title {
  font-size: var(--font-size-heading-3);
  font-weight: 600;
  color: var(--color-text-primary);
}

.password-reset-card__desc {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.password-reset-card__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.password-reset-card__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.password-reset-card__label {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.password-reset-card__btn {
  width: 100%;
  margin-top: var(--space-4);
}

.password-reset-card__error {
  font-size: var(--font-size-body-sm);
  color: var(--color-danger);
  padding: var(--space-8) var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-6);
}

.password-reset-card__step2-link {
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
  text-decoration: underline;
  text-underline-offset: 2px;
  text-align: center;
}

/* ─── 발송 완료 ─── */
.password-reset-card__sent {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-16);
  text-align: center;
}

.password-reset-card__sent-icon {
  width: 64px;
  height: 64px;
}

.password-reset-card__sent-msg {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  line-height: 1.7;
}

/* ─── 완료 ─── */
.password-reset-card__done {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-16);
  text-align: center;
}

.password-reset-card__done-icon {
  width: 72px;
  height: 72px;
}

.password-reset-card__done-title {
  font-size: var(--font-size-heading-3);
  font-weight: 700;
  color: var(--color-text-primary);
}

.password-reset-card__done-desc {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  line-height: 1.7;
}

/* ─── 푸터 ─── */
.password-reset-card__footer {
  text-align: center;
}

.password-reset-card__link {
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.password-reset-card__link:hover {
  color: var(--manager-primary);
}
</style>
