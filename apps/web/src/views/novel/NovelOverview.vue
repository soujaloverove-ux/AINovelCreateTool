<template>
  <div class="novel-overview">
    <el-card>
      <template #header>
        <span>小说概览</span>
      </template>
      <div v-if="novel" class="overview-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="书名">{{ novel.title }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(novel.status)">
              {{ getStatusLabel(novel.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="章节数">{{ novel.chapterCount }}</el-descriptions-item>
          <el-descriptions-item label="当前章节"
            >第{{ novel.currentChapter }}章</el-descriptions-item
          >
          <el-descriptions-item label="目标字数">{{
            novel.targetWordCount || '未设置'
          }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{
            formatTime(novel.createdAt)
          }}</el-descriptions-item>
          <el-descriptions-item label="简介" :span="2">
            {{ novel.description || '暂无简介' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useNovelStore } from '@/stores/novel';
import type { NovelStatus } from '@/types';

const novelStore = useNovelStore();
const novel = computed(() => novelStore.currentNovel);

const getStatusType = (
  status: NovelStatus,
): 'primary' | 'success' | 'warning' | 'info' | 'danger' => {
  const map: Record<NovelStatus, 'primary' | 'success' | 'warning' | 'info' | 'danger'> = {
    draft: 'info',
    in_progress: 'warning',
    completed: 'success',
    paused: 'primary',
  };
  return map[status];
};

const getStatusLabel = (status: NovelStatus) => {
  const map = { draft: '草稿', in_progress: '创作中', completed: '已完成', paused: '暂停' };
  return map[status];
};

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN');
};
</script>

<style scoped lang="scss">
.novel-overview {
  .overview-content {
    padding: 10px 0;
  }
}
</style>
