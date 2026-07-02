<script setup>
// 알림 수신 설정 (UI-C009) — Caddy 전용
// 배정확정·게시글·순번교환 알림 수신 여부 토글 + 저장
import { onMounted, ref } from 'vue'
import { useNotificationStore } from '@/stores/useNotificationStore'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseButton from '@/components/common/BaseButton.vue'

const store = useNotificationStore()

const form    = ref({ isAssignmentEnabled: true, isBoardEnabled: true, isSwapEnabled: true })
const loading = ref(false)
const saving  = ref(false)
const error   = ref('')
const success = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    await store.fetchSettings()
    if (store.settings) {
      form.value = {
        isAssignmentEnabled: store.settings.isAssignmentEnabled ?? true,
        isBoardEnabled:      store.settings.isBoardEnabled      ?? true,
        isSwapEnabled:       store.settings.isSwapEnabled       ?? true,
      }
    }
  } catch {
    error.value = '알림 설정을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
})

async function handleSave() {
  saving.value  = true
  success.value = false
  error.value   = ''
  try {
    await store.saveSettings(form.value)
    success.value = true
  } catch {
    error.value = '설정 저장에 실패했습니다.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="setting-view">
    <BaseLoading v-if="loading" />
    <p v-else-if="error && !saving" class="page-error">{{ error }}</p>

    <template v-else>
      <div class="setting-card">
        <h2 class="card-title">알림 수신 설정</h2>
        <p class="card-desc">각 알림 유형별 수신 여부를 설정합니다.</p>

        <div class="toggle-list">
          <div class="toggle-row">
            <div class="toggle-info">
              <p class="toggle-label">배정 확정 알림</p>
              <p class="toggle-sub">배정이 확정되면 알림을 받습니다.</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="form.isAssignmentEnabled" />
              <span class="slider" />
            </label>
          </div>

          <div class="toggle-row">
            <div class="toggle-info">
              <p class="toggle-label">공지 게시글 알림</p>
              <p class="toggle-sub">새 공지가 등록되면 알림을 받습니다.</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="form.isBoardEnabled" />
              <span class="slider" />
            </label>
          </div>

          <div class="toggle-row">
            <div class="toggle-info">
              <p class="toggle-label">순번교환 알림</p>
              <p class="toggle-sub">교환 요청 승인/거절 시 알림을 받습니다.</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="form.isSwapEnabled" />
              <span class="slider" />
            </label>
          </div>
        </div>

        <div class="save-row">
          <p v-if="error"   class="form-error">{{ error }}</p>
          <p v-if="success" class="form-success">설정이 저장되었습니다.</p>
          <BaseButton variant="primary" :loading="saving" @click="handleSave">저장</BaseButton>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.setting-view {
  display: flex;
  flex-direction: column;
  padding: var(--space-16);
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px) + var(--space-16));
}

.page-error {
  color: var(--color-danger); font-size: var(--font-size-body-sm);
  padding: var(--space-12); background: var(--color-danger-bg); border-radius: var(--radius-8);
}

.setting-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-12);
  padding: var(--space-20);
  display: flex; flex-direction: column; gap: var(--space-20);
}

.card-title {
  font-size: var(--font-size-body); font-weight: 700;
  color: var(--color-text-primary);
  padding-bottom: var(--space-8);
  border-bottom: 1px solid var(--color-border);
}

.card-desc {
  font-size: var(--font-size-body-sm); color: var(--color-text-secondary);
  margin-top: calc(-1 * var(--space-12));
}

.toggle-list { display: flex; flex-direction: column; gap: var(--space-4); }

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-12) 0;
  border-bottom: 1px solid var(--color-border);
}

.toggle-row:last-child { border-bottom: none; }

.toggle-info { display: flex; flex-direction: column; gap: 2px; }
.toggle-label { font-size: var(--font-size-body-sm); font-weight: 600; color: var(--color-text-primary); }
.toggle-sub   { font-size: var(--font-size-detail); color: var(--color-text-secondary); }

/* iOS 스타일 토글 스위치 */
.toggle-switch {
  position: relative;
  width: 48px; height: 28px;
  flex-shrink: 0;
  cursor: pointer;
}

.toggle-switch input { opacity: 0; width: 0; height: 0; }

.slider {
  position: absolute; inset: 0;
  background: var(--color-border);
  border-radius: 14px;
  transition: background var(--transition-fast);
}

.slider::before {
  content: '';
  position: absolute;
  width: 22px; height: 22px;
  left: 3px; top: 3px;
  background: #fff;
  border-radius: 50%;
  transition: transform var(--transition-fast);
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.toggle-switch input:checked + .slider { background: var(--caddy-primary); }
.toggle-switch input:checked + .slider::before { transform: translateX(20px); }

.save-row {
  display: flex; align-items: center; justify-content: flex-end; gap: var(--space-12);
  padding-top: var(--space-8);
  border-top: 1px solid var(--color-border);
}

.form-error   { font-size: var(--font-size-detail); color: var(--color-danger); }
.form-success { font-size: var(--font-size-detail); color: var(--color-success); }
</style>
