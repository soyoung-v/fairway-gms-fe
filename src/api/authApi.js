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

// 회원가입 — role(MANAGER/CADDY)로 Manager/Caddy를 구분한다. 단일 엔드포인트 사용.
export function signup(payload) {
  return apiClient.post('/api/auth/signup', payload)
}

// Manager 회원가입 — role=MANAGER 고정
export function signupManager(payload) {
  return signup({ ...payload, role: 'MANAGER' })
}

// Caddy 회원가입 — role=CADDY 고정
export function signupCaddy(payload) {
  return signup({ ...payload, role: 'CADDY' })
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
  signup,
  signupManager,
  signupCaddy,
  changePassword,
  requestPasswordReset,
  confirmPasswordReset,
}
