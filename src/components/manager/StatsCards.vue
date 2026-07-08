<script setup>
// 관리자 통계 카드 묶음 — APTeN StatsCards 패턴을 GMS 디자인 토큰으로 이식
// stats: [{ label, value, unit, desc, tone(success|warning|danger|info|default), icon(teams|course|caddie|cart|alert), progress(0~100) }]
defineProps({
  stats: { type: Array, default: () => [] },
})

// 아이콘은 의존성 없이 인라인 SVG path로 관리한다
const ICON_PATHS = {
  teams:  'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  course: 'M3 21h18M6 21V8l6-4 6 4v13M10 21v-6h4v6',
  caddie: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  cart:   'M5 17h-2v-6l2-5h9l4 5h3v6h-2M7 17a2 2 0 104 0M15 17a2 2 0 104 0',
  alert:  'M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  check:  'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3',
}
</script>

<template>
  <div class="stats-grid">
    <div v-for="(item, i) in stats" :key="i" class="stat-card" :class="item.tone && `stat-card--${item.tone}`">
      <div class="stat-card__main">
        <span class="stat-card__label">{{ item.label }}</span>
        <span class="stat-card__value">
          {{ item.value }}<span v-if="item.unit" class="stat-card__unit">{{ item.unit }}</span>
        </span>
        <div v-if="item.progress !== undefined" class="stat-card__progress">
          <div class="stat-card__progress-fill" :style="{ width: `${Math.min(item.progress, 100)}%` }" />
        </div>
        <span v-if="item.desc" class="stat-card__desc" :class="item.tone && `is-${item.tone}`">{{ item.desc }}</span>
      </div>
      <div v-if="item.icon" class="stat-card__icon" :class="item.tone && `is-${item.tone}`">
        <svg viewBox="0 0 24 24" fill="none">
          <path :d="ICON_PATHS[item.icon]" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: var(--space-16);
}

.stat-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-12);
  min-height: 128px;
  padding: var(--space-20) var(--space-24);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-12);
}

.stat-card--danger  { border-color: var(--color-danger);  }
.stat-card--warning { border-color: var(--color-warning); }

.stat-card__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.stat-card__label {
  font-size: var(--font-size-detail);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.stat-card__value {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.stat-card--danger .stat-card__value { color: var(--color-danger); }

.stat-card__unit {
  margin-left: 3px;
  font-size: var(--font-size-detail);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.stat-card__desc {
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
}

.stat-card__desc.is-success { color: var(--color-success); }
.stat-card__desc.is-warning { color: var(--color-warning); }
.stat-card__desc.is-danger  { color: var(--color-danger);  }
.stat-card__desc.is-info    { color: var(--color-info);    }

.stat-card__progress {
  width: 100%;
  height: 6px;
  margin: var(--space-4) 0;
  border-radius: 3px;
  background: var(--color-bg-disabled);
  overflow: hidden;
}

.stat-card__progress-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--manager-primary);
  transition: width 0.4s ease;
}

.stat-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
  background: var(--manager-primary-light);
  color: var(--manager-primary);
}

.stat-card__icon.is-success { background: var(--color-success-bg); color: var(--color-success); }
.stat-card__icon.is-warning { background: var(--color-warning-bg); color: var(--color-warning); }
.stat-card__icon.is-danger  { background: var(--color-danger-bg);  color: var(--color-danger);  }
.stat-card__icon.is-info    { background: var(--color-info-bg);    color: var(--color-info);    }

.stat-card__icon svg {
  width: 20px;
  height: 20px;
}
</style>
