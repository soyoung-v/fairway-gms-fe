import apiClient from './apiClient'

// ─────────────────────────────────────────────────────────────────────────────
// 캐디 관리 (Manager/Admin) — /api/caddie/caddies
// ─────────────────────────────────────────────────────────────────────────────

// 소속 골프장 캐디 전체 목록 조회 — keyword/status 필터, 페이지네이션 (API-302)
export function getCaddies({ keyword, status, page = 0, size = 20 } = {}) {
  const params = { page, size }
  if (keyword) params.keyword = keyword
  if (status)  params.status  = status
  return apiClient.get('/api/caddie/caddies', { params }).then(res => res.data?.data)
}

// 캐디 상세 조회 (API-303)
export function getCaddie(caddieId) {
  return apiClient.get(`/api/caddie/caddies/${caddieId}`).then(res => res.data?.data)
}

// 캐디 등록 — caddieNumber/name/phone/hireDate (API-301)
export function createCaddie({ caddieNumber, name, phone, hireDate }) {
  return apiClient.post('/api/caddie/caddies', { caddieNumber, name, phone, hireDate }).then(res => res.data?.data)
}

// 캐디 기본정보 수정 — caddieNumber/phone/hireDate (API-304)
export function updateCaddie(caddieId, { caddieNumber, phone, hireDate }) {
  return apiClient.patch(`/api/caddie/caddies/${caddieId}`, { caddieNumber, phone, hireDate }).then(res => res.data?.data)
}

// 캐디 상태 변경 — status: ACTIVE | ON_LEAVE | RESIGNED | EXCLUDED (API-305)
export function updateCaddieStatus(caddieId, status) {
  return apiClient.patch(`/api/caddie/caddies/${caddieId}/status`, { status }).then(res => res.data?.data)
}

// 캐디 퇴직 처리 — RESIGNED 상태 + 소프트 삭제 (caddie 도메인 API-305.5)
// 캐디 프로필 퇴직 처리 — 계정 탈퇴와 별개로 캐디 도메인에서 RESIGNED 상태로 변경
export function withdrawCaddie(caddieId) {
  return apiClient.patch(`/api/caddie/caddies/${caddieId}/withdraw`).then(res => res.data?.data)
}

// 가용 캐디 목록 조회 — 배정 가능한 캐디 + 대기순번 포함 (API-317)
export function getAvailableCaddies(assignmentDate) {
  return apiClient.get('/api/caddie/caddies/available', { params: { assignmentDate } }).then(res => res.data?.data)
}

// 근무 패턴 수정 — 모든 필드 optional, 전달된 필드만 업데이트 (API-310)
export function updateWorkPattern(caddieId, { canWeekday, canWeekend, periodLimit, isFirstWaitManual }) {
  return apiClient.patch(`/api/caddie/caddies/${caddieId}/work-pattern`, {
    canWeekday, canWeekend, periodLimit, isFirstWaitManual,
  }).then(res => res.data?.data)
}

// 라운딩 완료 처리 — completedAt: ISO datetime (API-314)
export function completeRound(caddieId, completedAt) {
  return apiClient.patch(`/api/caddie/caddies/${caddieId}/round-complete`, { completedAt }).then(res => res.data?.data)
}

// 캐디-계정 연동 — Caddy 회원계정(userId)을 캐디 레코드에 연결 (API-306)
export function linkAccount(caddieId, userId) {
  return apiClient.patch(`/api/caddie/caddies/${caddieId}/account`, { userId }).then(res => res.data?.data)
}

// ─────────────────────────────────────────────────────────────────────────────
// 지정 카트 (Manager) — /api/caddie/caddies
// ─────────────────────────────────────────────────────────────────────────────

// 골프장 전체 활성 지정카트 목록 조회 (API-309)
export function getDesignatedCarts() {
  return apiClient.get('/api/caddie/caddies/designated-carts').then(res => res.data?.data)
}

// 지정카트 등록/변경 — 기존 지정카트 자동 비활성화 후 신규 등록 (API-307)
export function setDesignatedCart(caddieId, cartId) {
  return apiClient.post(`/api/caddie/caddies/${caddieId}/designated-cart`, { cartId }).then(res => res.data?.data)
}

// 지정카트 해제 — 활성 지정카트 소프트 삭제 (API-308)
export function removeDesignatedCart(caddieId) {
  return apiClient.delete(`/api/caddie/caddies/${caddieId}/designated-cart`).then(res => res.data?.data)
}

// ─────────────────────────────────────────────────────────────────────────────
// 일별 현황 (Manager) — /api/caddie/daily-status
// ─────────────────────────────────────────────────────────────────────────────

// 날짜별 일별 현황 목록 조회 (API-317/3-2)
export function getDailyStatuses(statusDate) {
  return apiClient.get('/api/caddie/daily-status', { params: { statusDate } }).then(res => res.data?.data)
}

