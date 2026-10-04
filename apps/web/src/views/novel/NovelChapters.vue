<template>
  <div class="chapter-editor-page">
    <div class="chapter-list-panel">
      <div class="list-header">
        <span class="list-title">章节列表</span>
        <el-tag v-if="chapters.length" type="info" size="small">{{ chapters.length }}章</el-tag>
      </div>
      <div class="list-actions">
        <el-button size="small" type="primary" @click="showGenerateDialog">
          <el-icon><Plus /></el-icon>生成
        </el-button>
        <el-button size="small" @click="showBatchDialog">
          <el-icon><FolderOpened /></el-icon>批量
        </el-button>
      </div>

      <div v-if="progress" class="generation-progress">
        <div class="progress-header">
          <span class="progress-text">{{ progress.message }}</span>
          <el-button
            v-if="progress.stage !== 'complete' && progress.stage !== 'error'"
            text
            size="small"
            type="danger"
            @click="cancelGeneration"
          >
            取消
          </el-button>
        </div>
        <el-progress
          :percentage="progress.progress"
          :status="progressStatus"
          :stroke-width="8"
          striped
          striped-flow
        />
      </div>

      <div class="chapter-list">
        <div
          v-for="ch in chapters"
          :key="ch.id"
          class="chapter-list-item"
          :class="{ active: selectedChapterId === ch.id }"
          @click="selectChapter(ch)"
        >
          <div class="item-title">
            <span class="item-number">{{ ch.chapterNumber }}.</span>
            {{ ch.title || '未命名' }}
          </div>
          <div class="item-meta">
            <span>{{ ch.wordCount || 0 }}字</span>
            <el-tag :type="statusType(ch.status)" size="small">{{ statusLabel(ch.status) }}</el-tag>
          </div>
        </div>
        <div v-if="!chapters.length" class="empty-list">
          <Empty description="暂无章节" />
        </div>
      </div>
    </div>

    <div class="editor-panel">
      <template v-if="currentChapter">
        <div class="editor-header">
          <div class="editor-header-left">
            <el-input
              v-model="editorTitle"
              class="title-input"
              placeholder="章节标题"
              @input="onContentChange"
            />
          </div>
          <div class="editor-header-right">
            <span v-if="hasUnsavedChanges" class="unsaved-indicator">未保存</span>
            <span v-else-if="lastSavedAt" class="saved-indicator">
              已保存 {{ formatTime(lastSavedAt) }}
            </span>
            <span class="word-count">{{ wordCount }}字</span>
            <el-button size="small" @click="openVersionHistory">
              <el-icon><Clock /></el-icon>历史
            </el-button>
            <el-button size="small" type="primary" :disabled="!hasUnsavedChanges" @click="saveNow">
              保存
            </el-button>
          </div>
        </div>

        <div v-if="selectedText" class="ai-toolbar">
          <span class="ai-toolbar-label">已选 {{ selectedText.length }} 字 — AI操作：</span>
          <el-button size="small" @click="doTextOperation('continue')">续写</el-button>
          <el-button size="small" @click="doTextOperation('rewrite')">重写</el-button>
          <el-button size="small" @click="doTextOperation('expand')">扩写</el-button>
          <el-button size="small" @click="doTextOperation('shorten')">缩写</el-button>
          <el-button size="small" @click="doTextOperation('polish')">润色</el-button>
          <el-button size="small" text @click="clearSelection">取消选择</el-button>
        </div>

        <div class="editor-body">
          <textarea
            ref="textareaRef"
            v-model="editorContent"
            class="editor-textarea"
            placeholder="开始写作..."
            @mouseup="checkSelection"
            @keyup="checkSelection"
            @input="onContentChange"
          />
        </div>

        <div class="editor-footer">
          <div class="footer-left">
            <el-button
              size="small"
              :disabled="!currentChapter.content"
              :loading="chapterActionLoading"
              @click="showPolishConfirm"
            >
              全文润色
            </el-button>
            <el-button
              size="small"
              :disabled="!currentChapter.content"
              :loading="chapterActionLoading"
              @click="showContinueConfirm"
            >
              全文续写
            </el-button>
          </div>
          <div class="footer-right">
            <span v-if="aiLoading" class="ai-loading-text">
              <el-icon class="is-loading"><LoadingIcon /></el-icon>
              AI 处理中...
            </span>
          </div>
        </div>
      </template>

      <div v-else class="no-chapter-selected">
        <Empty description="选择左侧章节开始编辑，或生成新章节" />
      </div>
    </div>

    <el-dialog
      v-model="previewVisible"
      title="AI 结果预览"
      width="70%"
      top="5vh"
      :close-on-click-modal="false"
    >
      <div class="preview-container">
        <div class="preview-pane">
          <div class="preview-label">原文</div>
          <div class="preview-content original">{{ originalText }}</div>
        </div>
        <div class="preview-divider" />
        <div class="preview-pane">
          <div class="preview-label">AI 结果</div>
          <div class="preview-content ai-result">{{ aiResult }}</div>
        </div>
      </div>
      <template #footer>
        <el-button @click="rejectPreview">放弃</el-button>
        <el-button type="primary" @click="acceptPreview">采用</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="batchDialogVisible" title="批量生成章节" width="400px">
      <el-form label-width="100px">
        <el-form-item label="起始章节">
          <el-input-number v-model="batchStart" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="结束章节">
          <el-input-number v-model="batchEnd" :min="batchStart" :max="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="startBatchGenerate">开始生成</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="versionDrawerVisible" title="版本历史" size="400px">
      <div v-if="versions.length" class="version-list">
        <div v-for="ver in versions" :key="ver.id" class="version-item">
          <div class="version-header">
            <span class="version-number">V{{ ver.version }}</span>
            <span class="version-time">{{ formatDate(ver.createdAt) }}</span>
          </div>
          <div class="version-meta">
            <span>{{ ver.wordCount }}字</span>
            <span v-if="ver.changeNote">{{ ver.changeNote }}</span>
          </div>
          <el-button size="small" type="primary" text @click="restoreVersion(ver.id)">
            恢复此版本
          </el-button>
        </div>
      </div>
      <Empty v-else description="暂无历史版本" />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, FolderOpened, Clock, Loading as LoadingIcon } from '@element-plus/icons-vue';
