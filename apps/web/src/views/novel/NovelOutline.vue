<template>
  <div class="novel-outline">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>大纲</span>
          <el-button type="primary" size="small">
            <el-icon><Plus /></el-icon>
            添加大纲
          </el-button>
        </div>
      </template>
      <Empty description="暂无大纲" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue';
import Empty from '@/components/common/Empty.vue';
</script>

<style scoped lang="scss">
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
