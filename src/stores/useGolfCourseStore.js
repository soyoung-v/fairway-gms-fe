import { defineStore } from 'pinia'
import { ref } from 'vue'

const SESSION_KEY = 'gms_golf_course'

// Admin이 선택한 작업 대상 골프장 컨텍스트를 관리한다
// Manager/Caddy는 소속 골프장이 JWT에 고정되어 있으므로 이 store를 사용하지 않는다
export const useGolfCourseStore = defineStore('golfCourse', () => {
  // ─── state ───────────────────────────────────────────
  const selectedGolfCourseId   = ref(null)
  const selectedGolfCourseName = ref('')
  // Admin이 접근 가능한 골프장 목록 — golfCourseApi에서 로드한다
  const golfCourseList = ref([])

  // ─── actions ──────────────────────────────────────────

  // Admin이 작업 대상 골프장을 선택한다 — 이후 course-scoped API에 헤더로 전달된다
  function selectGolfCourse(id, name) {
    selectedGolfCourseId.value   = id
    selectedGolfCourseName.value = name || ''
    _persist()
  }

  // 선택된 골프장 컨텍스트를 초기화한다
  function clearSelection() {
    selectedGolfCourseId.value   = null
    selectedGolfCourseName.value = ''
    sessionStorage.removeItem(SESSION_KEY)
  }

  // 골프장 목록을 갱신한다 — golfCourseApi.getList() 응답을 받아 저장한다
  function setGolfCourseList(list) {
    golfCourseList.value = list || []
  }

  // 앱 초기화 또는 새로고침 시 sessionStorage에서 복원한다
  function restoreSelection() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      selectedGolfCourseId.value   = saved.id   ?? null
      selectedGolfCourseName.value = saved.name || ''
    } catch {
      sessionStorage.removeItem(SESSION_KEY)
    }
  }

  function _persist() {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      id:   selectedGolfCourseId.value,
      name: selectedGolfCourseName.value,
    }))
  }

  return {
    // state
    selectedGolfCourseId, selectedGolfCourseName, golfCourseList,
    // actions
    selectGolfCourse, clearSelection, setGolfCourseList, restoreSelection,
  }
})
