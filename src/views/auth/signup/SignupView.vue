<script setup>
// Manager 회원가입 화면 (UI-M024) — 가입 후 PENDING 상태 안내
import { onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import authApi from '@/api/authApi'
import golfCourseApi from '@/api/golfCourseApi'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'

// 폼 단계: 'form' | 'done'
const step = ref('form')

// 소속 골프장 선택 목록 — 비로그인 공개 API로 로드한다
const golfCourses  = ref([])
const coursesError = ref('')

onMounted(async () => {
  try {
    golfCourses.value = await golfCourseApi.getPublicGolfCourses() ?? []
  } catch {
    coursesError.value = '골프장 목록을 불러오지 못했습니다.'
  }
})

const form = reactive({
  name:          '',
  email:         '',
  password:      '',
  confirmPassword: '',
  golfCourseId:  '',
})

// 이메일 중복 확인 상태
const emailChecked = ref(false)
const emailCheckMsg = ref('')
const emailCheckOk  = ref(false)

// 필드별 에러
const errors = reactive({
  name:            '',
  email:           '',
  password:        '',
  confirmPassword: '',
  golfCourseId:    '',
})

const submitting    = ref(false)
const submitError   = ref('')
const checkingEmail = ref(false)

function validate() {
  let ok = true
  errors.name            = form.name.trim()     ? '' : '이름을 입력해 주세요.'
  errors.email           = form.email.trim()    ? '' : '이메일을 입력해 주세요.'
  errors.password        = form.password.length >= 8 ? '' : '비밀번호는 8자 이상이어야 합니다.'
  errors.confirmPassword = form.password === form.confirmPassword ? '' : '비밀번호가 일치하지 않습니다.'
  errors.golfCourseId    = form.golfCourseId ? '' : '소속 골프장을 선택해 주세요.'

  if (!emailCheckOk.value) {
    errors.email = errors.email || '이메일 중복 확인이 필요합니다.'
  }

  Object.values(errors).forEach(e => { if (e) ok = false })
  return ok
}

// 이메일 중복 확인 — GET /api/auth/check-email
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
    const data = await authApi.checkEmail(form.email)
    // 백엔드 응답 기준: available 또는 duplicate 여부 표시
    const available = data?.available ?? !data?.duplicate
    if (available) {
      emailCheckMsg.value = '사용 가능한 이메일입니다.'
      emailCheckOk.value  = true
    } else {
      emailCheckMsg.value = '이미 사용 중인 이메일입니다.'
      emailCheckOk.value  = false
    }
  } catch {
    emailCheckMsg.value = '이메일 확인 중 오류가 발생했습니다.'
    emailCheckOk.value  = false
  } finally {
    checkingEmail.value = false
  }
}

// 이메일이 바뀌면 중복 확인을 초기화한다
function onEmailInput() {
  emailChecked.value  = false
  emailCheckOk.value  = false
  emailCheckMsg.value = ''
}

