<script setup>
// 내 대기 순번 (UI-C004) — Caddy 전용
// GET /api/caddie/me/queue — queueDate 미지정 시 오늘 기준, 미등록 시 queueNumber: null
import { onMounted, ref } from 'vue'
import caddieApi from '@/api/caddieApi'
import BaseLoading from '@/components/common/BaseLoading.vue'

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const today        = new Date()
const selectedDate = ref(toDateStr(today))

const queueNumber = ref(null)
const queueDate   = ref(null)
const loading     = ref(false)
const error       = ref('')

async function loadQueue() {
  loading.value = true
  error.value   = ''
  try {
    const data    = await caddieApi.getMyQueue(selectedDate.value)
    queueNumber.value = data?.queueNumber ?? null
    queueDate.value   = data?.queueDate   ?? selectedDate.value
  } catch {
    error.value = '대기 순번을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(loadQueue)
</script>

<template>
  <div class="queue-view">
    <h1 class="page-title">내 대기 순번</h1>

    <!-- 날짜 선택 -->
    <div class="date-row">
      <input type="date" v-model="selectedDate" class="date-input" @change="loadQueue" />
    </div>

    <BaseLoading v-if="loading" />
    <p v-else-if="error" class="page-error">{{ error }}</p>

    <template v-else>
      <!-- 순번 카드 -->
      <div class="queue-card">
        <p class="queue-date-label">{{ queueDate ?? selectedDate }} 기준</p>
        <div v-if="queueNumber != null" class="queue-number-wrap">
          <p class="queue-number">{{ queueNumber }}</p>
          <p class="queue-unit">번</p>
        </div>
        <div v-else class="queue-empty">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
            <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <p>해당 날짜에 대기 순번이 없습니다.</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.queue-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
  padding: var(--space-16);
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px) + var(--space-16));
}

.page-title {
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--color-text-primary);
  padding: var(--space-8) 0;
}

.date-row { display: flex; justify-content: flex-end; }

.date-input {
  padding: var(--space-8) var(--space-12);
  font-size: var(--font-size-body-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  background: var(--color-bg-input);
  color: var(--color-text-primary);
  outline: none;
}

.date-input:focus { border-color: var(--caddy-primary); }

.page-error {
  color: var(--color-danger); font-size: var(--font-size-body-sm);
  padding: var(--space-12); background: var(--color-danger-bg); border-radius: var(--radius-8);
}

.queue-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-16);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-16, 16px);
  padding: var(--space-40) var(--space-20);
}

.queue-date-label {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}

.queue-number-wrap {
  display: flex;
  align-items: flex-end;
  gap: var(--space-4);
}

.queue-number {
  font-size: 80px;
  font-weight: 800;
  color: var(--caddy-primary);
  line-height: 1;
}

.queue-unit {
  font-size: 28px;
  font-weight: 700;
  color: var(--caddy-primary);
  padding-bottom: 10px;
}

.queue-empty {
  display: flex; flex-direction: column; align-items: center; gap: var(--space-12);
  color: var(--color-text-secondary); font-size: var(--font-size-body-sm);
}

.empty-icon { width: 40px; height: 40px; opacity: 0.4; }
</style>
