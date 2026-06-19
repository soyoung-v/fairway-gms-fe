<script setup>
// 조회 결과가 없을 때 빈 상태를 안내하는 컴포넌트
defineProps({
  message:    { type: String, default: '데이터가 없습니다.' },
  subMessage: { type: String, default: '' },
})
</script>

<template>
  <div class="base-empty" role="status">
    <!-- 빈 상태 아이콘 -->
    <svg class="base-empty__icon" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="28" stroke="var(--color-border)" stroke-width="2"/>
      <path
        d="M22 32h20M32 22v20"
        stroke="var(--color-text-disabled)"
        stroke-width="2"
        stroke-linecap="round"
        opacity="0.5"
      />
      <circle cx="32" cy="32" r="6" fill="var(--color-bg-disabled)"/>
    </svg>

    <p class="base-empty__message">{{ message }}</p>
    <p v-if="subMessage" class="base-empty__sub">{{ subMessage }}</p>

    <!-- 추가 액션 슬롯 (등록 버튼 등) -->
    <slot />
  </div>
</template>

<style scoped>
.base-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-12);
  padding: var(--space-48) var(--space-24);
  text-align: center;
}

.base-empty__icon {
  width: 64px;
  height: 64px;
  opacity: 0.6;
}

.base-empty__message {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.base-empty__sub {
  font-size: var(--font-size-detail);
  color: var(--color-text-disabled);
}
</style>
