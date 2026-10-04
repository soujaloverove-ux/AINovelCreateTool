<template>
  <div class="step-outline">
    <div class="step-header">
      <h2>生成总纲</h2>
      <p class="step-desc">AI 将根据所有设定生成完整的小说总纲</p>
    </div>

    <div class="action-area">
      <el-button
        type="primary"
        size="large"
        :loading="generating"
        :disabled="!!outline && !done"
        @click="generate"
      >
        {{ outline ? '重新生成总纲' : '开始生成总纲' }}
      </el-button>
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

    <div v-if="generating || done" class="progress-area">
      <el-progress :percentage="progressValue" :status="done ? 'success' : undefined" />
      <p class="progress-message">{{ progressMessage }}</p>
    </div>

    <div v-if="outline && outline.volumes.length > 0" class="outline-tree">
      <div v-for="volume in outline.volumes" :key="volume.volumeNumber" class="volume-item">
        <div class="volume-header">
          <div class="volume-info">
            <el-icon class="drag-handle"><DCaret /></el-icon>
            <span class="volume-number">第{{ volume.volumeNumber }}卷</span>
            <span class="volume-title">{{ volume.title }}</span>
          </div>
          <div class="volume-actions">
            <el-button size="small" @click="editVolume(volume)">编辑</el-button>
            <el-button size="small" type="warning" @click="regenerateVolume(volume)"
              >AI 重新生成</el-button
            >
            <el-button size="small" type="danger" @click="deleteVolume(volume)">删除</el-button>
          </div>
        </div>
        <div class="volume-summary">{{ volume.summary }}</div>

        <div v-if="volume.arcs.length > 0" class="arcs-list">
          <div v-for="arc in volume.arcs" :key="arc.arcNumber" class="arc-item">
            <div class="arc-header">
              <div class="arc-info">
                <el-icon class="drag-handle"><DCaret /></el-icon>
                <span class="arc-number">Arc {{ arc.arcNumber }}</span>
                <span class="arc-title">{{ arc.title }}</span>
              </div>
              <div class="arc-actions">
                <el-button size="small" @click="editArc(volume, arc)">编辑</el-button>
                <el-button size="small" type="warning" @click="regenerateArc(volume, arc)"
                  >AI 重新生成</el-button
                >
                <el-button size="small" type="danger" @click="deleteArc(volume, arc)"
                  >删除</el-button
                >
              </div>
            </div>
            <div class="arc-summary">{{ arc.summary }}</div>

            <div v-if="arc.chapters.length > 0" class="chapters-list">
              <div
                v-for="chapter in arc.chapters"
                :key="chapter.chapterNumber"
                class="chapter-item"
              >
                <span class="chapter-number">第{{ chapter.chapterNumber }}章</span>
                <span class="chapter-title">{{ chapter.title }}</span>
                <span class="chapter-summary">{{ chapter.summary }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="showPreviewDialog" title="预览更改" width="800px">
      <div v-if="store.state.outlinePreview" class="preview-content">
        <h3>
          第{{ store.state.outlinePreview.volumeNumber }}卷 - {{ store.state.outlinePreview.title }}
        </h3>
        <p>{{ store.state.outlinePreview.summary }}</p>
        <div v-if="store.state.outlinePreview.arcs.length > 0" class="preview-arcs">
          <div
            v-for="arc in store.state.outlinePreview.arcs"
            :key="arc.arcNumber"
            class="preview-arc"
          >
            <h4>Arc {{ arc.arcNumber }} - {{ arc.title }}</h4>
            <p>{{ arc.summary }}</p>
            <ul>
              <li v-for="chapter in arc.chapters" :key="chapter.chapterNumber">
                第{{ chapter.chapterNumber }}章 {{ chapter.title }}: {{ chapter.summary }}
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div v-else-if="store.state.arcPreview" class="preview-content">
        <h3>
          第{{ store.state.arcPreview.volumeNumber }}卷 Arc {{ store.state.arcPreview.arcNumber }}
        </h3>
        <ul>
          <li v-for="chapter in store.state.arcPreview.chapters" :key="chapter.chapterNumber">
            第{{ chapter.chapterNumber }}章 {{ chapter.title }}: {{ chapter.summary }}
          </li>
        </ul>
      </div>
      <template #footer>
        <el-button @click="cancelPreview">取消</el-button>
        <el-button type="primary" @click="applyPreview">确认应用</el-button>
      </template>
    </el-dialog>

    <div class="step-footer">
      <el-button @click="store.prevStep()">上一步</el-button>
      <el-button
        type="primary"
        :disabled="!outline || outline.volumes.length === 0"
        @click="saveAndNext"
      >
        下一步
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWizardStore } from '@/stores/wizard';
import { creationApi } from '@/api/creation';
import type { SSEEvent, VolumeOutline, ArcOutline } from '@/api/creation';
import { DCaret } from '@element-plus/icons-vue';
import { ElMessageBox } from 'element-plus';

