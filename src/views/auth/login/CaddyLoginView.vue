<script setup>
// 캐디 전용 로그인 화면 (UI-C001) — Caddy Mobile PWA 진입점
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import authApi from '@/api/authApi'

const router             = useRouter()
const authStore          = useAuthStore()
const notificationStore  = useNotificationStore()

const form = reactive({ email: '', password: '' })
const showPw   = ref(false)
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
    // FCM 토큰 등록 — 실패해도 로그인 흐름을 막지 않는다
    notificationStore.registerFcmToken().catch(() => {})
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
    <div class="caddy-login__inner">
      <!-- 로고 + 타이틀 -->
      <div class="caddy-login__title">
        <span class="caddy-login__logo" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="16" fill="currentColor"/>
            <path d="M25 18v26" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>
            <path d="M25 18l14 4.2-14 4.2V18z" fill="#fff"/>
            <ellipse cx="32" cy="46" rx="13" ry="4" fill="#fff" fill-opacity="0.45"/>
            <circle cx="25" cy="46" r="2.6" fill="#fff"/>
          </svg>
        </span>
        <h1 class="caddy-login__h1">FairwayGMS</h1>
        <p class="caddy-login__sub">캐디 전용 앱</p>
      </div>

      <!-- 폼 -->
      <form class="caddy-login__form" @submit.prevent="handleLogin">
        <div class="field">
          <label class="field__label">이메일</label>
          <input
            v-model="form.email"
            type="email"
            class="field__input"
            placeholder="이메일을 입력해 주세요"
            autocomplete="email"
            :disabled="loading"
          />
        </div>

        <div class="field">
          <label class="field__label">비밀번호</label>
          <div class="field__pw-wrap">
            <input
              v-model="form.password"
              :type="showPw ? 'text' : 'password'"
              class="field__input field__input--pw"
              placeholder="비밀번호를 입력해 주세요"
              autocomplete="current-password"
              :disabled="loading"
            />
            <button type="button" class="field__pw-toggle" @click="showPw = !showPw" tabindex="-1" aria-label="비밀번호 표시 전환">
              <svg v-if="!showPw" viewBox="0 0 24 24" fill="none">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.8"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <p v-if="errorMsg" class="caddy-login__error" role="alert">{{ errorMsg }}</p>

        <button type="submit" class="caddy-login__btn" :disabled="loading">
          <span v-if="!loading">로그인</span>
          <span v-else class="btn-spinner" aria-label="로그인 중"></span>
        </button>
      </form>

      <!-- 소셜 로그인 — 카카오만 -->
      <div class="caddy-login__social">
        <span class="caddy-login__divider">간편 로그인</span>
        <button class="social-btn social-btn--kakao" type="button" @click="handleSocialLogin('kakao')">
          <svg viewBox="0 0 24 24" class="social-btn__icon" fill="#3C1E1E" aria-hidden="true">
            <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.74 1.64 5.16 4.14 6.6L5.2 21l4.54-2.4c.73.1 1.48.16 2.26.16 5.52 0 10-3.48 10-7.76S17.52 3 12 3z"/>
          </svg>
          카카오로 로그인
        </button>
      </div>

      <!-- 하단 링크 -->
      <div class="caddy-login__links">
        <RouterLink to="/signup/caddy" class="link">회원가입</RouterLink>
        <span class="caddy-login__link-sep">|</span>
        <RouterLink to="/password-reset" class="link">비밀번호 재설정</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.caddy-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px calc(32px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(170deg, #f2faf5 0%, #e4f4ea 60%, #d5edde 100%);
  --accent: #2e7d4f;
  --accent-hover: #256b42;
}

.caddy-login__inner {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 26px;
}

/* ─── 로고 + 타이틀 ─── */
.caddy-login__title {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.caddy-login__logo {
  display: flex;
  color: var(--accent);
  margin-bottom: 16px;
}
.caddy-login__logo svg { width: 64px; height: 64px; }
.caddy-login__h1 {
  margin: 0 0 4px;
  font-size: 26px;
  font-weight: 800;
  color: #1a202c;
  letter-spacing: 0.01em;
}
.caddy-login__sub {
  margin: 0;
  font-size: 14px;
  color: #5b6b60;
}

/* ─── 폼 ─── */
.caddy-login__form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field__label {
  font-size: 13px;
  font-weight: 700;
  color: #2d3748;
}
.field__input {
  width: 100%;
  height: 50px;
  padding: 0 16px;
  border: 1.5px solid #d5e3da;
  border-radius: 12px;
  font-size: 15px;
  color: #1a202c;
  background: #fff;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.field__input::placeholder { color: #a0aec0; }
.field__input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 16%, transparent);
}
.field__input:disabled { background: #f5f8f6; }
.field__input--pw { padding-right: 48px; }

.field__pw-wrap { position: relative; }
.field__pw-toggle {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  display: flex;
  color: #8a998f;
}
.field__pw-toggle svg { width: 20px; height: 20px; }

/* ─── 에러 ─── */
.caddy-login__error {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(229, 62, 62, 0.08);
  color: #e53e3e;
  font-size: 13px;
  text-align: center;
}

/* ─── 로그인 버튼 ─── */
.caddy-login__btn {
  width: 100%;
  height: 52px;
  margin-top: 4px;
  border: 0;
  border-radius: 12px;
  background: var(--accent);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.caddy-login__btn:not(:disabled):active { background: var(--accent-hover); }
.caddy-login__btn:disabled { opacity: 0.65; }

.btn-spinner {
  width: 19px;
  height: 19px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── 소셜 ─── */
.caddy-login__social {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.caddy-login__divider {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #8a998f;
}
.caddy-login__divider::before,
.caddy-login__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #d5e3da;
}

.social-btn {
  width: 100%;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  border-radius: 12px;
  transition: opacity var(--transition-fast);
}
.social-btn:active { opacity: 0.9; }
.social-btn__icon { width: 20px; height: 20px; }
.social-btn--kakao { background: #FEE500; color: #3B1D1D; }

/* ─── 하단 링크 ─── */
.caddy-login__links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.link {
  font-size: 13px;
  color: #5b6b60;
  text-decoration: none;
}
.link:active { color: var(--accent); }
.caddy-login__link-sep { font-size: 12px; color: #c3d3c9; }
</style>
