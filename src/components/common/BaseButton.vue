<script setup>
// 공통 버튼 — variant·size·loading 상태를 지원한다
defineProps({
  variant:  {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'danger', 'success', 'secondary', 'outline'].includes(v),
  },
  size:     {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  loading:  { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  type:     { type: String, default: 'button' },
})
</script>

<template>
  <button
    :type="type"
    class="base-btn"
    :class="[`base-btn--${variant}`, `base-btn--${size}`]"
    :disabled="disabled || loading"
  >
    <!-- 로딩 스피너 -->
    <svg
      v-if="loading"
      class="base-btn__spinner"
      viewBox="0 0 20 20"
      fill="none"
    >
      <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2.5" stroke-dasharray="25 14" />
    </svg>
    <slot />
  </button>
</template>

<style scoped>
.base-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-8);
  font-size: var(--font-size-body-sm);
  font-weight: 600;
  border-radius: var(--radius-8);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
  white-space: nowrap;
}

.base-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* 크기 */
.base-btn--sm { padding: var(--space-4)  var(--space-12); font-size: var(--font-size-label); }
.base-btn--md { padding: var(--space-8)  var(--space-16); }
.base-btn--lg { padding: var(--space-12) var(--space-24); font-size: var(--font-size-body); }

/* primary — 테마에 따라 manager/caddy primary 적용 */
.base-btn--primary {
  background: var(--color-primary, var(--manager-primary));
  color:      var(--color-primary-contrast, var(--manager-primary-contrast));
}
.base-btn--primary:not(:disabled):hover {
  background: var(--color-primary-hover, var(--manager-primary-hover));
}

/* danger */
.base-btn--danger {
  background: var(--color-danger);
  color: #FFFFFF;
}
.base-btn--danger:not(:disabled):hover {
  opacity: 0.88;
}

/* success */
.base-btn--success {
  background: var(--color-success);
  color: #FFFFFF;
}
.base-btn--success:not(:disabled):hover {
  opacity: 0.88;
}

/* secondary */
.base-btn--secondary {
  background: var(--color-bg-disabled);
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}
.base-btn--secondary:not(:disabled):hover {
  background: var(--color-border);
}

/* outline */
.base-btn--outline {
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}
.base-btn--outline:not(:disabled):hover {
  background: var(--color-bg-disabled);
}

/* 로딩 스피너 */
.base-btn__spinner {
  width: 16px;
  height: 16px;
  animation: btn-spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes btn-spin {
  to { transform: rotate(360deg); }
}
</style>
