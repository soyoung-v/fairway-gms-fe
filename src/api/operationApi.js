import apiClient from './apiClient'

// ─────────────────────────────────────────────────────────────────────────────
// Operation 도메인 API — /api/operation/
// 권한: MANAGER 전용 (대시보드만 ADMIN+MANAGER 공용)
// ADMIN 호출 시 apiClient 인터셉터가 X-Selected-Golf-Course-Id 헤더를 자동 부착한다
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. 운영 설정 ─────────────────────────────────────────────────────────────

// 월별 운영 설정(부 시간표) 최초 등록 — 같은 월 중복 시 400
export function createOperationSetting({ yearMonth, periods }) {
  return apiClient.post('/api/operation/settings', { yearMonth, periods }).then(res => res.data?.data)
}

// 월별 운영 설정 조회 — yearMonth: 'YYYY-MM'
export function getOperationSetting(yearMonth) {
  return apiClient.get('/api/operation/settings', { params: { yearMonth } }).then(res => res.data?.data)
}

// 운영 설정 수정 — 변경할 부(period) 목록만 전달
export function updateOperationSetting(settingId, { periods }) {
  return apiClient.patch(`/api/operation/settings/${settingId}`, { periods }).then(res => res.data?.data)
}

// ── 2. 티타임 ─────────────────────────────────────────────────────────────────

// 운영 설정 기준 해당 월 전체 티타임 자동 생성 — 이미 존재하는 슬롯은 스킵
// courseId: null이면 전체 코스 생성
export function generateTeeTimes({ yearMonth, courseId = null }) {
  return apiClient.post('/api/operation/tee-times/generate', { yearMonth, courseId }).then(res => res.data?.data)
}

// 날짜별 티타임 목록 조회 — playDate 필수, courseId/periodNumber 선택
export function getTeeTimes({ playDate, courseId, periodNumber } = {}) {
  const params = { playDate }
  if (courseId) params.courseId = courseId
  if (periodNumber) params.periodNumber = periodNumber
  return apiClient.get('/api/operation/tee-times', { params }).then(res => res.data?.data)
}

// 티타임 수동 추가 — 자동 생성 외 특정 슬롯을 직접 추가
export function createTeeTime({ courseId, playDate, startTime, periodNumber }) {
  return apiClient.post('/api/operation/tee-times', { courseId, playDate, startTime, periodNumber }).then(res => res.data?.data)
}

// 티타임 마감 — OPEN → CLOSED 처리
export function closeTeeTime(teeTimeId) {
  return apiClient.patch(`/api/operation/tee-times/${teeTimeId}/close`).then(res => res.data?.data)
}

// 티타임 재생성 — 기존 슬롯 삭제 후 운영 설정 기준으로 다시 생성
// courseId 지정 시 해당 코스만, null이면 전체 재생성
export function regenerateTeeTimes({ yearMonth, courseId }) {
  return apiClient.post('/api/operation/tee-times/bulk-regenerate', { yearMonth, courseId }).then(res => res.data?.data)
}

// ── 3. 예약팀 ─────────────────────────────────────────────────────────────────

// 예약팀 등록 — teeTimeId 기준, memo 선택
export function createReservationTeam({ teeTimeId, teamName, bookerName, playerCount, memo }) {
  return apiClient.post('/api/operation/reservation-teams', { teeTimeId, teamName, bookerName, playerCount, memo }).then(res => res.data?.data)
}

// 예약팀 목록 조회 — playDate 필수, courseId/periodNumber 선택
export function getReservationTeams({ playDate, courseId, periodNumber } = {}) {
  const params = { playDate }
  if (courseId) params.courseId = courseId
  if (periodNumber) params.periodNumber = periodNumber
  return apiClient.get('/api/operation/reservation-teams', { params }).then(res => res.data?.data)
}

// 예약팀 상세 조회
export function getReservationTeam(teamId) {
  return apiClient.get(`/api/operation/reservation-teams/${teamId}`).then(res => res.data?.data)
}

// 예약팀 기본 정보 수정 — 변경할 필드만 포함
export function updateReservationTeam(teamId, { teamName, bookerName, playerCount, playerNames, memo } = {}) {
  return apiClient.patch(`/api/operation/reservation-teams/${teamId}`, { teamName, bookerName, playerCount, playerNames, memo }).then(res => res.data?.data)
}

// ── 예약팀 상태 전이 — RESERVED 상태에서만 가능, 그 외 400 ────────────────

