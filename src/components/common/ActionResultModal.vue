<script setup>
// API 처리 결과(성공·실패·경고)를 사용자에게 안내하는 결과 모달
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'

defineProps({
  visible:     { type: Boolean, required: true },
  type:        {
    type: String,
    required: true,
    validator: (v) => ['success', 'danger', 'warning'].includes(v),
  },
  title:       { type: String, default: '' },
  subtitle:    { type: String, default: '' },
  desc:        { type: String, default: '' },
  itemName:    { type: String, default: '' },
  time:        { type: String, default: '' },
  actionLabel: { type: String, default: '' },
  actor:       { type: String, default: '' },
  confirmText: { type: String, default: '확인' },
})

const emit = defineEmits(['close'])

// type에 따른 아이콘·색상 매핑
const typeConfig = {
  success: {
    iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    colorClass: 'result-modal__icon--success',
  },
  danger: {
    iconPath: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    colorClass: 'result-modal__icon--danger',
  },
  warning: {
    iconPath: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
    colorClass: 'result-modal__icon--warning',
  },
}
</script>

<template>
  <BaseModal
    :visible="visible"
    hide-header
    hide-footer
    :close-on-overlay="false"
    @close="emit('close')"
  >
    <div class="result-modal">
      <!-- 타입 아이콘 -->
      <div class="result-modal__icon" :class="typeConfig[type].colorClass">
        <svg viewBox="0 0 24 24" fill="none">
          <path
            :d="typeConfig[type].iconPath"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <!-- 결과 제목 -->
      <h2 class="result-modal__title">{{ title }}</h2>

      <!-- 부제목 -->
      <p v-if="subtitle" class="result-modal__subtitle">{{ subtitle }}</p>
      <p v-if="desc" class="result-modal__desc">{{ desc }}</p>

      <!-- 처리 상세 정보 -->
      <div v-if="itemName || actionLabel || time || actor" class="result-modal__info">
        <div v-if="itemName" class="result-modal__info-row">
          <span class="result-modal__info-label">대상</span>
          <span class="result-modal__info-value">{{ itemName }}</span>
        </div>
        <div v-if="actionLabel" class="result-modal__info-row">
          <span class="result-modal__info-label">처리</span>
          <span class="result-modal__info-value">{{ actionLabel }}</span>
        </div>
        <div v-if="time" class="result-modal__info-row">
          <span class="result-modal__info-label">처리 시각</span>
          <span class="result-modal__info-value">{{ time }}</span>
        </div>
        <div v-if="actor" class="result-modal__info-row">
          <span class="result-modal__info-label">처리자</span>
          <span class="result-modal__info-value">{{ actor }}</span>
        </div>
      </div>

      <!-- 확인 버튼 -->
      <div class="result-modal__actions">
        <BaseButton
          :variant="type === 'success' ? 'success' : type === 'danger' ? 'danger' : 'primary'"
          @click="emit('close')"
        >
          {{ confirmText }}
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.result-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-16);
  padding: var(--space-8) 0;
  text-align: center;
}

/* 타입별 아이콘 */
.result-modal__icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}
.result-modal__icon svg {
  width: 30px;
  height: 30px;
}

.result-modal__icon--success { background: var(--color-success-bg); color: var(--color-success); }
.result-modal__icon--danger  { background: var(--color-danger-bg);  color: var(--color-danger); }
.result-modal__icon--warning { background: var(--color-warning-bg); color: var(--color-warning); }

.result-modal__title {
  font-size: var(--font-size-heading-3);
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.4;
}

.result-modal__subtitle {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.result-modal__desc {
  font-size: var(--font-size-detail);
  color: var(--color-text-disabled);
}

/* 처리 상세 정보 박스 */
.result-modal__info {
  width: 100%;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  padding: var(--space-12) var(--space-16);
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  text-align: left;
}

.result-modal__info-row {
  display: flex;
  gap: var(--space-12);
  font-size: var(--font-size-body-sm);
}

.result-modal__info-label {
  color: var(--color-text-secondary);
  min-width: 52px;
  flex-shrink: 0;
}

.result-modal__info-value {
  color: var(--color-text-primary);
  font-weight: 500;
}

/* 확인 버튼 */
.result-modal__actions {
  display: flex;
  justify-content: center;
  width: 100%;
  padding-top: var(--space-8);
}

.result-modal__actions .base-btn {
  min-width: 120px;
}
</style>
