<script setup>
// 정산 자료 내보내기 (UI-M020) — Manager 전용
// 정산 변경 이력 조회 + 엑셀/보험 내보내기 (내보내기는 백엔드 미구현 stub)
import { onMounted, ref } from 'vue'
import { useSettlementStore } from '@/stores/useSettlementStore'
import settlementApi from '@/api/settlementApi'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'

// 이번 달 기본 선택
const now = new Date()
const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

const selectedMonth = ref(thisMonth)
const caddieIdInput  = ref('')

const history      = ref([])
const historyPage  = ref({ number: 0, totalPages: 0, totalElements: 0 })
const loadingHist  = ref(false)
const histError    = ref('')

const CHANGE_TYPE_LABEL = {
  FEE_ADJUSTED:      '캐디피 수동 조정',
  MONTH_CONFIRMED:   '월 마감 확정',
  CONFIRM_CANCELLED: '마감 확정 취소',
}

async function loadHistory(page = 0) {
  loadingHist.value = true
  histError.value   = ''
  try {
    const params = { yearMonth: selectedMonth.value, page, size: 20 }
    if (caddieIdInput.value.trim()) params.caddieId = Number(caddieIdInput.value.trim())
    const data = await settlementApi.getSettlementHistory(params)
    history.value     = data?.content ?? data ?? []
    historyPage.value = { number: data?.number ?? 0, totalPages: data?.totalPages ?? 1, totalElements: data?.totalElements ?? 0 }
  } catch {
    histError.value = '정산 이력을 불러오지 못했습니다.'
    history.value = []
  } finally {
    loadingHist.value = false
  }
}

function formatDate(str) {
  if (!str) return '—'
  return str.replace('T', ' ').slice(0, 16)
}

// ─── 엑셀 내보내기 (API-611 정산 자료 / API-610 과세자료 관리대장) ──
const exporting   = ref('')   // 'settlement' | 'insurance' | ''
const exportError = ref('')

// blob 응답을 브라우저 다운로드로 저장한다
function saveBlob(response, fallbackName) {
  const disposition = response.headers?.['content-disposition'] ?? ''
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)/)
  const filename = match ? decodeURIComponent(match[1]) : fallbackName

  const url = URL.createObjectURL(new Blob([response.data]))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function handleExport(type) {
  exporting.value   = type
  exportError.value = ''
  try {
    if (type === 'settlement') {
      const res = await settlementApi.downloadSettlementExcel(selectedMonth.value)
      saveBlob(res, `정산자료_${selectedMonth.value}.xlsx`)
    } else {
      const res = await settlementApi.downloadInsuranceExcel(selectedMonth.value)
      saveBlob(res, `과세자료관리대장_${selectedMonth.value}.xlsx`)
    }
  } catch {
    exportError.value = '엑셀 다운로드에 실패했습니다. 해당 월의 정산 데이터가 있는지 확인해 주세요.'
  } finally {
    exporting.value = ''
  }
}

onMounted(() => loadHistory())
</script>

