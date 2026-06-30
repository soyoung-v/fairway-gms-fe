<script setup>
// 예약팀 관리 (UI-M013) — Manager 전용
// 날짜별 예약팀 목록 조회/등록/수정, 상태 전이(취소/노쇼/우천취소/완료),
// 지정 캐디 설정, VIP 마킹, 티타임 변경, 엑셀 업로드(미리보기 → 확정)
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useOperationStore } from '@/stores/useOperationStore'
import * as operationApi from '@/api/operationApi'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const operationStore = useOperationStore()

// ─── 날짜·필터 ───────────────────────────────────────────────────
function today() { return new Date().toISOString().slice(0, 10) }

const playDate           = ref(today())
const filterCourseId     = ref('')
const filterPeriodNumber = ref('')

async function loadTeams() {
  const params = { playDate: playDate.value }
  if (filterCourseId.value)     params.courseId     = Number(filterCourseId.value)
  if (filterPeriodNumber.value) params.periodNumber = Number(filterPeriodNumber.value)
  await operationStore.fetchReservationTeams(params)
}

onMounted(loadTeams)
onUnmounted(() => { operationStore.reservationTeams = [] })

// ─── 상태 뱃지 매핑 ──────────────────────────────────────────────
const STATUS_BADGE = {
  RESERVED:      { type: 'primary',  label: '예약' },
  CANCELLED:     { type: 'disabled', label: '취소' },
  NO_SHOW:       { type: 'danger',   label: '노쇼' },
  RAIN_CANCELLED:{ type: 'warning',  label: '우천취소' },
  COMPLETED:     { type: 'success',  label: '완료' },
}
function getStatusBadge(status) {
  return STATUS_BADGE[status] ?? { type: 'disabled', label: status }
}

// ─── 예약팀 등록 모달 ────────────────────────────────────────────
const showCreateModal = ref(false)
const createForm      = reactive({
  teeTimeId: '', teamName: '', bookerName: '', playerCount: 4, memo: '',
})
const creating    = ref(false)
const createError = ref('')

function openCreateModal() {
  Object.assign(createForm, { teeTimeId: '', teamName: '', bookerName: '', playerCount: 4, memo: '' })
  createError.value     = ''
  showCreateModal.value = true
}

async function handleCreate() {
  if (!createForm.teeTimeId || !createForm.teamName || !createForm.bookerName) {
    createError.value = '티타임 ID, 팀명, 예약자는 필수입니다.'
    return
  }
  creating.value    = true
  createError.value = ''
  try {
    await operationStore.createReservationTeam({
      teeTimeId:   Number(createForm.teeTimeId),
      teamName:    createForm.teamName.trim(),
      bookerName:  createForm.bookerName.trim(),
      playerCount: Number(createForm.playerCount),
      memo:        createForm.memo.trim() || null,
    })
    showCreateModal.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    createError.value =
      code === 'TEE_TIME_NOT_FOUND' ? '해당 티타임이 존재하지 않습니다.' :
      err.response?.data?.error?.message || '등록에 실패했습니다.'
  } finally {
    creating.value = false
  }
}

// ─── 예약팀 수정 모달 ────────────────────────────────────────────
const showEditModal  = ref(false)
const editTarget     = ref(null)
const editForm       = reactive({
  teamName: '', bookerName: '', playerCount: 4, playerNames: '', memo: '',
})
const editing    = ref(false)
const editError  = ref('')

function openEditModal(team) {
  editTarget.value = team
  Object.assign(editForm, {
    teamName:    team.teamName    ?? '',
    bookerName:  team.bookerName  ?? '',
    playerCount: team.playerCount ?? 4,
    playerNames: team.playerNames ?? '',
    memo:        team.memo        ?? '',
  })
  editError.value     = ''
  showEditModal.value = true
}

async function handleEdit() {
  if (!editForm.teamName || !editForm.bookerName) {
    editError.value = '팀명과 예약자는 필수입니다.'
    return
  }
  editing.value   = true
  editError.value = ''
  try {
    await operationStore.editReservationTeam(editTarget.value.teamId, {
      teamName:    editForm.teamName.trim(),
      bookerName:  editForm.bookerName.trim(),
      playerCount: Number(editForm.playerCount),
      playerNames: editForm.playerNames.trim() || null,
      memo:        editForm.memo.trim() || null,
    })
    showEditModal.value = false
  } catch (err) {
    editError.value = err.response?.data?.error?.message || '수정에 실패했습니다.'
  } finally {
    editing.value = false
  }
}

