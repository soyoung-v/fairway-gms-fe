import apiClient from './apiClient'

// ─────────────────────────────────────────────────────────────────────────────
// 게시글 — /api/board/posts
// ─────────────────────────────────────────────────────────────────────────────

// 게시글 목록 조회 — category(SCHEDULE_NOTICE|GENERAL_NOTICE) 필터, 페이지 (API-801)
export function getPosts({ category, page = 0, size = 20 } = {}) {
  const params = { page, size }
  if (category) params.category = category
  return apiClient.get('/api/board/posts', { params }).then(res => res.data?.data)
}

// 게시글 단건 조회 (API-802)
export function getPost(postId) {
  return apiClient.get(`/api/board/posts/${postId}`).then(res => res.data?.data)
}

// 게시글 작성 — category, title, content 필수 (API-803)
export function createPost({ category, title, content }) {
  return apiClient.post('/api/board/posts', { category, title, content }).then(res => res.data?.data)
}

// 게시글 수정 — title, content (API-804)
export function updatePost(postId, { title, content }) {
  return apiClient.put(`/api/board/posts/${postId}`, { title, content }).then(res => res.data?.data)
}

// 게시글 삭제 — 소프트 삭제 (API-805)
export function deletePost(postId) {
  return apiClient.delete(`/api/board/posts/${postId}`).then(res => res.data?.data)
}

// ─────────────────────────────────────────────────────────────────────────────
// 댓글 — /api/board/posts/{postId}/comments
// ─────────────────────────────────────────────────────────────────────────────

// 댓글 목록 조회 (API-806)
export function getComments(postId, { page = 0, size = 20 } = {}) {
  return apiClient.get(`/api/board/posts/${postId}/comments`, { params: { page, size } }).then(res => res.data?.data)
}

// 댓글 작성 (API-807)
export function createComment(postId, { content }) {
  return apiClient.post(`/api/board/posts/${postId}/comments`, { content }).then(res => res.data?.data)
}

// 댓글 삭제 (API-808)
export function deleteComment(commentId) {
  return apiClient.delete(`/api/board/comments/${commentId}`).then(res => res.data?.data)
}

// ─────────────────────────────────────────────────────────────────────────────
// 순번교환 요청 — /api/board/swap-requests
// ─────────────────────────────────────────────────────────────────────────────

// 순번교환 요청 목록 조회 — status 필터 (Manager용, API-809)
export function getSwapRequests({ status, page = 0, size = 20 } = {}) {
  const params = { page, size }
  if (status) params.status = status
  return apiClient.get('/api/board/swap-requests', { params }).then(res => res.data?.data)
}

// 순번교환 요청 생성 (Caddy용, API-810)
export function createSwapRequest({ targetCaddieId, requestDate, reason }) {
  return apiClient.post('/api/board/swap-requests', { targetCaddieId, requestDate, reason }).then(res => res.data?.data)
}

// 순번교환 요청 승인 (Manager용, API-811)
export function approveSwapRequest(requestId) {
  return apiClient.patch(`/api/board/swap-requests/${requestId}/approve`).then(res => res.data?.data)
}

// 순번교환 요청 거절 — rejectReason 필수 (Manager용, API-812)
export function rejectSwapRequest(requestId, { rejectReason }) {
  return apiClient.patch(`/api/board/swap-requests/${requestId}/reject`, { rejectReason }).then(res => res.data?.data)
}

// 내 순번교환 요청 목록 (Caddy용, API-813)
export function getMySwapRequests({ page = 0, size = 20 } = {}) {
  return apiClient.get('/api/board/swap-requests/my', { params: { page, size } }).then(res => res.data?.data)
}

export default {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  getComments,
  createComment,
  deleteComment,
  getSwapRequests,
  createSwapRequest,
  approveSwapRequest,
  rejectSwapRequest,
  getMySwapRequests,
}
