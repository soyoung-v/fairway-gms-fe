import apiClient from './apiClient'

// 알림 목록 조회 — 페이지네이션, 최신순 (API-701)
export function getNotifications({ page = 0, size = 20 } = {}) {
  return apiClient.get('/api/notification/notifications', { params: { page, size } }).then(res => res.data?.data)
}

// 미읽음 알림 수 조회 (API-702)
export function getUnreadCount() {
  return apiClient.get('/api/notification/notifications/unread-count').then(res => res.data?.data)
}

// 단건 읽음 처리 (API-703)
export function markAsRead(notificationId) {
  return apiClient.patch(`/api/notification/notifications/${notificationId}/read`).then(res => res.data?.data)
}

// 전체 읽음 처리 (API-704)
export function markAllAsRead() {
  return apiClient.patch('/api/notification/notifications/read-all').then(res => res.data?.data)
}

// FCM 토큰 등록 — deviceType: 'WEB' | 'MOBILE' (API-705)
export function registerFcmToken({ token, deviceType }) {
  return apiClient.post('/api/notification/fcm/tokens', { token, deviceType }).then(res => res.data?.data)
}

// FCM 토큰 해제 (API-706)
export function deleteFcmToken(token) {
  return apiClient.delete('/api/notification/fcm/tokens', { data: { token } }).then(res => res.data?.data)
}

// 알림 수신 설정 조회 (API-708)
export function getSettings() {
  return apiClient.get('/api/notification/settings').then(res => res.data?.data)
}

// 알림 수신 설정 수정 — 변경할 필드만 전달 (API-707)
export function updateSettings({ isAssignmentEnabled, isBoardEnabled, isSwapEnabled } = {}) {
  return apiClient.patch('/api/notification/settings', { isAssignmentEnabled, isBoardEnabled, isSwapEnabled }).then(res => res.data?.data)
}

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  registerFcmToken,
  deleteFcmToken,
  getSettings,
  updateSettings,
}
