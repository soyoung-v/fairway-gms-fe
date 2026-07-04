<script setup>
// 로그인 화면 (UI-M001) — Manager/Admin Web 전용. Caddy는 /caddy/login 사용
// route.meta.adminLogin=true(/admin/login)이면 Admin 전용 모드(딥네이비 테마)로 렌더링한다
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import authApi from '@/api/authApi'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'

const route     = useRoute()
const router    = useRouter()
const authStore = useAuthStore()

// Admin 전용 로그인 진입점 여부 — 문구/링크/역할 검증/색상을 분기한다
const isAdminLogin = computed(() => route.meta.adminLogin === true)

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
    // Admin 전용 로그인 화면에서는 ADMIN 계정만 허용한다
    if (isAdminLogin.value && data.role !== 'ADMIN') {
      errorMsg.value = '관리자 전용 로그인입니다. 일반 로그인을 이용해 주세요.'
      return
    }
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
</script>

<template>
  <!-- is-admin이면 카드 컨테이너에서 --color-primary를 딥네이비로 덮어 버튼·액센트 색을 바꾼다 -->
  <div class="login-view" :class="{ 'is-admin': isAdminLogin }">
    <div class="login-card">
      <!-- 역할 배지 -->
      <span class="login-card__badge">
        {{ isAdminLogin ? 'PLATFORM ADMIN' : 'MANAGER' }}
      </span>

      <!-- 로고 -->
      <div class="login-card__logo">FairwayGMS</div>
      <p class="login-card__subtitle">
        {{ isAdminLogin ? '플랫폼 관리자 로그인' : '골프장 운영 관리 시스템' }}
      </p>

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

      <!-- 하단 링크 — Admin 로그인에서는 회원가입 숨김 (Admin은 자가가입 없음) -->
      <div class="login-card__links">
        <template v-if="!isAdminLogin">
          <RouterLink to="/signup" class="login-card__link">Manager 회원가입</RouterLink>
          <span class="login-card__link-sep">|</span>
        </template>
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
  /* 기본(Manager)은 초록 primary. is-admin에서 딥네이비로 덮는다 */
  --login-accent: var(--manager-primary);
}

/* Admin 모드 — 버튼(--color-primary)과 액센트를 딥네이비로 */
.login-view.is-admin {
  --color-primary:          var(--admin-primary);
  --color-primary-hover:    var(--admin-primary-hover);
  --color-primary-contrast: var(--admin-primary-contrast);
  --login-accent:           var(--admin-primary);
  background: linear-gradient(180deg, #f4f7fb 0%, #e6edf6 100%);
}

.login-card {
  width: 100%;
  max-width: 460px;
  background: var(--color-bg-card);
  border-radius: var(--radius-16);
  box-shadow: var(--shadow-large);
  padding: var(--space-48) var(--space-40);
  display: flex;
  flex-direction: column;
  gap: var(--space-24);
  /* 카드 상단에 역할 색 액센트 바 */
  border-top: 4px solid var(--login-accent);
}

.login-card__badge {
  align-self: center;
  font-size: var(--font-size-detail);
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--login-accent);
  background: color-mix(in srgb, var(--login-accent) 12%, transparent);
  padding: 4px var(--space-12);
  border-radius: var(--radius-full);
}

.login-card__logo {
  font-size: 34px;
  font-weight: 800;
  color: var(--login-accent);
  letter-spacing: 0.04em;
  text-align: center;
}

.login-card__subtitle {
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  text-align: center;
  margin-top: calc(-1 * var(--space-16));
}

.login-card__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-18, 18px);
}

.login-card__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.login-card__label {
  font-size: var(--font-size-body-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.login-card__error {
  font-size: var(--font-size-body-sm);
  color: var(--color-danger);
  padding: var(--space-10) var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-6);
  line-height: 1.5;
}

.login-card__submit {
  width: 100%;
  margin-top: var(--space-8);
  height: 50px;
  font-size: var(--font-size-body);
}

.login-card__links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-8);
  flex-wrap: wrap;
}

.login-card__link {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.login-card__link:hover { color: var(--login-accent); }

.login-card__link-sep {
  font-size: var(--font-size-body-sm);
  color: var(--color-border);
}
</style>