// 예약 취소
export function cancelReservationTeam(teamId) {
  return apiClient.patch(`/api/operation/reservation-teams/${teamId}/cancel`).then(res => res.data?.data)
}

// 노쇼 처리
export function noShowReservationTeam(teamId) {
  return apiClient.patch(`/api/operation/reservation-teams/${teamId}/no-show`).then(res => res.data?.data)
}

// 우천취소
export function rainCancelReservationTeam(teamId) {
  return apiClient.patch(`/api/operation/reservation-teams/${teamId}/rain-cancel`).then(res => res.data?.data)
}

// 완료 처리
export function completeReservationTeam(teamId) {
  return apiClient.patch(`/api/operation/reservation-teams/${teamId}/complete`).then(res => res.data?.data)
}

// 지정 캐디 설정 — caddieId: 지정할 캐디 ID
export function setDesignatedCaddie(teamId, caddieId) {
  return apiClient.patch(`/api/operation/reservation-teams/${teamId}/designated-caddie`, { caddieId }).then(res => res.data?.data)
}

// VIP 마킹 설정/해제
export function setVip(teamId, { isVip, vipNote }) {
  return apiClient.patch(`/api/operation/reservation-teams/${teamId}/vip`, { isVip, vipNote }).then(res => res.data?.data)
}

// 예약팀 티타임 변경 — RESERVED 상태에서만 가능
export function changeTeamTeeTime(teamId, newTeeTimeId) {
  return apiClient.patch(`/api/operation/reservation-teams/${teamId}/tee-time`, { newTeeTimeId }).then(res => res.data?.data)
}

// ── 4. 예약팀 엑셀 업로드 ────────────────────────────────────────────────────

// 엑셀 업로드 템플릿 다운로드 — Blob으로 반환해 다운로드 처리
export function downloadReservationTemplate() {
  return apiClient.get('/api/operation/reservation-teams/upload/template', { responseType: 'blob' })
}

// 엑셀 업로드 미리보기 — 행별 OK/WARN/ERROR 상태 반환, 실제 등록 없음
// WARN: 지정 캐디 불일치(캐디 없이 등록 예정), ERROR: 티타임 없음(해당 행 미등록)
export function previewReservationUpload(file) {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.post('/api/operation/reservation-teams/upload/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(res => res.data?.data)
}

// 엑셀 업로드 확정 — 실제 등록 실행, successCount/failCount/failedRows 반환
export function confirmReservationUpload(file) {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.post('/api/operation/reservation-teams/upload/confirm', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(res => res.data?.data)
}

// ── 5. 특별 운영일 ────────────────────────────────────────────────────────────

// 특별 운영일 목록 조회 — yearMonth: 'YYYY-MM' 기준 해당 월 전체 반환
export function getSpecialDays(yearMonth) {
  return apiClient.get('/api/operation/special-days', { params: { yearMonth } }).then(res => res.data?.data)
}

// 특별 운영일 등록 — operationDate: 'YYYY-MM-DD', note: 메모(예: "현충일")
export function createSpecialDay({ operationDate, note }) {
  return apiClient.post('/api/operation/special-days', { operationDate, note }).then(res => res.data?.data)
}

// 특별 운영일 삭제
export function deleteSpecialDay(specialDayId) {
  return apiClient.delete(`/api/operation/special-days/${specialDayId}`).then(res => res.data?.data)
}

// ── 6. 우천취소 정책 ──────────────────────────────────────────────────────────

// 우천취소 정책 등록/수정 (upsert) — policyType: 'KEEP_ORDER' | 'RESEQUENCE'
export function upsertRainCancellationPolicy(policyType) {
  return apiClient.put('/api/operation/policies/rain-cancellation', { policyType }).then(res => res.data?.data)
}

// 우천취소 정책 조회 — 미설정 시 404
export function getRainCancellationPolicy() {
  return apiClient.get('/api/operation/policies/rain-cancellation').then(res => res.data?.data)
}

// ── 7. 대시보드 (ADMIN + MANAGER 공용) ────────────────────────────────────────

// 운영 현황 대시보드 조회 — targetDate 미전달 시 오늘 기준
// unassignedTeams는 배정 도메인 완료 전까지 항상 0 반환
export function getDashboard(targetDate) {
  const params = {}
  if (targetDate) params.targetDate = targetDate
  return apiClient.get('/api/operation/dashboard', { params }).then(res => res.data?.data)
}
