<template>
  <div class="novel-read">
    <div v-if="!chapters.length" class="read-empty">
      <Empty description="暂无章节可阅读，请先生成章节" />
    </div>

    <template v-else>
      <div class="read-header">
        <div class="read-header-left">
          <el-button text :disabled="!hasPrev" @click="prevChapter">
            <el-icon><ArrowLeft /></el-icon>上一章
          </el-button>
        </div>
        <div class="read-header-center">
          <span class="read-chapter-title">
            第{{ currentChapter.chapterNumber }}章 {{ currentChapter.title }}
          </span>
        </div>
        <div class="read-header-right">
          <el-button text :disabled="!hasNext" @click="nextChapter">
            下一章<el-icon><ArrowRight /></el-icon>
          </el-button>
          <el-divider direction="vertical" />
          <el-button text @click="tocVisible = true">
            <el-icon><List /></el-icon>目录
          </el-button>
        </div>
      </div>

      <div ref="readBodyRef" class="read-body">
        <article class="read-content">
          <p v-for="(para, i) in paragraphs" :key="i">{{ para }}</p>
        </article>
      </div>

      <div class="read-footer">
        <el-button :disabled="!hasPrev" @click="prevChapter">
          <el-icon><ArrowLeft /></el-icon>上一章
        </el-button>
        <span class="read-progress"
          >{{ currentChapter.chapterNumber }} / {{ chapters.length }}</span
        >
        <el-button :disabled="!hasNext" @click="nextChapter">
          下一章<el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>
    </template>

    <el-drawer v-model="tocVisible" title="目录" size="320px" direction="rtl">
      <div class="toc-list">
        <div
          v-for="ch in chapters"
          :key="ch.id"
          class="toc-item"
          :class="{ active: ch.id === currentChapterId }"
          @click="goToChapter(ch)"
        >
          <span class="toc-number">{{ ch.chapterNumber }}.</span>
          <span class="toc-title">{{ ch.title || '未命名' }}</span>
          <span class="toc-words">{{ ch.wordCount || 0 }}字</span>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeft, ArrowRight, List } from '@element-plus/icons-vue';
import Empty from '@/components/common/Empty.vue';
import { chapterApi } from '@/api/novel';
import { chapterGenerationApi } from '@/api/chapter-generation';
import type { NovelChapter } from '@/types';

const route = useRoute();
const novelId = computed(() => route.params.id as string);

const chapters = ref<NovelChapter[]>([]);
const currentChapterId = ref<string | null>(null);
const currentChapter = ref<NovelChapter>({
  id: '',
  novelId: '',
  chapterNumber: 0,
  title: '',
  wordCount: 0,
  status: 'draft',
  generationStatus: 'pending',
});
const readBodyRef = ref<HTMLElement | null>(null);
const tocVisible = ref(false);

const paragraphs = computed(() => {
  const content = currentChapter.value.content || '';
  return content.split(/\n+/).filter((p) => p.trim().length > 0);
});

const currentIndex = computed(() =>
  chapters.value.findIndex((ch) => ch.id === currentChapterId.value),
);

const hasPrev = computed(() => currentIndex.value > 0);
const hasNext = computed(() => currentIndex.value < chapters.value.length - 1);

async function loadChapters() {
  const res = await chapterApi.findByNovelId(novelId.value);
  chapters.value = (res.data || []).sort((a, b) => a.chapterNumber - b.chapterNumber);
}

async function loadReadingPosition() {
  try {
    const res = await chapterGenerationApi.getReadingPosition(novelId.value);
    if (res.data.chapterId) {
      const ch = chapters.value.find((c) => c.id === res.data.chapterId);
      if (ch) {
        await loadChapter(ch);
        return;
      }
    }
  } catch {
    // fallback to first chapter
  }
  if (chapters.value.length) {
    await loadChapter(chapters.value[0]);
  }
}

async function loadChapter(ch: NovelChapter) {
  currentChapterId.value = ch.id;
  const res = await chapterApi.findById(novelId.value, ch.id);
  currentChapter.value = res.data;
  await nextTick();
  if (readBodyRef.value) {
    readBodyRef.value.scrollTop = 0;
  }
  saveReadingPosition();
}

function goToChapter(ch: NovelChapter) {
  loadChapter(ch);
  tocVisible.value = false;
}

function prevChapter() {
  const idx = currentIndex.value;
  if (idx > 0) {
    loadChapter(chapters.value[idx - 1]);
  }
}

function nextChapter() {
  const idx = currentIndex.value;
  if (idx < chapters.value.length - 1) {
    loadChapter(chapters.value[idx + 1]);
  }
}

async function saveReadingPosition() {
  if (!currentChapterId.value) return;
  try {
    await chapterGenerationApi.saveReadingPosition(novelId.value, currentChapterId.value);
  } catch {
    // silent fail
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    if (e.altKey) {
      e.preventDefault();
      prevChapter();
    }
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    if (e.altKey) {
      e.preventDefault();
      nextChapter();
    }
  }
}

onMounted(async () => {
  await loadChapters();
  await loadReadingPosition();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped lang="scss">
.novel-read {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 56px - 40px);
  margin: -20px;
  background: #fefcf5;
}

.read-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.read-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;

  .read-header-left,
  .read-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 180px;
  }

  .read-header-right {
    justify-content: flex-end;
  }

  .read-header-center {
    flex: 1;
    text-align: center;

    .read-chapter-title {
      font-size: 15px;
      font-weight: 500;
      color: #303133;
    }
  }
}

.read-body {
  flex: 1;
  overflow-y: auto;
  padding: 40px 20px;
}

.read-content {
  max-width: 680px;
  margin: 0 auto;

  p {
    font-size: 18px;
    line-height: 2;
    color: #2c3e50;
    text-indent: 2em;
    margin-bottom: 1em;
    font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Source Han Serif CN', serif;
    letter-spacing: 0.02em;
  }
}

.read-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 12px 24px;
  background: #fff;
  border-top: 1px solid #e4e7ed;
  flex-shrink: 0;

  .read-progress {
    font-size: 13px;
    color: #909399;
  }
}

.toc-list {
  .toc-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    cursor: pointer;
    border-bottom: 1px solid #f5f5f5;
    transition: background 0.2s;

    &:hover {
      background: #f5f7fa;
    }

    &.active {
      background: #ecf5ff;
      color: #409eff;
    }

    .toc-number {
      color: #909399;
      font-size: 13px;
      flex-shrink: 0;
    }

    .toc-title {
      flex: 1;
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .toc-words {
      font-size: 12px;
      color: #c0c4cc;
      flex-shrink: 0;
    }
  }
}
</style>
