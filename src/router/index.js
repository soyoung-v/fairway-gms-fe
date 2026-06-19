import { createRouter, createWebHistory } from 'vue-router'

// 라우트 분리 파일은 구현 단계에서 순차 추가
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [],
})

export default router
