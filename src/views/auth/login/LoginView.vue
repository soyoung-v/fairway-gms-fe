<script setup>
// 로그인 화면 (UI-M001) — Manager/Admin Web 전용. Caddy는 /caddy/login 사용
// route.meta.adminLogin=true(/admin/login)이면 Admin 전용 모드(딥네이비 액센트)로 렌더링한다
// Admin 로그인 성공 시 같은 카드에서 '골프장 선택' 스텝으로 전환한다 (APTeN 마스터→단지선택 흐름)
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGolfCourseStore } from '@/stores/useGolfCourseStore'
import authApi from '@/api/authApi'
import golfCourseApi from '@/api/golfCourseApi'

const route     = useRoute()
const router    = useRouter()
const authStore = useAuthStore()
const golfCourseStore = useGolfCourseStore()

// Admin 전용 로그인 진입점 여부 — 문구/링크/역할 검증/액센트 색을 분기한다
const isAdminLogin = computed(() => route.meta.adminLogin === true)

// 화면 스텝: 'login'(폼) | 'select'(Admin 골프장 선택)
const step = ref('login')

const form = reactive({ email: '', password: '' })
const showPw   = ref(false)
const loading  = ref(false)
const errorMsg = ref('')

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
    // Admin 전용 로그인 화면에서는 ADMIN 계정만 허용한다
    if (isAdminLogin.value && data.role !== 'ADMIN') {
      errorMsg.value = '관리자 전용 로그인입니다. 일반 로그인을 이용해 주세요.'
      return
    }
    authStore.login(data)
    // ADMIN은 골프장을 먼저 선택해야 운영 화면에 진입한다
    if (data.role === 'ADMIN') {
      await loadGolfCourses()
      step.value = 'select'
    } else {
      router.push(roleHome(data.role))
    }
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

// ─── Admin 골프장 선택 스텝 ─────────────────────────────────────────────
const golfCourses    = ref([])
const coursesLoading = ref(false)
const coursesError   = ref('')

async function loadGolfCourses() {
  coursesLoading.value = true
  coursesError.value   = ''
  try {
    const data = await golfCourseApi.getGolfCourses()
    golfCourses.value = Array.isArray(data) ? data : (data?.content ?? [])
    golfCourseStore.setGolfCourseList(golfCourses.value)
  } catch {
    coursesError.value = '골프장 목록을 불러오지 못했습니다.'
  } finally {
    coursesLoading.value = false
  }
}

// 골프장 선택 → 컨텍스트 저장 후 운영 화면 진입
function selectAndEnter(course) {
  golfCourseStore.selectGolfCourse(course.golfCourseId, course.name)
  router.push('/admin/dashboard')
}
</script>

