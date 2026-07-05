<script setup>
// 소셜 로그인 콜백 (OAuth) — 백엔드가 /oauth/callback?status=... 로 리다이렉트한다
// status: login(성공) | signup(최초가입, 추가정보 입력) | pending(승인대기) | error(실패)
// 소셜 로그인은 캐디 전용(카카오)이므로 캐디 테마로 렌더링한다
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import authApi from '@/api/authApi'
import golfCourseApi from '@/api/golfCourseApi'

const route             = useRoute()
const router            = useRouter()
const authStore         = useAuthStore()
const notificationStore = useNotificationStore()

// 화면 상태: 'loading' | 'signup' | 'pending' | 'error'
const view    = ref('loading')
const message = ref('')

onMounted(async () => {
  const status = String(route.query.status || '')

  if (status === 'login') {
    // 로그인 성공 — at/rt 쿠키가 이미 설정됨. 내 정보를 불러와 상태를 채우고 홈으로 이동
    try {
      const data = await authApi.getMyInfo()
      authStore.login(data)
      notificationStore.registerFcmToken().catch(() => {})
      router.replace(data.role === 'CADDY' ? '/caddy' : '/admin/dashboard')
    } catch {
      view.value = 'error'
      message.value = '로그인 정보를 확인하지 못했습니다. 다시 시도해 주세요.'
    }
    return
  }

  if (status === 'signup') {
    // 최초 가입 — 추가 정보 입력 폼. 골프장 목록을 공개 API로 로드
    view.value = 'signup'
    try {
      golfCourses.value = await golfCourseApi.getPublicGolfCourses() ?? []
    } catch {
      coursesError.value = '골프장 목록을 불러오지 못했습니다.'
    }
    return
  }

  if (status === 'pending') {
    view.value = 'pending'
    return
  }

  // error 또는 알 수 없는 status
  view.value = 'error'
  message.value = '소셜 로그인에 실패했습니다. 다시 시도해 주세요.'
})

// ─── 소셜 최초 가입 폼 ─────────────────────────────────────────────
const golfCourses  = ref([])
const coursesError = ref('')

const form = reactive({ golfCourseId: '', email: '', name: '', phone: '' })
const formError  = ref('')
const submitting = ref(false)

