<template>
  <div class="task-center">
    <div class="page-header">
      <h1>任务中心</h1>
      <div class="filters">
        <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width: 140px">
          <el-option label="等待中" value="pending" />
          <el-option label="运行中" value="running" />
          <el-option label="已暂停" value="paused" />
          <el-option label="已完成" value="completed" />
          <el-option label="失败" value="failed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        <el-select v-model="filterType" placeholder="全部类型" clearable style="width: 160px">
          <el-option label="续写小说" value="continue_novel" />
          <el-option label="生成章节" value="generate_chapter" />
          <el-option label="批量生成" value="generate_chapters" />
          <el-option label="重写章节" value="rewrite_chapter" />
          <el-option label="扩写章节" value="expand_chapter" />
          <el-option label="精简章节" value="shorten_chapter" />
        </el-select>
        <el-button :icon="Refresh" @click="loadTasks">刷新</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="filteredTasks" stripe style="width: 100%">
      <el-table-column label="类型" width="140">
        <template #default="{ row }">
          <el-tag :type="getTaskTypeTag(row.taskType)" size="small">
            {{ getTaskTypeLabel(row.taskType) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="getStatusTag(row.status)" size="small" effect="dark">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="进度" width="160">
        <template #default="{ row }">
          <el-progress
            :percentage="row.progress || 0"
            :status="
              row.status === 'failed' ? 'exception' : row.status === 'completed' ? 'success' : ''
            "
            :stroke-width="6"
          />
        </template>
      </el-table-column>

      <el-table-column label="详情" min-width="200">
        <template #default="{ row }">
          <div class="task-detail">
            <span v-if="row.chapterNumber">第{{ row.chapterNumber }}章</span>
            <span v-if="row.input?.mode">
              {{ getModeLabel(row.input.mode as string) }}
            </span>
            <span v-if="row.error" class="error-text" :title="row.error">
              {{ row.error.slice(0, 60) }}{{ row.error.length > 60 ? '...' : '' }}
            </span>
            <span v-if="row.retryCount > 0" class="retry-text">
              重试 {{ row.retryCount }}/{{ row.maxRetries }}
            </span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="开始时间" width="170">
        <template #default="{ row }">
          {{ row.startedAt ? formatTime(row.startedAt) : '-' }}
        </template>
      </el-table-column>

      <el-table-column label="结束时间" width="170">
        <template #default="{ row }">
          {{ row.completedAt ? formatTime(row.completedAt) : '-' }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <div class="action-btns">
            <el-button link type="primary" size="small" @click="viewDetail(row)"> 详情 </el-button>
            <el-button
              v-if="row.status === 'running'"
              link
              type="warning"
              size="small"
              @click="handlePause(row)"
            >
              暂停
            </el-button>
            <el-button
              v-if="row.status === 'paused'"
              link
              type="success"
              size="small"
              @click="handleResume(row)"
            >
              恢复
            </el-button>
            <el-button
              v-if="row.status === 'running' || row.status === 'paused'"
              link
              type="danger"
              size="small"
              @click="handleCancel(row)"
            >
              取消
            </el-button>
            <el-button
              v-if="row.status === 'failed'"
              link
              type="primary"
              size="small"
              @click="handleRetry(row)"
            >
              重试
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-drawer v-model="detailVisible" title="任务详情" size="500px">
      <template v-if="selectedTask">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="任务ID">{{ selectedTask.id }}</el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag size="small">{{ getTaskTypeLabel(selectedTask.taskType) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTag(selectedTask.status)" size="small" effect="dark">
              {{ getStatusLabel(selectedTask.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="进度">{{ selectedTask.progress }}%</el-descriptions-item>
          <el-descriptions-item v-if="selectedTask.chapterNumber" label="章节">
            第{{ selectedTask.chapterNumber }}章
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedTask.error" label="错误">
            <span class="error-text">{{ selectedTask.error }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatTime(selectedTask.createdAt || '') }}
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedTask.startedAt" label="开始时间">
            {{ formatTime(selectedTask.startedAt) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedTask.completedAt" label="结束时间">
            {{ formatTime(selectedTask.completedAt) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedTask.tokenUsage" label="Token用量">
            {{ selectedTask.tokenUsage.totalTokens }} (提示:
            {{ selectedTask.tokenUsage.promptTokens }}, 补全:
            {{ selectedTask.tokenUsage.completionTokens }})
          </el-descriptions-item>
        </el-descriptions>

        <div
          v-if="selectedTask.children && selectedTask.children.length > 0"
          class="children-section"
        >
          <h3>子任务 ({{ selectedTask.children.length }})</h3>
          <el-table :data="selectedTask.children" size="small" max-height="400">
            <el-table-column label="章节" width="80">
              <template #default="{ row }">
                {{ row.chapterNumber ? `第${row.chapterNumber}章` : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusTag(row.status)" size="small">
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="重试" width="70">
              <template #default="{ row }">
                {{ row.retryCount || 0 }}
              </template>
            </el-table-column>
            <el-table-column label="错误">
              <template #default="{ row }">
                <span v-if="row.error" class="error-text">{{ row.error?.slice(0, 40) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div v-if="selectedTask.input" class="input-section">
          <h3>输入参数</h3>
          <pre class="json-block">{{ JSON.stringify(selectedTask.input, null, 2) }}</pre>
        </div>
      </template>
    </el-drawer>

    <el-dialog v-model="retryDialogVisible" title="重试失败章节" width="400px">
      <p>
        确认重试 <strong>第{{ retryChapterNumber }}章</strong>？
      </p>
      <template #footer>
        <el-button @click="retryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="retryLoading" @click="confirmRetry">确认重试</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { taskCenterApi } from '@/api/chapter-generation';
import type { AiTask } from '@/types';

const loading = ref(false);
const tasks = ref<AiTask[]>([]);
const filterStatus = ref('');
const filterType = ref('');

const detailVisible = ref(false);
const selectedTask = ref<(AiTask & { children?: AiTask[] }) | null>(null);

const retryDialogVisible = ref(false);
const retryLoading = ref(false);
const retryTaskId = ref('');
const retryChapterNumber = ref(0);

const filteredTasks = computed(() => {
  let result = tasks.value;
  if (filterStatus.value) {
    result = result.filter((t) => t.status === filterStatus.value);
  }
  if (filterType.value) {
    result = result.filter((t) => t.taskType === filterType.value);
  }
  return result;
});

async function loadTasks() {
  loading.value = true;
  try {
    const params: Record<string, string> = {};
    if (filterStatus.value) params.status = filterStatus.value;
    if (filterType.value) params.taskType = filterType.value;
    const res = await taskCenterApi.listTasks(params);
    tasks.value = (res.data || []) as AiTask[];
  } catch {
    ElMessage.error('加载任务列表失败');
  } finally {
    loading.value = false;
  }
}

async function viewDetail(task: AiTask | Record<string, unknown>) {
  const t = task as AiTask;
  try {
    const res = await taskCenterApi.getTaskDetail(t.id);
    selectedTask.value = res.data as AiTask & { children: AiTask[] };
    detailVisible.value = true;
  } catch {
    ElMessage.error('加载任务详情失败');
  }
}

async function handlePause(task: AiTask | Record<string, unknown>) {
  const t = task as AiTask;
  try {
    await taskCenterApi.pauseTask(t.id);
    ElMessage.success('任务已暂停');
    await loadTasks();
  } catch {
    ElMessage.error('暂停失败');
  }
}

async function handleResume(task: AiTask | Record<string, unknown>) {
  const t = task as AiTask;
  try {
    await taskCenterApi.resumeTask(t.id);
    ElMessage.success('任务已恢复');
    await loadTasks();
  } catch {
    ElMessage.error('恢复失败');
  }
}

async function handleCancel(task: AiTask | Record<string, unknown>) {
  const t = task as AiTask;
  try {
    await ElMessageBox.confirm('确认取消该任务？取消后无法恢复。', '确认', {
      type: 'warning',
    });
    await taskCenterApi.cancelTask(t.id);
    ElMessage.success('任务已取消');
    await loadTasks();
  } catch {
    // cancelled
  }
}

function handleRetry(task: AiTask | Record<string, unknown>) {
  const t = task as AiTask;
  const failedChapter = t.children?.find((c) => c.status === 'failed');
  const chapterNum = failedChapter?.chapterNumber || (t.input?.chapterNumber as number) || 0;
  if (!chapterNum) {
    ElMessage.warning('无法确定需要重试的章节');
    return;
  }
  retryTaskId.value = t.id;
  retryChapterNumber.value = chapterNum;
  retryDialogVisible.value = true;
}

async function confirmRetry() {
  retryLoading.value = true;
  try {
    await taskCenterApi.retryChapter(retryTaskId.value, retryChapterNumber.value);
    ElMessage.success('开始重试');
    retryDialogVisible.value = false;
    await loadTasks();
  } catch {
    ElMessage.error('重试失败');
  } finally {
    retryLoading.value = false;
  }
}

function getTaskTypeLabel(type: string): string {
  const map: Record<string, string> = {
    create_novel: '创建小说',
    generate_title: '生成标题',
    generate_description: '生成简介',
    generate_character: '生成角色',
    generate_world_setting: '生成世界观',
    generate_outline: '生成大纲',
    generate_chapter_plan: '生成章节计划',
    generate_chapter: '生成章节',
    generate_chapters: '批量生成',
    continue_novel: '续写小说',
    rewrite_chapter: '重写章节',
    continue_chapter: '续写章节',
    expand_chapter: '扩写章节',
    shorten_chapter: '精简章节',
    review_chapter: '审核章节',
  };
  return map[type] || type;
}

type TagType = 'success' | 'warning' | 'info' | 'danger' | 'primary' | undefined;

function getTaskTypeTag(type: string): TagType {
  if (type === 'continue_novel') return 'primary';
  if (type.startsWith('generate_chapter')) return 'success';
  if (type.startsWith('generate_')) return undefined;
  return 'warning';
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

function formatTime(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

onMounted(() => {
  loadTasks();
});
</script>

<style scoped>
.task-center {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
}

.filters {
  display: flex;
  gap: 10px;
  align-items: center;
}

.task-detail {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  font-size: 13px;
}

.error-text {
  color: #f56c6c;
  font-size: 12px;
}

.retry-text {
  color: #e6a23c;
  font-size: 12px;
}

.action-btns {
  display: flex;
  gap: 4px;
}

.children-section,
.input-section {
  margin-top: 20px;
}

.children-section h3,
.input-section h3 {
  font-size: 15px;
  margin: 0 0 10px;
}

.json-block {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 200px;
  overflow: auto;
  margin: 0;
}
</style>
