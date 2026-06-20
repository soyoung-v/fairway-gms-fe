<script setup>
// 로그인 화면 (UI-M001 / UI-C001) — Manager/Admin/Caddy 공통
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import authApi from '@/api/authApi'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'

const router    = useRouter()
const authStore = useAuthStore()

const form = reactive({ email: '', password: '' })
const loading  = ref(false)
const errorMsg = ref('')

// 역할에 따른 홈 경로
function roleHome(role) {
  return role === 'CADDY' ? '/caddy' : '/admin/dashboard'
}

async function handleLogin() {
  if (!form.email || !form.password) {
    errorMsg.value = '이메일과 비밀번호를 입력해 주세요.'
    return
  }
  errorMsg.value = ''
  loading.value  = true
  try {
    const res  = await authApi.login(form.email, form.password)
    const data = res.data?.data
    authStore.login(data)
    // PENDING/REJECTED 상태는 router beforeEach guard가 /pending으로 리디렉션한다
    router.push(roleHome(data.role))
  } catch (err) {
    const status = err.response?.status
    const code   = err.response?.data?.error?.code || ''
    if (status === 401 || code === 'INVALID_CREDENTIALS') {
      errorMsg.value = '이메일 또는 비밀번호가 올바르지 않습니다.'
    } else if (status === 423) {
      errorMsg.value = '계정이 잠겨 있습니다. 관리자에게 문의해 주세요.'
    } else {
      errorMsg.value = '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.'
    }
  } finally {
    loading.value = false
  }
}

// 소셜 로그인 — Spring Security OAuth2 인가 엔드포인트로 전체 이동
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
function handleSocialLogin(provider) {
  window.location.href = `${BASE_URL}/oauth2/authorization/${provider}`
}
</script>

<template>
  <div class="login-view">
    <div class="login-card">
      <!-- 로고 -->
      <div class="login-card__logo">FairwayGMS</div>
      <p class="login-card__subtitle">골프장 운영 관리 시스템</p>

      <!-- 로그인 폼 -->
      <form class="login-card__form" @submit.prevent="handleLogin">
        <div class="login-card__field">
          <label class="login-card__label">이메일</label>
          <BaseInput
            v-model="form.email"
            type="email"
            placeholder="이메일 주소"
            autocomplete="email"
            :disabled="loading"
          />
        </div>
        <div class="login-card__field">
          <label class="login-card__label">비밀번호</label>
          <BaseInput
            v-model="form.password"
            type="password"
            placeholder="비밀번호"
            autocomplete="current-password"
            :disabled="loading"
          />
        </div>

        <!-- 에러 메시지 -->
        <p v-if="errorMsg" class="login-card__error" role="alert">{{ errorMsg }}</p>

        <BaseButton
          type="submit"
          variant="primary"
          size="lg"
          :loading="loading"
          class="login-card__submit"
        >
          로그인
        </BaseButton>
      </form>

      <!-- 소셜 로그인 -->
      <div class="login-card__social">
        <span class="login-card__divider">소셜 로그인</span>
        <div class="login-card__social-btns">
          <button class="social-btn social-btn--kakao" type="button" @click="handleSocialLogin('kakao')">
            카카오
          </button>
          <button class="social-btn social-btn--naver" type="button" @click="handleSocialLogin('naver')">
            네이버
          </button>
          <button class="social-btn social-btn--google" type="button" @click="handleSocialLogin('google')">
            Google
          </button>
        </div>
      </div>

      <!-- 하단 링크 -->
      <div class="login-card__links">
        <RouterLink to="/signup" class="login-card__link">Manager 회원가입</RouterLink>
        <span class="login-card__link-sep">|</span>
        <RouterLink to="/signup/caddy" class="login-card__link">Caddy 회원가입</RouterLink>
        <span class="login-card__link-sep">|</span>
        <RouterLink to="/password-reset" class="login-card__link">비밀번호 재설정</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-24);
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--color-bg-card);
  border-radius: var(--radius-16);
  box-shadow: var(--shadow-large);
  padding: var(--space-40) var(--space-32);
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

.login-card__logo {
  font-size: var(--font-size-heading-1);
  font-weight: 700;
  color: var(--manager-primary);
  letter-spacing: 0.04em;
  text-align: center;
}

.login-card__subtitle {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  text-align: center;
  margin-top: calc(-1 * var(--space-12));
}

.login-card__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.login-card__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.login-card__label {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.login-card__error {
  font-size: var(--font-size-body-sm);
  color: var(--color-danger);
  padding: var(--space-8) var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-6);
  line-height: 1.5;
}

.login-card__submit {
  width: 100%;
  margin-top: var(--space-4);
}

/* ─── 소셜 로그인 ──────────── */
.login-card__social {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
}

.login-card__divider {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
}

.login-card__divider::before,
.login-card__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.login-card__social-btns {
  display: flex;
  gap: var(--space-8);
}

.social-btn {
  flex: 1;
  padding: var(--space-8) var(--space-4);
  font-size: var(--font-size-body-sm);
  font-weight: 600;
  border-radius: var(--radius-8);
  transition: opacity var(--transition-fast);
}

.social-btn:hover { opacity: 0.85; }

.social-btn--kakao {
  background: #FEE500;
  color: #3B1D1D;
}

.social-btn--naver {
  background: #03C75A;
  color: #fff;
}

.social-btn--google {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

/* ─── 하단 링크 ──────────── */
.login-card__links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-8);
  flex-wrap: wrap;
}

.login-card__link {
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.login-card__link:hover {
  color: var(--manager-primary);
}

.login-card__link-sep {
  font-size: var(--font-size-detail);
  color: var(--color-border);
}
</style>
