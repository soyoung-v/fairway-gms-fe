import { defineStore } from 'pinia'
import { ref } from 'vue'
import boardApi from '@/api/boardApi'

export const useBoardStore = defineStore('board', () => {
  const posts        = ref([])   // BoardPostSummaryRes[]
  const postDetail   = ref(null) // BoardPostRes
  const comments     = ref([])   // BoardCommentRes[]
  const swapRequests = ref([])   // SwapRequestSummaryRes[]
  const postPage     = ref({ number: 0, totalPages: 1, totalElements: 0 })
  const swapPage     = ref({ number: 0, totalPages: 1, totalElements: 0 })
  const loading      = ref(false)
  const error        = ref('')

  // 게시글 목록을 불러온다 (카테고리 필터 지원)
  async function fetchPosts({ category, page = 0 } = {}) {
    loading.value = true
    error.value   = ''
    try {
      const data    = await boardApi.getPosts({ category, page })
      posts.value   = data?.content ?? data ?? []
      postPage.value = { number: data?.number ?? 0, totalPages: data?.totalPages ?? 1, totalElements: data?.totalElements ?? 0 }
    } catch {
      error.value = '게시글 목록을 불러오지 못했습니다.'
    } finally {
      loading.value = false
    }
  }

  // 게시글 단건 + 댓글을 함께 로드한다
  async function fetchPostDetail(postId) {
    loading.value = true
    error.value   = ''
    try {
      const [post, cmt] = await Promise.all([
        boardApi.getPost(postId),
        boardApi.getComments(postId),
      ])
      postDetail.value = post
      comments.value   = cmt?.content ?? cmt ?? []
    } catch {
      error.value = '게시글을 불러오지 못했습니다.'
    } finally {
      loading.value = false
    }
  }

  // 게시글을 작성하고 목록 맨 앞에 삽입한다
  async function createPost(payload) {
    const result = await boardApi.createPost(payload)
    posts.value  = [
      { postId: result.postId, category: result.category, title: result.title, createdAt: result.createdAt, commentCount: 0 },
      ...posts.value,
    ]
    return result
  }

  // 게시글을 수정하고 목록·상세를 갱신한다
  async function updatePost(postId, payload) {
    const result = await boardApi.updatePost(postId, payload)
    const idx    = posts.value.findIndex(p => p.postId === postId)
    if (idx !== -1) posts.value[idx] = { ...posts.value[idx], title: result.title }
    if (postDetail.value?.postId === postId) postDetail.value = result
    return result
  }

  // 게시글을 삭제하고 목록에서 제거한다
  async function deletePost(postId) {
    await boardApi.deletePost(postId)
    posts.value = posts.value.filter(p => p.postId !== postId)
    if (postDetail.value?.postId === postId) postDetail.value = null
  }

  // 댓글을 작성하고 로컬 목록에 추가한다
  async function createComment(postId, payload) {
    const result   = await boardApi.createComment(postId, payload)
    comments.value = [...comments.value, result]
    const idx      = posts.value.findIndex(p => p.postId === postId)
    if (idx !== -1) posts.value[idx] = { ...posts.value[idx], commentCount: (posts.value[idx].commentCount ?? 0) + 1 }
    return result
  }

  // 댓글을 삭제하고 로컬 목록에서 제거한다
  async function deleteComment(commentId) {
    await boardApi.deleteComment(commentId)
    comments.value = comments.value.filter(c => c.commentId !== commentId)
  }

  // 순번교환 요청 목록을 불러온다 (status 필터 지원)
  async function fetchSwapRequests({ status, page = 0 } = {}) {
    loading.value = true
    error.value   = ''
    try {
      const data         = await boardApi.getSwapRequests({ status, page })
      swapRequests.value = data?.content ?? data ?? []
      swapPage.value     = { number: data?.number ?? 0, totalPages: data?.totalPages ?? 1, totalElements: data?.totalElements ?? 0 }
    } catch {
      error.value = '순번교환 요청 목록을 불러오지 못했습니다.'
    } finally {
      loading.value = false
    }
  }

  // 순번교환 요청을 승인하고 로컬 상태를 갱신한다
  async function approveSwapRequest(requestId) {
    await boardApi.approveSwapRequest(requestId)
    _updateSwapStatus(requestId, 'APPROVED')
  }

  // 순번교환 요청을 거절하고 로컬 상태를 갱신한다
  async function rejectSwapRequest(requestId, payload) {
    await boardApi.rejectSwapRequest(requestId, payload)
    _updateSwapStatus(requestId, 'REJECTED', payload.rejectReason)
  }

  function _updateSwapStatus(requestId, status, rejectReason = null) {
    const idx = swapRequests.value.findIndex(r => r.requestId === requestId)
    if (idx !== -1) swapRequests.value[idx] = { ...swapRequests.value[idx], status, rejectReason }
  }

  function $reset() {
    posts.value        = []
    postDetail.value   = null
    comments.value     = []
    swapRequests.value = []
    loading.value      = false
    error.value        = ''
  }

  return {
    posts, postDetail, comments, swapRequests,
    postPage, swapPage, loading, error,
    fetchPosts, fetchPostDetail,
    createPost, updatePost, deletePost,
    createComment, deleteComment,
    fetchSwapRequests, approveSwapRequest, rejectSwapRequest,
    $reset,
  }
})
