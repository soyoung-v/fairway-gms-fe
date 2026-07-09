<script setup>
// 관리자 공통 테이블 — APTeN AdminTable 패턴을 GMS 디자인 토큰으로 이식
// columns: [{ key, label, align('left'|'center'|'right'), width }]
// 셀 커스텀은 #cell-{key}="{ row, value }" 슬롯, 행 우측 버튼은 #action="{ row }" 슬롯 사용
defineProps({
  columns:   { type: Array, required: true },
  rows:      { type: Array, default: () => [] },
  rowKey:    { type: String, default: 'id' },
  rowClass:  { type: Function, default: null },
  clickable: { type: Boolean, default: false },
  emptyText: { type: String, default: '데이터가 없습니다.' },
})

const emit = defineEmits(['row-click'])
</script>

<template>
  <div class="admin-table-wrap table-wrap">
    <table class="admin-table">
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :style="{ textAlign: col.align || 'left', width: col.width }"
          >{{ col.label }}</th>
          <th v-if="$slots.action" class="th-action">
            <slot name="action-header">관리</slot>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!rows.length" class="empty-row">
          <td :colspan="columns.length + ($slots.action ? 1 : 0)">{{ emptyText }}</td>
        </tr>
        <tr
          v-for="row in rows"
          v-else
          :key="row[rowKey]"
          :class="[rowClass?.(row), { 'is-clickable': clickable }]"
          @click="clickable && emit('row-click', row)"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            :style="{ textAlign: col.align || 'left' }"
          >
            <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
              {{ row[col.key] ?? '—' }}
            </slot>
          </td>
          <td v-if="$slots.action" class="td-action" @click.stop>
            <slot name="action" :row="row" />
          </td>
        </tr>
      </tbody>
    </table>
    <slot name="footer" />
  </div>
</template>

<style scoped>
.admin-table-wrap {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  overflow: hidden;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-body-sm);
}

.admin-table th {
  background: var(--color-bg-page);
  padding: var(--space-12) var(--space-16);
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.admin-table td {
  padding: var(--space-12) var(--space-16);
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border);
}

.admin-table tbody tr:last-child td { border-bottom: none; }

.admin-table tbody tr {
  transition: background var(--transition-fast);
}

.admin-table tbody tr:hover { background: var(--manager-primary-light); }
.admin-table tbody tr.empty-row:hover { background: transparent; }

.admin-table tbody tr.is-clickable { cursor: pointer; }

.empty-row td {
  padding: var(--space-40) 0;
  text-align: center;
  color: var(--color-text-disabled);
}

.th-action, .td-action { text-align: right; white-space: nowrap; }
</style>
