import '@/assets/styles/variables.css'
import '@/assets/styles/base.css'
import '@/assets/styles/utilities.css'
import '@/assets/styles/manager-polish.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/useAuthStore'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)

// 앱 초기화 시 localStorage에서 인증 정보를 복원한다
const authStore = useAuthStore()
authStore.restoreAuth()

app.mount('#app')