// ─── 상태 전이 확인 모달 (취소/노쇼/우천취소/완료) ───────────────
const statusActionTarget = ref(null)
const statusActionType   = ref('')  // 'cancel' | 'no-show' | 'rain-cancel' | 'complete'
const showStatusConfirm  = ref(false)
const statusActing       = ref(false)

const STATUS_ACTION_LABELS = {
  cancel:       { label: '취소', msg: '예약을 취소하시겠습니까?', btnVariant: 'danger' },
  'no-show':    { label: '노쇼', msg: '노쇼 처리하시겠습니까?',   btnVariant: 'danger' },
  'rain-cancel':{ label: '우천취소', msg: '우천취소 처리하시겠습니까?', btnVariant: 'warning' },
  complete:     { label: '완료', msg: '완료 처리하시겠습니까?',    btnVariant: 'primary' },
}

function openStatusAction(team, type) {
  statusActionTarget.value = team
  statusActionType.value   = type
  showStatusConfirm.value  = true
}

async function handleStatusAction() {
  statusActing.value = true
  try {
    const { teamId } = statusActionTarget.value
    if (statusActionType.value === 'cancel')       await operationStore.cancelTeam(teamId)
    if (statusActionType.value === 'no-show')      await operationStore.noShowTeam(teamId)
    if (statusActionType.value === 'rain-cancel')  await operationStore.rainCancelTeam(teamId)
    if (statusActionType.value === 'complete')     await operationStore.completeTeam(teamId)
    showStatusConfirm.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    alert(
      code === 'INVALID_TEAM_STATUS' ? '이미 처리된 상태이거나 상태 변경이 불가능합니다.' :
      err.response?.data?.error?.message || '처리에 실패했습니다.'
    )
    showStatusConfirm.value = false
  } finally {
    statusActing.value = false
  }
}

// ─── 지정 캐디 설정 모달 ─────────────────────────────────────────
const showCaddieModal  = ref(false)
const caddieTarget     = ref(null)
const caddieIdInput    = ref('')
const settingCaddie    = ref(false)
const caddieError      = ref('')

function openCaddieModal(team) {
  caddieTarget.value = team
  caddieIdInput.value = String(team.designatedCaddieId ?? '')
  caddieError.value  = ''
  showCaddieModal.value = true
}

async function handleSetCaddie() {
  if (!caddieIdInput.value) { caddieError.value = '캐디 ID를 입력해 주세요.'; return }
  settingCaddie.value = true
  caddieError.value   = ''
  try {
    await operationStore.assignDesignatedCaddie(caddieTarget.value.teamId, Number(caddieIdInput.value))
    showCaddieModal.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    caddieError.value =
      code === 'CADDIE_NOT_FOUND' ? '해당 캐디를 찾을 수 없습니다.' :
      err.response?.data?.error?.message || '설정에 실패했습니다.'
  } finally {
    settingCaddie.value = false
  }
}

// ─── 티타임 변경 모달 ────────────────────────────────────────────
const showTeeTimeChangeModal = ref(false)
const teeTimeChangeTarget    = ref(null)
const newTeeTimeIdInput      = ref('')
const changingTeeTime        = ref(false)
const teeTimeChangeError     = ref('')

function openTeeTimeChangeModal(team) {
  teeTimeChangeTarget.value = team
  newTeeTimeIdInput.value   = ''
  teeTimeChangeError.value  = ''
  showTeeTimeChangeModal.value = true
}

async function handleChangeTeeTime() {
  if (!newTeeTimeIdInput.value) { teeTimeChangeError.value = '새 티타임 ID를 입력해 주세요.'; return }
  changingTeeTime.value    = true
  teeTimeChangeError.value = ''
  try {
    await operationStore.moveTeamTeeTime(teeTimeChangeTarget.value.teamId, Number(newTeeTimeIdInput.value))
    showTeeTimeChangeModal.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    teeTimeChangeError.value =
      code === 'TEE_TIME_NOT_FOUND'   ? '해당 티타임이 존재하지 않습니다.' :
      code === 'INVALID_TEAM_STATUS'  ? 'RESERVED 상태인 팀만 티타임을 변경할 수 있습니다.' :
      err.response?.data?.error?.message || '변경에 실패했습니다.'
  } finally {
    changingTeeTime.value = false
  }
}

