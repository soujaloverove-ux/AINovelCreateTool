<template>
  <div class="novel-continuation">
    <h2>自动续写</h2>

    <div v-if="activeTask" class="active-task-card">
      <el-card>
        <template #header>
          <div class="active-header">
            <span>当前续写任务</span>
            <el-tag :type="getStatusTag(activeTask.status)" size="small" effect="dark">
              {{ getStatusLabel(activeTask.status) }}
            </el-tag>
          </div>
        </template>
        <div class="active-info">
          <el-progress :percentage="activeTask.progress || 0" :stroke-width="8" />
          <div class="active-meta">
            <span>模式：{{ getModeLabel(activeTask.input?.mode as string) }}</span>
            <span v-if="activeTask.chapterNumber">当前：第{{ activeTask.chapterNumber }}章</span>
            <span v-if="activeTask.error" class="error-text">{{ activeTask.error }}</span>
          </div>
          <div v-if="children.length > 0" class="children-list">
            <div v-for="child in children" :key="child.id" class="child-item">
              <span>第{{ child.chapterNumber }}章</span>
              <el-tag :type="getStatusTag(child.status)" size="small">
                {{ getStatusLabel(child.status) }}
              </el-tag>
              <el-button
                v-if="child.status === 'failed'"
                link
                type="primary"
                size="small"
                @click="handleRetryChild(child)"
              >
                重试
              </el-button>
            </div>
          </div>
        </div>
        <div class="active-actions">
          <el-button v-if="activeTask.status === 'running'" type="warning" @click="handlePause">
            暂停
          </el-button>
          <el-button v-if="activeTask.status === 'paused'" type="success" @click="handleResume">
            继续
          </el-button>
          <el-button type="danger" @click="handleCancel">取消任务</el-button>
        </div>
      </el-card>
    </div>

    <div v-else class="continuation-form">
      <el-card>
        <template #header>
          <span>开始新的续写</span>
        </template>

        <el-form label-width="120px" class="continuation-options">
          <el-form-item label="续写模式">
            <el-radio-group v-model="mode">
              <el-radio-button value="nextChapter">下一章</el-radio-button>
              <el-radio-button value="count">按数量</el-radio-button>
              <el-radio-button value="toChapter">到指定章节</el-radio-button>
              <el-radio-button value="toWordCount">到指定字数</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item v-if="mode === 'count'" label="生成数量">
            <el-input-number v-model="count" :min="1" :max="100" />
            <span class="hint">章</span>
            <div class="quick-select">
              <el-button size="small" @click="count = 5">5章</el-button>
              <el-button size="small" @click="count = 10">10章</el-button>
              <el-button size="small" @click="count = 20">20章</el-button>
            </div>
          </el-form-item>

          <el-form-item v-if="mode === 'toChapter'" label="目标章节">
            <el-input-number v-model="toChapter" :min="nextChapterNumber" :max="9999" />
            <span class="hint">（当前第{{ nextChapterNumber - 1 }}章）</span>
          </el-form-item>

          <el-form-item v-if="mode === 'toWordCount'" label="目标字数">
            <el-input-number v-model="toWordCount" :min="1000" :max="10000000" :step="10000" />
            <span class="hint">字</span>
            <div class="quick-select">
              <el-button size="small" @click="toWordCount = 50000">5万字</el-button>
              <el-button size="small" @click="toWordCount = 100000">10万字</el-button>
              <el-button size="small" @click="toWordCount = 300000">30万字</el-button>
            </div>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :loading="starting" size="large" @click="handleStart">
              开始续写
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card class="info-card">
        <template #header>
          <span>小说信息</span>
        </template>
        <el-descriptions :column="1" size="small">
          <el-descriptions-item label="当前章节数">{{
            nextChapterNumber - 1
          }}</el-descriptions-item>
          <el-descriptions-item label="目标字数">{{
            novel?.targetWordCount || '未设置'
          }}</el-descriptions-item>
          <el-descriptions-item label="写作风格">{{
            novel?.writingStyle || '未设置'
          }}</el-descriptions-item>
          <el-descriptions-item label="叙事视角">{{
            novel?.pointOfView || '第三人称'
          }}</el-descriptions-item>
        </el-descriptions>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { chapterGenerationApi, taskCenterApi } from '@/api/chapter-generation';
import { useNovelStore } from '@/stores/novel';
import type { AiTask } from '@/types';

const route = useRoute();
const novelStore = useNovelStore();

const novelId = computed(() => route.params.id as string);
const novel = computed(() => novelStore.currentNovel);

const mode = ref<'nextChapter' | 'count' | 'toChapter' | 'toWordCount'>('count');
const count = ref(10);
const toChapter = ref(100);
const toWordCount = ref(100000);
const starting = ref(false);

const activeTask = ref<AiTask | null>(null);
const children = ref<AiTask[]>([]);
const nextChapterNumber = ref(1);

