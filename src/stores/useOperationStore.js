import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as operationApi from '@/api/operationApi'

// Manager 운영 화면(UI-M002, M011, M012, M013)에서 Operation 도메인 상태를 관리한다
// 대시보드는 Admin도 접근 가능 — apiClient 인터셉터가 X-Selected-Golf-Course-Id를 자동 부착한다
export const useOperationStore = defineStore('operation', () => {

  // ─── state ───────────────────────────────────────────────────────────────

  // 운영 설정 (UI-M011)
  const operationSetting = ref(null)       // 현재 월 운영 설정 전체 (settingId + periods)

  // 티타임 목록 (UI-M012) — 선택 날짜 기준
  const teeTimes = ref([])

  // 예약팀 목록·상세 (UI-M013)
  const reservationTeams = ref([])
  const currentTeam      = ref(null)

  // 우천취소 정책
  const rainPolicy = ref(null)             // { policyId, policyType }

  // 특별 운영일 목록 — operationSetting과 함께 UI-M011에서 사용
  const specialDays = ref([])

  // 대시보드 현황 요약 (UI-M002)
  const dashboard = ref(null)

  const loading = ref(false)
  const error   = ref('')

  // ─── 내부 헬퍼 ───────────────────────────────────────────────────────────

  function _setLoading(v) { loading.value = v }
  function _setError(msg) { error.value = msg || '' }
  function _clearError()  { error.value = '' }

  // ─── 운영 설정 (UI-M011) ──────────────────────────────────────────────────

  // 월별 운영 설정을 조회한다 — yearMonth: 'YYYY-MM'
  async function fetchOperationSetting(yearMonth) {
    _setLoading(true)
    _clearError()
    try {
      operationSetting.value = await operationApi.getOperationSetting(yearMonth)
    } catch (err) {
      // 404는 해당 월 설정 미존재 — null 유지, 에러 표시 생략
      if (err.response?.status !== 404) {
        _setError(err.response?.data?.error?.message || '운영 설정을 불러오지 못했습니다.')
      }
      operationSetting.value = null
    } finally {
      _setLoading(false)
    }
  }

  // 월별 운영 설정을 최초 등록한다 — 같은 월 중복 시 400
  async function createOperationSetting(body) {
    const data = await operationApi.createOperationSetting(body)
    operationSetting.value = data
    return data
  }

  // 운영 설정을 수정하고 상태에 반영한다
  async function editOperationSetting(settingId, body) {
    const data = await operationApi.updateOperationSetting(settingId, body)
    operationSetting.value = data
    return data
  }

  // ─── 티타임 (UI-M012) ────────────────────────────────────────────────────

  // 날짜별 티타임 목록을 조회한다 — playDate 필수
  async function fetchTeeTimes(params) {
    _setLoading(true)
    _clearError()
    try {
      teeTimes.value = await operationApi.getTeeTimes(params) ?? []
    } catch (err) {
      _setError(err.response?.data?.error?.message || '티타임 목록을 불러오지 못했습니다.')
    } finally {
      _setLoading(false)
    }
  }

  // 티타임을 자동 생성한다 — 이미 존재하는 슬롯은 스킵
  async function generateTeeTimes(body) {
    const data = await operationApi.generateTeeTimes(body)
    return data   // { generatedCount, yearMonth } — 목록은 이후 fetchTeeTimes로 갱신
  }

  // 티타임을 재생성한다 — 기존 슬롯 삭제 후 다시 생성
  async function regenerateTeeTimes(body) {
    const data = await operationApi.regenerateTeeTimes(body)
    return data
  }

  // 티타임을 수동 추가하고 목록에 반영한다
  async function addTeeTime(body) {
    const data = await operationApi.createTeeTime(body)
    teeTimes.value = [...teeTimes.value, data]
    return data
  }

  // 티타임을 마감(CLOSED) 처리하고 목록 상태를 갱신한다
  async function closeTeeTime(teeTimeId) {
    await operationApi.closeTeeTime(teeTimeId)
    const idx = teeTimes.value.findIndex(t => t.teeTimeId === teeTimeId)
    if (idx !== -1) teeTimes.value[idx] = { ...teeTimes.value[idx], status: 'CLOSED' }
  }

  // ─── 예약팀 (UI-M013) ────────────────────────────────────────────────────

  // 날짜별 예약팀 목록을 조회한다 — playDate 필수
  async function fetchReservationTeams(params) {
    _setLoading(true)
    _clearError()
    try {
      reservationTeams.value = await operationApi.getReservationTeams(params) ?? []
    } catch (err) {
      _setError(err.response?.data?.error?.message || '예약팀 목록을 불러오지 못했습니다.')
    } finally {
      _setLoading(false)
    }
  }

  // 예약팀 상세를 조회한다
  async function fetchReservationTeam(teamId) {
    _setLoading(true)
    _clearError()
    try {
      currentTeam.value = await operationApi.getReservationTeam(teamId)
    } catch (err) {
      _setError(err.response?.data?.error?.message || '예약팀 정보를 불러오지 못했습니다.')
    } finally {
      _setLoading(false)
    }
  }

  // 예약팀을 등록하고 목록 앞에 추가한다
  async function createReservationTeam(body) {
    const data = await operationApi.createReservationTeam(body)
    reservationTeams.value = [data, ...reservationTeams.value]
    return data
  }

  // 예약팀 기본정보를 수정하고 목록·상세에 반영한다
  async function editReservationTeam(teamId, body) {
    const data = await operationApi.updateReservationTeam(teamId, body)
    _syncTeam(teamId, data)
    return data
  }

  // ── 상태 전이 (RESERVED에서만 가능) ──────────────────────────────────────

  // 예약을 취소하고 상태를 CANCELLED로 갱신한다
  async function cancelTeam(teamId) {
    await operationApi.cancelReservationTeam(teamId)
    _syncTeam(teamId, { status: 'CANCELLED' })
  }

  // 노쇼 처리하고 상태를 NO_SHOW로 갱신한다
  async function noShowTeam(teamId) {
    await operationApi.noShowReservationTeam(teamId)
    _syncTeam(teamId, { status: 'NO_SHOW' })
  }

  // 우천취소 처리하고 상태를 RAIN_CANCELLED로 갱신한다
  async function rainCancelTeam(teamId) {
    await operationApi.rainCancelReservationTeam(teamId)
    _syncTeam(teamId, { status: 'RAIN_CANCELLED' })
  }

  // 완료 처리하고 상태를 COMPLETED로 갱신한다
  async function completeTeam(teamId) {
    await operationApi.completeReservationTeam(teamId)
    _syncTeam(teamId, { status: 'COMPLETED' })
  }

  // 지정 캐디를 설정하고 목록·상세에 반영한다
  async function assignDesignatedCaddie(teamId, caddieId) {
    const data = await operationApi.setDesignatedCaddie(teamId, caddieId)
    _syncTeam(teamId, data)
    return data
  }

  // VIP 마킹을 설정/해제하고 목록·상세에 반영한다
  async function setTeamVip(teamId, body) {
    const data = await operationApi.setVip(teamId, body)
    _syncTeam(teamId, data)
    return data
  }

  // 예약팀의 티타임을 변경하고 목록·상세에 반영한다
  async function moveTeamTeeTime(teamId, newTeeTimeId) {
    const data = await operationApi.changeTeamTeeTime(teamId, newTeeTimeId)
    _syncTeam(teamId, data)
    return data
  }

  // ─── 우천취소 정책 ───────────────────────────────────────────────────────

  // 우천취소 정책을 조회한다 — 미설정 시 404이므로 null 유지
  async function fetchRainPolicy() {
    _clearError()
    try {
      rainPolicy.value = await operationApi.getRainCancellationPolicy()
    } catch (err) {
      if (err.response?.status !== 404) {
        _setError(err.response?.data?.error?.message || '우천취소 정책을 불러오지 못했습니다.')
      }
      rainPolicy.value = null
    }
  }

  // 우천취소 정책을 등록/수정(upsert)한다
  async function saveRainPolicy(policyType) {
    const data = await operationApi.upsertRainCancellationPolicy(policyType)
    rainPolicy.value = data
    return data
  }

  // ─── 특별 운영일 (UI-M011 내 관리) ──────────────────────────────────────

  // 월별 특별 운영일 목록을 조회한다 — yearMonth: 'YYYY-MM'
  async function fetchSpecialDays(yearMonth) {
    _clearError()
    try {
      specialDays.value = await operationApi.getSpecialDays(yearMonth) ?? []
    } catch (err) {
      _setError(err.response?.data?.error?.message || '특별 운영일을 불러오지 못했습니다.')
    }
  }

  // 특별 운영일을 등록하고 목록에 추가한다
  async function addSpecialDay(body) {
    const data = await operationApi.createSpecialDay(body)
    specialDays.value = [...specialDays.value, data]
    return data
  }

  // 특별 운영일을 삭제하고 목록에서 제거한다
  async function removeSpecialDay(specialDayId) {
    await operationApi.deleteSpecialDay(specialDayId)
    specialDays.value = specialDays.value.filter(d => d.specialDayId !== specialDayId)
  }

  // ─── 대시보드 (UI-M002, ADMIN+MANAGER 공용) ───────────────────────────────

  // 운영 현황 대시보드를 조회한다 — targetDate 미전달 시 오늘 기준
  async function fetchDashboard(targetDate) {
    _setLoading(true)
    _clearError()
    try {
      dashboard.value = await operationApi.getDashboard(targetDate)
    } catch (err) {
      _setError(err.response?.data?.error?.message || '대시보드를 불러오지 못했습니다.')
    } finally {
      _setLoading(false)
    }
  }

  // ─── 내부 동기화 헬퍼 ────────────────────────────────────────────────────

  // 수정/상태전이 후 목록과 상세를 동시에 갱신한다
  function _syncTeam(teamId, updated) {
    const idx = reservationTeams.value.findIndex(t => t.teamId === teamId)
    if (idx !== -1) reservationTeams.value[idx] = { ...reservationTeams.value[idx], ...updated }
    if (currentTeam.value?.teamId === teamId) {
      currentTeam.value = { ...currentTeam.value, ...updated }
    }
  }

  // ─── 상태 초기화 ──────────────────────────────────────────────────────────

  // 화면 이탈 시 상태를 초기화한다
  function $reset() {
    operationSetting.value = null
    teeTimes.value         = []
    reservationTeams.value = []
    currentTeam.value      = null
    rainPolicy.value       = null
    specialDays.value      = []
    dashboard.value        = null
    loading.value          = false
    error.value            = ''
  }

  return {
    // state
    operationSetting, teeTimes,
    reservationTeams, currentTeam,
    rainPolicy, specialDays, dashboard,
    loading, error,
    // 운영 설정
    fetchOperationSetting, createOperationSetting, editOperationSetting,
    // 티타임
    fetchTeeTimes, generateTeeTimes, regenerateTeeTimes, addTeeTime, closeTeeTime,
    // 예약팀
    fetchReservationTeams, fetchReservationTeam,
    createReservationTeam, editReservationTeam,
    cancelTeam, noShowTeam, rainCancelTeam, completeTeam,
    assignDesignatedCaddie, setTeamVip, moveTeamTeeTime,
    // 우천취소 정책
    fetchRainPolicy, saveRainPolicy,
    // 특별 운영일
    fetchSpecialDays, addSpecialDay, removeSpecialDay,
    // 대시보드
    fetchDashboard,
    // 초기화
    $reset,
  }
})