// ─── 엑셀 업로드 ─────────────────────────────────────────────────
const showUploadModal  = ref(false)
const uploadFile       = ref(null)
const uploadFileInput  = ref(null)
const previewing       = ref(false)
const confirming       = ref(false)
const previewRows      = ref([])       // 미리보기 행 결과
const uploadResult     = ref(null)     // 확정 결과 { successCount, failCount, failedRows }
const uploadError      = ref('')

// 미리보기 행 상태 뱃지
const PREVIEW_BADGE = {
  OK:   { type: 'success', label: 'OK' },
  WARN: { type: 'warning', label: 'WARN' },
  ERROR:{ type: 'danger',  label: 'ERROR' },
}

function openUploadModal() {
  uploadFile.value   = null
  previewRows.value  = []
  uploadResult.value = null
  uploadError.value  = ''
  showUploadModal.value = true
  // 파일 인풋 초기화
  if (uploadFileInput.value) uploadFileInput.value.value = ''
}

function onFileChange(e) {
  uploadFile.value   = e.target.files?.[0] ?? null
  previewRows.value  = []
  uploadResult.value = null
  uploadError.value  = ''
}

async function handlePreview() {
  if (!uploadFile.value) { uploadError.value = '파일을 선택해 주세요.'; return }
  previewing.value  = true
  uploadError.value = ''
  try {
    previewRows.value  = await operationApi.previewReservationUpload(uploadFile.value)
    uploadResult.value = null
  } catch (err) {
    uploadError.value = err.response?.data?.error?.message || '미리보기에 실패했습니다.'
  } finally {
    previewing.value = false
  }
}

async function handleConfirmUpload() {
  if (!uploadFile.value) { uploadError.value = '파일을 선택해 주세요.'; return }
  confirming.value  = true
  uploadError.value = ''
  try {
    uploadResult.value = await operationApi.confirmReservationUpload(uploadFile.value)
    previewRows.value  = []
    await loadTeams()
  } catch (err) {
    uploadError.value = err.response?.data?.error?.message || '업로드 확정에 실패했습니다.'
  } finally {
    confirming.value = false
  }
}

async function handleDownloadTemplate() {
  try {
    const response = await operationApi.downloadReservationTemplate()
    const url  = URL.createObjectURL(response.data)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'reservation_template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    alert('템플릿 다운로드에 실패했습니다.')
  }
}

const hasError = (rows) => rows.some(r => r.status === 'ERROR')
</script>

