import apiClient from './apiClient'

// 코스 목록 조회 — sortOrder 오름차순 반환 (API-207)
export function getCourses(golfCourseId) {
  return apiClient.get(`/api/golf-course/golf-courses/${golfCourseId}/courses`).then(res => res.data?.data)
}

// 코스 등록 — name/holeCount(9|18|27)/sortOrder 필수 (API-205)
export function createCourse(golfCourseId, { name, holeCount, sortOrder }) {
  return apiClient.post(`/api/golf-course/golf-courses/${golfCourseId}/courses`, { name, holeCount, sortOrder }).then(res => res.data?.data)
}

// 코스 수정 — name/holeCount/sortOrder/isActive 모두 필수 (API-206)
export function updateCourse(courseId, { name, holeCount, sortOrder, isActive }) {
  return apiClient.patch(`/api/golf-course/courses/${courseId}`, { name, holeCount, sortOrder, isActive }).then(res => res.data?.data)
}

export default { getCourses, createCourse, updateCourse }
