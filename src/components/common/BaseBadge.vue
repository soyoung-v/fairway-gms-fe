<script setup>
// 계정/배정 상태를 색상 뱃지로 표시한다
defineProps({
  type: {
    type: String,
    required: true,
    validator: (v) => ['success', 'warning', 'danger', 'disabled'].includes(v),
  },
})
</script>

<template>
  <span class="base-badge" :class="`badge--${type}`">
    <slot />
  </span>
</template>

<style scoped>
.base-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-8);
  border-radius: var(--radius-full);
  font-size: var(--font-size-detail);
  font-weight: 600;
  white-space: nowrap;
  line-height: 1.6;
}

/* badge-- 클래스는 utilities.css에 정의된 전역 클래스를 그대로 사용 */
</style>
