<template>
  <div class="error-container">
    <el-result icon="error" :title="title" :sub-title="message">
      <template #extra>
        <slot>
          <el-button v-if="retryable" type="primary" @click="$emit('retry')"> 重试 </el-button>
        </slot>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  message?: string;
  retryable?: boolean;
}>();

defineEmits<{
  retry: [];
}>();
</script>

<style scoped lang="scss">
.error-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}
</style>
