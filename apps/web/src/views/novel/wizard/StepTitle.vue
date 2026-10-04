<template>
  <div class="step-title">
    <div class="step-header">
      <h2>AI 生成书名和简介</h2>
      <p class="step-desc">AI 将根据你选择的类型生成多个书名和简介方案</p>
    </div>

    <div class="action-area">
      <el-button type="primary" size="large" :loading="generating" @click="generate">
        {{ store.state.titleCandidates.length > 0 ? '重新生成' : '开始生成' }}
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

    <div v-if="store.state.titleCandidates.length > 0" class="candidates-list">
      <div
        v-for="(candidate, index) in store.state.titleCandidates"
        :key="index"
        class="candidate-card"
        :class="{ selected: store.state.selectedTitleIndex === index }"
        @click="store.selectTitle(index)"
      >
        <div class="candidate-header">
          <h3>{{ candidate.title }}</h3>
          <el-tag v-if="store.state.selectedTitleIndex === index" type="success">已选择</el-tag>
        </div>
        <p class="candidate-desc">{{ candidate.description }}</p>
      </div>
    </div>

    <div class="step-footer">
      <el-button @click="store.prevStep()">上一步</el-button>
      <el-button
        type="primary"
        :disabled="store.state.selectedTitleIndex < 0"
        @click="store.nextStep()"
      >
        下一步
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useWizardStore } from '@/stores/wizard';
import { creationApi } from '@/api/creation';

const store = useWizardStore();
const generating = ref(false);
const error = ref('');

async function generate() {
  generating.value = true;
  error.value = '';
  try {
    const mainGenre = store.mainGenre;
    const subGenres = store.subGenres;
    const res = await creationApi.generateTitles({
      mainGenre: mainGenre?.label || '',
      subGenres: subGenres.map((g) => g.label),
      keywords: store.state.basicSetting.keywords,
      provider: store.state.aiProvider || undefined,
    });
    store.setTitleCandidates(res.data.candidates);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    error.value = err.response?.data?.message || err.message || '生成失败，请重试';
    console.error(err);
  } finally {
    generating.value = false;
  }
}
</script>

<style scoped>
.step-title {
  max-width: 800px;
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

.candidates-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.candidate-card {
  padding: 20px;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.candidate-card:hover {
  border-color: #409eff;
}

.candidate-card.selected {
  border-color: #67c23a;
  background: #f0f9eb;
}

.candidate-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.candidate-header h3 {
  font-size: 18px;
  margin: 0;
}

.candidate-desc {
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.step-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
}
</style>
