import apiClient from './apiClient'

// ─────────────────────────────────────────────────────────────────────────────
// 캐디피 정책 — /api/settlement/fee-policies
// ─────────────────────────────────────────────────────────────────────────────

// 캐디피 정책 조회 — SecurityContext 골프장 기준 (API-602)
export function getFeePolicy() {
  return apiClient.get('/api/settlement/fee-policies').then(res => res.data?.data)
}

// 캐디피 정책 등록/수정 — PUT 전체 덮어쓰기 (API-601)
// halfBackType: SINGLE | ONE_AND_HALF | DOUBLE, noShowPolicy: NONE | HALF | FULL
export function upsertFeePolicy({ fullRoundFee, halfRoundFee, halfBackType, noShowPolicy, noShowFee }) {
  return apiClient.put('/api/settlement/fee-policies', { fullRoundFee, halfRoundFee, halfBackType, noShowPolicy, noShowFee }).then(res => res.data?.data)
}

// 우천취소 캐디피 계산 (API-603)
export function calculateRainCancellationFee({ assignmentId, playedHoleCount }) {
  return apiClient.post('/api/settlement/fee-policies/rain-cancellation/calculate', { assignmentId, playedHoleCount }).then(res => res.data?.data)
}

// 노쇼 캐디피 계산 (API-604)
export function calculateNoShowFee(assignmentId) {
  return apiClient.post('/api/settlement/fee-policies/no-show/calculate', { assignmentId }).then(res => res.data?.data)
}

// ─────────────────────────────────────────────────────────────────────────────
// 월별 정산 — /api/settlement/monthly
// ─────────────────────────────────────────────────────────────────────────────

// 캐디별 근무횟수 집계 — yearMonth: 'YYYY-MM' (API-606)
export function getRoundSummary(yearMonth) {
  return apiClient.get('/api/settlement/monthly/rounds', { params: { yearMonth } }).then(res => res.data?.data)
}

// 캐디별 수입 집계 (API-607)
export function getIncomeSummary(yearMonth) {
  return apiClient.get('/api/settlement/monthly/income', { params: { yearMonth } }).then(res => res.data?.data)
}

// 캐디피 수동 조정 — reason 필수 (API-605)
export function adjustCaddieFee(caddieId, { yearMonth, adjustedFee, reason }) {
  return apiClient.patch(`/api/settlement/caddies/${caddieId}/fee`, { yearMonth, adjustedFee, reason }).then(res => res.data?.data)
}

// 월 마감 확정 (API-608)
export function confirmMonth(yearMonth) {
  return apiClient.post(`/api/settlement/monthly/${yearMonth}/confirm`).then(res => res.data?.data)
}

// 월 마감 확정 취소 — Admin 전용 (API-609)
export function cancelConfirmMonth(yearMonth) {
  return apiClient.delete(`/api/settlement/monthly/${yearMonth}/confirm`).then(res => res.data?.data)
}

// ─────────────────────────────────────────────────────────────────────────────
// 정산 이력 / 내보내기
// ─────────────────────────────────────────────────────────────────────────────

// 정산 변경 이력 조회 (API-612)
export function getSettlementHistory({ yearMonth, caddieId, page = 0, size = 20 } = {}) {
  const params = { yearMonth, page, size }
  if (caddieId) params.caddieId = caddieId
  return apiClient.get('/api/settlement/history', { params }).then(res => res.data?.data)
}

// 정산 자료 엑셀 다운로드 — 캐디별 일수/횟수/캐디피/조정액 (API-611)
export function downloadSettlementExcel(yearMonth) {
  return apiClient.get('/api/settlement/excel', { params: { yearMonth }, responseType: 'blob' })
}

// 과세자료 관리대장 엑셀 다운로드 — 국세청 제출 양식 (API-610)
export function downloadInsuranceExcel(yearMonth) {
  return apiClient.get('/api/settlement/insurance/export', { params: { yearMonth }, responseType: 'blob' })
}

export default {
  getFeePolicy,
  upsertFeePolicy,
  calculateRainCancellationFee,
  calculateNoShowFee,
  getRoundSummary,
  getIncomeSummary,
  adjustCaddieFee,
  confirmMonth,
  cancelConfirmMonth,
  getSettlementHistory,
  downloadSettlementExcel,
  downloadInsuranceExcel,
}
