<script setup>
// 게시글 상세 (UI-C007) — Caddy 전용
// 게시글 내용 + 댓글 목록 + 댓글 등록. CaddyLayout이 BottomNav를 자동으로 숨긴다
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import boardApi from '@/api/boardApi'
import BaseLoading from '@/components/common/BaseLoading.vue'

const route  = useRoute()
const router = useRouter()

const postId = Number(route.params.postId)

const post     = ref(null)
const comments = ref([])
const loading  = ref(false)
const error    = ref('')

const CATEGORY_LABEL = { SCHEDULE_NOTICE: '시간표 공지', GENERAL_NOTICE: '일반 공지' }
const AUTHOR_LABEL   = { MANAGER: '매니저', CADDY: '캐디' }

function formatDate(str) {
  if (!str) return '—'
  return str.replace('T', ' ').slice(0, 16)
}

onMounted(async () => {
  loading.value = true
  error.value   = ''
  try {
    const [postData, cmtData] = await Promise.all([
      boardApi.getPost(postId),
      boardApi.getComments(postId),
    ])
    post.value     = postData
    comments.value = cmtData?.content ?? cmtData ?? []
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    error.value = code === 'POST_NOT_FOUND' ? '게시글을 찾을 수 없습니다.' : '게시글을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
})

// ─── 댓글 등록 ─────────────────────────────────────────────────
const newComment    = ref('')
const commentSaving = ref(false)
const commentError  = ref('')

async function handleAddComment() {
  if (!newComment.value.trim()) { commentError.value = '댓글을 입력해 주세요.'; return }
  commentSaving.value = true
  commentError.value  = ''
  try {
    const result   = await boardApi.createComment(postId, { content: newComment.value.trim() })
    comments.value = [...comments.value, result]
    newComment.value = ''
  } catch {
    commentError.value = '댓글 등록에 실패했습니다.'
  } finally {
    commentSaving.value = false
  }
}
</script>

<template>
  <div class="detail-view">
    <!-- 자체 헤더 (BottomNav 없는 몰입형 화면) -->
    <div class="detail-header">
      <button class="back-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <span class="header-title">게시글</span>
    </div>

    <BaseLoading v-if="loading" />
    <p v-else-if="error" class="page-error">{{ error }}</p>

    <template v-else-if="post">
      <!-- 게시글 본문 -->
      <div class="post-card">
        <div class="post-meta">
          <span class="cat-badge">{{ CATEGORY_LABEL[post.category] ?? post.category }}</span>
          <span class="post-date">{{ formatDate(post.createdAt) }}</span>
        </div>
        <h1 class="post-title">{{ post.title }}</h1>
        <p class="post-content">{{ post.content }}</p>
      </div>

      <!-- 댓글 영역 -->
      <div class="comment-section">
        <h2 class="comment-title">댓글 {{ comments.length }}</h2>

        <div v-if="comments.length" class="comment-list">
          <div v-for="c in comments" :key="c.commentId" class="comment-item">
            <div class="comment-author-row">
              <span class="comment-author">{{ AUTHOR_LABEL[c.authorType] ?? c.authorType }}</span>
              <span class="comment-date">{{ formatDate(c.createdAt) }}</span>
            </div>
            <p class="comment-content">{{ c.content }}</p>
          </div>
        </div>
        <p v-else class="comment-empty">첫 번째 댓글을 남겨보세요.</p>
      </div>
    </template>

    <!-- 댓글 입력창 — 고정 하단 -->
    <div v-if="post" class="comment-input-bar">
      <input
        v-model="newComment"
        type="text"
        class="comment-input"
        placeholder="댓글을 입력해 주세요"
        :disabled="commentSaving"
        @keyup.enter="handleAddComment"
      />
      <button class="comment-send-btn" :disabled="commentSaving" @click="handleAddComment">
        <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
          <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
    <p v-if="commentError" class="comment-error">{{ commentError }}</p>
  </div>
</template>

<style scoped>
.detail-view {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px));
}

.detail-header {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  height: 52px;
  padding: 0 var(--space-16);
  border-bottom: 1px solid var(--color-border);
  position: sticky; top: 0; z-index: 10;
  background: var(--color-bg-card);
}

.back-btn {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px;
  color: var(--color-text-primary);
  -webkit-tap-highlight-color: transparent;
}

.header-title {
  font-size: var(--font-size-body-sm); font-weight: 600;
  color: var(--color-text-primary);
}

.page-error {
  margin: var(--space-16);
  color: var(--color-danger); font-size: var(--font-size-body-sm);
  padding: var(--space-12); background: var(--color-danger-bg); border-radius: var(--radius-8);
}

.post-card {
  padding: var(--space-20) var(--space-16);
  border-bottom: 4px solid var(--color-bg-page);
  display: flex; flex-direction: column; gap: var(--space-12);
}

.post-meta { display: flex; align-items: center; gap: var(--space-8); }

.cat-badge {
  font-size: var(--font-size-detail); font-weight: 600;
  padding: 2px 8px; border-radius: var(--radius-4);
  background: #e0f0ff; color: #0066cc;
}

.post-date { font-size: var(--font-size-detail); color: var(--color-text-secondary); }

.post-title {
  font-size: 18px; font-weight: 700;
  color: var(--color-text-primary); line-height: 1.4;
}

.post-content {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-primary);
  line-height: 1.7;
  white-space: pre-wrap;
}

.comment-section {
  padding: var(--space-16);
  display: flex; flex-direction: column; gap: var(--space-12);
}

.comment-title {
  font-size: var(--font-size-body-sm); font-weight: 700;
  color: var(--color-text-primary);
  padding-bottom: var(--space-8);
  border-bottom: 1px solid var(--color-border);
}

.comment-list { display: flex; flex-direction: column; gap: var(--space-12); }

.comment-item {
  display: flex; flex-direction: column; gap: var(--space-4);
  padding: var(--space-10) var(--space-12);
  background: var(--color-bg-page);
  border-radius: var(--radius-8);
}

.comment-author-row {
  display: flex; align-items: center; justify-content: space-between;
}

.comment-author {
  font-size: var(--font-size-detail); font-weight: 600;
  color: var(--caddy-primary);
}

.comment-date { font-size: var(--font-size-detail); color: var(--color-text-secondary); }

.comment-content { font-size: var(--font-size-body-sm); color: var(--color-text-primary); line-height: 1.5; }

.comment-empty {
  font-size: var(--font-size-body-sm); color: var(--color-text-secondary);
  text-align: center; padding: var(--space-20) 0;
}

/* 고정 하단 댓글 입력창 */
.comment-input-bar {
  position: fixed;
  bottom: env(safe-area-inset-bottom, 0px);
  left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 430px;
  display: flex; align-items: center; gap: var(--space-8);
  padding: var(--space-10) var(--space-16);
  background: var(--color-bg-card);
  border-top: 1px solid var(--color-border);
  z-index: 20;
}

.comment-input {
  flex: 1;
  padding: var(--space-10) var(--space-12);
  font-size: var(--font-size-body-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  outline: none;
}

.comment-input:focus { border-color: var(--caddy-primary); }

.comment-send-btn {
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  background: var(--caddy-primary); color: #fff;
  border-radius: var(--radius-8);
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}

.comment-send-btn:disabled { opacity: 0.5; }

.comment-error {
  position: fixed; bottom: calc(60px + env(safe-area-inset-bottom, 0px));
  left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 430px;
  padding: var(--space-6) var(--space-16);
  font-size: var(--font-size-detail);
  color: var(--color-danger);
  background: var(--color-danger-bg);
  text-align: center;
}
</style>
