<script setup>
// 게시판 관리 (UI-M021) — Manager 전용
// 게시글 목록(카테고리 필터), 게시글 등록/수정/삭제, 댓글 관리
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useBoardStore } from '@/stores/useBoardStore'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseLoading from '@/components/common/BaseLoading.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'

const store = useBoardStore()
const { posts, postDetail, comments, postPage, loading, error } = storeToRefs(store)

const CATEGORY_OPTIONS = [
  { value: '',               label: '전체' },
  { value: 'SCHEDULE_NOTICE', label: '시간표 공지' },
  { value: 'GENERAL_NOTICE',  label: '일반 공지' },
]

const CATEGORY_LABEL = { SCHEDULE_NOTICE: '시간표 공지', GENERAL_NOTICE: '일반 공지' }
const CATEGORY_BADGE = { SCHEDULE_NOTICE: 'info', GENERAL_NOTICE: 'default' }

const selectedCategory = ref('')

function formatDate(str) {
  if (!str) return '—'
  return str.replace('T', ' ').slice(0, 16)
}

// ─── 게시글 목록 ────────────────────────────────────────────────
async function loadPosts(page = 0) {
  await store.fetchPosts({ category: selectedCategory.value || undefined, page })
}

onMounted(() => loadPosts())

// ─── 게시글 상세 모달 ───────────────────────────────────────────
const showDetail = ref(false)
const detailLoading = ref(false)

async function openDetail(postId) {
  showDetail.value   = true
  detailLoading.value = true
  await store.fetchPostDetail(postId)
  detailLoading.value = false
  newComment.value = ''
  commentError.value = ''
}

// ─── 게시글 등록/수정 모달 ──────────────────────────────────────
const showForm  = ref(false)
const editingId = ref(null) // null = 신규
const postForm  = ref({ category: 'GENERAL_NOTICE', title: '', content: '' })
const saving    = ref(false)
const formError = ref('')

function openCreate() {
  editingId.value = null
  postForm.value  = { category: 'GENERAL_NOTICE', title: '', content: '' }
  formError.value = ''
  showForm.value  = true
}

function openEdit(post) {
  editingId.value = post.postId
  postForm.value  = { category: post.category, title: post.title, content: postDetail.value?.content ?? '' }
  formError.value = ''
  showForm.value  = true
  // 상세가 열려있지 않으면 content 없음 — 상세 먼저 로드
  if (!postDetail.value || postDetail.value.postId !== post.postId) {
    store.fetchPostDetail(post.postId).then(() => {
      postForm.value.content = postDetail.value?.content ?? ''
    })
  }
}