<template>
  <div class="reservation-team-view">
    <div class="page-header">
      <h1 class="page-header__title">예약팀 관리</h1>
      <div class="page-header__actions">
        <BaseButton variant="ghost"   size="sm" @click="openUploadModal">엑셀 업로드</BaseButton>
        <BaseButton variant="primary" size="sm" @click="openCreateModal">+ 예약팀 등록</BaseButton>
      </div>
    </div>

    <!-- 날짜·필터 바 -->
    <div class="filter-bar">
      <BaseInput v-model="playDate" type="date" class="filter-bar__date" />
      <BaseInput v-model="filterCourseId" type="number" placeholder="코스 ID" class="filter-bar__short" />
      <BaseInput v-model="filterPeriodNumber" type="number" placeholder="부 번호" class="filter-bar__short" />
      <BaseButton variant="primary" size="sm" @click="loadTeams">조회</BaseButton>
    </div>

    <BaseLoading v-if="operationStore.loading" />
    <p v-else-if="operationStore.error" class="feedback-err">{{ operationStore.error }}</p>
    <BaseEmpty v-else-if="!operationStore.reservationTeams.length" message="해당 날짜의 예약팀이 없습니다." />

    <div v-else class="table-wrap">
      <table class="team-table">
        <thead>
          <tr>
            <th>팀명</th>
            <th>예약자</th>
            <th>인원</th>
            <th>상태</th>
            <th>지정캐디</th>
            <th>VIP</th>
            <th>상태 처리</th>
            <th>기타</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="team in operationStore.reservationTeams"
            :key="team.teamId"
            class="team-table__row"
          >
            <td class="td-name">{{ team.teamName }}</td>
            <td>{{ team.bookerName }}</td>
            <td>{{ team.playerCount }}명</td>
            <td>
              <BaseBadge :type="getStatusBadge(team.status).type">
                {{ getStatusBadge(team.status).label }}
              </BaseBadge>
            </td>
            <td>{{ team.designatedCaddieId ?? '—' }}</td>
            <td>
              <BaseBadge v-if="team.isVip" type="warning">VIP</BaseBadge>
              <span v-else class="text-muted">—</span>
            </td>

            <!-- 상태 전이: RESERVED 상태에서만 활성화 -->
            <td>
              <div v-if="team.status === 'RESERVED'" class="action-group">
                <BaseButton variant="ghost"   size="sm" @click="openStatusAction(team, 'complete')">완료</BaseButton>
                <BaseButton variant="danger"  size="sm" @click="openStatusAction(team, 'cancel')">취소</BaseButton>
                <BaseButton variant="danger"  size="sm" @click="openStatusAction(team, 'no-show')">노쇼</BaseButton>
                <BaseButton variant="warning" size="sm" @click="openStatusAction(team, 'rain-cancel')">우천취소</BaseButton>
              </div>
              <span v-else class="text-muted">—</span>
            </td>

            <td>
              <div class="action-group">
                <BaseButton variant="ghost" size="sm" @click="openEditModal(team)">수정</BaseButton>
                <BaseButton variant="ghost" size="sm" @click="openCaddieModal(team)">캐디 설정</BaseButton>
                <BaseButton
                  v-if="team.status === 'RESERVED'"
                  variant="ghost"
                  size="sm"
                  @click="openTeeTimeChangeModal(team)"
                >티타임 변경</BaseButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── 예약팀 등록 모달 ── -->
    <BaseModal v-if="showCreateModal" title="예약팀 등록" @close="showCreateModal = false">
      <div class="modal-form">
        <p class="modal-hint">날짜: <strong>{{ playDate }}</strong></p>
        <div class="field-col">
          <label class="field-label">티타임 ID <span class="required">*</span></label>
          <BaseInput v-model="createForm.teeTimeId" type="number" placeholder="예: 1" />
        </div>
        <div class="field-col">
          <label class="field-label">팀명 <span class="required">*</span></label>
          <BaseInput v-model="createForm.teamName" placeholder="예: 홍팀" />
        </div>
        <div class="field-col">
          <label class="field-label">예약자 <span class="required">*</span></label>
          <BaseInput v-model="createForm.bookerName" placeholder="예: 홍길동" />
        </div>
        <div class="field-col">
          <label class="field-label">인원</label>
          <BaseInput v-model="createForm.playerCount" type="number" />
        </div>
        <div class="field-col">
          <label class="field-label">메모</label>
          <BaseInput v-model="createForm.memo" placeholder="VIP 고객 등" />
        </div>
        <p v-if="createError" class="feedback-err">{{ createError }}</p>
        <div class="modal-actions">
          <BaseButton variant="ghost" @click="showCreateModal = false">취소</BaseButton>
          <BaseButton variant="primary" :loading="creating" @click="handleCreate">등록</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- ── 예약팀 수정 모달 ── -->
    <BaseModal v-if="showEditModal" :title="`예약팀 수정 — ${editTarget?.teamName}`" @close="showEditModal = false">
      <div class="modal-form">
        <div class="field-col">
          <label class="field-label">팀명 <span class="required">*</span></label>
          <BaseInput v-model="editForm.teamName" />
        </div>
        <div class="field-col">
          <label class="field-label">예약자 <span class="required">*</span></label>
          <BaseInput v-model="editForm.bookerName" />
        </div>
        <div class="field-col">
          <label class="field-label">인원</label>
          <BaseInput v-model="editForm.playerCount" type="number" />
        </div>
        <div class="field-col">
          <label class="field-label">선수명(쉼표 구분)</label>
          <BaseInput v-model="editForm.playerNames" placeholder="홍길동, 김철수" />
        </div>
        <div class="field-col">
          <label class="field-label">메모</label>
          <BaseInput v-model="editForm.memo" />
        </div>
        <p v-if="editError" class="feedback-err">{{ editError }}</p>
        <div class="modal-actions">
          <BaseButton variant="ghost" @click="showEditModal = false">취소</BaseButton>
          <BaseButton variant="primary" :loading="editing" @click="handleEdit">저장</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- ── 상태 전이 확인 모달 ── -->
    <ConfirmModal
      v-if="showStatusConfirm"
      :message="`[${statusActionTarget?.teamName}] ${STATUS_ACTION_LABELS[statusActionType]?.msg}`"
      :confirm-label="STATUS_ACTION_LABELS[statusActionType]?.label"
      @confirm="handleStatusAction"
      @cancel="showStatusConfirm = false"
    />

    <!-- ── 지정 캐디 설정 모달 ── -->
    <BaseModal v-if="showCaddieModal" :title="`지정 캐디 설정 — ${caddieTarget?.teamName}`" @close="showCaddieModal = false">
      <div class="modal-form">
        <div class="field-col">
          <label class="field-label">캐디 ID <span class="required">*</span></label>
          <BaseInput v-model="caddieIdInput" type="number" placeholder="예: 5" />
        </div>
        <p v-if="caddieError" class="feedback-err">{{ caddieError }}</p>
        <div class="modal-actions">
          <BaseButton variant="ghost" @click="showCaddieModal = false">취소</BaseButton>
          <BaseButton variant="primary" :loading="settingCaddie" @click="handleSetCaddie">설정</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- ── 티타임 변경 모달 ── -->
    <BaseModal v-if="showTeeTimeChangeModal" :title="`티타임 변경 — ${teeTimeChangeTarget?.teamName}`" @close="showTeeTimeChangeModal = false">
      <div class="modal-form">
        <div class="field-col">
          <label class="field-label">새 티타임 ID <span class="required">*</span></label>
          <BaseInput v-model="newTeeTimeIdInput" type="number" placeholder="예: 3" />
        </div>
        <p v-if="teeTimeChangeError" class="feedback-err">{{ teeTimeChangeError }}</p>
        <div class="modal-actions">
          <BaseButton variant="ghost" @click="showTeeTimeChangeModal = false">취소</BaseButton>
          <BaseButton variant="primary" :loading="changingTeeTime" @click="handleChangeTeeTime">변경</BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- ── 엑셀 업로드 모달 ── -->
    <BaseModal v-if="showUploadModal" title="예약팀 엑셀 업로드" @close="showUploadModal = false">
      <div class="modal-form">
        <!-- 템플릿 다운로드 -->
        <div class="upload-template">
          <span class="field-label">업로드 양식이 필요하신가요?</span>
          <BaseButton variant="ghost" size="sm" @click="handleDownloadTemplate">템플릿 다운로드</BaseButton>
        </div>

        <!-- 파일 선택 -->
        <div class="field-col">
          <label class="field-label">파일 선택 (.xlsx)</label>
          <input
            ref="uploadFileInput"
            type="file"
            accept=".xlsx"
            class="file-input"
            @change="onFileChange"
          />
        </div>

        <p v-if="uploadError" class="feedback-err">{{ uploadError }}</p>

        <!-- 미리보기 결과 -->
        <div v-if="previewRows.length" class="preview-section">
          <p class="preview-title">미리보기 결과 ({{ previewRows.length }}행)</p>
          <div class="preview-table-wrap">
            <table class="preview-table">
              <thead>
                <tr>
                  <th>행</th>
                  <th>상태</th>
                  <th>날짜</th>
                  <th>코스</th>
                  <th>시간</th>
                  <th>예약자</th>
                  <th>인원</th>
                  <th>오류 내용</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in previewRows"
                  :key="row.rowNumber"
                  :class="['preview-row', `preview-row--${row.status.toLowerCase()}`]"
                >
                  <td>{{ row.rowNumber }}</td>
                  <td>
                    <BaseBadge :type="PREVIEW_BADGE[row.status]?.type">
                      {{ PREVIEW_BADGE[row.status]?.label }}
                    </BaseBadge>
                  </td>
                  <td>{{ row.playDate }}</td>
                  <td>{{ row.courseName }}</td>
                  <td>{{ row.teeTime }}</td>
                  <td>{{ row.bookerName }}</td>
                  <td>{{ row.playerCount }}</td>
                  <td class="td-error-msg">{{ row.errorMessage ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="preview-warn">
            · WARN 행: 지정 캐디 불일치 — 캐디 없이 등록됩니다.<br/>
            · ERROR 행: 티타임 없음 등 — 해당 행은 등록되지 않습니다.
          </p>
        </div>

        <!-- 확정 결과 -->
        <div v-if="uploadResult" class="upload-result">
          <p class="result-ok">✓ 등록 성공: {{ uploadResult.successCount }}건</p>
          <p v-if="uploadResult.failCount > 0" class="result-fail">
            ✗ 등록 실패: {{ uploadResult.failCount }}건
          </p>
          <ul v-if="uploadResult.failedRows?.length" class="result-fail-list">
            <li v-for="row in uploadResult.failedRows" :key="row.rowNumber">
              {{ row.rowNumber }}행 — {{ row.errorMessage }}
            </li>
          </ul>
        </div>

        <div class="modal-actions">
          <BaseButton variant="ghost" @click="showUploadModal = false">닫기</BaseButton>
          <BaseButton
            variant="ghost"
            :loading="previewing"
            :disabled="!uploadFile"
            @click="handlePreview"
          >미리보기</BaseButton>
          <BaseButton
            variant="primary"
            :loading="confirming"
            :disabled="!uploadFile || hasError(previewRows)"
            @click="handleConfirmUpload"
          >업로드 확정</BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.reservation-team-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-12);
}

