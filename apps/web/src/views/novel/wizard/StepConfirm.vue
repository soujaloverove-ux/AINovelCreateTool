<template>
  <div class="step-confirm">
    <div class="step-header">
      <h2>确认创建</h2>
      <p class="step-desc">请检查所有设定信息，确认无误后创建小说</p>
    </div>

    <el-descriptions :column="1" border class="confirm-section">
      <el-descriptions-item label="书名">
        <strong>{{ store.state.title }}</strong>
      </el-descriptions-item>
      <el-descriptions-item label="简介">
        {{ store.state.description || '无' }}
      </el-descriptions-item>
      <el-descriptions-item label="类型">
        <el-tag v-if="store.mainGenre" type="primary">{{ store.mainGenre.label }}</el-tag>
        <el-tag v-for="g in store.subGenres" :key="g.id" class="sub-tag">
          {{ g.label }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="章节数">
        {{ store.state.basicSetting.chapterCount }} 章
      </el-descriptions-item>
      <el-descriptions-item label="每章字数">
        {{ store.state.basicSetting.wordsPerChapter }} 字
      </el-descriptions-item>
      <el-descriptions-item label="目标总字数">
        {{ store.state.basicSetting.targetWordCount.toLocaleString() }} 字
      </el-descriptions-item>
      <el-descriptions-item label="写作风格">
        {{ store.state.basicSetting.writingStyle || '未设定' }}
      </el-descriptions-item>
      <el-descriptions-item label="叙事视角">
        {{ store.state.basicSetting.pointOfView }}
      </el-descriptions-item>
    </el-descriptions>

    <el-descriptions v-if="store.state.protagonist" :column="1" border class="confirm-section">
      <el-descriptions-item label="主角">
        {{ store.state.protagonist.name }}（{{ store.state.protagonist.identity }}）
      </el-descriptions-item>
    </el-descriptions>

    <div v-if="store.state.characters.length > 0" class="confirm-section">
      <h3>主要角色 ({{ store.state.characters.length }})</h3>
      <div class="char-tags">
        <el-tag v-for="(char, i) in store.state.characters" :key="i" class="char-tag">
          {{ char.name }}（{{ char.relationship || '未定义' }}）
        </el-tag>
      </div>
    </div>

    <div v-if="store.state.chapterPlan.length > 0" class="confirm-section">
      <h3>章节规划 ({{ store.state.chapterPlan.length }} 章)</h3>
    </div>

    <div class="step-footer">
      <el-button @click="store.prevStep()">上一步</el-button>
      <el-button type="primary" size="large" :loading="creating" @click="createNovel">
        确认创建
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useWizardStore } from '@/stores/wizard';
import { creationApi } from '@/api/creation';
import { ElMessage } from 'element-plus';

const store = useWizardStore();
const creating = ref(false);

async function createNovel() {
  creating.value = true;
  try {
    const mainGenre = store.mainGenre;
    const subGenres = store.subGenres;

    const data = {
      title: store.state.title,
      description: store.state.description,
      genreIds: store.state.genreIds,
      basicSetting: store.state.basicSetting,
      worldSetting: store.state.worldSetting,
      protagonist: store.state.protagonist,
      characters: store.state.characters,
      coreSetting: store.state.coreSetting,
      plotDirection: store.state.plotDirection,
      outline: store.state.outline
        ? {
            title: '小说总纲',
            summary: '',
            content: '',
            children: store.state.outline.volumes.map((v) => ({
              title: `第${v.volumeNumber}卷 ${v.title}`,
              summary: v.summary,
              content: '',
              children: v.arcs.map((a) => ({
                title: `Arc ${a.arcNumber} ${a.title}`,
                summary: a.summary,
                content: '',
              })),
            })),
          }
        : undefined,
      chapterPlan: store.state.chapterPlan,
      mainGenre: mainGenre?.label,
      subGenres: subGenres.map((g) => g.label),
    };

    const novelId = store.state.novelId || 'temp-' + Date.now();
    const res = await creationApi.finalizeNovel(novelId, data as Record<string, unknown>);

    store.setNovelId(res.data.id);
    store.nextStep();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    ElMessage.error(err.response?.data?.message || err.message || '创建失败，请重试');
    console.error(err);
  } finally {
    creating.value = false;
  }
}
</script>

<style scoped>
.step-confirm {
  max-width: 700px;
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

.confirm-section {
  margin-bottom: 24px;
}

.confirm-section h3 {
  font-size: 16px;
  margin-bottom: 12px;
}

.sub-tag {
  margin-left: 8px;
}

.char-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.step-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
}
</style>
