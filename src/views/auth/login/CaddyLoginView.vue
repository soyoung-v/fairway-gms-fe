<script setup>
// 캐디 전용 로그인 화면 (UI-C001) — Caddy Mobile PWA 진입점
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

    // 캐디 전용 로그인 화면 — CADDY 역할이 아니면 오류 처리
    if (data.role !== 'CADDY') {
      errorMsg.value = '캐디 계정으로만 로그인할 수 있습니다.'
      return
    }

    authStore.login(data)
    // PENDING/REJECTED 상태는 router beforeEach guard가 /caddy/pending으로 리디렉션한다
    router.push('/caddy')
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
  <div class="caddy-login theme-caddy">
    <div class="caddy-login__shell">
      <!-- 앱 헤더 영역 -->
      <div class="caddy-login__header">
        <div class="caddy-login__logo">FairwayGMS</div>
        <p class="caddy-login__subtitle">캐디 전용 앱</p>
      </div>

      <!-- 로그인 폼 -->
      <div class="caddy-login__body">
        <form class="caddy-login__form" @submit.prevent="handleLogin">
          <div class="caddy-login__field">
            <label class="caddy-login__label">이메일</label>
            <BaseInput
              v-model="form.email"
              type="email"
              placeholder="이메일 주소"
              autocomplete="email"
              :disabled="loading"
            />
          </div>
          <div class="caddy-login__field">
            <label class="caddy-login__label">비밀번호</label>
            <BaseInput
              v-model="form.password"
              type="password"
              placeholder="비밀번호"
              autocomplete="current-password"
              :disabled="loading"
            />
          </div>

          <p v-if="errorMsg" class="caddy-login__error" role="alert">{{ errorMsg }}</p>

          <BaseButton
            type="submit"
            variant="primary"
            size="lg"
            :loading="loading"
            class="caddy-login__submit"
          >
            로그인
          </BaseButton>
        </form>

        <!-- 소셜 로그인 -->
        <div class="caddy-login__social">
          <span class="caddy-login__divider">소셜 로그인</span>
          <div class="caddy-login__social-btns">
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
        <div class="caddy-login__links">
          <RouterLink to="/signup/caddy" class="caddy-login__link">회원가입</RouterLink>
          <span class="caddy-login__link-sep">|</span>
          <RouterLink to="/password-reset" class="caddy-login__link">비밀번호 재설정</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 모바일 PWA 쉘 — CaddyLayout과 동일한 max-width 430px 중앙 정렬 */
.caddy-login {
  display: flex;
  justify-content: center;
  min-height: 100vh;
  background: #F2FAF5;
}

.caddy-login__shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 430px;
  min-height: 100vh;
  background: var(--color-bg-card);
}

@media (min-width: 431px) {
  .caddy-login {
    padding: var(--space-24);
    background: #E8F5E9;
  }

  .caddy-login__shell {
    border-radius: var(--radius-12);
    overflow: hidden;
    box-shadow: var(--shadow-large);
    min-height: auto;
    height: calc(100vh - var(--space-48));
  }
}

.caddy-login__header {
  padding: var(--space-48) var(--space-24) var(--space-32);
  background: var(--caddy-primary, #2E7D4F);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-8);
}

.caddy-login__logo {
  font-size: var(--font-size-heading-1);
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.04em;
}

.caddy-login__subtitle {
  font-size: var(--font-size-body-sm);
  color: rgba(255, 255, 255, 0.8);
}

.caddy-login__body {
  flex: 1;
  padding: var(--space-32) var(--space-24);
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

.caddy-login__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.caddy-login__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.caddy-login__label {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.caddy-login__error {
  font-size: var(--font-size-body-sm);
  color: var(--color-danger);
  padding: var(--space-8) var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-6);
  line-height: 1.5;
}

.caddy-login__submit {
  width: 100%;
  margin-top: var(--space-4);
}

.caddy-login__social {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
}

.caddy-login__divider {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
}

.caddy-login__divider::before,
.caddy-login__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.caddy-login__social-btns {
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

.social-btn--kakao { background: #FEE500; color: #3B1D1D; }
.social-btn--naver { background: #03C75A; color: #fff; }
.social-btn--google {
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.caddy-login__links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-8);
}

.caddy-login__link {
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.caddy-login__link:hover {
  color: var(--caddy-primary, #2E7D4F);
}

.caddy-login__link-sep {
  font-size: var(--font-size-detail);
  color: var(--color-border);
}
</style>