let pollTimer: ReturnType<typeof setInterval> | null = null;

async function loadStatus() {
  try {
    const res = await chapterGenerationApi.getContinuationStatus(novelId.value);
    const data = res.data;
    if (data?.active && data.task) {
      activeTask.value = data.task as AiTask;
      children.value = (data.children || []) as AiTask[];
    } else {
      activeTask.value = null;
      children.value = [];
    }
  } catch {
    // ignore
  }
}

async function loadNextChapterNumber() {
  try {
    const res = await chapterGenerationApi.getContinuationStatus(novelId.value);
    const task = res.data?.task;
    if (task?.input?.startChapter) {
      nextChapterNumber.value = task.input.startChapter as number;
    } else {
      nextChapterNumber.value = (novel.value?.currentChapter || 0) + 1;
    }
  } catch {
    nextChapterNumber.value = (novel.value?.currentChapter || 0) + 1;
  }
}

async function handleStart() {
  starting.value = true;
  try {
    const options: Record<string, unknown> = { mode: mode.value };
    if (mode.value === 'count') options.count = count.value;
    if (mode.value === 'toChapter') options.toChapter = toChapter.value;
    if (mode.value === 'toWordCount') options.toWordCount = toWordCount.value;

    await chapterGenerationApi.startContinuation(
      novelId.value,
      options as {
        mode: 'nextChapter' | 'count' | 'toChapter' | 'toWordCount';
        count?: number;
        toChapter?: number;
        toWordCount?: number;
      },
    );
    ElMessage.success('续写任务已启动');
    await loadStatus();
    startPolling();
  } catch (err) {
    ElMessage.error((err as Error).message || '启动失败');
  } finally {
    starting.value = false;
  }
}

async function handlePause() {
  if (!activeTask.value) return;
  try {
    await taskCenterApi.pauseTask(activeTask.value.id);
    ElMessage.success('任务已暂停');
    await loadStatus();
  } catch {
    ElMessage.error('暂停失败');
  }
}

async function handleResume() {
  if (!activeTask.value) return;
  try {
    await taskCenterApi.resumeTask(activeTask.value.id);
    ElMessage.success('任务已恢复');
    await loadStatus();
  } catch {
    ElMessage.error('恢复失败');
  }
}

async function handleCancel() {
  if (!activeTask.value) return;
  try {
    await ElMessageBox.confirm('确认取消续写任务？已生成的章节会保留。', '确认', {
      type: 'warning',
    });
    await taskCenterApi.cancelTask(activeTask.value.id);
    ElMessage.success('任务已取消');
    activeTask.value = null;
    children.value = [];
    stopPolling();
  } catch {
    // cancelled
  }
}

async function handleRetryChild(child: AiTask) {
  if (!activeTask.value || !child.chapterNumber) return;
  try {
    await taskCenterApi.retryChapter(activeTask.value.id, child.chapterNumber);
    ElMessage.success(`开始重试第${child.chapterNumber}章`);
  } catch {
    ElMessage.error('重试失败');
  }
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(loadStatus, 5000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '等待中',
    running: '运行中',
    paused: '已暂停',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
  };
  return map[status] || status;
}

type TagType = 'success' | 'warning' | 'info' | 'danger' | 'primary' | undefined;

function getStatusTag(status: string): TagType {
  const map: Record<string, TagType> = {
    pending: 'info',
    running: undefined,
    paused: 'warning',
    completed: 'success',
    failed: 'danger',
    cancelled: 'info',
  };
  return map[status];
}

function getModeLabel(mode: string): string {
  const map: Record<string, string> = {
    nextChapter: '生成下一章',
    count: '按数量生成',
    toChapter: '生成到指定章节',
    toWordCount: '生成到指定字数',
  };
  return map[mode] || mode;
}

onMounted(() => {
  loadStatus();
  loadNextChapterNumber();
  startPolling();
});

onUnmounted(() => {
  stopPolling();
});
</script>

<style scoped>
.novel-continuation {
  max-width: 700px;
}

.novel-continuation h2 {
  margin: 0 0 20px;
  font-size: 20px;
  font-weight: 600;
}

.active-task-card {
  margin-bottom: 20px;
}

.active-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.active-info {
  margin-bottom: 16px;
}

.active-meta {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  font-size: 13px;
  color: #606266;
}

.error-text {
  color: #f56c6c;
}

.children-list {
  margin-top: 16px;
  max-height: 200px;
  overflow-y: auto;
}

.child-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}

.active-actions {
  display: flex;
  gap: 8px;
}

.continuation-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.continuation-options {
  .hint {
    margin-left: 8px;
    color: #909399;
    font-size: 13px;
  }

  .quick-select {
    display: flex;
    gap: 6px;
    margin-top: 6px;
  }
}

.info-card {
  margin-top: 0;
}
</style>