import Empty from '@/components/common/Empty.vue';
import { chapterApi } from '@/api/novel';
import {
  chapterGenerationApi,
  type GenerationProgress,
  type ChapterVersion,
  type TextOperation,
} from '@/api/chapter-generation';
import type { NovelChapter } from '@/types';

const route = useRoute();
const novelId = computed(() => route.params.id as string);

const chapters = ref<NovelChapter[]>([]);
const selectedChapterId = ref<string | null>(null);
const currentChapter = ref<NovelChapter | null>(null);

const editorTitle = ref('');
const editorContent = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const selectedText = ref('');
const selectionStart = ref(0);
const selectionEnd = ref(0);

const previewVisible = ref(false);
const originalText = ref('');
const aiResult = ref('');
const pendingOperation = ref<TextOperation | null>(null);

const aiLoading = ref(false);
const chapterActionLoading = ref(false);

const hasUnsavedChanges = ref(false);
const lastSavedAt = ref<Date | null>(null);
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
const AUTO_SAVE_DELAY = 3000;

const versions = ref<ChapterVersion[]>([]);
const versionDrawerVisible = ref(false);

const batchDialogVisible = ref(false);
const batchStart = ref(1);
const batchEnd = ref(10);

const progress = ref<GenerationProgress | null>(null);
const eventSource = ref<EventSource | null>(null);

const wordCount = computed(() => editorContent.value.replace(/\s/g, '').length);

const progressStatus = computed(() => {
  if (!progress.value) return undefined;
  if (progress.value.stage === 'complete') return 'success' as const;
  if (progress.value.stage === 'error') return 'exception' as const;
  return undefined;
});

function statusType(status: string): 'primary' | 'success' | 'warning' | 'info' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'info'> = {
    draft: 'info',
    generating: 'warning',
    completed: 'success',
    published: 'primary',
  };
  return map[status] || 'info';
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    generating: '生成中',
    completed: '已完成',
    published: '已发布',
  };
  return map[status] || status;
}

