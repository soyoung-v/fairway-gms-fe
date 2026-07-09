<script setup>
// 공통 페이지네이션 — APTeN AppPagination 패턴을 GMS 디자인 토큰으로 이식
// Spring Page 응답(number 0-base) 기준: currentPage는 1-base로 넘겨서 사용한다
import { computed } from 'vue'

const props = defineProps({
  currentPage:   { type: Number, default: 1 },   // 1-base
  totalPages:    { type: Number, default: 1 },
  totalElements: { type: Number, default: 0 },
  unit:          { type: String, default: '건' },
})

const emit = defineEmits(['change'])

const PAGE_GROUP_SIZE = 10

const currentGroup = computed(() => Math.ceil((props.currentPage || 1) / PAGE_GROUP_SIZE))
const startPage    = computed(() => (currentGroup.value - 1) * PAGE_GROUP_SIZE + 1)
const endPage      = computed(() => Math.min(currentGroup.value * PAGE_GROUP_SIZE, props.totalPages))
const pages        = computed(() => {
  const list = []
  for (let i = startPage.value; i <= endPage.value; i += 1) list.push(i)
  return list
})
</script>

<template>
  <div class="pagination-wrap">
    <span class="pagination-info">총 {{ totalElements }}{{ unit }}</span>
    <div class="pagination">
      <button class="page-btn" :disabled="currentPage <= 1" @click="emit('change', 1)">&laquo;</button>
      <button class="page-btn" :disabled="currentPage <= 1" @click="emit('change', currentPage - 1)">&lsaquo;</button>
      <button
        v-for="page in pages"
        :key="page"
        class="page-btn"
        :class="{ 'is-active': page === currentPage }"
        @click="emit('change', page)"
      >{{ page }}</button>
      <button class="page-btn" :disabled="currentPage >= totalPages" @click="emit('change', currentPage + 1)">&rsaquo;</button>
      <button class="page-btn" :disabled="currentPage >= totalPages" @click="emit('change', totalPages)">&raquo;</button>
    </div>
    <span class="pagination-spacer" />
  </div>
</template>

<style scoped>
.pagination-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-12) var(--space-16);
  border-top: 1px solid var(--color-border);
}

.pagination-info,
.pagination-spacer {
  flex: 1;
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
}

.pagination {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-6);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  font-size: var(--font-size-detail);
  transition: background var(--transition-fast);
}

.page-btn:hover:not(:disabled) { background: var(--color-bg-page); }

.page-btn.is-active {
  background: var(--manager-primary);
  border-color: var(--manager-primary);
  color: #fff;
}

.page-btn:disabled {
  color: var(--color-border);
  cursor: default;
}
</style>
