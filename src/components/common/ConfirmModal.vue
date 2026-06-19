<script setup>
// 사용자 액션 전 재확인을 요청하는 모달 — confirmType은 반드시 명시해야 한다
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'

defineProps({
  visible:       { type: Boolean, required: true },
  title:         { type: String, default: '확인하시겠습니까?' },
  subtitle:      { type: String, default: '' },
  subtitleColor: { type: String, default: '' },
  itemName:      { type: String, default: '' },
  itemLabel:     { type: String, default: '' },
  actionLabel:   { type: String, default: '' },
  actionText:    { type: String, default: '' },
  extraValue:    { type: String, default: '' },
  extraLabel:    { type: String, default: '' },
  confirmText:   { type: String, default: '확인' },
  cancelText:    { type: String, default: '취소' },
  // ★ 반드시 명시 — 생략 시 버튼 색상이 의도와 다르게 표시됨
  // 삭제/거절/취소 → 'danger' | 저장/수정/등록 → 'primary' | 승인/완료 → 'success'
  confirmType:   {
    type: String,
    required: true,
    validator: (v) => ['danger', 'success', 'primary'].includes(v),
  },
  loading:       { type: Boolean, default: false },
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <BaseModal
    :visible="visible"
    hide-header
    hide-footer
    :close-on-overlay="!loading"
    @close="emit('cancel')"
  >
    <div class="confirm-modal">
      <!-- 타입별 아이콘 -->
      <div class="confirm-modal__icon" :class="`confirm-modal__icon--${confirmType}`">
        <svg v-if="confirmType === 'danger'" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else-if="confirmType === 'success'" viewBox="0 0 24 24" fill="none">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
          <path d="M12 8v4m0 4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>

      <!-- 제목 -->
      <h2 class="confirm-modal__title">{{ title }}</h2>

      <!-- 부제목 -->
      <p
        v-if="subtitle"
        class="confirm-modal__subtitle"
        :style="subtitleColor ? { color: subtitleColor } : {}"
      >
        {{ subtitle }}
      </p>

      <!-- 처리 대상 정보 -->
      <div v-if="itemName || actionLabel" class="confirm-modal__info">
        <div v-if="itemName" class="confirm-modal__info-row">
          <span class="confirm-modal__info-label">{{ itemLabel || '대상' }}</span>
          <span class="confirm-modal__info-value">{{ itemName }}</span>
        </div>
        <div v-if="actionLabel" class="confirm-modal__info-row">
          <span class="confirm-modal__info-label">처리</span>
          <span class="confirm-modal__info-value">
            {{ actionLabel }}
            <span v-if="actionText" class="confirm-modal__info-sub">{{ actionText }}</span>
          </span>
        </div>
        <div v-if="extraLabel && extraValue" class="confirm-modal__info-row">
          <span class="confirm-modal__info-label">{{ extraLabel }}</span>
          <span class="confirm-modal__info-value">{{ extraValue }}</span>
        </div>
      </div>

      <!-- 버튼 영역 -->
      <div class="confirm-modal__actions">
        <BaseButton
          variant="outline"
          :disabled="loading"
          @click="emit('cancel')"
        >
          {{ cancelText }}
        </BaseButton>
        <BaseButton
          :variant="confirmType"
          :loading="loading"
          @click="emit('confirm')"
        >
          {{ confirmText }}
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.confirm-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-16);
  padding: var(--space-8) 0;
  text-align: center;
}

/* 타입별 아이콘 */
.confirm-modal__icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirm-modal__icon svg {
  width: 28px;
  height: 28px;
}

.confirm-modal__icon--danger  { background: var(--color-danger-bg);  color: var(--color-danger); }
.confirm-modal__icon--success { background: var(--color-success-bg); color: var(--color-success); }
.confirm-modal__icon--primary {
  background: var(--color-primary-light, var(--manager-primary-light));
  color: var(--color-primary, var(--manager-primary));
}

.confirm-modal__title {
  font-size: var(--font-size-heading-3);
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.4;
}

.confirm-modal__subtitle {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* 처리 대상 정보 박스 */
.confirm-modal__info {
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

.confirm-modal__info-row {
  display: flex;
  gap: var(--space-12);
  font-size: var(--font-size-body-sm);
}

.confirm-modal__info-label {
  color: var(--color-text-secondary);
  min-width: 40px;
  flex-shrink: 0;
}

.confirm-modal__info-value {
  color: var(--color-text-primary);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.confirm-modal__info-sub {
  color: var(--color-text-secondary);
  font-weight: 400;
  font-size: var(--font-size-detail);
}

/* 버튼 영역 */
.confirm-modal__actions {
  display: flex;
  gap: var(--space-8);
  width: 100%;
  justify-content: flex-end;
  padding-top: var(--space-8);
}
</style>