function formatTime(date: Date) {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 10) return '刚刚';
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function loadChapters() {
  const res = await chapterApi.findByNovelId(novelId.value);
  chapters.value = (res.data || []).sort((a, b) => a.chapterNumber - b.chapterNumber);
}

async function selectChapter(ch: NovelChapter) {
  if (ch.id === selectedChapterId.value) return;

  if (hasUnsavedChanges.value && currentChapter.value) {
    await saveNow();
  }

  selectedChapterId.value = ch.id;
  const res = await chapterApi.findById(novelId.value, ch.id);
  currentChapter.value = res.data;
  editorTitle.value = res.data.title || '';
  editorContent.value = res.data.content || '';
  hasUnsavedChanges.value = false;
  selectedText.value = '';
  lastSavedAt.value = null;
}

function checkSelection() {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  if (start !== end) {
    selectionStart.value = start;
    selectionEnd.value = end;
    selectedText.value = editorContent.value.substring(start, end);
  }
}

function clearSelection() {
  selectedText.value = '';
  if (textareaRef.value) {
    textareaRef.value.setSelectionRange(0, 0);
  }
}

function onContentChange() {
  hasUnsavedChanges.value = true;
  scheduleAutoSave();
}

function scheduleAutoSave() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    doAutoSave();
  }, AUTO_SAVE_DELAY);
}

async function doAutoSave() {
  if (!currentChapter.value || !hasUnsavedChanges.value) return;
  try {
    await chapterGenerationApi.autoSave(novelId.value, currentChapter.value.id, {
      title: editorTitle.value,
      content: editorContent.value,
      wordCount: wordCount.value,
    });
    hasUnsavedChanges.value = false;
    lastSavedAt.value = new Date();
    currentChapter.value.wordCount = wordCount.value;
    currentChapter.value.title = editorTitle.value;
    const idx = chapters.value.findIndex((c) => c.id === currentChapter.value!.id);
    if (idx >= 0) {
      chapters.value[idx].title = editorTitle.value;
      chapters.value[idx].wordCount = wordCount.value;
    }
  } catch (err) {
    console.error('Auto-save failed:', err);
  }
}

async function saveNow() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  await doAutoSave();
}

function getBeforeAfterContext() {
  const content = editorContent.value;
  const start = selectionStart.value;
  const end = selectionEnd.value;
  const contextRadius = 500;
  return {
    before: content.substring(Math.max(0, start - contextRadius), start),
    after: content.substring(end, Math.min(content.length, end + contextRadius)),
  };
}

async function doTextOperation(operation: TextOperation) {
  if (!selectedText.value || !currentChapter.value) return;

  aiLoading.value = true;
  pendingOperation.value = operation;
  originalText.value = selectedText.value;

  try {
    const context = getBeforeAfterContext();
    const res = await chapterGenerationApi.processTextSelection(
      novelId.value,
      selectedText.value,
      operation,
      context,
    );
    aiResult.value = res.data.result;
    previewVisible.value = true;
  } catch (err) {
    ElMessage.error('AI 处理失败：' + (err as Error).message);
  } finally {
    aiLoading.value = false;
  }
}

function acceptPreview() {
  if (!aiResult.value) return;
  const before = editorContent.value.substring(0, selectionStart.value);
  const after = editorContent.value.substring(selectionEnd.value);
  editorContent.value = before + aiResult.value + after;
  previewVisible.value = false;
  selectedText.value = '';
  onContentChange();
  ElMessage.success('已替换');
}

function rejectPreview() {
  previewVisible.value = false;
  aiResult.value = '';
}

async function showPolishConfirm() {
  if (!currentChapter.value) return;
  try {
    await ElMessageBox.confirm('确定要对全文进行润色吗？当前内容会自动保存。', '全文润色');
    chapterActionLoading.value = true;
    await saveNow();
    const res = await chapterGenerationApi.polishChapter(novelId.value, currentChapter.value.id);
    originalText.value = editorContent.value;
    aiResult.value = res.data.content;
    pendingOperation.value = 'polish';
    previewVisible.value = true;
  } catch (err) {
    if ((err as Error).message !== 'cancel') {
      ElMessage.error('润色失败：' + (err as Error).message);
    }
  } finally {
    chapterActionLoading.value = false;
  }
}

