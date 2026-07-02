import { defineStore } from 'pinia'
import { ref } from 'vue'
import assignmentApi from '@/api/assignmentApi'

export const useAssignmentStore = defineStore('assignment', () => {
  const assignments     = ref([])
  const unassignedTeams = ref([])
  const schedule        = ref(null) // DailyScheduleRes — 페이지 세션 내에서만 유지
  const loading         = ref(false)
  const error           = ref('')

  // 일일 배정 목록 + 미배정 팀 + 배정표 상태를 함께 로드한다
  async function fetchDailyData(assignmentDate, golfCourseId) {
    loading.value = true
    error.value   = ''
    try {
      const [aList, uList, sched] = await Promise.all([
        assignmentApi.getDailyAssignments({ assignmentDate, golfCourseId }),
        assignmentApi.getUnassignedTeams({ assignmentDate, golfCourseId }),
        // 날짜 기준 배정표 조회 — 없으면 null 반환 (404 시 조용히 처리)
        assignmentApi.getScheduleByDate(assignmentDate).catch(() => null),
      ])
      assignments.value     = Array.isArray(aList) ? aList : []
      unassignedTeams.value = Array.isArray(uList) ? uList : []
      schedule.value        = sched ?? null
    } catch {
      error.value = '배정 데이터를 불러오지 못했습니다.'
    } finally {
      loading.value = false
    }
  }

  // 배정표 생성 후 schedule 상태를 업데이트한다
  async function createSchedule(scheduleDate) {
    const result   = await assignmentApi.createSchedule(scheduleDate)
    schedule.value = result
    return result
  }

  // 배정표 확정
  async function confirmSchedule() {
    const result   = await assignmentApi.confirmSchedule(schedule.value.id)
    schedule.value = result
    return result
  }

  // 배정표 확정 취소
  async function cancelConfirmSchedule() {
    const result   = await assignmentApi.cancelConfirmSchedule(schedule.value.id)
    schedule.value = result
    return result
  }

  // 배정표 완료 처리
  async function completeSchedule() {
    const result   = await assignmentApi.completeSchedule(schedule.value.id)
    schedule.value = result
    return result
  }

  // 수동배정 후 로컬 목록에 추가하고 미배정 팀에서 제거한다
  async function addAssignment(payload) {
    const created = await assignmentApi.manualAssign(payload)
    assignments.value     = [...assignments.value, created]
    unassignedTeams.value = unassignedTeams.value.filter(t => t.teamId !== payload.reservationTeamId)
    return created
  }

  // 재배정 후 로컬 상태를 갱신한다
  async function updateCaddie(assignmentId, payload) {
    const updated = await assignmentApi.reassign(assignmentId, payload)
    _sync(assignmentId, updated)
    return updated
  }

  // 배정 취소 후 로컬 목록에서 제거한다
  async function removeAssignment(assignmentId, reason) {
    await assignmentApi.cancelAssignment(assignmentId, reason)
    assignments.value = assignments.value.filter(a => a.id !== assignmentId)
  }

  // 단건 완료 처리
  async function markComplete(assignmentId) {
    const updated = await assignmentApi.completeAssignment(assignmentId)
    _sync(assignmentId, updated)
    return updated
  }

  // 잠금 해제
  async function unlock(assignmentId, reason) {
    const updated = await assignmentApi.unlockAssignment(assignmentId, reason)
    _sync(assignmentId, updated)
    return updated
  }

  // 배정 교환 — 교환 후 목록을 다시 로드해야 정확하므로 플래그만 반환한다
  async function swap(payload) {
    await assignmentApi.swapAssignments(payload)
  }

  // 자동배정 실행 후 목록을 재로드 할 수 있도록 결과를 반환한다
  async function runAutoAssign(payload) {
    return assignmentApi.autoAssign(payload)
  }

  // 로컬 배정 항목을 갱신한다
  function _sync(assignmentId, updated) {
    const idx = assignments.value.findIndex(a => a.id === assignmentId)
    if (idx !== -1) assignments.value[idx] = updated
  }

  // 날짜 변경 시 상태를 초기화한다
  function reset() {
    assignments.value     = []
    unassignedTeams.value = []
    schedule.value        = null
    error.value           = ''
  }

  function $reset() {
    reset()
    loading.value = false
  }

  return {
    assignments,
    unassignedTeams,
    schedule,
    loading,
    error,
    fetchDailyData,
    createSchedule,
    confirmSchedule,
    cancelConfirmSchedule,
    completeSchedule,
    addAssignment,
    updateCaddie,
    removeAssignment,
    markComplete,
    unlock,
    swap,
    runAutoAssign,
    reset,
    $reset,
  }
})