.page-header__title {
  font-size: var(--font-size-heading-3);
  font-weight: 700;
  color: var(--color-text-primary);
}

.page-header__actions { display: flex; gap: var(--space-8); }

.filter-bar {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  flex-wrap: wrap;
}

.filter-bar__date  { width: 180px; }
.filter-bar__short { width: 100px; }

/* ─── 테이블 ─── */
.table-wrap {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  overflow-x: auto;
}

.team-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-body-sm);
  white-space: nowrap;
}

.team-table th {
  background: var(--color-bg-page);
  padding: var(--space-12) var(--space-14);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
}

.team-table td {
  padding: var(--space-10) var(--space-14);
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.team-table__row:last-child td { border-bottom: none; }
.team-table__row:hover { background: var(--manager-primary-light); }

.td-name { font-weight: 600; }
.text-muted { color: var(--color-text-secondary); }

.action-group {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
}

/* ─── 모달 폼 공통 ─── */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-14);
}

.modal-hint {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-secondary);
}

.field-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.field-label {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.required { color: var(--color-danger); }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-8);
  padding-top: var(--space-8);
}

/* ─── 엑셀 업로드 ─── */
.upload-template {
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.file-input {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-primary);
}

/* ─── 미리보기 테이블 ─── */
.preview-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.preview-title {
  font-size: var(--font-size-body-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.preview-table-wrap {
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-6);
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-detail);
}

