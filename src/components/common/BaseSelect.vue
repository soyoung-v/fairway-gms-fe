<script setup>
// 공통 select — options 배열({ value, label })을 받아 v-model로 선택값을 바인딩한다
defineProps({
  modelValue: { type: [String, Number, Boolean], default: '' },
  options:    { type: Array, default: () => [] }, // [{ value, label }]
  placeholder:{ type: String, default: '' },
  disabled:   { type: Boolean, default: false },
  error:      { type: String, default: '' },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="base-select">
    <select
      class="base-select__field"
      :class="{
        'base-select__field--error':    error,
        'base-select__field--disabled': disabled,
      }"
      :value="modelValue"
      :disabled="disabled"
      v-bind="$attrs"
      @change="$emit('update:modelValue', isNaN(Number($event.target.value)) ? $event.target.value : Number($event.target.value))"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
    <p v-if="error" class="base-select__error">{{ error }}</p>
  </div>
</template>

<style scoped>
.base-select {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: 100%;
}

.base-select__field {
  width: 100%;
  padding: var(--space-8) var(--space-12);
  font-size: var(--font-size-body-sm);
  color: var(--color-text-primary);
  background: var(--color-bg-input);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  outline: none;
  cursor: pointer;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--space-12) center;
  padding-right: var(--space-32);
}

.base-select__field:focus {
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px rgba(82, 183, 136, 0.15);
}

.base-select__field--error {
  border-color: var(--color-border-error);
}

.base-select__field--disabled {
  background-color: var(--color-bg-disabled);
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

.base-select__error {
  font-size: var(--font-size-detail);
  color: var(--color-danger);
  line-height: 1.4;
}
</style>
