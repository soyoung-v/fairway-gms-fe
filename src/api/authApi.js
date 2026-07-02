import apiClient from './apiClient'

// 로그인 — 성공 시 at/rt HttpOnly 쿠키가 Set-Cookie로 설정된다
export function login(email, password) {
  return apiClient.post('/api/auth/login', { email, password })
}

// 로그아웃 — at/rt 쿠키를 서버에서 만료시킨다
export function logout() {
  return apiClient.post('/api/auth/logout')
}

// 내 계정 정보 조회 — 승인 대기 화면 폴링에서 상태 확인에 사용한다
export function getMyInfo() {
  return apiClient.get('/api/auth/me').then(res => res.data?.data)
}

// 이메일 중복 확인 — 회원가입 폼에서 이메일 입력 직후 호출한다
export function checkEmail(email) {
  return apiClient.get('/api/auth/check-email', { params: { email } })
    .then(res => res.data?.data)
}

// Manager 회원가입
export function signupManager(payload) {
  return apiClient.post('/api/auth/signup/manager', payload)
}

// Caddy 회원가입
export function signupCaddy(payload) {
  return apiClient.post('/api/auth/signup/caddy', payload)
}

// 비밀번호 변경 — 현재 비밀번호 검증 후 새 비밀번호로 교체한다
export function changePassword({ currentPassword, newPassword }) {
  return apiClient.patch('/api/auth/me/password', { currentPassword, newPassword }).then(res => res.data?.data)
}

// 비밀번호 재설정 요청
export function requestPasswordReset(email) {
  return apiClient.post('/api/auth/password-reset/request', { email })
}

// 비밀번호 재설정 확인
export function confirmPasswordReset(payload) {
  return apiClient.post('/api/auth/password-reset/confirm', payload)
}

export default {
  login,
  logout,
  getMyInfo,
  checkEmail,
  signupManager,
  signupCaddy,
  changePassword,
  requestPasswordReset,
  confirmPasswordReset,
}
