<template>
  <div class="step-plot">
    <div class="step-header">
      <h2>剧情方向</h2>
      <p class="step-desc">规划故事的核心冲突和发展方向</p>
    </div>

    <div class="action-area">
      <el-button type="primary" :loading="generating" @click="generate">
        {{ store.state.plotDirection ? '重新生成' : 'AI 生成剧情方向' }}
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

    <div v-if="store.state.plotDirection" class="plot-form">
      <el-form label-position="top">
        <el-form-item label="主线目标">
          <el-input v-model="form.mainGoal" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="核心冲突">
          <el-input v-model="form.coreConflict" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="故事走向">
          <el-input v-model="form.storyDirection" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="爽点设计">
          <el-input v-model="form.highlights" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="升级方向">
          <el-input v-model="form.upgradeDirection" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="感情线">
          <el-input v-model="form.romanceLine" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="重要剧情要求">
          <el-input v-model="form.importantPlot" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="禁止出现的内容">
          <el-input v-model="form.forbiddenContent" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
    </div>

    <div class="step-footer">
      <el-button @click="store.prevStep()">上一步</el-button>
      <el-button type="primary" @click="saveAndNext">下一步</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useWizardStore } from '@/stores/wizard';
import type { PlotDirection } from '@/api/creation';
import { creationApi } from '@/api/creation';

const store = useWizardStore();
const generating = ref(false);
const error = ref('');

const form = reactive<PlotDirection>({
  mainGoal: store.state.plotDirection?.mainGoal || '',
  coreConflict: store.state.plotDirection?.coreConflict || '',
  storyDirection: store.state.plotDirection?.storyDirection || '',
  highlights: store.state.plotDirection?.highlights || '',
  upgradeDirection: store.state.plotDirection?.upgradeDirection || '',
  romanceLine: store.state.plotDirection?.romanceLine || '',
  importantPlot: store.state.plotDirection?.importantPlot || '',
  forbiddenContent: store.state.plotDirection?.forbiddenContent || '',
});

watch(
  () => store.state.plotDirection,
  (val) => {
    if (val) Object.assign(form, val);
  },
);

async function generate() {
  generating.value = true;
  error.value = '';
  try {
    const mainGenre = store.mainGenre;
    const subGenres = store.subGenres;
    const res = await creationApi.generatePlotDirection({
      title: store.state.title,
      description: store.state.description,
      mainGenre: mainGenre?.label || '',
      subGenres: subGenres.map((g) => g.label),
      protagonist: store.state.protagonist || undefined,
      provider: store.state.aiProvider || undefined,
    });
    store.setPlotDirection(res.data.plotDirection);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    error.value = err.response?.data?.message || err.message || '生成失败，请重试';
  } finally {
    generating.value = false;
  }
}

function saveAndNext() {
  store.setPlotDirection({ ...form });
  store.nextStep();
}
</script>

<style scoped>
.step-plot {
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

.action-area {
  text-align: center;
  margin-bottom: 24px;
}

.error-alert {
  margin-bottom: 24px;
}

.step-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
}
</style>