const store = useWizardStore();
const generating = ref(false);
const done = ref(false);
const error = ref('');
const progressValue = ref(0);
const progressMessage = ref('');
const showPreviewDialog = ref(false);

const outline = computed(() => store.state.outline);

async function generate() {
  generating.value = true;
  done.value = false;
  error.value = '';
  progressValue.value = 0;
  progressMessage.value = '准备中...';

  const mainGenre = store.mainGenre;
  const subGenres = store.subGenres;

  const params = {
    title: store.state.title,
    description: store.state.description,
    mainGenre: mainGenre?.label || '',
    subGenres: subGenres.map((g) => g.label),
    worldSetting: store.state.worldSetting,
    protagonist: store.state.protagonist,
    characters: store.state.characters,
    coreSetting: store.state.coreSetting,
    plotDirection: store.state.plotDirection,
    chapterCount: store.state.basicSetting.chapterCount,
    provider: store.state.aiProvider || undefined,
  };

  const novelId = store.state.novelId || 'temp';

  creationApi.generateOutlineStream(
    novelId,
    params,
    (event: SSEEvent) => {
      if (event.event === 'progress') {
        const data = event.data as { stage: string; message: string; progress?: number };
        progressMessage.value = data.message;
        if (data.progress !== undefined) {
          progressValue.value = data.progress;
        }
        if (data.stage === 'complete') {
          progressValue.value = 100;
        }
      } else if (event.event === 'outline') {
        const data = event.data as { volumes: VolumeOutline[] };
        store.setOutline({ volumes: data.volumes || [] });
        done.value = true;
        generating.value = false;
      } else if (event.event === 'error') {
        const data = event.data as { error: string };
        error.value = data.error || '生成失败';
        generating.value = false;
      }
    },
    (err: Error) => {
      error.value = err.message || '生成失败';
      generating.value = false;
    },
  );
}

function editVolume(volume: VolumeOutline) {
  const newTitle = prompt('卷标题:', volume.title);
  if (newTitle !== null) {
    store.updateVolume(volume.volumeNumber, { title: newTitle });
  }
}

function editArc(volume: VolumeOutline, arc: ArcOutline) {
  const newTitle = prompt('Arc 标题:', arc.title);
  if (newTitle !== null) {
    store.updateArc(volume.volumeNumber, arc.arcNumber, { title: newTitle });
  }
}

async function deleteVolume(volume: VolumeOutline) {
  try {
    await ElMessageBox.confirm(`确定要删除第${volume.volumeNumber}卷吗？`, '确认删除', {
      type: 'warning',
    });
    store.removeVolume(volume.volumeNumber);
  } catch {
    // cancelled
  }
}

async function deleteArc(volume: VolumeOutline, arc: ArcOutline) {
  try {
    await ElMessageBox.confirm(`确定要删除 Arc ${arc.arcNumber} 吗？`, '确认删除', {
      type: 'warning',
    });
    store.removeArc(volume.volumeNumber, arc.arcNumber);
  } catch {
    // cancelled
  }
}

