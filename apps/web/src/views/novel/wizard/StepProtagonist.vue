<template>
  <div class="step-protagonist">
    <div class="step-header">
      <h2>主角设定</h2>
      <p class="step-desc">AI 生成或手动编辑主角信息</p>
    </div>

    <div class="action-area">
      <el-button type="primary" :loading="generating" @click="generate">
        {{ store.state.protagonist ? '重新生成' : 'AI 生成主角' }}
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

    <div v-if="store.state.protagonist" class="protagonist-form">
      <el-form label-position="top">
        <el-row :gutter="24">
          <el-col :span="8">
            <el-form-item label="姓名">
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="性别">
              <el-select v-model="form.gender" style="width: 100%">
                <el-option label="男" value="男" />
                <el-option label="女" value="女" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="年龄">
              <el-input v-model="form.age" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="身份">
          <el-input v-model="form.identity" />
        </el-form-item>

        <el-form-item label="性格特点">
          <el-input v-model="form.personality" type="textarea" :rows="2" />
        </el-form-item>

        <el-form-item label="外貌特征">
          <el-input v-model="form.appearance" type="textarea" :rows="2" />
        </el-form-item>

        <el-form-item label="初始能力">
          <el-input v-model="form.ability" />
        </el-form-item>

        <el-form-item label="背景故事">
          <el-input v-model="form.background" type="textarea" :rows="3" />
        </el-form-item>

        <el-form-item label="目标追求">
          <el-input v-model="form.goals" type="textarea" :rows="2" />
        </el-form-item>

        <el-form-item label="金手指/特殊优势">
          <el-input v-model="form.goldenFinger" type="textarea" :rows="2" />
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
import type { Protagonist } from '@/api/creation';
import { creationApi } from '@/api/creation';

const store = useWizardStore();
const generating = ref(false);
const error = ref('');

const form = reactive<Protagonist>({
  name: store.state.protagonist?.name || '',
  gender: store.state.protagonist?.gender || '男',
  age: store.state.protagonist?.age || '',
  identity: store.state.protagonist?.identity || '',
  personality: store.state.protagonist?.personality || '',
  appearance: store.state.protagonist?.appearance || '',
  ability: store.state.protagonist?.ability || '',
  background: store.state.protagonist?.background || '',
  goals: store.state.protagonist?.goals || '',
  goldenFinger: store.state.protagonist?.goldenFinger || '',
});

watch(
  () => store.state.protagonist,
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
    const res = await creationApi.generateProtagonist({
      title: store.state.title,
      description: store.state.description,
      mainGenre: mainGenre?.label || '',
      subGenres: subGenres.map((g) => g.label),
      worldSetting: store.state.worldSetting || undefined,
      provider: store.state.aiProvider || undefined,
    });
    store.setProtagonist(res.data.protagonist);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    error.value = err.response?.data?.message || err.message || '生成失败，请重试';
  } finally {
    generating.value = false;
  }
}

function saveAndNext() {
  store.setProtagonist({ ...form });
  store.nextStep();
}
</script>

<style scoped>
.step-protagonist {
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
