<script setup>
// 로딩 중 상태를 스피너로 표시한다
defineProps({
  size:    { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
  message: { type: String, default: '' },
})
</script>

<template>
  <div class="base-loading" :class="`base-loading--${size}`" role="status" aria-label="로딩 중">
    <svg class="base-loading__spinner" viewBox="0 0 40 40" fill="none">
      <circle
        cx="20" cy="20" r="16"
        stroke="var(--color-border)"
        stroke-width="3.5"
      />
      <circle
        cx="20" cy="20" r="16"
        stroke="var(--color-primary, var(--manager-primary))"
        stroke-width="3.5"
        stroke-dasharray="60 42"
        stroke-linecap="round"
      />
    </svg>
    <p v-if="message" class="base-loading__message">{{ message }}</p>
  </div>
</template>

<style scoped>
.base-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-12);
  padding: var(--space-24);
}

.base-loading__spinner {
  animation: loading-spin 0.9s linear infinite;
  flex-shrink: 0;
}

.base-loading--sm .base-loading__spinner { width: 24px; height: 24px; }
.base-loading--md .base-loading__spinner { width: 40px; height: 40px; }
.base-loading--lg .base-loading__spinner { width: 56px; height: 56px; }

.base-loading__message {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}

@keyframes loading-spin {
  to { transform: rotate(360deg); }
}
</style>