async function showContinueConfirm() {
  if (!currentChapter.value) return;
  try {
    await ElMessageBox.confirm('确定要在末尾续写吗？', '全文续写');
    chapterActionLoading.value = true;
    await saveNow();
    const res = await chapterGenerationApi.continueChapter(novelId.value, currentChapter.value.id);
    editorContent.value = editorContent.value + '\n' + res.data.content;
    onContentChange();
    ElMessage.success('续写完成');
  } catch (err) {
    if ((err as Error).message !== 'cancel') {
      ElMessage.error('续写失败：' + (err as Error).message);
    }
  } finally {
    chapterActionLoading.value = false;
  }
}

async function openVersionHistory() {
  if (!currentChapter.value) return;
  versionDrawerVisible.value = true;
  try {
    const res = await chapterGenerationApi.getVersions(novelId.value, currentChapter.value.id);
    versions.value = res.data || [];
  } catch (err) {
    ElMessage.error('获取版本历史失败');
  }
}

async function restoreVersion(versionId: string) {
  if (!currentChapter.value) return;
  try {
    await ElMessageBox.confirm('确定要恢复到此版本吗？当前内容会先备份。', '恢复确认');
    const res = await chapterGenerationApi.restoreVersion(
      novelId.value,
      currentChapter.value.id,
      versionId,
    );
    editorContent.value = res.data.content || '';
    editorTitle.value = res.data.title || '';
    hasUnsavedChanges.value = true;
    versionDrawerVisible.value = false;
    ElMessage.success('已恢复');
  } catch (err) {
    if ((err as Error).message !== 'cancel') {
      ElMessage.error('恢复失败：' + (err as Error).message);
    }
  }
}

function showGenerateDialog() {
  const nextChapter = chapters.value.length
    ? Math.max(...chapters.value.map((c) => c.chapterNumber)) + 1
    : 1;
  generateSingle(nextChapter);
}

function showBatchDialog() {
  const nextChapter = chapters.value.length
    ? Math.max(...chapters.value.map((c) => c.chapterNumber)) + 1
    : 1;
  batchStart.value = nextChapter;
  batchEnd.value = nextChapter + 9;
  batchDialogVisible.value = true;
}

async function generateSingle(chapterNumber: number) {
  try {
    await chapterGenerationApi.generateChapter(novelId.value, chapterNumber);
    progress.value = {
      stage: 'preparing',
      message: `开始生成第${chapterNumber}章...`,
      progress: 0,
      chapterNumber,
    };
    connectSSE();
  } catch (err) {
    ElMessage.error('生成失败：' + (err as Error).message);
  }
}

async function startBatchGenerate() {
  batchDialogVisible.value = false;
  try {
    await chapterGenerationApi.batchGenerate(novelId.value, batchStart.value, batchEnd.value);
    progress.value = {
      stage: 'preparing',
      message: `开始批量生成第${batchStart.value}-${batchEnd.value}章...`,
      progress: 0,
    };
    connectSSE();
  } catch (err) {
    ElMessage.error('批量生成失败：' + (err as Error).message);
  }
}

async function cancelGeneration() {
  try {
    await ElMessageBox.confirm('确定要取消当前生成任务吗？', '确认取消', { type: 'warning' });
    progress.value = null;
    disconnectSSE();
  } catch {
    /* cancelled */
  }
}

function connectSSE() {
  disconnectSSE();
  const es = chapterGenerationApi.createProgressStream(novelId.value);
  eventSource.value = es;
  es.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      if (parsed.event === 'progress') {
        progress.value = parsed.data;
        if (parsed.data.stage === 'complete' || parsed.data.stage === 'error') {
          setTimeout(() => {
            loadChapters();
            if (selectedChapterId.value) {
              const ch = chapters.value.find((c) => c.id === selectedChapterId.value);
              if (ch) selectChapter(ch);
            }
          }, 1000);
        }
      }
    } catch {
      /* ignore */
    }
  };
  es.onerror = () => disconnectSSE();
}

function disconnectSSE() {
  if (eventSource.value) {
    eventSource.value.close();
    eventSource.value = null;
  }
}

let refreshTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  loadChapters();
  connectSSE();
  refreshTimer = setInterval(() => {
    if (lastSavedAt.value) {
      // trigger reactivity for time display
      lastSavedAt.value = new Date(lastSavedAt.value.getTime());
    }
  }, 30000);
});

onUnmounted(() => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  if (refreshTimer) clearInterval(refreshTimer);
  disconnectSSE();
  if (hasUnsavedChanges.value && currentChapter.value) {
    doAutoSave();
  }
});
</script>

<style scoped lang="scss">
.chapter-editor-page {
  display: flex;
  height: calc(100vh - 56px - 40px);
  gap: 0;
  margin: -20px;
}

.chapter-list-panel {
  width: 260px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;

    .list-title {
      font-size: 15px;
      font-weight: 500;
    }
  }

  .list-actions {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  .generation-progress {
    padding: 12px 16px;
    background: #f0f9eb;
    border-bottom: 1px solid #e1f3d8;

    .progress-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;

      .progress-text {
        font-size: 12px;
        color: #606266;
      }
    }
  }

  .chapter-list {
    flex: 1;
    overflow-y: auto;
  }

  .chapter-list-item {
    padding: 12px 16px;
    cursor: pointer;
    border-bottom: 1px solid #f5f5f5;
    transition: background 0.2s;

    &:hover {
      background: #f5f7fa;
    }

    &.active {
      background: #ecf5ff;
      border-left: 3px solid #409eff;
      padding-left: 13px;
    }

    .item-title {
      font-size: 14px;
      color: #303133;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      .item-number {
        color: #909399;
        margin-right: 4px;
      }
    }

    .item-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: #909399;
    }
  }

  .empty-list {
    padding: 40px 16px;
    text-align: center;
  }
}

.editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #fff;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #e4e7ed;
  gap: 16px;
  flex-shrink: 0;

  .editor-header-left {
    flex: 1;
    min-width: 0;

    .title-input {
      :deep(.el-input__inner) {
        font-size: 16px;
        font-weight: 500;
        border: none;
        padding: 0;
        background: transparent;
      }
    }
  }

  .editor-header-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;

    .unsaved-indicator {
      color: #e6a23c;
      font-size: 12px;
    }

    .saved-indicator {
      color: #67c23a;
      font-size: 12px;
    }

    .word-count {
      color: #909399;
      font-size: 12px;
    }
  }
}

.ai-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: #ecf5ff;
  border-bottom: 1px solid #d9ecff;
  flex-shrink: 0;

  .ai-toolbar-label {
    font-size: 12px;
    color: #409eff;
    margin-right: 4px;
  }
}

.editor-body {
  flex: 1;
  overflow: hidden;
  padding: 0;

  .editor-textarea {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    resize: none;
    padding: 20px;
    font-size: 16px;
    line-height: 1.8;
    font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    color: #303133;
    background: transparent;
    tab-size: 2;
  }
}

.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  border-top: 1px solid #e4e7ed;
  flex-shrink: 0;

  .footer-left {
    display: flex;
    gap: 8px;
  }

  .footer-right {
    .ai-loading-text {
      font-size: 13px;
      color: #409eff;
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
}

.no-chapter-selected {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-container {
  display: flex;
  gap: 0;
  min-height: 300px;
  max-height: 60vh;

  .preview-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;

    .preview-label {
      font-size: 13px;
      font-weight: 500;
      color: #909399;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f0f0f0;
    }

    .preview-content {
      flex: 1;
      overflow-y: auto;
      font-size: 14px;
      line-height: 1.8;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .original {
      color: #606266;
    }

    .ai-result {
      color: #303133;
    }
  }

  .preview-divider {
    width: 1px;
    background: #e4e7ed;
    margin: 0 20px;
  }
}

.version-list {
  .version-item {
    padding: 16px;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    margin-bottom: 12px;

    .version-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;

      .version-number {
        font-weight: 500;
        font-size: 14px;
      }

      .version-time {
        font-size: 12px;
        color: #909399;
      }
    }

    .version-meta {
      display: flex;
      gap: 12px;
      font-size: 12px;
      color: #909399;
      margin-bottom: 8px;
    }
  }
}
</style>
