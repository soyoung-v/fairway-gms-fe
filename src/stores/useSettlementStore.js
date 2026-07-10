import { defineStore } from 'pinia'
import { ref } from 'vue'
import settlementApi from '@/api/settlementApi'

export const useSettlementStore = defineStore('settlement', () => {
  const feePolicy       = ref(null) // FeePolicyRes
  const roundSummary    = ref([])   // RoundSummaryRes[]
  const incomeSummary   = ref([])   // IncomeSummaryRes[]
  const monthlyStatus   = ref(null) // MonthlySettlementRes
  const loading         = ref(false)
  const error           = ref('')

  // 캐디피 정책을 불러온다
  async function fetchFeePolicy() {
    loading.value = true
    error.value   = ''
    try {
      feePolicy.value = await settlementApi.getFeePolicy()
    } catch (err) {
      const code = err.response?.data?.error?.code || ''
      // 백엔드 실제 코드는 FEE_POLICY_NOT_FOUND — 정책 미등록은 오류가 아니라 신규 등록 상태
      if (code !== 'FEE_POLICY_NOT_FOUND' && code !== 'POLICY_NOT_FOUND') {
        error.value = '캐디피 정책을 불러오지 못했습니다.'
      }
      feePolicy.value = null
    } finally {
      loading.value = false
    }
  }

  // 캐디피 정책을 저장(등록/수정)한다
  async function saveFeePolicy(payload) {
    const result    = await settlementApi.upsertFeePolicy(payload)
    feePolicy.value = result
    return result
  }

  // 월별 근무횟수 + 수입 집계를 함께 로드한다
  async function fetchMonthlySummary(yearMonth) {
    loading.value = true
    error.value   = ''
    try {
      const [rounds, income] = await Promise.all([
        settlementApi.getRoundSummary(yearMonth),
        settlementApi.getIncomeSummary(yearMonth),
      ])
      roundSummary.value  = Array.isArray(rounds) ? rounds : []
      incomeSummary.value = Array.isArray(income) ? income : []
    } catch {
      error.value = '월별 정산 데이터를 불러오지 못했습니다.'
    } finally {
      loading.value = false
    }
  }

  // 캐디피를 수동 조정하고 로컬 수입 집계를 갱신한다
  async function adjustFee(caddieId, payload) {
    const updated = await settlementApi.adjustCaddieFee(caddieId, payload)
    const idx = incomeSummary.value.findIndex(s => s.caddieId === caddieId)
    if (idx !== -1) incomeSummary.value[idx] = { ...incomeSummary.value[idx], adjustedFee: updated.adjustedFee }
    return updated
  }

  // 월 마감을 확정한다
  async function confirmMonth(yearMonth) {
    const result    = await settlementApi.confirmMonth(yearMonth)
    monthlyStatus.value = result
    return result
  }

  // 월 마감 확정을 취소한다
  async function cancelConfirm(yearMonth) {
    await settlementApi.cancelConfirmMonth(yearMonth)
    monthlyStatus.value = null
  }

  function $reset() {
    feePolicy.value     = null
    roundSummary.value  = []
    incomeSummary.value = []
    monthlyStatus.value = null
    loading.value       = false
    error.value         = ''
  }

  return {
    feePolicy,
    roundSummary,
    incomeSummary,
    monthlyStatus,
    loading,
    error,
    fetchFeePolicy,
    saveFeePolicy,
    fetchMonthlySummary,
    adjustFee,
    confirmMonth,
    cancelConfirm,
    $reset,
  }
})