// 일별 현황 등록 — type: DAY_OFF|ABSENCE|DUTY|EARLY|SPECIAL|ASSIGN_EXCLUDED (API-315)
// DUTY 타입일 때 priority(FIRST|SECOND) 필수, SPECIAL일 때 note 권장
export function createDailyStatus({ caddieId, statusDate, type, priority = null, note = null }) {
  return apiClient.post('/api/caddie/daily-status', { caddieId, statusDate, type, priority, note }).then(res => res.data?.data)
}

// 일별 현황 삭제 — 소프트 삭제 (API-316)
export function deleteDailyStatus(statusId) {
  return apiClient.delete(`/api/caddie/daily-status/${statusId}`).then(res => res.data?.data)
}

// ─────────────────────────────────────────────────────────────────────────────
// 대기 순번 (Manager) — /api/caddie/queues
// ─────────────────────────────────────────────────────────────────────────────

// 날짜별 대기 순번 목록 조회 (API-311)
export function getQueues(queueDate) {
  return apiClient.get('/api/caddie/queues', { params: { queueDate } }).then(res => res.data?.data)
}

// 대기 순번 전체 초기화 — 캐디 번호 오름차순으로 1부터 재할당, 비관적 락 적용 (API-312)
export function initializeQueues(queueDate) {
  return apiClient.post('/api/caddie/queues/initialize', { queueDate }).then(res => res.data?.data)
}

// 특정 캐디 순번 수동 조정 — reason 필수, 중복 번호 불가 (API-313)
export function adjustQueue(caddieId, { queueDate, queueNumber, reason }) {
  return apiClient.patch(`/api/caddie/caddies/${caddieId}/queue`, { queueDate, queueNumber, reason }).then(res => res.data?.data)
}

// ─────────────────────────────────────────────────────────────────────────────
// 캐디 모바일 (CADDY 전용) — /api/caddie/me
// Manager/Admin 호출 시 403 응답
// ─────────────────────────────────────────────────────────────────────────────

// 내 기본정보 + 근무패턴 조회 (workPattern은 미등록 시 null)
export function getMyInfo() {
  return apiClient.get('/api/caddie/me').then(res => res.data?.data)
}

// 내 대기 순번 조회 — queueDate 생략 시 오늘 기준, 미등록 시 queueNumber: null
export function getMyQueue(queueDate) {
  const params = queueDate ? { queueDate } : {}
  return apiClient.get('/api/caddie/me/queue', { params }).then(res => res.data?.data)
}

// 내 운영 시간표 조회 — 부별 시작/종료시간 + 코스명 (API-320)
// 응답: [{ periodNumber, startTime, endTime, courseName }]
export function getMySchedule(targetDate) {
  const params = targetDate ? { targetDate } : {}
  return apiClient.get('/api/caddie/me/schedule', { params }).then(res => res.data?.data)
}

// ─────────────────────────────────────────────────────────────────────────────
// 캐디 그룹 (Manager) — /api/caddie/groups (ADR-005)
// ─────────────────────────────────────────────────────────────────────────────

// 그룹 목록 조회 — 첫 조회 시 "하우스캐디" 기본 그룹 자동 생성 (API-321)
// 응답: [{ groupId, name, assignmentType, assignmentTypeLabel, caddieCount }]
export function getCaddieGroups() {
  return apiClient.get('/api/caddie/groups').then(res => res.data?.data)
}

// 그룹 등록 — assignmentType: HOUSE | PRIORITY_FIRST | SESSION_FIXED (API-322)
export function createCaddieGroup({ name, assignmentType }) {
  return apiClient.post('/api/caddie/groups', { name, assignmentType }).then(res => res.data?.data)
}

// 그룹 수정 (API-323)
export function updateCaddieGroup(groupId, { name, assignmentType }) {
  return apiClient.patch(`/api/caddie/groups/${groupId}`, { name, assignmentType }).then(res => res.data?.data)
}

// 그룹 삭제 — 소속 캐디가 있으면 409 CADDIE_GROUP_HAS_CADDIES (API-324)
export function deleteCaddieGroup(groupId) {
  return apiClient.delete(`/api/caddie/groups/${groupId}`).then(res => res.data?.data)
}

// 캐디 그룹 지정/해제 — groupId=null이면 해제(자동배정 시 하우스 취급) (API-325)
export function assignCaddieGroup(caddieId, groupId) {
  return apiClient.patch(`/api/caddie/caddies/${caddieId}/group`, { groupId }).then(res => res.data?.data)
}

export default {
  // 캐디 관리
  getCaddies,
  getCaddie,
  createCaddie,
  updateCaddie,
  updateCaddieStatus,
  withdrawCaddie,
  getAvailableCaddies,
  updateWorkPattern,
  completeRound,
  linkAccount,
  // 지정카트
  getDesignatedCarts,
  setDesignatedCart,
  removeDesignatedCart,
  // 일별 현황
  getDailyStatuses,
  createDailyStatus,
  deleteDailyStatus,
  // 대기 순번
  getQueues,
  initializeQueues,
  adjustQueue,
  // 캐디 모바일
  getMyInfo,
  getMyQueue,
  getMySchedule,
  // 캐디 그룹
  getCaddieGroups,
  createCaddieGroup,
  updateCaddieGroup,
  deleteCaddieGroup,
  assignCaddieGroup,
}
