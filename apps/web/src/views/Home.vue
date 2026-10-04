<template>
  <div class="home-page">
    <el-container>
      <el-header class="home-header">
        <h1>QoderNovel</h1>
        <span class="subtitle">AI 小说创作工具</span>
        <router-link to="/tasks" class="header-link">任务中心</router-link>
        <router-link to="/settings/prompts" class="header-link">Prompt 管理</router-link>
        <router-link to="/settings/providers" class="header-link">AI Key 配置</router-link>
      </el-header>
      <el-main class="home-main">
        <div class="stats-section">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-card shadow="hover" class="stat-card">
                <div class="stat-content">
                  <div class="stat-icon">
                    <el-icon :size="32" color="#409eff"><Notebook /></el-icon>
                  </div>
                  <div class="stat-info">
                    <div class="stat-value">{{ novelStore.novelCount }}</div>
                    <div class="stat-label">小说总数</div>
                  </div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="hover" class="stat-card">
                <div class="stat-content">
                  <div class="stat-icon">
                    <el-icon :size="32" color="#67c23a"><CircleCheck /></el-icon>
                  </div>
                  <div class="stat-info">
                    <div class="stat-value">{{ completedCount }}</div>
                    <div class="stat-label">已完成</div>
                  </div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="hover" class="stat-card">
                <div class="stat-content">
                  <div class="stat-icon">
                    <el-icon :size="32" color="#e6a23c"><Edit /></el-icon>
                  </div>
                  <div class="stat-info">
                    <div class="stat-value">{{ inProgressCount }}</div>
                    <div class="stat-label">创作中</div>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>

        <div class="action-section">
          <el-button type="primary" size="large" @click="goToCreate">
            <el-icon><Plus /></el-icon>
            创建新小说
          </el-button>
          <el-button size="large" @click="goToNovels">
            <el-icon><List /></el-icon>
            查看全部
          </el-button>
        </div>

        <div class="recent-section">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>最近编辑</span>
                <el-button text type="primary" @click="goToNovels">查看全部</el-button>
              </div>
            </template>
            <Loading v-if="novelStore.loading" text="加载中..." />
            <Empty
              v-else-if="novelStore.recentNovels.length === 0"
              description="还没有小说，快来创建吧"
            />
            <el-table v-else :data="novelStore.recentNovels" style="width: 100%">
              <el-table-column prop="title" label="书名" min-width="200">
                <template #default="{ row }">
                  <el-link type="primary" @click="goToNovel(row.id)">{{ row.title }}</el-link>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="getStatusType(row.status)" size="small">
                    {{ getStatusLabel(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="chapterCount" label="章节" width="80" />
              <el-table-column prop="updatedAt" label="更新时间" width="180">
                <template #default="{ row }">
                  {{ formatTime(row.updatedAt) }}
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Notebook, CircleCheck, Edit, Plus, List } from '@element-plus/icons-vue';
import { useNovelStore } from '@/stores/novel';
import Loading from '@/components/common/Loading.vue';
import Empty from '@/components/common/Empty.vue';
import type { NovelStatus } from '@/types';

const router = useRouter();
const novelStore = useNovelStore();

const completedCount = computed(
  () => novelStore.novels.filter((n) => n.status === 'completed').length,
);
const inProgressCount = computed(
  () => novelStore.novels.filter((n) => n.status === 'in_progress').length,
);

const goToCreate = () => router.push('/novels/create');
const goToNovels = () => router.push('/novels');
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
  const date = new Date(time);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
};

onMounted(() => {
  novelStore.fetchNovels();
});
</script>

<style scoped lang="scss">
.home-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.home-header {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 40px;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 64px;

  h1 {
    margin: 0;
    font-size: 24px;
    color: #303133;
    font-weight: 600;
  }

  .subtitle {
    color: #909399;
    font-size: 14px;
  }

  .header-link {
    margin-left: auto;
    color: #409eff;
    text-decoration: none;
    font-size: 14px;

    &:hover {
      text-decoration: underline;
    }
  }
}

.home-main {
  padding: 30px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.stats-section {
  margin-bottom: 30px;

  .stat-card {
    :deep(.el-card__body) {
      padding: 20px;
    }
  }

  .stat-content {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background: #f5f7fa;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-info {
    .stat-value {
      font-size: 28px;
      font-weight: 600;
      color: #303133;
    }

    .stat-label {
      font-size: 14px;
      color: #909399;
      margin-top: 4px;
    }
  }
}

.action-section {
  margin-bottom: 30px;
  display: flex;
  gap: 12px;
}

.recent-section {
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