.preview-table th {
  background: var(--color-bg-page);
  padding: var(--space-8) var(--space-10);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
  position: sticky;
  top: 0;
}

.preview-table td {
  padding: var(--space-8) var(--space-10);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
}

.preview-row--warn { background: var(--color-warning-bg, #fffbeb); }
.preview-row--error { background: var(--color-danger-bg); }

.td-error-msg {
  max-width: 200px;
  white-space: normal;
  font-size: var(--font-size-detail);
  color: var(--color-danger);
}

.preview-warn {
  font-size: var(--font-size-detail);
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/* ─── 업로드 결과 ─── */
.upload-result {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-12);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-6);
}

.result-ok   { font-size: var(--font-size-body-sm); color: var(--color-success); font-weight: 600; }
.result-fail { font-size: var(--font-size-body-sm); color: var(--color-danger);  font-weight: 600; }

.result-fail-list {
  margin: 0;
  padding-left: var(--space-16);
  font-size: var(--font-size-detail);
  color: var(--color-danger);
}

/* ─── 피드백 ─── */
.feedback-err {
  font-size: var(--font-size-body-sm);
  color: var(--color-danger);
  padding: var(--space-8) var(--space-12);
  background: var(--color-danger-bg);
  border-radius: var(--radius-6);
}
</style>