async function handleSave() {
  if (!postForm.value.category) { formError.value = '카테고리를 선택해 주세요.'; return }
  if (!postForm.value.title.trim()) { formError.value = '제목을 입력해 주세요.'; return }
  if (!postForm.value.content.trim()) { formError.value = '내용을 입력해 주세요.'; return }
  saving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await store.updatePost(editingId.value, { title: postForm.value.title.trim(), content: postForm.value.content.trim() })
    } else {
      await store.createPost({ category: postForm.value.category, title: postForm.value.title.trim(), content: postForm.value.content.trim() })
    }
    showForm.value = false
  } catch (err) {
    const code = err.response?.data?.error?.code || ''
    formError.value = code === 'FORBIDDEN' ? '권한이 없습니다.' : '저장에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

// ─── 게시글 삭제 ───────────────────────────────────────────────
const deleting = ref(false)

async function handleDelete(postId) {
  if (!confirm('게시글을 삭제하시겠습니까?')) return
  deleting.value = true
  try {
    await store.deletePost(postId)
    if (showDetail.value) showDetail.value = false
  } catch {
    alert('삭제에 실패했습니다.')
  } finally {
    deleting.value = false
  }
}

// ─── 댓글 등록 / 삭제 ─────────────────────────────────────────
const newComment  = ref('')
const commentError = ref('')
const commentSaving = ref(false)

async function handleAddComment() {
  if (!newComment.value.trim()) { commentError.value = '댓글 내용을 입력해 주세요.'; return }
  commentSaving.value = true
  commentError.value  = ''
  try {
    await store.createComment(postDetail.value.postId, { content: newComment.value.trim() })
    newComment.value = ''
  } catch {
    commentError.value = '댓글 등록에 실패했습니다.'
  } finally {
    commentSaving.value = false
  }
}

async function handleDeleteComment(commentId) {
  if (!confirm('댓글을 삭제하시겠습니까?')) return
  try {
    await store.deleteComment(commentId)
  } catch {
    alert('댓글 삭제에 실패했습니다.')
  }
}
</script>

<template>
  <div class="board-view">
    <div class="page-header">
      <h1 class="page-header__title">게시판 관리</h1>
      <BaseButton variant="primary" size="sm" @click="openCreate">+ 게시글 등록</BaseButton>
    </div>

    <!-- 카테고리 필터 -->
    <div class="filter-row">
      <div class="tab-group">
        <button
          v-for="opt in CATEGORY_OPTIONS"
          :key="opt.value"
          class="tab"
          :class="{ 'is-active': selectedCategory === opt.value }"
          @click="selectedCategory = opt.value; loadPosts()"
        >{{ opt.label }}</button>
      </div>
    </div>

    <BaseLoading v-if="loading" />
    <p v-else-if="error" class="page-error">{{ error }}</p>

    <template v-else>
      <BaseEmpty v-if="!posts.length" message="등록된 게시글이 없습니다." />
      <div v-else class="table-wrap">
        <table class="gms-table">
          <thead>
            <tr>
              <th>카테고리</th>
              <th>제목</th>
              <th>댓글</th>
              <th>작성일</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in posts" :key="p.postId">
              <td>
                <BaseBadge :type="CATEGORY_BADGE[p.category] ?? 'default'">
                  {{ CATEGORY_LABEL[p.category] ?? p.category }}
                </BaseBadge>
              </td>
              <td>
                <button class="title-link" @click="openDetail(p.postId)">{{ p.title }}</button>
              </td>
              <td>{{ p.commentCount }}</td>
              <td>{{ formatDate(p.createdAt) }}</td>
              <td class="td-actions">
                <BaseButton variant="ghost" size="sm" @click="openEdit(p)">수정</BaseButton>
                <BaseButton variant="ghost" size="sm" :loading="deleting" @click="handleDelete(p.postId)">삭제</BaseButton>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 페이지네이션 -->
        <div v-if="postPage.totalPages > 1" class="pagination">
          <BaseButton variant="ghost" size="sm" :disabled="postPage.number === 0" @click="loadPosts(postPage.number - 1)">이전</BaseButton>
          <span class="page-info">{{ postPage.number + 1 }} / {{ postPage.totalPages }}</span>
          <BaseButton variant="ghost" size="sm" :disabled="postPage.number >= postPage.totalPages - 1" @click="loadPosts(postPage.number + 1)">다음</BaseButton>
        </div>
      </div>
    </template>

    <!-- 게시글 상세 모달 -->
    <BaseModal :visible="showDetail" :title="postDetail?.title ?? '게시글 상세'" @close="showDetail = false">
      <BaseLoading v-if="detailLoading" />
      <template v-else-if="postDetail">
        <div class="detail-meta">
          <BaseBadge :type="CATEGORY_BADGE[postDetail.category] ?? 'default'">
            {{ CATEGORY_LABEL[postDetail.category] ?? postDetail.category }}
          </BaseBadge>
          <span class="detail-date">{{ formatDate(postDetail.createdAt) }}</span>
        </div>
        <div class="detail-content">{{ postDetail.content }}</div>

        <div class="comment-section">
          <h3 class="comment-title">댓글 ({{ comments.length }})</h3>
          <div v-if="comments.length" class="comment-list">
            <div v-for="c in comments" :key="c.commentId" class="comment-item">
              <span class="comment-author">{{ c.authorType === 'MANAGER' ? '매니저' : '캐디' }}</span>
              <span class="comment-content">{{ c.content }}</span>
              <span class="comment-date">{{ formatDate(c.createdAt) }}</span>
              <button class="comment-del" @click="handleDeleteComment(c.commentId)">삭제</button>
            </div>
          </div>
          <p v-else class="comment-empty">댓글이 없습니다.</p>

          <div class="comment-input-row">
            <BaseInput v-model="newComment" placeholder="댓글을 입력해 주세요" :disabled="commentSaving" @keyup.enter="handleAddComment" />
            <BaseButton variant="primary" size="sm" :loading="commentSaving" @click="handleAddComment">등록</BaseButton>
          </div>
          <p v-if="commentError" class="form-error">{{ commentError }}</p>
        </div>
      </template>
      <template #footer>
        <BaseButton variant="ghost" @click="openEdit(postDetail)">수정</BaseButton>
        <BaseButton variant="ghost" @click="handleDelete(postDetail.postId)">삭제</BaseButton>
        <BaseButton variant="primary" @click="showDetail = false">닫기</BaseButton>
      </template>
    </BaseModal>

    <!-- 게시글 등록/수정 모달 -->
    <BaseModal
      :visible="showForm"
      :title="editingId ? '게시글 수정' : '게시글 등록'"
      @close="showForm = false"
    >
      <div class="form">
        <div v-if="!editingId" class="form-row">
          <label class="form-label">카테고리 <span class="required">*</span></label>
          <BaseSelect
            v-model="postForm.category"
            :options="CATEGORY_OPTIONS.filter(o => o.value)"
            :disabled="saving"
          />
        </div>
        <div class="form-row">
          <label class="form-label">제목 <span class="required">*</span></label>
          <BaseInput v-model="postForm.title" placeholder="제목을 입력해 주세요 (최대 200자)" :disabled="saving" />
        </div>
        <div class="form-row">
          <label class="form-label">내용 <span class="required">*</span></label>
          <textarea
            v-model="postForm.content"
            class="content-textarea"
            rows="8"
            placeholder="내용을 입력해 주세요"
            :disabled="saving"
          />
        </div>
        <p v-if="formError" class="form-error">{{ formError }}</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" :disabled="saving" @click="showForm = false">취소</BaseButton>
        <BaseButton variant="primary" :loading="saving" @click="handleSave">저장</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.board-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-header__title {
  font-size: var(--font-size-heading-2);
  font-weight: 700;
  color: var(--color-text-primary);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.tab-group {
  display: flex;
  gap: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.tab {
  padding: var(--space-8) var(--space-16);
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}

.tab.is-active {
  color: var(--manager-primary);
  border-bottom-color: var(--manager-primary);
}

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

.title-link {
  color: var(--manager-primary);
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.td-actions {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-12);
  padding: var(--space-12);
  border-top: 1px solid var(--color-border);
}

.page-info { font-size: var(--font-size-body-sm); color: var(--color-text-secondary); }

/* 상세 모달 */
.detail-meta {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  margin-bottom: var(--space-12);
}

.detail-date { font-size: var(--font-size-detail); color: var(--color-text-secondary); }

.detail-content {
  white-space: pre-wrap;
  font-size: var(--font-size-body-sm);
  color: var(--color-text-primary);
  line-height: 1.7;
  padding: var(--space-16);
  background: var(--color-bg-page);
  border-radius: var(--radius-8);
  border: 1px solid var(--color-border);
  min-height: 80px;
}

.comment-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
  margin-top: var(--space-20);
}

.comment-title {
  font-size: var(--font-size-body-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  padding-bottom: var(--space-8);
  border-bottom: 1px solid var(--color-border);
}

.comment-list { display: flex; flex-direction: column; gap: var(--space-8); }

.comment-item {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-8) var(--space-12);
  background: var(--color-bg-page);
  border-radius: var(--radius-8);
  font-size: var(--font-size-body-sm);
}

.comment-author {
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  min-width: 48px;
}

.comment-content { flex: 1; color: var(--color-text-primary); }

.comment-date { font-size: var(--font-size-detail); color: var(--color-text-secondary); white-space: nowrap; }

.comment-del {
  font-size: var(--font-size-detail);
  color: var(--color-danger);
  padding: 2px 6px;
}

.comment-empty { font-size: var(--font-size-body-sm); color: var(--color-text-secondary); }

.comment-input-row {
  display: flex;
  gap: var(--space-8);
  align-items: center;
}

/* 폼 */
.form { display: flex; flex-direction: column; gap: var(--space-16); }

.form-row { display: flex; flex-direction: column; gap: var(--space-6); }

.form-label {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.content-textarea {
  width: 100%;
  padding: var(--space-10) var(--space-12);
  font-size: var(--font-size-body-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-8);
  background: var(--color-bg-input);
  color: var(--color-text-primary);
  resize: vertical;
  outline: none;
  line-height: 1.6;
  font-family: inherit;
}

.content-textarea:focus { border-color: var(--color-border-focus); }

.form-error { font-size: var(--font-size-detail); color: var(--color-danger); }
.required { color: var(--color-danger); }
</style>
