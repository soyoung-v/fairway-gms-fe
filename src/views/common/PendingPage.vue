<script setup>
// 승인 대기(PENDING) / 거절(REJECTED) 안내 화면 — AuthLayout에서 렌더링한다
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { useRouter } from 'vue-router'
import authApi from '@/api/authApi'

const authStore = useAuthStore()
const router    = useRouter()

const isRejected = computed(() => authStore.status === 'REJECTED')
const userName   = computed(() => authStore.name || '사용자')

// 폴링 설정 — 3초 간격, 최대 10회(약 30초)
// 계정 자동 처리가 비동기로 진행되어 로그인 직후 PENDING일 수 있으므로 주기적으로 확인한다
const POLL_INTERVAL_MS = 3000
const MAX_POLL_COUNT   = 10
let pollIntervalId  = null
let pollCount       = 0
let pollingFinished = false

// 최대 폴링 횟수 도달 후 페이지 새로고침 안내를 표시한다
const showRefreshGuide = ref(false)

// store와 localStorage를 함께 갱신한다
// authStore.setStatus가 _persist()를 호출하므로 양쪽에 반영된다
function applyStatus(newStatus) {
  authStore.setStatus(newStatus)
}

function stopPolling() {
  pollingFinished = true
  if (pollIntervalId !== null) {
    clearInterval(pollIntervalId)
    pollIntervalId = null
  }
}

async function pollStatus() {
  pollCount += 1
  try {
    const info   = await authApi.getMyInfo()
    const status = info?.status

    if (status === 'ACTIVE') {
      // 승인 완료 → store 갱신 후 역할별 홈으로 이동
      applyStatus(status)
      stopPolling()
      const homePath = authStore.userRole === 'CADDY' ? '/caddy' : '/admin/dashboard'
      router.push(homePath)
      return
    }

    if (status === 'REJECTED') {
      // 거절 확정 → 폴링 중단, 거절 화면으로 전환
      applyStatus(status)
      stopPolling()
      return
    }
  } catch {
    // 일시적 오류는 다음 주기에 재시도
  }

  // 최대 횟수 도달 → 폴링 중단 후 새로고침 안내 표시
  if (pollCount >= MAX_POLL_COUNT) {
    stopPolling()
    showRefreshGuide.value = true
  }
}

onMounted(async () => {
  // 마운트 즉시 1회 조회 — 이미 승인 완료면 바로 이동한다
  await pollStatus()
  if (!pollingFinished) {
    pollIntervalId = setInterval(pollStatus, POLL_INTERVAL_MS)
  }
})

onUnmounted(() => {
  // 컴포넌트 해제 시 폴링을 반드시 중단한다 — 메모리 누수 방지
  stopPolling()
})

async function handleLogout() {
  // 로그아웃 전 역할을 먼저 확인해야 한다 — logout() 후에는 role이 초기화된다
  const isCaddy = authStore.isCaddy
  await authStore.logout()
  router.replace(isCaddy ? '/caddy/login' : '/login')
}
</script>

