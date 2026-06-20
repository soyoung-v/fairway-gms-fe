import apiClient from './apiClient'

// Manager 계정 목록 조회 — status 필터 없으면 전체 반환 (Admin 전용)
export function getManagers({ status, page = 0, size = 20 } = {}) {
  const params = { page, size }
  if (status) params.status = status
  return apiClient.get('/api/auth/managers', { params }).then(res => res.data?.data)
}

// 승인 대기 Caddy 목록 조회 (Admin, Manager 공용)
export function getPendingCaddies({ page = 0, size = 20 } = {}) {
  return apiClient.get('/api/auth/caddies/pending', { params: { page, size } }).then(res => res.data?.data)
}

// Manager 가입 승인 (Admin 전용)
export function approveManager(userId) {
  return apiClient.patch(`/api/auth/managers/${userId}/approve`).then(res => res.data?.data)
}

// Manager 가입 거절 (Admin 전용) — reason 필수
export function rejectManager(userId, reason) {
  return apiClient.patch(`/api/auth/managers/${userId}/reject`, { reason }).then(res => res.data?.data)
}

// Manager 퇴사 처리 (Admin 전용) — ACTIVE Manager만 처리 가능
export function withdrawManager(userId) {
  return apiClient.patch(`/api/admin/users/${userId}/withdraw`).then(res => res.data?.data)
}

export default {
  getManagers,
  getPendingCaddies,
  approveManager,
  rejectManager,
  withdrawManager,
}
