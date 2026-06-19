<script setup>
// 공통 입력 필드 — error 상태 및 v-model을 지원한다
defineProps({
  modelValue:  { type: [String, Number], default: '' },
  type:        { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  error:       { type: String, default: '' },
  disabled:    { type: Boolean, default: false },
  readonly:    { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="base-input">
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      class="base-input__field"
      :class="{ 'base-input__field--error': error, 'base-input__field--disabled': disabled }"
      v-bind="$attrs"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <p v-if="error" class="base-input__error">{{ error }}</p>
  </div>
</template>

<style scoped>
.base-input {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: 100%;
}

.base-input__field {
  width: 100%;
  padding: var(--space-8) var(--space-12);
  font-size: var(--font-size-body-sm);
  color: var(--color-text-primary);
  background: var(--color-bg-input);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  outline: none;
}

.base-input__field::placeholder {
  color: var(--color-text-disabled);
}

.base-input__field:focus {
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px rgba(82, 183, 136, 0.15);
}

.base-input__field--error {
  border-color: var(--color-border-error);
}
.base-input__field--error:focus {
  box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.12);
}

.base-input__field--disabled {
  background: var(--color-bg-disabled);
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

.base-input__error {
  font-size: var(--font-size-detail);
  color: var(--color-danger);
  line-height: 1.4;
}
</style>
