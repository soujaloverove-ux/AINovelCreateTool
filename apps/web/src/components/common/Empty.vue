<template>
  <div class="empty-container">
    <el-empty :description="description" :image-size="imageSize">
      <template #default>
        <slot />
      </template>
      <template #image>
        <slot name="image">
          <el-icon :size="64" color="#c0c4cc">
            <Document v-if="!$slots.image" />
          </el-icon>
        </slot>
      </template>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { Document } from '@element-plus/icons-vue';

defineProps<{
  description?: string;
  imageSize?: number;
}>();
</script>

<style scoped lang="scss">
.empty-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}
</style>
