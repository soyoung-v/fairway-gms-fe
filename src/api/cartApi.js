import apiClient from './apiClient'

// 카트 목록 조회 — status 파라미터(AVAILABLE/IN_USE/MAINTENANCE/DISABLED)로 필터링 가능 (API-209)
export function getCarts(golfCourseId, { status } = {}) {
  const params = {}
  if (status && status !== 'ALL') params.status = status
  return apiClient.get(`/api/golf-course/golf-courses/${golfCourseId}/carts`, { params }).then(res => res.data?.data)
}

// 카트 등록 — cartNumber/cartType(ELECTRIC|MANUAL) 필수 (API-208)
export function createCart(golfCourseId, { cartNumber, cartType }) {
  return apiClient.post(`/api/golf-course/golf-courses/${golfCourseId}/carts`, { cartNumber, cartType }).then(res => res.data?.data)
}

// 카트 정보 수정 — cartNumber/cartType/note (API-210)
export function updateCart(cartId, { cartNumber, cartType, note }) {
  return apiClient.patch(`/api/golf-course/carts/${cartId}`, { cartNumber, cartType, note }).then(res => res.data?.data)
}

// 카트 상태 변경 — AVAILABLE/MAINTENANCE/DISABLED만 허용, IN_USE는 배정 시스템 자동 처리 (API-211)
export function updateCartStatus(cartId, status) {
  return apiClient.patch(`/api/golf-course/carts/${cartId}/status`, { status }).then(res => res.data?.data)
}

// 카트 반납 — IN_USE → AVAILABLE 처리, 배정 도메인 이벤트 연동 예정 (API-212)
export function returnCart(cartId) {
  return apiClient.patch(`/api/golf-course/carts/${cartId}/return`).then(res => res.data?.data)
}

export default { getCarts, createCart, updateCart, updateCartStatus, returnCart }
