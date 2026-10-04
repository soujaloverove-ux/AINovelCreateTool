import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { novelApi } from '@/api/novel';
import type { Novel } from '@/types';

export const useNovelStore = defineStore('novel', () => {
  const novels = ref<Novel[]>([]);
  const currentNovel = ref<Novel | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const novelCount = computed(() => novels.value.length);
  const recentNovels = computed(() =>
    [...novels.value]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5),
  );

  async function fetchNovels() {
    loading.value = true;
    error.value = null;
    try {
      const res = await novelApi.findAll();
      novels.value = res.data;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchNovel(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await novelApi.findById(id);
      currentNovel.value = res.data;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  function clearCurrentNovel() {
    currentNovel.value = null;
  }

  return {
    novels,
    currentNovel,
    loading,
    error,
    novelCount,
    recentNovels,
    fetchNovels,
    fetchNovel,
    clearCurrentNovel,
  };
});