async function regenerateVolume(volume: VolumeOutline) {
  try {
    generating.value = true;
    error.value = '';
    const mainGenre = store.mainGenre;
    const novelId = store.state.novelId || 'temp';

    const res = await creationApi.regenerateVolume(novelId, {
      volumeNumber: volume.volumeNumber,
      title: store.state.title,
      mainGenre: mainGenre?.label || '',
      subGenres: store.subGenres.map((g) => g.label),
      worldSetting: store.state.worldSetting || undefined,
      protagonist: store.state.protagonist || undefined,
      characters: store.state.characters || undefined,
      coreSetting: store.state.coreSetting || undefined,
      plotDirection: store.state.plotDirection || undefined,
      provider: store.state.aiProvider || undefined,
    });

    store.setOutlinePreview(res.data.preview);
    showPreviewDialog.value = true;
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    error.value = err.response?.data?.message || err.message || '重新生成失败，请重试';
  } finally {
    generating.value = false;
  }
}

async function regenerateArc(volume: VolumeOutline, arc: ArcOutline) {
  try {
    generating.value = true;
    error.value = '';
    const mainGenre = store.mainGenre;
    const novelId = store.state.novelId || 'temp';

    const res = await creationApi.regenerateArcChapters(novelId, {
      volumeNumber: volume.volumeNumber,
      arcNumber: arc.arcNumber,
      title: store.state.title,
      mainGenre: mainGenre?.label || '',
      subGenres: store.subGenres.map((g) => g.label),
      worldSetting: store.state.worldSetting || undefined,
      protagonist: store.state.protagonist || undefined,
      characters: store.state.characters || undefined,
      coreSetting: store.state.coreSetting || undefined,
      plotDirection: store.state.plotDirection || undefined,
      arcTitle: arc.title,
      arcSummary: arc.summary,
      provider: store.state.aiProvider || undefined,
    });

    store.setArcPreview(res.data.preview);
    showPreviewDialog.value = true;
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    error.value = err.response?.data?.message || err.message || '重新生成失败，请重试';
  } finally {
    generating.value = false;
  }
}

function cancelPreview() {
  showPreviewDialog.value = false;
  store.setOutlinePreview(null);
  store.setArcPreview(null);
}

function applyPreview() {
  if (store.state.outlinePreview) {
    store.applyVolumePreview();
  } else if (store.state.arcPreview) {
    store.applyArcPreview();
  }
  showPreviewDialog.value = false;
}

function saveAndNext() {
  store.nextStep();
}
</script>

<style scoped>
.step-outline {
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
  text-align: center;
  color: #606266;
  margin-top: 8px;
  font-size: 14px;
}

.outline-tree {
  margin-bottom: 24px;
}

.volume-item {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  margin-bottom: 16px;
  padding: 16px;
  background: #f5f7fa;
}

.volume-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.volume-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drag-handle {
  cursor: move;
  color: #909399;
}

.volume-number {
  font-weight: bold;
  color: #303133;
}

.volume-title {
  font-size: 16px;
  color: #303133;
}

.volume-actions {
  display: flex;
  gap: 8px;
}

.volume-summary {
  color: #606266;
  font-size: 14px;
  margin-bottom: 12px;
  padding-left: 24px;
}

.arcs-list {
  margin-left: 24px;
  margin-top: 12px;
}

.arc-item {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  margin-bottom: 12px;
  padding: 12px;
  background: #fff;
}

.arc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.arc-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.arc-number {
  font-weight: bold;
  color: #409eff;
}

.arc-title {
  color: #303133;
}

.arc-actions {
  display: flex;
  gap: 8px;
}

.arc-summary {
  color: #606266;
  font-size: 14px;
  margin-bottom: 8px;
  padding-left: 24px;
}

.chapters-list {
  margin-left: 24px;
  margin-top: 8px;
}

.chapter-item {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
  color: #606266;
}

.chapter-number {
  font-weight: bold;
  color: #909399;
  min-width: 60px;
}

.chapter-title {
  font-weight: 500;
  color: #303133;
  min-width: 150px;
}

.chapter-summary {
  color: #606266;
}

.preview-content {
  max-height: 500px;
  overflow-y: auto;
}

.preview-content h3 {
  margin-bottom: 12px;
  color: #303133;
}

.preview-content h4 {
  margin-top: 16px;
  margin-bottom: 8px;
  color: #409eff;
}

.preview-content p {
  color: #606266;
  margin-bottom: 12px;
}

.preview-content ul {
  margin-left: 20px;
  color: #606266;
}

.preview-content li {
  margin-bottom: 4px;
}

.step-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
}
</style>
