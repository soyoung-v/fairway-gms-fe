import apiClient from './apiClient'

// 골프장 목록 조회 — Admin은 전체, Manager는 소속 골프장만 반환된다
export function getGolfCourses() {
  return apiClient.get('/api/golf-course/golf-courses').then(res => res.data?.data)
}

// 골프장 등록 (Admin 전용)
export function createGolfCourse(payload) {
  return apiClient.post('/api/golf-course/golf-courses', payload).then(res => res.data?.data)
}

// 골프장 수정 (Admin 전용)
export function updateGolfCourse(golfCourseId, payload) {
  return apiClient.patch(`/api/golf-course/golf-courses/${golfCourseId}`, payload).then(res => res.data?.data)
}

export default {
  getGolfCourses,
  createGolfCourse,
  updateGolfCourse,
}