async function handleComplete() {
  formError.value = ''
  if (!form.golfCourseId) {
    formError.value = '소속 골프장을 선택해 주세요.'
    return
  }
  submitting.value = true
  try {
    // 소셜 로그인은 캐디 전용 — role은 CADDY 고정
    await authApi.completeOAuthSignup({
      role:         'CADDY',
      golfCourseId: Number(form.golfCourseId),
      name:         form.name.trim()  || undefined,
      phone:        form.phone.trim() || undefined,
      email:        form.email.trim() || undefined,
    })
    // 가입 완료 → 관리자/매니저 승인 대기(PENDING)
    view.value = 'pending'
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    formError.value = code === 'EMAIL_DUPLICATED'
      ? '이미 가입된 이메일입니다.'
      : '가입 완료에 실패했습니다. 다시 시도해 주세요.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="oauth-cb theme-caddy">
    <div class="oauth-cb__inner">
      <!-- 로고 -->
      <div class="oauth-cb__logo" aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" rx="16" fill="currentColor"/>
          <path d="M25 18v26" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>
          <path d="M25 18l14 4.2-14 4.2V18z" fill="#fff"/>
          <ellipse cx="32" cy="46" rx="13" ry="4" fill="#fff" fill-opacity="0.45"/>
          <circle cx="25" cy="46" r="2.6" fill="#fff"/>
        </svg>
      </div>

      <!-- 로딩 (login 처리 중) -->
      <template v-if="view === 'loading'">
        <div class="oauth-cb__center">
          <span class="spinner"></span>
          <p class="oauth-cb__msg">로그인 처리 중입니다…</p>
        </div>
      </template>

      <!-- 최초 가입 폼 -->
      <template v-else-if="view === 'signup'">
        <div class="oauth-cb__head">
          <h1 class="oauth-cb__h1">추가 정보 입력</h1>
          <p class="oauth-cb__sub">소속 골프장을 선택하면 가입 신청이 완료됩니다</p>
        </div>

        <form class="oauth-cb__form" @submit.prevent="handleComplete">
          <div class="field">
            <label class="field__label">소속 골프장 <span class="req">*</span></label>
            <select
              v-model="form.golfCourseId"
              class="field__input"
              :disabled="submitting || !golfCourses.length"
            >
              <option value="" disabled>골프장을 선택하세요</option>
              <option v-for="gc in golfCourses" :key="gc.golfCourseId" :value="gc.golfCourseId">
                {{ gc.name }}
              </option>
            </select>
            <p v-if="coursesError" class="field__hint">{{ coursesError }}</p>
          </div>

          <div class="field">
            <label class="field__label">이메일 <span class="opt">(선택)</span></label>
            <input v-model="form.email" type="email" class="field__input" placeholder="카카오 이메일이 없으면 입력" :disabled="submitting" />
          </div>

          <div class="field">
            <label class="field__label">이름 <span class="opt">(선택)</span></label>
            <input v-model="form.name" type="text" class="field__input" placeholder="미입력 시 카카오 닉네임 사용" :disabled="submitting" />
          </div>

          <div class="field">
            <label class="field__label">연락처 <span class="opt">(선택)</span></label>
            <input v-model="form.phone" type="tel" class="field__input" placeholder="연락처" :disabled="submitting" />
          </div>

          <p v-if="formError" class="oauth-cb__error" role="alert">{{ formError }}</p>

          <button type="submit" class="oauth-cb__btn" :disabled="submitting">
            <span v-if="!submitting">가입 완료</span>
            <span v-else class="btn-spinner"></span>
          </button>
        </form>
      </template>

      <!-- 승인 대기 -->
      <template v-else-if="view === 'pending'">
        <div class="oauth-cb__center">
          <h1 class="oauth-cb__h1">가입 신청 완료</h1>
          <p class="oauth-cb__msg">
            가입 신청이 접수되었습니다.<br>
            관리자 승인 후 서비스를 이용하실 수 있습니다.
          </p>
          <RouterLink to="/caddy/login" class="oauth-cb__link-btn">로그인 화면으로</RouterLink>
        </div>
      </template>

      <!-- 에러 -->
      <template v-else>
        <div class="oauth-cb__center">
          <h1 class="oauth-cb__h1">로그인 실패</h1>
          <p class="oauth-cb__msg">{{ message }}</p>
          <RouterLink to="/caddy/login" class="oauth-cb__link-btn">다시 로그인</RouterLink>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.oauth-cb {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px calc(32px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(170deg, #f2faf5 0%, #e4f4ea 60%, #d5edde 100%);
  --accent: #2e7d4f;
}

.oauth-cb__inner {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.oauth-cb__logo { display: flex; color: var(--accent); }
.oauth-cb__logo svg { width: 60px; height: 60px; }

.oauth-cb__head { text-align: center; }
.oauth-cb__h1 {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 800;
  color: #1a202c;
}
.oauth-cb__sub {
  margin: 0;
  font-size: 14px;
  color: #5b6b60;
}

.oauth-cb__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
}
.oauth-cb__msg {
  margin: 0;
  font-size: 14px;
  color: #5b6b60;
  line-height: 1.7;
}

/* ─── 폼 ─── */
.oauth-cb__form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.field { display: flex; flex-direction: column; gap: 6px; }
.field__label { font-size: 13px; font-weight: 700; color: #2d3748; }
.req { color: #e53e3e; }
.opt { color: #a0aec0; font-weight: 500; }
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
.field__hint { font-size: 12px; color: #e53e3e; }

.oauth-cb__error {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(229, 62, 62, 0.08);
  color: #e53e3e;
  font-size: 13px;
  text-align: center;
}

.oauth-cb__btn {
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
}
.oauth-cb__btn:disabled { opacity: 0.65; }

.oauth-cb__link-btn {
  margin-top: 4px;
  padding: 12px 28px;
  border-radius: 12px;
  background: var(--accent);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(46, 125, 79, 0.25);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.btn-spinner {
  width: 19px;
  height: 19px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
