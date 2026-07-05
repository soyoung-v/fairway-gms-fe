<script setup>
// 로그인·회원가입·비밀번호 재설정에 사용하는 최소 레이아웃
// route.meta.authFull=true(캐디 로그인 등 자체 풀스크린 화면)이면 중앙정렬·배경 없이 그대로 통과시킨다
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div
    class="auth-layout"
    :class="{
      'auth-layout--full': route.meta.authFull,
      'auth-layout--admin': route.meta.adminLogin,
    }"
  >
    <RouterView />
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-page);
}

/* Admin 로그인 — 딥네이비 톤에 맞춘 연한 푸른 배경 */
.auth-layout--admin {
  background: linear-gradient(160deg, #eef2f9 0%, #e2e9f4 55%, #d7e0ef 100%);
}

/* 자체 풀스크린 화면 — 래퍼가 여백/배경을 만들지 않도록 투명하게 통과 */
.auth-layout--full {
  display: block;
  background: none;
}
</style>
