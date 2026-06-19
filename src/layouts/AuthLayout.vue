<script setup>
// 로그인·회원가입·비밀번호 재설정에 사용하는 최소 레이아웃
</script>

<template>
  <div class="auth-layout">
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
</style>
