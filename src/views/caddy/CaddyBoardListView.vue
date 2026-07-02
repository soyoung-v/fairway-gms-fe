<script setup>
// 공지 게시판 (UI-C006) — Caddy 전용
// 카테고리 필터(전체/시간표공지/일반공지) + 게시글 목록
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import boardApi from '@/api/boardApi'
import BaseLoading from '@/components/common/BaseLoading.vue'

const router = useRouter()

const CATEGORIES = [
  { value: '',                label: '전체' },
  { value: 'SCHEDULE_NOTICE', label: '시간표 공지' },
  { value: 'GENERAL_NOTICE',  label: '일반 공지' },
]

const CATEGORY_LABEL = { SCHEDULE_NOTICE: '시간표', GENERAL_NOTICE: '일반' }
const CATEGORY_CLASS  = { SCHEDULE_NOTICE: 'cat--schedule', GENERAL_NOTICE: 'cat--general' }

const selectedCategory = ref('')
const posts   = ref([])
const page    = ref({ number: 0, totalPages: 1 })
const loading = ref(false)
const error   = ref('')

function formatDate(str) {
  return str ? str.slice(0, 10) : '—'
}

async function loadPosts(pageNum = 0) {
  loading.value = true
  error.value   = ''
  try {
    const data  = await boardApi.getPosts({ category: selectedCategory.value || undefined, page: pageNum })
    posts.value = data?.content ?? data ?? []
    page.value  = { number: data?.number ?? 0, totalPages: data?.totalPages ?? 1 }
  } catch {
    error.value = '게시글 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(() => loadPosts())
</script>

<template>
  <div class="board-list-view">
    <!-- 카테고리 탭 -->
    <div class="cat-tabs">
      <button
        v-for="cat in CATEGORIES"
        :key="cat.value"
        class="cat-tab"
        :class="{ 'is-active': selectedCategory === cat.value }"
        @click="selectedCategory = cat.value; loadPosts()"
      >{{ cat.label }}</button>
    </div>

    <BaseLoading v-if="loading" />
    <p v-else-if="error" class="page-error">{{ error }}</p>

    <template v-else>
      <div v-if="!posts.length" class="empty-card"><p>게시글이 없습니다.</p></div>

      <div class="post-list">
        <div
          v-for="p in posts"
          :key="p.postId"
          class="post-item"
          @click="router.push(`/caddy/board/${p.postId}`)"
        >
          <div class="post-item__top">
            <span class="cat-badge" :class="CATEGORY_CLASS[p.category]">
              {{ CATEGORY_LABEL[p.category] ?? p.category }}
            </span>
            <span class="post-date">{{ formatDate(p.createdAt) }}</span>
          </div>
          <p class="post-title">{{ p.title }}</p>
          <div class="post-meta">
            <svg class="meta-icon" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
            </svg>
            <span>{{ p.commentCount }}</span>
          </div>
        </div>
      </div>

      <div v-if="page.totalPages > 1" class="pagination">
        <button class="page-btn" :disabled="page.number === 0" @click="loadPosts(page.number - 1)">이전</button>
        <span class="page-info">{{ page.number + 1 }} / {{ page.totalPages }}</span>
        <button class="page-btn" :disabled="page.number >= page.totalPages - 1" @click="loadPosts(page.number + 1)">다음</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.board-list-view {
  display: flex;
  flex-direction: column;
}

.cat-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  padding: 0 var(--space-16);
}

.cat-tab {
  flex: 1;
  padding: var(--space-12) var(--space-4);
  font-size: var(--font-size-body-sm); font-weight: 500;
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  -webkit-tap-highlight-color: transparent;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}

.cat-tab.is-active { color: var(--caddy-primary); border-bottom-color: var(--caddy-primary); }

.page-error {
  margin: var(--space-16);
  color: var(--color-danger); font-size: var(--font-size-body-sm);
  padding: var(--space-12); background: var(--color-danger-bg); border-radius: var(--radius-8);
}

.empty-card {
  display: flex; justify-content: center; padding: var(--space-40) var(--space-20);
  color: var(--color-text-secondary); font-size: var(--font-size-body-sm);
}

.post-list { display: flex; flex-direction: column; }

.post-item {
  padding: var(--space-16);
  border-bottom: 1px solid var(--color-border);
  display: flex; flex-direction: column; gap: var(--space-6);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.post-item:active { background: var(--color-bg-page); }

.post-item__top { display: flex; align-items: center; justify-content: space-between; }

.cat-badge {
  font-size: var(--font-size-detail); font-weight: 600;
  padding: 2px 8px; border-radius: var(--radius-4);
}

.cat--schedule { background: #e0f0ff; color: #0066cc; }
.cat--general  { background: var(--color-bg-page); color: var(--color-text-secondary); border: 1px solid var(--color-border); }

.post-date { font-size: var(--font-size-detail); color: var(--color-text-secondary); }

.post-title {
  font-size: var(--font-size-body-sm); font-weight: 600;
  color: var(--color-text-primary); line-height: 1.4;
}

.post-meta {
  display: flex; align-items: center; gap: 4px;
  font-size: var(--font-size-detail); color: var(--color-text-secondary);
}

.meta-icon { width: 13px; height: 13px; }

.pagination {
  display: flex; align-items: center; justify-content: center; gap: var(--space-12);
  padding: var(--space-16); border-top: 1px solid var(--color-border);
}

.page-btn {
  font-size: var(--font-size-body-sm); color: var(--caddy-primary); font-weight: 500;
  padding: var(--space-6) var(--space-12);
  border: 1px solid var(--caddy-primary); border-radius: var(--radius-8);
  -webkit-tap-highlight-color: transparent;
}

.page-btn:disabled { color: var(--color-text-secondary); border-color: var(--color-border); }
.page-info { font-size: var(--font-size-body-sm); color: var(--color-text-secondary); }
</style>
