<script setup>
// 캐디피 정책 (UI-M018) — Manager 전용
// 캐디피 정책 조회/수정 (정규·하프백·노쇼 기준)
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettlementStore } from '@/stores/useSettlementStore'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'

const store = useSettlementStore()
const { feePolicy, loading, error } = storeToRefs(store)

const HALF_BACK_OPTIONS = [
  { value: 'SINGLE',       label: '단일 (동일 금액)' },
  { value: 'ONE_AND_HALF', label: '1.5배' },
  { value: 'DOUBLE',       label: '2배' },
]

const NO_SHOW_OPTIONS = [
  { value: 'NONE', label: '미지급' },
  { value: 'HALF', label: '반액' },
  { value: 'FULL', label: '전액' },
]

const form = ref({
  fullRoundFee:  '',
  halfRoundFee:  '',
  halfBackType:  'SINGLE',
  noShowPolicy:  'NONE',
  noShowFee:     '',
})

const saving     = ref(false)
const saveError  = ref('')
const saveSuccess = ref(false)

function initForm(policy) {
  if (!policy) return
  form.value = {
    fullRoundFee: policy.fullRoundFee  ?? '',
    halfRoundFee: policy.halfRoundFee  ?? '',
    halfBackType: policy.halfBackType  ?? 'SINGLE',
    noShowPolicy: policy.noShowPolicy  ?? 'NONE',
    noShowFee:    policy.noShowFee     ?? '',
  }
}

async function handleSave() {
  saveError.value   = ''
  saveSuccess.value = false
  if (!form.value.fullRoundFee) { saveError.value = '정규 라운드 캐디피를 입력해 주세요.'; return }
  if (!form.value.noShowPolicy) { saveError.value = '노쇼 정책을 선택해 주세요.'; return }
  saving.value = true
  try {
    await store.saveFeePolicy({
      fullRoundFee: Number(form.value.fullRoundFee),
      halfRoundFee: form.value.halfRoundFee ? Number(form.value.halfRoundFee) : null,
      halfBackType: form.value.halfBackType || null,
      noShowPolicy: form.value.noShowPolicy,
      noShowFee:    form.value.noShowFee ? Number(form.value.noShowFee) : null,
    })
    saveSuccess.value = true
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    saveError.value = code === 'INVALID_PARAMETER' ? '입력값을 확인해 주세요.' : '저장에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await store.fetchFeePolicy()
  initForm(feePolicy.value)
})
</script>

<template>
  <div class="fee-policy-view">
    <div class="page-header">
      <h1 class="page-header__title">캐디피 정책</h1>
    </div>

    <BaseLoading v-if="loading" />
    <p v-else-if="error" class="page-error">{{ error }}</p>

    <template v-else>
      <p v-if="!feePolicy" class="page-notice">등록된 캐디피 정책이 없습니다. 아래에서 새로 등록해 주세요.</p>

      <div class="policy-card">
        <h2 class="card-title">정규 라운드</h2>
        <div class="form-grid">
          <div class="form-row">
            <label class="form-label">정규 캐디피 (원) <span class="required">*</span></label>
            <BaseInput v-model="form.fullRoundFee" type="number" min="0" placeholder="예: 80000" :disabled="saving" />
          </div>
          <div class="form-row">
            <label class="form-label">하프백 기준</label>
            <BaseSelect v-model="form.halfBackType" :options="HALF_BACK_OPTIONS" :disabled="saving" />
          </div>
          <div class="form-row">
            <label class="form-label">하프백 캐디피 (원)</label>
            <BaseInput v-model="form.halfRoundFee" type="number" min="0" placeholder="미입력 시 자동 계산" :disabled="saving" />
          </div>
        </div>

        <h2 class="card-title card-title--mt">노쇼 처리</h2>
        <div class="form-grid">
          <div class="form-row">
            <label class="form-label">노쇼 정책 <span class="required">*</span></label>
            <BaseSelect v-model="form.noShowPolicy" :options="NO_SHOW_OPTIONS" :disabled="saving" />
          </div>
          <div class="form-row">
            <label class="form-label">노쇼 캐디피 (원)</label>
            <BaseInput v-model="form.noShowFee" type="number" min="0" placeholder="정책이 NONE이면 0" :disabled="saving" />
          </div>
        </div>

        <div class="form-actions">
          <p v-if="saveError" class="form-error">{{ saveError }}</p>
          <p v-if="saveSuccess" class="form-success">정책이 저장되었습니다.</p>
          <BaseButton variant="primary" :loading="saving" @click="handleSave">저장</BaseButton>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.fee-policy-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

.page-header__title {
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--color-text-primary);
}

.page-notice {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  padding: var(--space-16);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
}

.page-error {
  color: var(--color-danger);
  font-size: var(--font-size-body-sm);
  padding: var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-8);
}

.policy-card {
  padding: var(--space-24);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.card-title {
  font-size: var(--font-size-body);
  font-weight: 600;
  color: var(--color-text-primary);
  padding-bottom: var(--space-8);
  border-bottom: 1px solid var(--color-border);
}

.card-title--mt { margin-top: var(--space-8); }

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-16);
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

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
  margin-top: var(--space-8);
  padding-top: var(--space-16);
  border-top: 1px solid var(--color-border);
}

.form-error   { font-size: var(--font-size-detail); color: var(--color-danger); }
.form-success { font-size: var(--font-size-detail); color: var(--color-success); }
.required { color: var(--color-danger); }
</style>
