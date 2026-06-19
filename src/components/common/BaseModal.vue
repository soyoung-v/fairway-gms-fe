<script setup>
// 오버레이·컨텐츠 박스·헤더·푸터 슬롯을 제공하는 기반 모달 컴포넌트
const props = defineProps({
  visible:        { type: Boolean, required: true },
  title:          { type: String, default: '' },
  subtitle:       { type: String, default: '' },
  hideHeader:     { type: Boolean, default: false },
  hideFooter:     { type: Boolean, default: false },
  closeOnOverlay: { type: Boolean, default: true },
})

const emit = defineEmits(['close'])

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="visible"
        class="modal-overlay"
        @click.self="handleOverlayClick"
      >
        <div class="modal-container" role="dialog" aria-modal="true">
          <!-- 헤더 슬롯 -->
          <header v-if="!hideHeader" class="modal-header">
            <slot name="header">
              <div class="modal-header__text">
                <h2 class="modal-header__title">{{ title }}</h2>
                <p v-if="subtitle" class="modal-header__subtitle">{{ subtitle }}</p>
              </div>
            </slot>
            <button class="modal-header__close" type="button" aria-label="닫기" @click="emit('close')">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
          </header>

          <!-- 본문 슬롯 -->
          <div class="modal-body">
            <slot />
          </div>

          <!-- 푸터 슬롯 -->
          <footer v-if="!hideFooter" class="modal-footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-16);
}

.modal-container {
  background: var(--color-bg-card);
  border-radius: var(--radius-12);
  box-shadow: var(--shadow-large);
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-12);
  padding: var(--space-20) var(--space-24) var(--space-16);
  border-bottom: 1px solid var(--color-border);
}

.modal-header__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.modal-header__title {
  font-size: var(--font-size-heading-3);
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.4;
}

.modal-header__subtitle {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}

.modal-header__close {
  flex-shrink: 0;
  padding: var(--space-4);
  color: var(--color-text-secondary);
  border-radius: var(--radius-6);
  transition: color var(--transition-fast), background var(--transition-fast);
}

.modal-header__close:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-disabled);
}

.modal-body {
  padding: var(--space-24);
  flex: 1;
}

.modal-footer {
  padding: var(--space-16) var(--space-24) var(--space-20);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-8);
}

/* 트랜지션 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--transition-normal);
}
.modal-fade-enter-active .modal-container,
.modal-fade-leave-active .modal-container {
  transition: transform var(--transition-normal), opacity var(--transition-normal);
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .modal-container,
.modal-fade-leave-to .modal-container {
  transform: translateY(-12px);
  opacity: 0;
}
</style>
