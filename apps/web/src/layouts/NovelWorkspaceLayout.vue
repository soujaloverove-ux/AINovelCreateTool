<template>
  <div class="novel-workspace-layout">
    <el-container>
      <el-header class="workspace-header">
        <div class="header-left">
          <el-button text @click="goHome">
            <el-icon><HomeFilled /></el-icon>
            首页
          </el-button>
          <el-divider direction="vertical" />
          <span v-if="novelStore.currentNovel" class="novel-title">
            {{ novelStore.currentNovel.title }}
          </span>
        </div>
        <div class="header-right">
          <el-button text @click="toggleRightPanel">
            <el-icon><Monitor /></el-icon>
            AI 工具
          </el-button>
          <el-divider direction="vertical" />
          <el-button text @click="goToNovels">
            <el-icon><List /></el-icon>
            小说列表
          </el-button>
        </div>
      </el-header>
      <el-container class="workspace-body">
        <el-aside width="180px" class="workspace-sidebar">
          <el-menu :default-active="activeMenu" :router="true" class="sidebar-menu">
            <el-menu-item :index="`/novels/${novelId}/overview`">
              <el-icon><Document /></el-icon>
              <span>概览</span>
            </el-menu-item>
            <el-menu-item :index="`/novels/${novelId}/world`">
              <el-icon><Place /></el-icon>
              <span>世界观</span>
            </el-menu-item>
            <el-menu-item :index="`/novels/${novelId}/characters`">
              <el-icon><User /></el-icon>
              <span>角色</span>
            </el-menu-item>
            <el-menu-item :index="`/novels/${novelId}/outline`">
              <el-icon><Files /></el-icon>
              <span>大纲</span>
            </el-menu-item>
            <el-menu-item :index="`/novels/${novelId}/chapters`">
              <el-icon><Notebook /></el-icon>
              <span>章节</span>
            </el-menu-item>
            <el-menu-item :index="`/novels/${novelId}/read`">
              <el-icon><Reading /></el-icon>
              <span>阅读</span>
            </el-menu-item>
            <el-menu-item :index="`/novels/${novelId}/continuation`">
              <el-icon><Promotion /></el-icon>
              <span>续写</span>
            </el-menu-item>
            <el-menu-item :index="`/novels/${novelId}/settings`">
              <el-icon><Setting /></el-icon>
              <span>设置</span>
            </el-menu-item>
          </el-menu>
        </el-aside>
        <el-main class="workspace-content">
          <Loading v-if="novelStore.loading" text="加载中..." />
          <Error
            v-else-if="novelStore.error"
            :message="novelStore.error"
            retryable
            @retry="novelStore.fetchNovel(novelId)"
          />
          <router-view v-else />
        </el-main>
        <transition name="slide-right">
          <el-aside
            v-if="rightPanelVisible"
            :width="rightPanelWidth + 'px'"
            class="workspace-right-panel"
          >
            <div class="right-panel-header">
              <span class="right-panel-title">{{ rightPanelTitle }}</span>
              <el-button text size="small" @click="rightPanelVisible = false">
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
            <div class="right-panel-body">
              <component :is="rightPanelComponent" v-bind="rightPanelProps" />
            </div>
          </el-aside>
        </transition>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, watch, type Component } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  HomeFilled,
  List,
  Document,
  User,
  Place,
  Files,
  Notebook,
  Reading,
  Setting,
  Monitor,
  Close,
  Promotion,
} from '@element-plus/icons-vue';
import { useNovelStore } from '@/stores/novel';
import Loading from '@/components/common/Loading.vue';
import Error from '@/components/common/Error.vue';

const route = useRoute();
const router = useRouter();
const novelStore = useNovelStore();

const novelId = computed(() => route.params.id as string);
const activeMenu = computed(() => route.path);

const goHome = () => router.push('/');
const goToNovels = () => router.push('/novels');

const rightPanelVisible = ref(false);
const rightPanelWidth = ref(360);
const rightPanelTitle = ref('AI 工具');
const rightPanelComponent = ref<Component | null>(null);
const rightPanelProps = ref<Record<string, unknown>>({});

function toggleRightPanel() {
  rightPanelVisible.value = !rightPanelVisible.value;
}

function openRightPanel(options: {
  title: string;
  component: Component;
  props?: Record<string, unknown>;
  width?: number;
}) {
  rightPanelTitle.value = options.title;
  rightPanelComponent.value = options.component;
  rightPanelProps.value = options.props || {};
  rightPanelWidth.value = options.width || 360;
  rightPanelVisible.value = true;
}

function closeRightPanel() {
  rightPanelVisible.value = false;
}

provide('workspaceRightPanel', {
  open: openRightPanel,
  close: closeRightPanel,
  toggle: toggleRightPanel,
});

onMounted(() => {
  novelStore.fetchNovel(novelId.value);
});

watch(novelId, (newId) => {
  novelStore.fetchNovel(newId);
  rightPanelVisible.value = false;
  rightPanelComponent.value = null;
});

onUnmounted(() => {
  rightPanelComponent.value = null;
});
</script>

<style scoped lang="scss">
.novel-workspace-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
  height: 56px;
  flex-shrink: 0;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .novel-title {
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.workspace-body {
  flex: 1;
  overflow: hidden;
}

.workspace-sidebar {
  background: #fff;
  border-right: 1px solid #e4e7ed;
  overflow-y: auto;
  flex-shrink: 0;

  .sidebar-menu {
    border-right: none;
    height: 100%;
  }
}

.workspace-content {
  background: #f5f7fa;
  overflow-y: auto;
  padding: 20px;
  flex: 1;
}

.workspace-right-panel {
  background: #fff;
  border-left: 1px solid #e4e7ed;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  .right-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #e4e7ed;
    flex-shrink: 0;

    .right-panel-title {
      font-size: 14px;
      font-weight: 500;
      color: #303133;
    }
  }

  .right-panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
