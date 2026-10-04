<template>
  <div class="step-edit-title">
    <div class="step-header">
      <h2>编辑书名和简介</h2>
      <p class="step-desc">你可以修改 AI 生成的内容，或完全自定义</p>
    </div>

    <el-form label-position="top" class="edit-form">
      <el-form-item label="书名">
        <el-input v-model="title" placeholder="输入书名" maxlength="50" show-word-limit />
      </el-form-item>

      <el-form-item label="简介">
        <el-input
          v-model="description"
          type="textarea"
          :rows="6"
          placeholder="输入简介"
          maxlength="1000"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <div class="step-footer">
      <el-button @click="store.prevStep()">上一步</el-button>
      <el-button type="primary" :disabled="!title.trim()" @click="saveAndNext"> 下一步 </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useWizardStore } from '@/stores/wizard';

const store = useWizardStore();
const title = ref(store.state.title);
const description = ref(store.state.description);

function saveAndNext() {
  store.setTitle(title.value);
  store.setDescription(description.value);
  store.nextStep();
}
</script>

<style scoped>
.step-edit-title {
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

.edit-form {
  margin-bottom: 24px;
}

.step-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
}
</style>