<template>
  <div class="export-view">
    <div class="page-header">
      <h1 class="page-header__title">정산 자료 내보내기</h1>
    </div>

    <!-- 엑셀 내보내기 -->
    <div class="section-card">
      <h2 class="section-title">자료 내보내기</h2>
      <p class="section-note">선택한 월({{ selectedMonth }}) 기준으로 엑셀 파일을 다운로드합니다.</p>
      <div class="export-actions">
        <BaseButton
          variant="primary" size="sm"
          :loading="exporting === 'settlement'" :disabled="!!exporting"
          @click="handleExport('settlement')"
        >
          정산 내역 엑셀 (.xlsx)
        </BaseButton>
        <BaseButton
          variant="secondary" size="sm"
          :loading="exporting === 'insurance'" :disabled="!!exporting"
          @click="handleExport('insurance')"
        >
          과세자료 관리대장 (.xlsx)
        </BaseButton>
      </div>
      <p v-if="exportError" class="page-error">{{ exportError }}</p>
    </div>

    <!-- 정산 변경 이력 -->
    <div class="section-card">
      <h2 class="section-title">정산 변경 이력</h2>

      <div class="filter-row">
        <input type="month" v-model="selectedMonth" class="month-input" />
        <input
          v-model="caddieIdInput"
          type="number"
          placeholder="캐디 ID (선택)"
          class="caddie-input"
        />
        <BaseButton variant="primary" size="sm" :loading="loadingHist" @click="loadHistory()">
          조회
        </BaseButton>
      </div>

      <BaseLoading v-if="loadingHist" />
      <p v-else-if="histError" class="page-error">{{ histError }}</p>
      <template v-else>
        <BaseEmpty v-if="!history.length" message="해당 조건의 정산 이력이 없습니다." />
        <div v-else class="table-wrap">
          <table class="gms-table">
            <thead>
              <tr>
                <th>변경 유형</th>
                <th>캐디명</th>
                <th>변경 전 금액</th>
                <th>변경 후 금액</th>
                <th>사유</th>
                <th>처리 일시</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in history" :key="h.historyId ?? h.id">
                <td>
                  <span class="change-type">{{ CHANGE_TYPE_LABEL[h.changeType] ?? h.changeType }}</span>
                </td>
                <td>{{ h.caddieName ?? '—' }}</td>
                <td>{{ h.beforeFee != null ? Number(h.beforeFee).toLocaleString('ko-KR') + '원' : '—' }}</td>
                <td>{{ h.afterFee  != null ? Number(h.afterFee).toLocaleString('ko-KR')  + '원' : '—' }}</td>
                <td class="td-reason">{{ h.reason ?? '—' }}</td>
                <td>{{ formatDate(h.changedAt ?? h.createdAt) }}</td>
              </tr>
            </tbody>
          </table>

          <!-- 페이지네이션 -->
          <div v-if="historyPage.totalPages > 1" class="pagination">
            <BaseButton
              variant="ghost" size="sm"
              :disabled="historyPage.number === 0"
              @click="loadHistory(historyPage.number - 1)"
            >이전</BaseButton>
            <span class="page-info">{{ historyPage.number + 1 }} / {{ historyPage.totalPages }}</span>
            <BaseButton
              variant="ghost" size="sm"
              :disabled="historyPage.number >= historyPage.totalPages - 1"
              @click="loadHistory(historyPage.number + 1)"
            >다음</BaseButton>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.export-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

.page-header__title {
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--color-text-primary);
}

.section-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
  padding: var(--space-24);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
}

.section-title {
  font-size: var(--font-size-body);
  font-weight: 600;
  color: var(--color-text-primary);
  padding-bottom: var(--space-8);
  border-bottom: 1px solid var(--color-border);
}

.section-note {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}

.export-actions {
  display: flex;
  gap: var(--space-8);
  flex-wrap: wrap;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  flex-wrap: wrap;
}

.month-input,
.caddie-input {
  padding: var(--space-6) var(--space-10);
  font-size: var(--font-size-body-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  background: var(--color-bg-input);
  color: var(--color-text-primary);
  outline: none;
}

.month-input:focus,
.caddie-input:focus { border-color: var(--color-border-focus); }

.caddie-input { width: 140px; }

.page-error {
  color: var(--color-danger);
  font-size: var(--font-size-body-sm);
  padding: var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-8);
}

.table-wrap {
  overflow-x: auto;
  border-radius: var(--radius-8);
  border: 1px solid var(--color-border);
}

.gms-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-body-sm);
}

.gms-table th {
  background: var(--color-bg-page);
  padding: var(--space-12) var(--space-16);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.gms-table td {
  padding: var(--space-12) var(--space-16);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
  vertical-align: middle;
}

.gms-table tbody tr:last-child td { border-bottom: none; }
.gms-table tbody tr:hover { background: var(--color-bg-page); }

.change-type {
  font-size: var(--font-size-detail);
  font-weight: 500;
  padding: 2px 8px;
  border-radius: var(--radius-4);
  background: var(--color-bg-page);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  white-space: nowrap;
}

.td-reason {
  color: var(--color-text-secondary);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-12);
  padding: var(--space-12);
  border-top: 1px solid var(--color-border);
}

.page-info {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}
</style>
