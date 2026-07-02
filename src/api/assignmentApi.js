import apiClient from './apiClient'

// ─────────────────────────────────────────────────────────────────────────────
// 캐디 배정 — /api/assignment
// ─────────────────────────────────────────────────────────────────────────────

// 일일 배정 목록 조회 — AssignmentRes에 teamName/teeTime/courseName 포함 (API-511)
export function getDailyAssignments({ assignmentDate, golfCourseId } = {}) {
  const params = { assignmentDate }
  if (golfCourseId) params.golfCourseId = golfCourseId
  return apiClient.get('/api/assignment/schedules/daily', { params }).then(res => res.data?.data)
}

// 코스별 배정표 조회 — courseId 필수 (API-512)
export function getAssignmentsByCourse({ assignmentDate, courseId, golfCourseId } = {}) {
  const params = { assignmentDate, courseId }
  if (golfCourseId) params.golfCourseId = golfCourseId
  return apiClient.get('/api/assignment/schedules/by-course', { params }).then(res => res.data?.data)
}

// 날짜 기준 배정표 조회 — 페이지 새로고침 시 scheduleId 없이 date로 복구
export function getScheduleByDate(scheduleDate) {
  return apiClient.get('/api/assignment/schedules', { params: { scheduleDate } }).then(res => res.data?.data)
}

// 자동배정 실행 — periodId 기준 지정캐디→당번→순번 순서로 배정 (API-501)
export function autoAssign({ assignmentDate, periodId, groupIds = [] }) {
  return apiClient.post('/api/assignment/auto', { assignmentDate, periodId, groupIds }).then(res => res.data?.data)
}

// 수동배정 — 예약팀 + 캐디 직접 지정 (API-503)
export function manualAssign({ reservationTeamId, caddieId, isLocked = false, isHalfBack = false, reason = '' }) {
  return apiClient.post('/api/assignment/manual', { reservationTeamId, caddieId, isLocked, isHalfBack, reason }).then(res => res.data?.data)
}

// 재배정 — 캐디 변경, 이력 자동 저장 (API-504)
export function reassign(assignmentId, { newCaddieId, reason = '' }) {
  return apiClient.patch(`/api/assignment/${assignmentId}/caddie`, { newCaddieId, reason }).then(res => res.data?.data)
}

// 배정 취소 — reason 선택 (API-505)
export function cancelAssignment(assignmentId, reason = '') {
  return apiClient.delete(`/api/assignment/${assignmentId}`, { data: { reason } }).then(res => res.data?.data)
}

// 지정 캐디 잠금 강제 해제 — reason 필수 (API-507)
export function unlockAssignment(assignmentId, reason) {
  return apiClient.patch(`/api/assignment/${assignmentId}/lock/release`, { reason }).then(res => res.data?.data)
}

// 배정 교환 — 두 배정의 캐디를 서로 맞바꿈 (API-506)
export function swapAssignments({ assignmentId1, assignmentId2, reason = '' }) {
  return apiClient.post('/api/assignment/swap', { assignmentId1, assignmentId2, reason }).then(res => res.data?.data)
}

// 단건 배정 완료 처리 (API-515)
export function completeAssignment(assignmentId) {
  return apiClient.patch(`/api/assignment/${assignmentId}/complete`).then(res => res.data?.data)
}

// 미배정 팀 목록 조회 (API-510)
export function getUnassignedTeams({ assignmentDate, golfCourseId } = {}) {
  const params = { assignmentDate }
  if (golfCourseId) params.golfCourseId = golfCourseId
  return apiClient.get('/api/assignment/unassigned', { params }).then(res => res.data?.data)
}

// 배정 변경 이력 조회 — caddieId 선택 필터 (API-517)
export function getHistory({ assignmentDate, caddieId, golfCourseId } = {}) {
  const params = { assignmentDate }
  if (caddieId) params.caddieId = caddieId
  if (golfCourseId) params.golfCourseId = golfCourseId
  return apiClient.get('/api/assignment/history', { params }).then(res => res.data?.data)
}

// ─────────────────────────────────────────────────────────────────────────────
// 배정표 관리 — /api/assignment/schedules
// ─────────────────────────────────────────────────────────────────────────────

// 배정표 생성 (DRAFT 상태)
export function createSchedule(scheduleDate) {
  return apiClient.post('/api/assignment/schedules', { scheduleDate }).then(res => res.data?.data)
}

// 배정표 확정 (API-513)
export function confirmSchedule(scheduleId) {
  return apiClient.post(`/api/assignment/schedules/${scheduleId}/confirm`).then(res => res.data?.data)
}

// 배정표 확정 취소 (API-514)
export function cancelConfirmSchedule(scheduleId) {
  return apiClient.delete(`/api/assignment/schedules/${scheduleId}/confirm`).then(res => res.data?.data)
}

// 배정표 완료 처리 — AssignmentCompletedEvent 발행
export function completeSchedule(scheduleId) {
  return apiClient.post(`/api/assignment/schedules/${scheduleId}/complete`).then(res => res.data?.data)
}

// ─────────────────────────────────────────────────────────────────────────────
// 카트 배정 — /api/assignment/carts
// ─────────────────────────────────────────────────────────────────────────────

// 카트 배정 목록 조회
export function getCartAssignments({ assignmentDate, golfCourseId } = {}) {
  const params = { assignmentDate }
  if (golfCourseId) params.golfCourseId = golfCourseId
  return apiClient.get('/api/assignment/carts', { params }).then(res => res.data?.data)
}

// 카트 수동 배정
export function assignCart({ cartId, teeTimeId, assignmentDate }) {
  return apiClient.post('/api/assignment/carts', { cartId, teeTimeId, assignmentDate }).then(res => res.data?.data)
}

// 카트 자동 배정 — assignmentDate: query param (API-520)
export function autoAssignCarts(assignmentDate) {
  return apiClient.post('/api/assignment/carts/auto', null, { params: { assignmentDate } }).then(res => res.data?.data)
}

// 카트 수동 변경 (API-521)
export function changeCart(cartAssignmentId, newCartId) {
  return apiClient.patch(`/api/assignment/carts/${cartAssignmentId}`, { newCartId }).then(res => res.data?.data)
}

// 카트 반납 — IN_PROGRESS → RETURNED
export function returnCartAssignment(cartAssignmentId) {
  return apiClient.patch(`/api/assignment/carts/${cartAssignmentId}/return`).then(res => res.data?.data)
}

// 카트 배정 취소
export function cancelCartAssignment(cartAssignmentId) {
  return apiClient.delete(`/api/assignment/carts/${cartAssignmentId}`).then(res => res.data?.data)
}

export default {
  getDailyAssignments,
  getAssignmentsByCourse,
  getScheduleByDate,
  autoAssign,
  manualAssign,
  reassign,
  cancelAssignment,
  unlockAssignment,
  swapAssignments,
  completeAssignment,
  getUnassignedTeams,
  getHistory,
  createSchedule,
  confirmSchedule,
  cancelConfirmSchedule,
  completeSchedule,
  getCartAssignments,
  assignCart,
  autoAssignCarts,
  changeCart,
  returnCartAssignment,
  cancelCartAssignment,
}
