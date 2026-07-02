<script setup>
// 순번교환 요청 (UI-C010) — Caddy 전용
// 내 교환 요청 목록 조회 + 새 교환 요청 등록 (targetCaddieId, requestDate, reason)
import { onMounted, ref } from 'vue'
import boardApi from '@/api/boardApi'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'

const STATUS_LABEL = { REQUESTED: '대기', APPROVED: '승인', REJECTED: '거절' }
const STATUS_CLASS = { REQUESTED: 'badge--warning', APPROVED: 'badge--success', REJECTED: 'badge--danger' }

const myRequests = ref([])
const loading    = ref(false)
const error      = ref('')

function formatDate(str) {
  return str ? String(str).slice(0, 10) : '—'
}

async function loadMyRequests() {
  loading.value = true
  error.value   = ''
  try {
    const data       = await boardApi.getMySwapRequests()
    myRequests.value = data?.content ?? data ?? []
  } catch {
    error.value = '교환 요청 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(loadMyRequests)

// ─── 새 요청 등록 모달 ─────────────────────────────────────────
const showForm  = ref(false)
const form      = ref({ targetCaddieId: '', requestDate: '', reason: '' })
const submitting = ref(false)
const formError  = ref('')

// 오늘 날짜를 기본값으로 설정
const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

function openForm() {
  form.value    = { targetCaddieId: '', requestDate: todayStr, reason: '' }
  formError.value = ''
  showForm.value  = true
}

async function handleSubmit() {
  if (!form.value.targetCaddieId) { formError.value = '대상 캐디 ID를 입력해 주세요.'; return }
  if (!form.value.requestDate)     { formError.value = '요청 날짜를 선택해 주세요.'; return }
  submitting.value = true
  formError.value  = ''
  try {
    await boardApi.createSwapRequest({
      targetCaddieId: Number(form.value.targetCaddieId),
      requestDate:    form.value.requestDate,
      reason:         form.value.reason.trim() || undefined,
    })
    showForm.value = false
    await loadMyRequests()
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    formError.value =
      code === 'SELF_SWAP'        ? '본인에게 교환 요청할 수 없습니다.' :
      code === 'INVALID_PARAMETER' ? '입력값을 확인해 주세요.' :
      '요청 등록에 실패했습니다.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="swap-view">
    <!-- 상단 헤더 -->
    <div class="swap-header">
      <h1 class="page-title">순번교환</h1>
      <BaseButton variant="primary" size="sm" @click="openForm">+ 요청</BaseButton>
    </div>

    <BaseLoading v-if="loading" />
    <p v-else-if="error" class="page-error">{{ error }}</p>

    <template v-else>
      <div v-if="!myRequests.length" class="empty-card">
        <p>교환 요청 내역이 없습니다.</p>
      </div>

      <div class="request-list">
        <div v-for="r in myRequests" :key="r.requestId" class="request-item">
          <div class="request-top">
            <span class="request-date">{{ formatDate(r.requestDate) }}</span>
            <span class="badge" :class="STATUS_CLASS[r.status]">{{ STATUS_LABEL[r.status] ?? r.status }}</span>
          </div>
          <p class="request-reason">{{ r.rejectReason ? `거절 사유: ${r.rejectReason}` : '—' }}</p>
        </div>
      </div>
    </template>

    <!-- 새 요청 등록 모달 -->
    <BaseModal :visible="showForm" title="순번교환 요청" @close="showForm = false">
      <div class="form">
        <div class="form-row">
          <label class="form-label">대상 캐디 ID <span class="required">*</span></label>
          <BaseInput
            v-model="form.targetCaddieId"
            type="number"
            placeholder="캐디 ID 번호"
            :disabled="submitting"
          />
        </div>
        <div class="form-row">
          <label class="form-label">요청 날짜 <span class="required">*</span></label>
          <input type="date" v-model="form.requestDate" class="date-input" :disabled="submitting" />
        </div>
        <div class="form-row">
          <label class="form-label">사유</label>
          <BaseInput v-model="form.reason" placeholder="교환 사유 (선택)" :disabled="submitting" />
        </div>
        <p v-if="formError" class="form-error">{{ formError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" :disabled="submitting" @click="showForm = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="submitting" @click="handleSubmit">요청 등록</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.swap-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
  padding: var(--space-16);
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px) + var(--space-16));
}

.swap-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-4) 0;
}

.page-title {
  font-size: var(--font-size-heading-2); font-weight: 700;
  color: var(--color-text-primary);
}

.page-error {
  color: var(--color-danger); font-size: var(--font-size-body-sm);
  padding: var(--space-12); background: var(--color-danger-bg); border-radius: var(--radius-8);
}

.empty-card {
  display: flex; justify-content: center; padding: var(--space-40) var(--space-20);
  color: var(--color-text-secondary); font-size: var(--font-size-body-sm);
}

.request-list { display: flex; flex-direction: column; gap: var(--space-10); }

.request-item {
  padding: var(--space-14, 14px) var(--space-16);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-12);
  display: flex; flex-direction: column; gap: var(--space-6);
}

.request-top { display: flex; align-items: center; justify-content: space-between; }

.request-date { font-size: var(--font-size-body-sm); font-weight: 600; color: var(--color-text-primary); }

.badge {
  font-size: var(--font-size-detail); font-weight: 600;
  padding: 2px 8px; border-radius: var(--radius-4);
}

.badge--warning { background: var(--color-warning-bg, #fff8e1); color: var(--color-warning); }
.badge--success { background: var(--color-success-bg); color: var(--color-success); }
.badge--danger  { background: var(--color-danger-bg);  color: var(--color-danger); }

.request-reason {
  font-size: var(--font-size-detail); color: var(--color-text-secondary);
}

/* 폼 */
.form { display: flex; flex-direction: column; gap: var(--space-16); }
.form-row { display: flex; flex-direction: column; gap: var(--space-6); }
.form-label { font-size: var(--font-size-body-sm); font-weight: 500; color: var(--color-text-primary); }

.date-input {
  width: 100%;
  padding: var(--space-10) var(--space-12);
  font-size: var(--font-size-body-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  background: var(--color-bg-input);
  color: var(--color-text-primary);
  outline: none;
}

.date-input:focus { border-color: var(--caddy-primary); }

.form-error { font-size: var(--font-size-detail); color: var(--color-danger); }
.required   { color: var(--color-danger); }
</style>
