<template>
  <div class="step-core">
    <div class="step-header">
      <h2>核心设定</h2>
      <p class="step-desc">根据小说类型生成核心设定体系</p>
    </div>

    <div class="action-area">
      <el-button type="primary" :loading="generating" @click="generate">
        {{ store.state.coreSetting ? '重新生成' : 'AI 生成核心设定' }}
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

    <div v-if="store.state.coreSetting" class="core-display">
      <el-descriptions :column="1" border>
        <el-descriptions-item
          v-for="(value, key) in store.state.coreSetting"
          :key="String(key)"
          :label="String(key)"
        >
          {{ typeof value === 'string' ? value : JSON.stringify(value) }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="edit-toggle">
        <el-button text type="primary" @click="showRaw = !showRaw">
          {{ showRaw ? '隐藏原始数据' : '编辑原始数据' }}
        </el-button>
      </div>

      <el-input v-if="showRaw" v-model="rawJson" type="textarea" :rows="10" class="raw-editor" />
    </div>

    <div class="step-footer">
      <el-button @click="store.prevStep()">上一步</el-button>
      <el-button type="primary" @click="saveAndNext">下一步</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useWizardStore } from '@/stores/wizard';
import { creationApi } from '@/api/creation';

const store = useWizardStore();
const generating = ref(false);
const error = ref('');
const showRaw = ref(false);
const rawJson = ref('');

watch(
  () => store.state.coreSetting,
  (val) => {
    if (val) rawJson.value = JSON.stringify(val, null, 2);
  },
  { immediate: true },
);

async function generate() {
  generating.value = true;
  error.value = '';
  try {
    const mainGenre = store.mainGenre;
    const subGenres = store.subGenres;
    const res = await creationApi.generateCoreSetting({
      mainGenre: mainGenre?.label || '',
      subGenres: subGenres.map((g) => g.label),
      worldSetting: store.state.worldSetting || undefined,
      provider: store.state.aiProvider || undefined,
    });
    store.setCoreSetting(res.data.coreSetting);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    error.value = err.response?.data?.message || err.message || '生成失败，请重试';
  } finally {
    generating.value = false;
  }
}

function saveAndNext() {
  if (showRaw.value && rawJson.value) {
    try {
      store.setCoreSetting(JSON.parse(rawJson.value));
    } catch {
      error.value = 'JSON 格式错误';
      return;
    }
  }
  store.nextStep();
}
</script>

<style scoped>
.step-core {
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

.edit-toggle {
  margin-top: 16px;
  text-align: right;
}

.raw-editor {
  margin-top: 12px;
}

.step-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
}
</style>
