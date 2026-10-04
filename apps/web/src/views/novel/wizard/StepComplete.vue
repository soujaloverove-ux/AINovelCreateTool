<template>
  <div class="step-complete">
    <el-result icon="success" title="小说创建成功！" sub-title="所有设定已保存，可以开始创作了">
      <template #extra>
        <el-button type="primary" size="large" @click="goToWorkspace"> 进入工作台 </el-button>
        <el-button @click="startNew">创建新小说</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useWizardStore } from '@/stores/wizard';

const router = useRouter();
const store = useWizardStore();

function goToWorkspace() {
  const novelId = store.state.novelId;
  if (novelId) {
    store.reset();
    router.push(`/novels/${novelId}/overview`);
  }
}

function startNew() {
  store.reset();
}
</script>

<style scoped>
.step-complete {
  max-width: 600px;
  margin: 60px auto;
}
</style>