<template>
  <div class="pending-page">
    <!-- 로고 -->
    <div class="pending-page__logo">FairwayGMS</div>

    <!-- 상태 아이콘 (PENDING: 회전 시계, REJECTED: X 아이콘) -->
    <div class="pending-page__icon-wrap">
      <svg
        class="pending-page__icon"
        :class="{ 'pending-page__icon--spin': !isRejected }"
        viewBox="0 0 64 64"
        fill="none"
      >
        <template v-if="!isRejected">
          <circle cx="32" cy="32" r="30" stroke="var(--color-warning)"
                  stroke-width="2.5" stroke-dasharray="6 4" opacity="0.4"/>
          <circle cx="32" cy="32" r="22" fill="var(--color-warning-bg)"/>
          <path d="M32 20v12l7 4" stroke="var(--color-warning)"
                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </template>
        <template v-else>
          <circle cx="32" cy="32" r="30" stroke="var(--color-danger)"
                  stroke-width="2.5" opacity="0.3"/>
          <circle cx="32" cy="32" r="22" fill="var(--color-danger-bg)"/>
          <path d="M24 24l16 16M40 24L24 40" stroke="var(--color-danger)"
                stroke-width="2.5" stroke-linecap="round"/>
        </template>
      </svg>
    </div>

    <!-- 상태 안내 -->
    <div class="pending-page__content">
      <h1 class="pending-page__title">
        {{ isRejected ? '승인 거절' : '승인 대기 중' }}
      </h1>
      <p class="pending-page__desc">
        <template v-if="isRejected">
          <strong>{{ userName }}</strong>님의 가입 신청이 거절되었습니다.<br>
          정보를 확인한 뒤 다시 가입해 주세요.
        </template>
        <template v-else>
          <strong>{{ userName }}</strong>님의 가입 신청이 접수되었습니다.<br>
          관리자 승인 후 서비스를 이용하실 수 있습니다.
        </template>
      </p>
    </div>

    <!-- 내 정보 카드 -->
    <div class="pending-page__info-card">
      <div class="pending-page__info-row">
        <span class="pending-page__info-label">이름</span>
        <span class="pending-page__info-value">{{ userName }}</span>
      </div>
      <div class="pending-page__info-row">
        <span class="pending-page__info-label">상태</span>
        <span
          class="pending-page__info-badge"
          :class="isRejected ? 'badge--danger' : 'badge--warning'"
        >
          {{ isRejected ? '승인 거절' : '승인 대기' }}
        </span>
      </div>
    </div>

    <!-- 하단 안내 -->
    <p class="pending-page__notice">
      <template v-if="showRefreshGuide">
        승인 확인에 시간이 걸리고 있습니다.<br>
        페이지를 새로고침하거나 잠시 후 다시 확인해 주세요.
      </template>
      <template v-else-if="isRejected">
        입력한 정보와 승인 기준이 일치하지 않습니다.<br>
        다시 가입하거나 관리자에게 문의해 주세요.
      </template>
      <template v-else>
        승인까지 1~2 영업일이 소요될 수 있습니다.<br>
        문의사항은 관리자에게 연락해 주세요.
      </template>
    </p>

    <button class="pending-page__logout" type="button" @click="handleLogout">
      로그아웃
    </button>
  </div>
</template>

<style scoped>
.pending-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-24);
  padding: var(--space-48) var(--space-24) var(--space-32);
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.pending-page__logo {
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--manager-primary);
  letter-spacing: 0.04em;
}

.pending-page__icon-wrap {
  width: 80px;
  height: 80px;
}

.pending-page__icon {
  width: 80px;
  height: 80px;
}

.pending-page__icon--spin {
  animation: pending-spin 3s linear infinite;
}

@keyframes pending-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.pending-page__title {
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--color-text-primary);
}

.pending-page__desc {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin-top: var(--space-8);
}

.pending-page__info-card {
  width: 100%;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-12);
  padding: var(--space-16) var(--space-20);
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
  text-align: left;
}

.pending-page__info-row {
  display: flex;
  align-items: center;
  gap: var(--space-16);
  font-size: var(--font-size-body-sm);
}

.pending-page__info-label {
  color: var(--color-text-secondary);
  min-width: 36px;
  flex-shrink: 0;
}

.pending-page__info-value {
  color: var(--color-text-primary);
  font-weight: 500;
}

.pending-page__info-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-8);
  border-radius: var(--radius-full);
  font-size: var(--font-size-detail);
  font-weight: 600;
}

.pending-page__notice {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.pending-page__logout {
  margin-top: var(--space-8);
  padding: var(--space-8) var(--space-24);
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  background: var(--color-bg-card);
  transition: background var(--transition-fast);
}

.pending-page__logout:hover {
  background: var(--color-bg-disabled);
}
</style>
