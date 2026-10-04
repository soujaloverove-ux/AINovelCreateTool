<template>
  <div class="novel-list-page">
    <el-container>
      <el-header class="page-header">
        <div class="header-left">
          <el-button text @click="goHome">
            <el-icon><ArrowLeft /></el-icon>
            返回首页
          </el-button>
          <h2>小说列表</h2>
        </div>
        <el-button type="primary" @click="goToCreate">
          <el-icon><Plus /></el-icon>
          创建小说
        </el-button>
      </el-header>
      <el-main class="page-main">
        <Loading v-if="novelStore.loading" text="加载中..." />
        <Error
          v-else-if="novelStore.error"
          :message="novelStore.error"
          retryable
          @retry="novelStore.fetchNovels()"
        />
        <Empty v-else-if="novelStore.novels.length === 0" description="还没有小说">
          <el-button type="primary" @click="goToCreate">创建第一本小说</el-button>
        </Empty>
        <el-table v-else :data="novelStore.novels" style="width: 100%">
          <el-table-column prop="title" label="书名" min-width="200">
            <template #default="{ row }">
              <el-link type="primary" @click="goToNovel(row.id)">{{ row.title }}</el-link>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="150">
            <template #default="{ row }">
              <el-tag v-if="row.genreMaps?.length" size="small">
                {{ row.genreMaps[0].genre?.label || '-' }}
              </el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="currentChapter" label="当前章节" width="100">
            <template #default="{ row }"> 第{{ row.currentChapter }}章 </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="updatedAt" label="更新时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.updatedAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="goToNovel(row.id)"> 打开 </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, Plus } from '@element-plus/icons-vue';
import { useNovelStore } from '@/stores/novel';
import Loading from '@/components/common/Loading.vue';
import Empty from '@/components/common/Empty.vue';
import Error from '@/components/common/Error.vue';
import type { NovelStatus } from '@/types';

const router = useRouter();
const novelStore = useNovelStore();

const goHome = () => router.push('/');
const goToCreate = () => router.push('/novels/create');
const goToNovel = (id: string) => router.push(`/novels/${id}`);

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

onMounted(() => {
  novelStore.fetchNovels();
});
</script>

<style scoped lang="scss">
.novel-list-page {
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

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    h2 {
      margin: 0;
      font-size: 20px;
      color: #303133;
    }
  }
}

.page-main {
  padding: 30px 40px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
</style>
