import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as caddieApi from '@/api/caddieApi'

// Manager/Admin 운영 화면에서 캐디 도메인 상태를 관리한다
// Caddy 모바일 본인 조회(/me) 상태는 View 로컬 또는 별도 Store로 분리한다
export const useCaddyStore = defineStore('caddy', () => {

  // ─── state ───────────────────────────────────────────────────────────────

  // 캐디 목록·상세 (UI-M007, UI-M008)
  const caddies       = ref([])
  const currentCaddie = ref(null)

  // 대기 순번 목록 (UI-M009)
  const queues = ref([])

  // 일별 현황 목록 (UI-M010)
  const dailyStatuses = ref([])

  // 배정 화면(UI-M014) 등에서 공용으로 쓰는 가용 캐디 목록
  const availableCaddies = ref([])

  const loading = ref(false)
  const error   = ref('')

  // ─── 내부 헬퍼 ───────────────────────────────────────────────────────────

  function _setLoading(v) { loading.value = v }
  function _setError(msg) { error.value = msg || '' }
  function _clearError()  { error.value = '' }

  // ─── 캐디 관리 ───────────────────────────────────────────────────────────

  // 소속 골프장 캐디 목록을 조회한다 — keyword/status 필터 가능
  async function fetchCaddies(params = {}) {
    _setLoading(true)
    _clearError()
    try {
      caddies.value = await caddieApi.getCaddies(params) ?? []
    } catch (err) {
      _setError(err.response?.data?.error?.message || '캐디 목록을 불러오지 못했습니다.')
    } finally {
      _setLoading(false)
    }
  }

  // 캐디 상세 정보를 조회한다
  async function fetchCaddie(caddieId) {
    _setLoading(true)
    _clearError()
    try {
      currentCaddie.value = await caddieApi.getCaddie(caddieId)
    } catch (err) {
      _setError(err.response?.data?.error?.message || '캐디 정보를 불러오지 못했습니다.')
    } finally {
      _setLoading(false)
    }
  }

  // 캐디를 등록하고 목록에 추가한다
  async function createCaddie(body) {
    const data = await caddieApi.createCaddie(body)
    caddies.value = [data, ...caddies.value]
    return data
  }

  // 캐디 기본정보를 수정하고 목록·상세를 동기화한다
  async function editCaddie(caddieId, body) {
    const data = await caddieApi.updateCaddie(caddieId, body)
    _syncCaddie(caddieId, data)
    return data
  }

  // 캐디 상태를 변경한다 (ACTIVE/ON_LEAVE/EXCLUDED 등)
  async function changeCaddieStatus(caddieId, status) {
    const data = await caddieApi.updateCaddieStatus(caddieId, status)
    _syncCaddie(caddieId, data)
    return data
  }

  // 캐디를 퇴직 처리한다 (caddie 도메인 — 상태 RESIGNED + 소프트 삭제)
  async function retireCaddie(caddieId) {
    const data = await caddieApi.withdrawCaddie(caddieId)
    // 퇴직 처리 후 목록에서 제거한다
    caddies.value = caddies.value.filter(c => c.id !== caddieId)
    if (currentCaddie.value?.id === caddieId) currentCaddie.value = null
    return data
  }

  // 근무 패턴을 수정하고 상세에 반영한다
  async function editWorkPattern(caddieId, body) {
    const data = await caddieApi.updateWorkPattern(caddieId, body)
    if (currentCaddie.value?.id === caddieId) {
      currentCaddie.value = { ...currentCaddie.value, workPattern: data }
    }
    return data
  }

  // 라운딩 완료를 처리한다
  async function finishRound(caddieId, completedAt) {
    return await caddieApi.completeRound(caddieId, completedAt)
  }

  // 캐디-계정을 연동한다
  async function linkCaddieAccount(caddieId, userId) {
    const data = await caddieApi.linkAccount(caddieId, userId)
    _syncCaddie(caddieId, data)
    return data
  }

  // ─── 지정카트 ─────────────────────────────────────────────────────────────

  // 캐디 지정카트를 등록/변경한다
  async function assignDesignatedCart(caddieId, cartId) {
    return await caddieApi.setDesignatedCart(caddieId, cartId)
  }

  // 캐디 지정카트를 해제한다
  async function clearDesignatedCart(caddieId) {
    return await caddieApi.removeDesignatedCart(caddieId)
  }

  // ─── 대기 순번 (UI-M009) ──────────────────────────────────────────────────

  // 날짜별 대기 순번 목록을 조회한다
  async function fetchQueues(queueDate) {
    _setLoading(true)
    _clearError()
    try {
      queues.value = await caddieApi.getQueues(queueDate) ?? []
    } catch (err) {
      _setError(err.response?.data?.error?.message || '대기 순번을 불러오지 못했습니다.')
    } finally {
      _setLoading(false)
    }
  }

  // 대기 순번을 전체 초기화한다 — 캐디 번호 오름차순으로 재할당
  async function resetQueues(queueDate) {
    const data = await caddieApi.initializeQueues(queueDate)
    // 초기화 후 목록을 다시 불러온다
    await fetchQueues(queueDate)
    return data
  }

  // 특정 캐디의 순번을 수동 조정한다 — reason 필수
  async function updateQueue(caddieId, body) {
    const data = await caddieApi.adjustQueue(caddieId, body)
    const idx = queues.value.findIndex(q => q.caddieId === caddieId)
    if (idx !== -1) queues.value[idx] = { ...queues.value[idx], queueNumber: data.queueNumber }
    return data
  }

  // ─── 일별 현황 (UI-M010) ──────────────────────────────────────────────────

  // 날짜별 일별 현황 목록을 조회한다
  async function fetchDailyStatuses(statusDate) {
    _setLoading(true)
    _clearError()
    try {
      dailyStatuses.value = await caddieApi.getDailyStatuses(statusDate) ?? []
    } catch (err) {
      _setError(err.response?.data?.error?.message || '일별 현황을 불러오지 못했습니다.')
    } finally {
      _setLoading(false)
    }
  }

  // 일별 현황을 등록하고 목록에 추가한다
  async function addDailyStatus(body) {
    const data = await caddieApi.createDailyStatus(body)
    dailyStatuses.value = [...dailyStatuses.value, data]
    return data
  }

  // 일별 현황을 삭제하고 목록에서 제거한다
  async function removeDailyStatus(statusId) {
    await caddieApi.deleteDailyStatus(statusId)
    dailyStatuses.value = dailyStatuses.value.filter(s => s.statusId !== statusId)
  }

  // ─── 가용 캐디 (배정 화면 공용) ───────────────────────────────────────────

  // 지정일 기준 배정 가능한 캐디 목록을 조회한다
  async function fetchAvailableCaddies(assignmentDate) {
    _setLoading(true)
    _clearError()
    try {
      availableCaddies.value = await caddieApi.getAvailableCaddies(assignmentDate) ?? []
    } catch (err) {
      _setError(err.response?.data?.error?.message || '가용 캐디 목록을 불러오지 못했습니다.')
    } finally {
      _setLoading(false)
    }
  }

  // ─── 내부 동기화 헬퍼 ────────────────────────────────────────────────────

  // 수정/변경 후 목록과 상세를 동시에 갱신한다
  function _syncCaddie(caddieId, updated) {
    const idx = caddies.value.findIndex(c => c.id === caddieId)
    if (idx !== -1) caddies.value[idx] = { ...caddies.value[idx], ...updated }
    if (currentCaddie.value?.id === caddieId) {
      currentCaddie.value = { ...currentCaddie.value, ...updated }
    }
  }

  // ─── 상태 초기화 ──────────────────────────────────────────────────────────

  // 화면 이탈 시 상태를 초기화한다
  function $reset() {
    caddies.value         = []
    currentCaddie.value   = null
    queues.value          = []
    dailyStatuses.value   = []
    availableCaddies.value = []
    loading.value         = false
    error.value           = ''
  }

  return {
    // state
    caddies, currentCaddie, queues, dailyStatuses, availableCaddies,
    loading, error,
    // 캐디 관리
    fetchCaddies, fetchCaddie, createCaddie, editCaddie,
    changeCaddieStatus, retireCaddie, editWorkPattern,
    finishRound, linkCaddieAccount,
    // 지정카트
    assignDesignatedCart, clearDesignatedCart,
    // 대기 순번
    fetchQueues, resetQueues, updateQueue,
    // 일별 현황
    fetchDailyStatuses, addDailyStatus, removeDailyStatus,
    // 가용 캐디
    fetchAvailableCaddies,
    // 초기화
    $reset,
  }
})
