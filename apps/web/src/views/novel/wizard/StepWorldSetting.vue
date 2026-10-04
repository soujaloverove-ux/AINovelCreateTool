<template>
  <div class="step-world">
    <div class="step-header">
      <h2>世界观设定</h2>
      <p class="step-desc">AI 生成或手动编辑世界观</p>
    </div>

    <div class="action-area">
      <el-button type="primary" :loading="generating" @click="generate">
        {{ store.state.worldSetting ? '重新生成' : 'AI 生成世界观' }}
      </el-button>
      <el-button @click="useManual">手动编辑</el-button>
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

    <div v-if="store.state.worldSetting" class="world-form">
      <el-form label-position="top">
        <el-form-item label="世界背景">
          <el-input v-model="form.background" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="地理环境">
          <el-input v-model="form.geography" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="社会结构">
          <el-input v-model="form.socialStructure" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="主要势力">
          <el-input v-model="form.factions" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="时代背景">
          <el-input v-model="form.era" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="特殊规则">
          <el-input v-model="form.specialRules" type="textarea" :rows="2" />
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
import type { WorldSetting } from '@/api/creation';
import { creationApi } from '@/api/creation';

const store = useWizardStore();
const generating = ref(false);
const error = ref('');

const form = reactive<WorldSetting>({
  background: store.state.worldSetting?.background || '',
  geography: store.state.worldSetting?.geography || '',
  socialStructure: store.state.worldSetting?.socialStructure || '',
  factions: store.state.worldSetting?.factions || '',
  era: store.state.worldSetting?.era || '',
  specialRules: store.state.worldSetting?.specialRules || '',
});

watch(
  () => store.state.worldSetting,
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
    const res = await creationApi.generateWorldSetting({
      title: store.state.title,
      description: store.state.description,
      mainGenre: mainGenre?.label || '',
      subGenres: subGenres.map((g) => g.label),
      provider: store.state.aiProvider || undefined,
    });
    store.setWorldSetting(res.data.worldSetting);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    error.value = err.response?.data?.message || err.message || '生成失败，请重试';
  } finally {
    generating.value = false;
  }
}

function useManual() {
  if (!store.state.worldSetting) {
    store.setWorldSetting({ ...form });
  }
}

function saveAndNext() {
  store.setWorldSetting({ ...form });
  store.nextStep();
}
</script>

<style scoped>
.step-world {
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
