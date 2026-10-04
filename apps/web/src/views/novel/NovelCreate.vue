<template>
  <div class="novel-create-page">
    <el-container>
      <el-header class="page-header">
        <div class="header-left">
          <el-button text @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <h2>创建小说</h2>
        </div>
        <div class="header-right">
          <el-select
            v-if="providers.length > 0"
            :model-value="store.state.aiProvider || defaultProvider"
            placeholder="AI 服务"
            size="small"
            style="width: 180px; margin-right: 16px"
            @change="(val: string) => store.setAiProvider(val)"
          >
            <el-option
              v-for="p in providers"
              :key="p.name"
              :label="`${p.label} (${p.model})`"
              :value="p.name"
              :disabled="!p.configured"
            />
          </el-select>
          <span class="step-indicator">
            步骤 {{ store.currentStep }} / {{ store.totalSteps }}
          </span>
        </div>
      </el-header>

      <div class="progress-bar">
        <el-steps :active="store.currentStep - 1" align-center finish-status="success">
          <el-step v-for="step in stepLabels" :key="step.key" :title="step.label" />
        </el-steps>
      </div>

      <el-main class="page-main">
        <el-card>
          <StepGenre v-if="store.currentStep === 1" />
          <StepTitle v-else-if="store.currentStep === 2" />
          <StepEditTitle v-else-if="store.currentStep === 3" />
          <StepBasicSetting v-else-if="store.currentStep === 4" />
          <StepWorldSetting v-else-if="store.currentStep === 5" />
          <StepProtagonist v-else-if="store.currentStep === 6" />
          <StepCharacters v-else-if="store.currentStep === 7" />
          <StepCoreSetting v-else-if="store.currentStep === 8" />
          <StepPlotDirection v-else-if="store.currentStep === 9" />
          <StepOutline v-else-if="store.currentStep === 10" />
          <StepChapterPlan v-else-if="store.currentStep === 11" />
          <StepConfirm v-else-if="store.currentStep === 12" />
          <StepComplete v-else-if="store.currentStep === 13" />
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft } from '@element-plus/icons-vue';
import { useWizardStore } from '@/stores/wizard';
import { aiApi, type ProviderInfo } from '@/api/ai';
import StepGenre from './wizard/StepGenre.vue';
import StepTitle from './wizard/StepTitle.vue';
import StepEditTitle from './wizard/StepEditTitle.vue';
import StepBasicSetting from './wizard/StepBasicSetting.vue';
import StepWorldSetting from './wizard/StepWorldSetting.vue';
import StepProtagonist from './wizard/StepProtagonist.vue';
import StepCharacters from './wizard/StepCharacters.vue';
import StepCoreSetting from './wizard/StepCoreSetting.vue';
import StepPlotDirection from './wizard/StepPlotDirection.vue';
import StepOutline from './wizard/StepOutline.vue';
import StepChapterPlan from './wizard/StepChapterPlan.vue';
import StepConfirm from './wizard/StepConfirm.vue';
import StepComplete from './wizard/StepComplete.vue';

const router = useRouter();
const store = useWizardStore();
const providers = ref<ProviderInfo[]>([]);
const defaultProvider = ref('');

const stepLabels = [
  { key: 'genre', label: '类型' },
  { key: 'title', label: '书名' },
  { key: 'edit', label: '编辑' },
  { key: 'basic', label: '基础' },
  { key: 'world', label: '世界观' },
  { key: 'protagonist', label: '主角' },
  { key: 'characters', label: '角色' },
  { key: 'core', label: '核心' },
  { key: 'plot', label: '剧情' },
  { key: 'outline', label: '总纲' },
  { key: 'chapters', label: '章节' },
  { key: 'confirm', label: '确认' },
  { key: 'complete', label: '完成' },
];

onMounted(async () => {
  if (store.genres.length === 0) {
    store.loadGenres();
  }
  try {
    const res = await aiApi.getProviders();
    providers.value = res.data.providers || [];
    defaultProvider.value = res.data.defaultProvider || '';
    if (!store.state.aiProvider && defaultProvider.value) {
      store.setAiProvider(defaultProvider.value);
    }
  } catch {
    // ignore - provider selection is optional
  }
});

function goBack() {
  if (store.currentStep > 1 && store.currentStep < 13) {
    store.prevStep();
  } else {
    router.back();
  }
}
</script>

<style scoped>
.novel-create-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.page-header {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-left h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.step-indicator {
  color: #909399;
  font-size: 14px;
}

.progress-bar {
  background: #fff;
  padding: 20px 40px;
  border-bottom: 1px solid #e4e7ed;
}

.page-main {
  padding: 30px 40px;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}
</style>