// Manager 회원가입 — POST /api/auth/signup/manager
async function handleSubmit() {
  submitError.value = ''
  if (!validate()) return
  submitting.value = true
  try {
    await authApi.signupManager({
      name:         form.name.trim(),
      email:        form.email.trim(),
      password:     form.password,
      golfCourseId: Number(form.golfCourseId),
    })
    step.value = 'done'
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    if (code === 'DUPLICATE_EMAIL') {
      errors.email      = '이미 사용 중인 이메일입니다.'
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
  <div class="signup-view">
    <div class="signup-card">
      <div class="signup-card__logo">FairwayGMS</div>

      <!-- ── 완료 상태 ───────────────────────────────── -->
      <template v-if="step === 'done'">
        <div class="signup-done">
          <svg class="signup-done__icon" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" stroke="var(--color-warning)" stroke-width="2.5" opacity="0.4"/>
            <circle cx="32" cy="32" r="22" fill="var(--color-warning-bg)"/>
            <path d="M32 20v12l7 4" stroke="var(--color-warning)" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          <h2 class="signup-done__title">가입 신청 완료</h2>
          <p class="signup-done__desc">
            가입 신청이 접수되었습니다.<br>
            관리자 승인 후 서비스를 이용하실 수 있습니다.
          </p>
          <RouterLink to="/login">
            <BaseButton variant="primary" size="md">로그인 화면으로</BaseButton>
          </RouterLink>
        </div>
      </template>

      <!-- ── 가입 폼 ────────────────────────────────── -->
      <template v-else>
        <h2 class="signup-card__title">Manager 회원가입</h2>

        <form class="signup-card__form" @submit.prevent="handleSubmit">
          <!-- 이름 -->
          <div class="signup-card__field">
            <label class="signup-card__label">이름</label>
            <BaseInput
              v-model="form.name"
              placeholder="이름"
              :error="errors.name"
              :disabled="submitting"
            />
          </div>

          <!-- 이메일 + 중복확인 -->
          <div class="signup-card__field">
            <label class="signup-card__label">이메일</label>
            <div class="signup-card__email-row">
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
                size="sm"
                :loading="checkingEmail"
                :disabled="submitting"
                type="button"
                class="signup-card__check-btn"
                @click="handleCheckEmail"
              >
                중복 확인
              </BaseButton>
            </div>
            <p
              v-if="emailCheckMsg"
              class="signup-card__email-msg"
              :class="emailCheckOk ? 'signup-card__email-msg--ok' : 'signup-card__email-msg--err'"
            >
              {{ emailCheckMsg }}
            </p>
          </div>

          <!-- 비밀번호 -->
          <div class="signup-card__field">
            <label class="signup-card__label">비밀번호</label>
            <BaseInput
              v-model="form.password"
              type="password"
              placeholder="비밀번호 (8자 이상)"
              :error="errors.password"
              :disabled="submitting"
            />
          </div>

          <!-- 비밀번호 확인 -->
          <div class="signup-card__field">
            <label class="signup-card__label">비밀번호 확인</label>
            <BaseInput
              v-model="form.confirmPassword"
              type="password"
              placeholder="비밀번호 재입력"
              :error="errors.confirmPassword"
              :disabled="submitting"
            />
          </div>

          <!-- 소속 골프장 선택 -->
          <div class="signup-card__field">
            <label class="signup-card__label">소속 골프장</label>
            <select
              v-model="form.golfCourseId"
              class="signup-card__select"
              :class="{ 'is-error': errors.golfCourseId }"
              :disabled="submitting || !golfCourses.length"
            >
              <option value="" disabled>골프장을 선택하세요</option>
              <option v-for="gc in golfCourses" :key="gc.golfCourseId" :value="gc.golfCourseId">
                {{ gc.name }}
              </option>
            </select>
            <p v-if="errors.golfCourseId" class="signup-card__field-error">{{ errors.golfCourseId }}</p>
            <p v-else-if="coursesError" class="signup-card__hint">{{ coursesError }}</p>
          </div>

          <!-- 제출 에러 -->
          <p v-if="submitError" class="signup-card__error" role="alert">{{ submitError }}</p>

          <BaseButton
            type="submit"
            variant="primary"
            size="lg"
            :loading="submitting"
            class="signup-card__submit"
          >
            가입 신청
          </BaseButton>
        </form>

        <div class="signup-card__footer">
          <RouterLink to="/login" class="signup-card__link">이미 계정이 있으신가요? 로그인</RouterLink>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.signup-view {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-40) var(--space-24);
}

.signup-card {
  width: 100%;
  max-width: 440px;
  background: var(--color-bg-card);
  border-radius: var(--radius-16);
  box-shadow: var(--shadow-large);
  padding: var(--space-40) var(--space-32);
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

.signup-card__logo {
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--manager-primary);
  letter-spacing: 0.04em;
  text-align: center;
}

.signup-card__title {
  font-size: var(--font-size-heading-3);
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
  margin-top: calc(-1 * var(--space-8));
}

.signup-card__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.signup-card__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.signup-card__label {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.signup-card__email-row {
  display: flex;
  gap: var(--space-8);
  align-items: flex-start;
}

.signup-card__email-row :deep(.base-input) {
  flex: 1;
}

.signup-card__check-btn {
  flex-shrink: 0;
  align-self: flex-start;
}

.signup-card__email-msg {
  font-size: var(--font-size-detail);
  line-height: 1.4;
}

.signup-card__email-msg--ok  { color: var(--color-success); }
.signup-card__email-msg--err { color: var(--color-danger); }

.signup-card__hint {
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
}

.signup-card__select {
  height: 46px;
  width: 100%;
  box-sizing: border-box;
  padding: 0 var(--space-12);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-8);
  font-size: var(--font-size-body-sm);
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color 0.15s;
}
.signup-card__select:focus { border-color: var(--manager-primary); }
.signup-card__select.is-error { border-color: var(--color-danger); }

.signup-card__field-error {
  font-size: var(--font-size-detail);
  color: var(--color-danger);
}

.signup-card__error {
  font-size: var(--font-size-body-sm);
  color: var(--color-danger);
  padding: var(--space-8) var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-6);
}

.signup-card__submit {
  width: 100%;
  margin-top: var(--space-4);
}

.signup-card__footer {
  text-align: center;
}

.signup-card__link {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.signup-card__link:hover { color: var(--manager-primary); }

/* ── 완료 패널 ── */
.signup-done {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-16);
  text-align: center;
  padding: var(--space-8) 0 var(--space-16);
}

.signup-done__icon {
  width: 72px;
  height: 72px;
}

.signup-done__title {
  font-size: var(--font-size-heading-3);
  font-weight: 700;
  color: var(--color-text-primary);
}

.signup-done__desc {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  line-height: 1.7;
}
</style>
