<script setup>
// 404 — 존재하지 않는 경로. 로그인 역할에 맞는 홈으로 안내한다.
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'

const router = useRouter()
const auth = useAuthStore()

// 역할별 홈 경로/라벨 (라우터 가드 규칙과 동일)
const homePath = computed(() => {
  if (auth.isCaddy) return '/caddy'
  if (auth.isManager || auth.isAdmin) return '/admin/dashboard'
  return '/login'
})
const homeLabel = computed(() => {
  if (auth.isCaddy) return '캐디 홈으로'
  if (auth.isManager || auth.isAdmin) return '대시보드로'
  return '로그인으로'
})

function goHome() { router.push(homePath.value) }
function goBack() { router.back() }
</script>

<template>
  <div class="notfound">
    <div class="notfound__card">
      <div class="notfound__code">404</div>
      <h1 class="notfound__title">페이지를 찾을 수 없습니다</h1>
      <p class="notfound__desc">요청하신 페이지가 없거나 주소가 변경되었어요.</p>
      <div class="notfound__actions">
        <button class="nf-btn nf-btn--primary" @click="goHome">{{ homeLabel }}</button>
        <button class="nf-btn nf-btn--ghost" @click="goBack">이전 페이지</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notfound {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--color-bg-page);
}
.notfound__card {
  width: 100%;
  max-width: 420px;
  text-align: center;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 3rem 2rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}
.notfound__code {
  font-size: 5rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 2px;
  color: var(--color-border-focus);
}
.notfound__title {
  margin: 1rem 0 0.5rem;
  font-size: 1.25rem;
  color: var(--color-text-primary);
}
.notfound__desc {
  margin: 0 0 1.75rem;
  font-size: 0.95rem;
  color: var(--color-text-secondary);
}
.notfound__actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.nf-btn {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity 0.15s ease;
}
.nf-btn:hover { opacity: 0.9; }
.nf-btn--primary {
  background: var(--color-border-focus);
  color: var(--color-text-inverse);
}
.nf-btn--ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}
</style>