<template>
  <!-- is-admin이면 --accent를 딥네이비로 덮어 로고·버튼·포커스 색을 바꾼다 -->
  <div class="auth-card" :class="{ 'is-admin': isAdminLogin }">
    <!-- 로고 + 타이틀 -->
    <div class="auth-card__title">
      <span class="auth-card__logo" aria-hidden="true">
        <svg viewBox="0 0 56 56" fill="none">
          <rect width="56" height="56" rx="14" fill="currentColor"/>
          <path d="M22 16v22" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M22 16l12 3.6-12 3.6V16z" fill="#fff"/>
          <ellipse cx="28" cy="40" rx="11" ry="3.4" fill="#fff" fill-opacity="0.45"/>
          <circle cx="22" cy="40" r="2.2" fill="#fff"/>
        </svg>
      </span>
      <h1 class="auth-card__h1">
        {{ step === 'select' ? '골프장 선택' : (isAdminLogin ? '관리자 로그인' : '로그인') }}
      </h1>
      <p class="auth-card__sub">
        {{ step === 'select'
          ? '운영할 골프장을 선택하세요'
          : (isAdminLogin ? '플랫폼 관리자 계정으로 로그인하세요' : 'FairwayGMS 골프장 운영 관리 시스템') }}
      </p>
    </div>

    <!-- ── 스텝 1: 로그인 폼 ── -->
    <template v-if="step === 'login'">
      <form class="auth-form" @submit.prevent="handleLogin">
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

        <p v-if="errorMsg" class="auth-form__error" role="alert">{{ errorMsg }}</p>

        <button type="submit" class="auth-form__btn" :disabled="loading">
          <span v-if="!loading">로그인</span>
          <span v-else class="btn-spinner" aria-label="로그인 중"></span>
        </button>
      </form>

      <div class="auth-card__links">
        <template v-if="!isAdminLogin">
          <RouterLink to="/signup" class="link">회원가입</RouterLink>
          <span class="auth-card__divider">|</span>
        </template>
        <RouterLink to="/password-reset" class="link">비밀번호 재설정</RouterLink>
      </div>
    </template>

    <!-- ── 스텝 2: Admin 골프장 선택 ── -->
    <template v-else>
      <div v-if="coursesLoading" class="gc-state">골프장 목록을 불러오는 중…</div>
      <p v-else-if="coursesError" class="auth-form__error">{{ coursesError }}</p>
      <div v-else-if="!golfCourses.length" class="gc-state">
        등록된 골프장이 없습니다. 먼저 골프장을 등록해 주세요.
      </div>

      <ul v-else class="gc-list">
        <li v-for="course in golfCourses" :key="course.golfCourseId">
          <button class="gc-item" type="button" @click="selectAndEnter(course)">
            <span class="gc-item__name">{{ course.name }}</span>
            <span v-if="course.address" class="gc-item__addr">{{ course.address }}</span>
            <svg class="gc-item__arrow" viewBox="0 0 24 24" fill="none">
              <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.auth-card {
  position: relative;
  width: 100%;
  max-width: 440px;
  padding: 48px 36px 32px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 18px 50px rgba(30, 42, 62, 0.10);
  box-sizing: border-box;
  /* 기본 Manager 초록. is-admin에서 딥네이비로 덮는다 */
  --accent: var(--manager-primary);
  --accent-hover: var(--manager-primary-hover);
}
.auth-card.is-admin {
  --accent: var(--admin-primary);
  --accent-hover: var(--admin-primary-hover);
}

/* ─── 로고 + 타이틀 ─── */
.auth-card__title {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 30px;
}
.auth-card__logo {
  display: flex;
  color: var(--accent);
  margin-bottom: 16px;
}
.auth-card__logo svg { width: 56px; height: 56px; }
.auth-card__h1 {
  margin: 0 0 6px;
  font-size: 26px;
  font-weight: 800;
  color: #1a202c;
  letter-spacing: -0.01em;
}
.auth-card__sub {
  margin: 0;
  font-size: 13px;
  color: #757575;
}

/* ─── 폼 ─── */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  height: 46px;
  padding: 0 14px;
  border: 1.5px solid #d9dee8;
  border-radius: 8px;
  font-size: 14px;
  color: #1a202c;
  background: #fff;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.field__input::placeholder { color: #a0aec0; }
.field__input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
}
.field__input:disabled { background: #f7f8fa; }
.field__input--pw { padding-right: 44px; }

.field__pw-wrap { position: relative; }
.field__pw-toggle {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  display: flex;
  color: #8a94a6;
}
.field__pw-toggle svg { width: 18px; height: 18px; }
.field__pw-toggle:hover { color: var(--accent); }

/* ─── 에러 ─── */
.auth-form__error {
  margin: 0;
  padding: 9px 12px;
  border-radius: 8px;
  background: rgba(229, 62, 62, 0.08);
  color: #e53e3e;
  font-size: 13px;
  text-align: center;
}

/* ─── 버튼 ─── */
.auth-form__btn {
  width: 100%;
  height: 48px;
  margin-top: 6px;
  border: 0;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.auth-form__btn:not(:disabled):hover { background: var(--accent-hover); }
.auth-form__btn:disabled { opacity: 0.65; cursor: not-allowed; }

.btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── 하단 링크 ─── */
.auth-card__links {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 22px;
}
.auth-card__divider { font-size: 12px; color: #cbd5e0; }
.link {
  font-size: 13px;
  color: #757575;
  text-decoration: none;
}
.link:hover { color: var(--accent); text-decoration: underline; }

/* ─── 골프장 선택 스텝 ─── */
.gc-state {
  padding: 24px 8px;
  text-align: center;
  font-size: 14px;
  color: #757575;
  line-height: 1.6;
}

.gc-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.gc-item {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 14px 40px 14px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}
.gc-item:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, #fff);
}
.gc-item__name { font-size: 15px; font-weight: 700; color: #1a202c; }
.gc-item__addr { font-size: 12px; color: #757575; }
.gc-item__arrow {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--accent);
}
</style>
