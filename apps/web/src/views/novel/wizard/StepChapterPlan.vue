<template>
  <div class="step-chapter-plan">
    <div class="step-header">
      <h2>章节规划</h2>
      <p class="step-desc">基于总纲生成详细章节规划</p>
    </div>

    <div class="action-area">
      <el-button type="primary" :loading="generating" @click="generate">
        {{ store.state.chapterPlan.length > 0 ? '重新生成' : 'AI 生成章节规划' }}
      </el-button>
      <el-text
        v-if="store.state.aiProvider === 'ollama'"
        type="info"
        size="small"
        style="margin-left: 12px"
      >
        本地模型会分批生成，章节越多耗时越长，可在下方查看进度
      </el-text>
    </div>

    <div v-if="generating" class="progress-area">
      <el-progress :percentage="progress" />
      <p class="progress-message">{{ progressMessage }}</p>
    </div>

    <el-alert
      v-if="error"
      :title="error"
      type="error"
      show-icon
      closable
      class="error-alert"
      @close="error = ''"
    />

    <div v-if="store.state.chapterPlan.length > 0" class="chapter-list">
      <el-table :data="store.state.chapterPlan" stripe border max-height="500">
        <el-table-column prop="chapterNumber" label="序号" width="70" />
        <el-table-column prop="title" label="章节标题" width="200" />
        <el-table-column prop="summary" label="剧情概要" min-width="200" show-overflow-tooltip />
        <el-table-column label="关键事件" width="180">
          <template #default="{ row }">
            {{ Array.isArray(row.keyEvents) ? row.keyEvents.join('、') : row.keyEvents || '' }}
          </template>
        </el-table-column>
        <el-table-column prop="conflict" label="冲突" width="150" show-overflow-tooltip />
        <el-table-column prop="highlight" label="爽点" width="150" show-overflow-tooltip />
        <el-table-column label="结尾钩子" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.endingHook || row.hook || '' }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="step-footer">
      <el-button @click="goToPreviousStep">上一步</el-button>
      <el-button type="primary" :disabled="generating" @click="store.nextStep()">下一步</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { useWizardStore } from '@/stores/wizard';
import { creationApi } from '@/api/creation';
import type { ChapterPlanItem, SSEEvent } from '@/api/creation';
import { abortRequestBeforeNavigate } from '@/api/sse';

const store = useWizardStore();
const generating = ref(false);
const error = ref('');
const progress = ref(0);
const progressMessage = ref('');
let requestController: AbortController | null = null;

function generate() {
  generating.value = true;
  error.value = '';
  progress.value = 0;
  progressMessage.value = '准备分批生成章节规划...';

  const generated: ChapterPlanItem[] = [];
  const mainGenre = store.mainGenre;
  const novelId = store.state.novelId || 'temp';

  requestController?.abort();
  requestController = creationApi.generateChapterPlanStream(
    novelId,
    {
      outline: store.state.outline || store.state.outlineContent,
      chapterCount: store.state.basicSetting.chapterCount,
      title: store.state.title,
      mainGenre: mainGenre?.label || '',
      subGenres: store.subGenres.map((genre) => genre.label),
      writingStyle: store.state.basicSetting.writingStyle,
      worldSetting: store.state.worldSetting || undefined,
      protagonist: store.state.protagonist || undefined,
      characters: store.state.characters,
      coreSetting: store.state.coreSetting || undefined,
      plotDirection: store.state.plotDirection || undefined,
      provider: store.state.aiProvider || undefined,
    },
    (event: SSEEvent) => {
      if (event.event === 'progress') {
        const data = event.data as { completed: number; total: number; message: string };
        progress.value = data.total ? Math.round((data.completed / data.total) * 100) : 0;
        progressMessage.value = data.message;
      } else if (event.event === 'batch') {
        const data = event.data as {
          chapters: ChapterPlanItem[];
          completed: number;
          total: number;
          message: string;
        };
        generated.push(...data.chapters);
        store.setChapterPlan([...generated]);
        progress.value = Math.round((data.completed / data.total) * 100);
        progressMessage.value = data.message;
      } else if (event.event === 'done') {
        progress.value = 100;
        progressMessage.value = `章节规划生成完成，共 ${generated.length} 章`;
        generating.value = false;
        requestController = null;
      } else if (event.event === 'error') {
        const data = event.data as { error?: string };
        error.value = data.error || '生成失败，请重试';
        generating.value = false;
        requestController = null;
      }
    },
    (err: Error) => {
      error.value = err.message || '生成失败，请重试';
      generating.value = false;
      requestController = null;
    },
  );
}

function goToPreviousStep() {
  abortRequestBeforeNavigate(requestController, () => {
    requestController = null;
    generating.value = false;
    store.prevStep();
  });
}

onBeforeUnmount(() => {
  if (requestController) {
    requestController.abort();
    requestController = null;
    generating.value = false;
  }
});
</script>

<style scoped>
.step-chapter-plan {
  max-width: 1000px;
  margin: 0 auto;
}

.step-header {
  text-align: center;
  margin-bottom: 32px;
}

.step-header h2 {
  font-size: 24px;
  margin-bottom: 8px;
}

.step-desc {
  color: #909399;
  font-size: 14px;
}

.action-area {
  text-align: center;
  margin-bottom: 24px;
}

.error-alert {
  margin-bottom: 24px;
}

.progress-area {
  margin-bottom: 24px;
}

.progress-message {
  margin-top: 8px;
  color: #606266;
  font-size: 14px;
  text-align: center;
}

.step-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
}
</style>
