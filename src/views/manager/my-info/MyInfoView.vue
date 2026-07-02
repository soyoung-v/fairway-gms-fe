<script setup>
// 내 정보 (UI-M023) — Admin, Manager 공용
// 로그인 사용자 정보 조회 + 비밀번호 변경
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/useAuthStore'
import { changePassword } from '@/api/authApi'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseInput from '@/components/common/BaseInput.vue'

const authStore = useAuthStore()
const { name, email, role, golfCourseName, status } = storeToRefs(authStore)

const ROLE_LABEL   = { ADMIN: '플랫폼 관리자', MANAGER: '매니저', CADDY: '캐디' }
const STATUS_LABEL = { ACTIVE: '활성', PENDING: '승인 대기', REJECTED: '거절', WITHDRAWN: '탈퇴' }

// ─── 비밀번호 변경 ─────────────────────────────────────────────
// 새 비밀번호 정책: 8~30자, 영문+숫자+특수문자 각 1개 이상, 공백 없음
const PW_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,30}$/

const pwForm  = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const saving  = ref(false)
const pwError = ref('')
const pwSuccess = ref(false)

function validatePw() {
  if (!pwForm.value.currentPassword) return '현재 비밀번호를 입력해 주세요.'
  if (!PW_REGEX.test(pwForm.value.newPassword))
    return '새 비밀번호는 8~30자이며 영문·숫자·특수문자를 각 1개 이상 포함해야 합니다.'
  if (pwForm.value.newPassword !== pwForm.value.confirmPassword)
    return '새 비밀번호와 확인이 일치하지 않습니다.'
  return ''
}

async function handleChangePassword() {
  pwError.value   = ''
  pwSuccess.value = false
  const err = validatePw()
  if (err) { pwError.value = err; return }
  saving.value = true
  try {
    await changePassword({
      currentPassword: pwForm.value.currentPassword,
      newPassword:     pwForm.value.newPassword,
    })
    pwSuccess.value = true
    pwForm.value    = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    pwError.value =
      code === 'INVALID_PASSWORD'      ? '현재 비밀번호가 올바르지 않습니다.' :
      code === 'SAME_AS_CURRENT'       ? '새 비밀번호가 현재 비밀번호와 동일합니다.' :
      code === 'INVALID_PARAMETER'     ? '비밀번호 형식이 올바르지 않습니다.' :
      '비밀번호 변경에 실패했습니다.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="my-info-view">
    <div class="page-header">
      <h1 class="page-header__title">내 정보</h1>
    </div>

    <!-- 기본 정보 카드 -->
    <div class="info-card">
      <h2 class="card-title">기본 정보</h2>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">이름</span>
          <span class="info-value">{{ name }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">이메일</span>
          <span class="info-value">{{ email }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">역할</span>
          <span class="info-value">{{ ROLE_LABEL[role] ?? role }}</span>
        </div>
        <div v-if="golfCourseName" class="info-row">
          <span class="info-label">소속 골프장</span>
          <span class="info-value">{{ golfCourseName }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">계정 상태</span>
          <span class="info-value">{{ STATUS_LABEL[status] ?? status }}</span>
        </div>
      </div>
    </div>

    <!-- 비밀번호 변경 카드 -->
    <div class="info-card">
      <h2 class="card-title">비밀번호 변경</h2>
      <p class="card-desc">비밀번호는 8~30자이며 영문·숫자·특수문자를 각 1개 이상 포함해야 합니다.</p>

      <div class="pw-form">
        <div class="form-row">
          <label class="form-label">현재 비밀번호 <span class="required">*</span></label>
          <BaseInput
            v-model="pwForm.currentPassword"
            type="password"
            placeholder="현재 비밀번호"
            :disabled="saving"
            autocomplete="current-password"
          />
        </div>
        <div class="form-row">
          <label class="form-label">새 비밀번호 <span class="required">*</span></label>
          <BaseInput
            v-model="pwForm.newPassword"
            type="password"
            placeholder="새 비밀번호 (8~30자, 영문·숫자·특수문자 포함)"
            :disabled="saving"
            autocomplete="new-password"
          />
        </div>
        <div class="form-row">
          <label class="form-label">새 비밀번호 확인 <span class="required">*</span></label>
          <BaseInput
            v-model="pwForm.confirmPassword"
            type="password"
            placeholder="새 비밀번호를 다시 입력해 주세요"
            :disabled="saving"
            autocomplete="new-password"
          />
        </div>

        <div class="form-actions">
          <p v-if="pwError"   class="form-error">{{ pwError }}</p>
          <p v-if="pwSuccess" class="form-success">비밀번호가 변경되었습니다.</p>
          <BaseButton variant="primary" :loading="saving" @click="handleChangePassword">
            비밀번호 변경
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-info-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
  max-width: 600px;
}

.page-header__title {
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-4);
}

.info-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
  padding: var(--space-24);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
}

.card-title {
  font-size: var(--font-size-body);
  font-weight: 600;
  color: var(--color-text-primary);
  padding-bottom: var(--space-8);
  border-bottom: 1px solid var(--color-border);
}

.card-desc {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}

.info-grid { display: flex; flex-direction: column; gap: var(--space-12); }

.info-row {
  display: flex;
  align-items: center;
  gap: var(--space-16);
  font-size: var(--font-size-body-sm);
}

.info-label {
  min-width: 100px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.info-value { color: var(--color-text-primary); }

.pw-form { display: flex; flex-direction: column; gap: var(--space-16); }

.form-row { display: flex; flex-direction: column; gap: var(--space-6); }

.form-label {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-12);
  padding-top: var(--space-8);
  border-top: 1px solid var(--color-border);
}

.form-error   { font-size: var(--font-size-detail); color: var(--color-danger); }
.form-success { font-size: var(--font-size-detail); color: var(--color-success); }
.required     { color: var(--color-danger); }
</style>
