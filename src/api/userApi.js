import apiClient from './apiClient'

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN 전용 — 사용자 계정 관리 (/api/admin/users)
// ─────────────────────────────────────────────────────────────────────────────

// 전체 사용자 목록 조회 — status 없으면 전체, 있으면 필터 (PENDING/ACTIVE/REJECTED/WITHDRAWN)
export function getUsers({ status } = {}) {
  const params = {}
  if (status && status !== 'ALL') params.status = status
  return apiClient.get('/api/admin/users', { params }).then(res => res.data?.data)
}

// 승인 대기 사용자 목록 조회 — MANAGER + CADDY 포함, role 필드로 구분
export function getPendingUsers() {
  return apiClient.get('/api/admin/users/pending').then(res => res.data?.data)
}

// 사용자 가입 승인 (Admin 전용) — CADDY 승인 시 캐디 프로필 + 근무패턴 자동 생성
export function approveUser(userId) {
  return apiClient.patch(`/api/admin/users/${userId}/approve`).then(res => res.data?.data)
}

// 사용자 가입 거절 (Admin 전용)
export function rejectUser(userId) {
  return apiClient.patch(`/api/admin/users/${userId}/reject`).then(res => res.data?.data)
}

// Manager 퇴사 처리 (Admin 전용) — ACTIVE Manager만 처리 가능
export function withdrawManager(userId) {
  return apiClient.patch(`/api/admin/users/${userId}/withdraw`).then(res => res.data?.data)
}

// ─────────────────────────────────────────────────────────────────────────────
// Manager 전용 — 캐디 계정 승인 관리 (/api/manager/users)
// ─────────────────────────────────────────────────────────────────────────────

// 자기 골프장 소속 캐디 승인 대기 목록 조회
export function getPendingCaddies() {
  return apiClient.get('/api/manager/users/pending').then(res => res.data?.data)
}

// 자기 골프장 소속 캐디 계정 승인 — 캐디 프로필 + 근무패턴 자동 생성
export function approveCaddie(userId) {
  return apiClient.patch(`/api/manager/users/${userId}/approve-caddie`).then(res => res.data?.data)
}

// 자기 골프장 소속 캐디 계정 거절 — 백엔드 현재 reason 미처리
export function rejectCaddie(userId) {
  return apiClient.patch(`/api/manager/users/${userId}/reject-caddie`).then(res => res.data?.data)
}

// ─────────────────────────────────────────────────────────────────────────────
// 이전 함수명 호환 alias
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated getUsers() 사용 */
export const getManagers = getUsers

/** @deprecated approveUser() 사용 */
export const approveManager = approveUser

/** @deprecated rejectUser() 사용 */
export const rejectManager = rejectUser

export default {
  getUsers,
  getPendingUsers,
  approveUser,
  rejectUser,
  withdrawManager,
  getPendingCaddies,
  approveCaddie,
  rejectCaddie,
  getManagers,
  approveManager,
  rejectManager,
}
