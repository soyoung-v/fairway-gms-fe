<script setup>
// 배정 상세 (UI-C003) — Caddy 전용
// API-519 /api/assignment/me/{assignmentId} — 팀 명단/카트/메모 포함 상세
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getMyAssignmentDetail } from '@/api/assignmentApi'
import BaseLoading from '@/components/common/BaseLoading.vue'

const route  = useRoute()
const router = useRouter()

const assignmentId = Number(route.params.assignmentId)

const assignment = ref(null)
const loading    = ref(false)
const error      = ref('')

const STATUS_LABEL = {
  CONFIRMED:   '배정 확정',
  IN_PROGRESS: '진행 중',
  COMPLETED:   '완료',
  CANCELLED:   '취소',
}
const STATUS_CLASS = {
  CONFIRMED:   'badge--info',
  IN_PROGRESS: 'badge--primary',
  COMPLETED:   'badge--success',
  CANCELLED:   'badge--muted',
}

onMounted(async () => {
  loading.value = true
  error.value   = ''
  try {
    assignment.value = await getMyAssignmentDetail(assignmentId)
    if (!assignment.value) error.value = '배정 정보를 찾을 수 없습니다.'
  } catch {
    error.value = '배정 정보를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="detail-view">
    <!-- 헤더 -->
    <div class="detail-header">
      <button class="back-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <h1 class="detail-title">배정 상세</h1>
    </div>

    <BaseLoading v-if="loading" />
    <p v-else-if="error" class="page-error">{{ error }}</p>

    <template v-else-if="assignment">
      <div class="info-card">
        <!-- 팀명 + 상태 -->
        <div class="info-top">
          <span class="team-name">{{ assignment.teamName }}</span>
          <span class="badge" :class="STATUS_CLASS[assignment.status]">
            {{ STATUS_LABEL[assignment.status] ?? assignment.status }}
          </span>
        </div>

        <!-- 상세 항목 -->
        <div class="detail-rows">
          <div class="detail-row">
            <span class="detail-label">티타임</span>
            <span class="detail-value">{{ assignment.teeTime?.slice(0, 5) ?? '—' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">코스</span>
            <span class="detail-value">{{ assignment.courseName ?? '—' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">배정일</span>
            <span class="detail-value">{{ assignment.assignmentDate ?? '—' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">인원</span>
            <span class="detail-value">{{ assignment.playerCount != null ? `${assignment.playerCount}명` : '—' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">카트</span>
            <span class="detail-value">{{ assignment.cartNumber ?? '미배정' }}</span>
          </div>
          <div v-if="assignment.playerNames" class="detail-row">
            <span class="detail-label">명단</span>
            <span class="detail-value">{{ assignment.playerNames }}</span>
          </div>
          <div v-if="assignment.memo" class="detail-row">
            <span class="detail-label">메모</span>
            <span class="detail-value">{{ assignment.memo }}</span>
          </div>
          <div v-if="assignment.isVip" class="detail-row">
            <span class="detail-label">유형</span>
            <span class="detail-value tag-badge">VIP</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
  padding: var(--space-16);
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px) + var(--space-16));
}

.detail-header {
  display: flex;
  align-items: center;
  gap: var(--space-12);
  padding: var(--space-4) 0;
}

.back-btn {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  color: var(--color-text-primary);
  -webkit-tap-highlight-color: transparent;
}

.detail-title {
  font-size: var(--font-size-body);
  font-weight: 700;
  color: var(--color-text-primary);
}

.page-error {
  color: var(--color-danger); font-size: var(--font-size-body-sm);
  padding: var(--space-12); background: var(--color-danger-bg); border-radius: var(--radius-8);
}

.info-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-12);
  padding: var(--space-20);
  display: flex; flex-direction: column; gap: var(--space-16);
}

.info-top {
  display: flex; align-items: center; justify-content: space-between;
}

.team-name { font-size: 20px; font-weight: 700; color: var(--color-text-primary); }

.badge {
  font-size: var(--font-size-detail); font-weight: 600;
  padding: 2px 8px; border-radius: var(--radius-4);
}
.badge--info    { background: #e0f0ff; color: #0066cc; }
.badge--primary { background: var(--caddy-primary-bg, #e8f5e9); color: var(--caddy-primary); }
.badge--success { background: var(--color-success-bg); color: var(--color-success); }
.badge--muted   { background: var(--color-bg-page); color: var(--color-text-secondary); border: 1px solid var(--color-border); }

.detail-rows {
  display: flex; flex-direction: column; gap: var(--space-12);
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-16);
}

.detail-row {
  display: flex; align-items: center; gap: var(--space-12);
  font-size: var(--font-size-body-sm);
}

.detail-label { min-width: 64px; color: var(--color-text-secondary); font-weight: 500; }
.detail-value { color: var(--color-text-primary); font-weight: 500; }

.tag-badge {
  font-size: var(--font-size-detail); padding: 2px 6px; border-radius: var(--radius-4);
  background: var(--color-warning-bg, #fff8e1); color: var(--color-warning); font-weight: 500;
}

.gap-notice {
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
  padding: var(--space-10) var(--space-12);
  background: var(--color-bg-page);
  border-radius: var(--radius-8);
  border: 1px dashed var(--color-border);
  line-height: 1.5;
}
</style>
