<script setup>
// Caddy 회원가입 화면 (UI-C013) — 모바일 우선 UX
import { reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import authApi from '@/api/authApi'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'

const step = ref('form') // 'form' | 'done'

const form = reactive({
  name:            '',
  email:           '',
  password:        '',
  confirmPassword: '',
  golfCourseId:    '',
})

const emailCheckOk  = ref(false)
const emailCheckMsg = ref('')
const checkingEmail = ref(false)

const errors = reactive({
  name:            '',
  email:           '',
  password:        '',
  confirmPassword: '',
  golfCourseId:    '',
})

const submitting  = ref(false)
const submitError = ref('')

function validate() {
  let ok = true
  errors.name            = form.name.trim()        ? '' : '이름을 입력해 주세요.'
  errors.email           = form.email.trim()       ? '' : '이메일을 입력해 주세요.'
  errors.password        = form.password.length >= 8 ? '' : '비밀번호는 8자 이상이어야 합니다.'
  errors.confirmPassword = form.password === form.confirmPassword ? '' : '비밀번호가 일치하지 않습니다.'
  errors.golfCourseId    = form.golfCourseId.trim()  ? '' : '소속 골프장 ID를 입력해 주세요.'

  if (!emailCheckOk.value && !errors.email) {
    errors.email = '이메일 중복 확인이 필요합니다.'
  }

  Object.values(errors).forEach(e => { if (e) ok = false })
  return ok
}

async function handleCheckEmail() {
  if (!form.email.trim()) {
    emailCheckMsg.value = '이메일을 먼저 입력해 주세요.'
    emailCheckOk.value  = false
    return
  }
  checkingEmail.value = true
  emailCheckMsg.value = ''
  emailCheckOk.value  = false
  try {
    const data      = await authApi.checkEmail(form.email)
    const available = data?.available ?? !data?.duplicate
    emailCheckMsg.value = available ? '사용 가능한 이메일입니다.' : '이미 사용 중인 이메일입니다.'
    emailCheckOk.value  = available
  } catch {
    emailCheckMsg.value = '이메일 확인 중 오류가 발생했습니다.'
  } finally {
    checkingEmail.value = false
  }
}

function onEmailInput() {
  emailCheckOk.value  = false
  emailCheckMsg.value = ''
}

// Caddy 회원가입 — POST /api/auth/signup/caddy
async function handleSubmit() {
  submitError.value = ''
  if (!validate()) return
  submitting.value = true
  try {
    await authApi.signupCaddy({
      name:         form.name.trim(),
      email:        form.email.trim(),
      password:     form.password,
      golfCourseId: Number(form.golfCourseId),
    })
    step.value = 'done'
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    if (code === 'DUPLICATE_EMAIL') {
      errors.email    = '이미 사용 중인 이메일입니다.'
      emailCheckOk.value = false
    } else {
      submitError.value = '회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="caddy-signup">
    <!-- ── 완료 상태 ─────────────────────────── -->
    <template v-if="step === 'done'">
      <div class="caddy-signup__done">
        <svg class="done-icon" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="30" stroke="var(--caddy-primary)" stroke-width="2.5" opacity="0.35"/>
          <circle cx="32" cy="32" r="22" fill="var(--caddy-primary-bg, #e8f5e9)"/>
          <path d="M22 32l7 7 13-13" stroke="var(--caddy-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h2 class="caddy-signup__done-title">가입 신청 완료</h2>
        <p class="caddy-signup__done-desc">
          가입 신청이 접수되었습니다.<br>
          관리자 승인 후 서비스를 이용하실 수 있습니다.
        </p>
        <RouterLink to="/caddy/login">
          <BaseButton variant="primary" size="lg" class="caddy-signup__done-btn">
            로그인 화면으로
          </BaseButton>
        </RouterLink>
      </div>
    </template>

    <!-- ── 가입 폼 ─────────────────────────── -->
    <template v-else>
      <div class="caddy-signup__header">
        <div class="caddy-signup__logo">FairwayGMS</div>
        <h2 class="caddy-signup__title">캐디 회원가입</h2>
      </div>

      <form class="caddy-signup__form" @submit.prevent="handleSubmit">
        <!-- 이름 -->
        <div class="caddy-signup__field">
          <label class="caddy-signup__label">이름</label>
          <BaseInput
            v-model="form.name"
            placeholder="이름을 입력하세요"
            :error="errors.name"
            :disabled="submitting"
          />
        </div>

        <!-- 이메일 -->
        <div class="caddy-signup__field">
          <label class="caddy-signup__label">이메일</label>
          <BaseInput
            v-model="form.email"
            type="email"
            placeholder="이메일 주소"
            :error="errors.email"
            :disabled="submitting"
            @input="onEmailInput"
          />
          <BaseButton
            variant="outline"
            size="md"
            :loading="checkingEmail"
            :disabled="submitting"
            type="button"
            class="caddy-signup__check-btn"
            @click="handleCheckEmail"
          >
            이메일 중복 확인
          </BaseButton>
          <p
            v-if="emailCheckMsg"
            class="caddy-signup__email-msg"
            :class="emailCheckOk ? 'is-ok' : 'is-err'"
          >
            {{ emailCheckMsg }}
          </p>
        </div>

        <!-- 비밀번호 -->
        <div class="caddy-signup__field">
          <label class="caddy-signup__label">비밀번호</label>
          <BaseInput
            v-model="form.password"
            type="password"
            placeholder="비밀번호 (8자 이상)"
            :error="errors.password"
            :disabled="submitting"
          />
        </div>

        <!-- 비밀번호 확인 -->
        <div class="caddy-signup__field">
          <label class="caddy-signup__label">비밀번호 확인</label>
          <BaseInput
            v-model="form.confirmPassword"
            type="password"
            placeholder="비밀번호 재입력"
            :error="errors.confirmPassword"
            :disabled="submitting"
          />
        </div>

        <!-- 소속 골프장 ID -->
        <div class="caddy-signup__field">
          <label class="caddy-signup__label">소속 골프장 ID</label>
          <BaseInput
            v-model="form.golfCourseId"
            type="number"
            placeholder="골프장 ID (숫자)"
            :error="errors.golfCourseId"
            :disabled="submitting"
          />
          <p class="caddy-signup__hint">소속 골프장 ID를 관리자에게 확인하세요.</p>
        </div>

        <p v-if="submitError" class="caddy-signup__submit-error" role="alert">
          {{ submitError }}
        </p>

        <BaseButton
          type="submit"
          variant="primary"
          size="lg"
          :loading="submitting"
          class="caddy-signup__submit"
        >
          가입 신청
        </BaseButton>
      </form>

      <div class="caddy-signup__footer">
        <RouterLink to="/caddy/login" class="caddy-signup__login-link">
          이미 계정이 있으신가요? 로그인
        </RouterLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.caddy-signup {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: var(--space-40) var(--space-20) var(--space-32);
  background: var(--color-bg-card);
  gap: var(--space-24);
}

/* ─── 헤더 ─── */
.caddy-signup__header {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.caddy-signup__logo {
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--caddy-primary);
  letter-spacing: 0.04em;
}

.caddy-signup__title {
  font-size: var(--font-size-heading-3);
  font-weight: 600;
  color: var(--color-text-primary);
}

/* ─── 폼 ─── */
.caddy-signup__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

.caddy-signup__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.caddy-signup__label {
  font-size: var(--font-size-body-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.caddy-signup__check-btn {
  width: 100%;
}

.caddy-signup__email-msg {
  font-size: var(--font-size-detail);
  line-height: 1.4;
}
.caddy-signup__email-msg.is-ok  { color: var(--color-success); }
.caddy-signup__email-msg.is-err { color: var(--color-danger); }

.caddy-signup__hint {
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
}

.caddy-signup__submit-error {
  font-size: var(--font-size-body-sm);
  color: var(--color-danger);
  padding: var(--space-8) var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-6);
}

.caddy-signup__submit {
  width: 100%;
}

/* ─── 하단 ─── */
.caddy-signup__footer {
  text-align: center;
  margin-top: auto;
}

.caddy-signup__login-link {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ─── 완료 패널 ─── */
.caddy-signup__done {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-20);
  text-align: center;
  padding: var(--space-48) 0;
}

.done-icon {
  width: 80px;
  height: 80px;
}

.caddy-signup__done-title {
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--color-text-primary);
}

.caddy-signup__done-desc {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.caddy-signup__done-btn {
  width: 100%;
  max-width: 280px;
}
</style>
