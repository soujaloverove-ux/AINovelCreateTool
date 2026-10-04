<template>
  <div class="step-genre">
    <div class="step-header">
      <h2>选择小说类型</h2>
      <p class="step-desc">选择一个主类型和多个子类型，将影响后续所有 AI 生成内容</p>
    </div>

    <el-skeleton :loading="store.loading" :rows="6" animated>
      <template #default>
        <div class="genre-section">
          <h3>主类型 <span class="required">*</span></h3>
          <div class="genre-grid">
            <div
              v-for="genre in availableGenres"
              :key="genre.id"
              class="genre-card"
              :class="{ active: store.state.mainGenreId === genre.id }"
              @click="selectMainGenre(genre.id)"
            >
              <span class="genre-label">{{ genre.label }}</span>
            </div>
          </div>
        </div>

        <div v-if="store.state.mainGenreId" class="genre-section">
          <h3>子类型 <span class="optional">(可多选)</span></h3>
          <div class="genre-grid">
            <div
              v-for="genre in availableSubGenres"
              :key="genre.id"
              class="genre-card sub"
              :class="{ active: store.state.subGenreIds.includes(genre.id) }"
              @click="toggleSubGenre(genre.id)"
            >
              <span class="genre-label">{{ genre.label }}</span>
              <el-icon v-if="store.state.subGenreIds.includes(genre.id)" class="check-icon">
                <Check />
              </el-icon>
            </div>
          </div>
        </div>
      </template>
    </el-skeleton>

    <div class="step-footer">
      <el-button type="primary" :disabled="!canProceed" @click="store.nextStep()">
        下一步
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { Check } from '@element-plus/icons-vue';
import { useWizardStore } from '@/stores/wizard';

const store = useWizardStore();

const availableGenres = computed(() => store.genres);
const availableSubGenres = computed(() =>
  store.genres.filter((g) => g.id !== store.state.mainGenreId),
);

const canProceed = computed(() => !!store.state.mainGenreId);

function selectMainGenre(id: string) {
  const subIds = store.state.subGenreIds.filter((sid) => sid !== id);
  store.setGenreSelection(id, subIds);
}

function toggleSubGenre(id: string) {
  const subs = [...store.state.subGenreIds];
  const idx = subs.indexOf(id);
  if (idx >= 0) {
    subs.splice(idx, 1);
  } else {
    subs.push(id);
  }
  store.setGenreSelection(store.state.mainGenreId, subs);
}

onMounted(() => {
  if (store.genres.length === 0) {
    store.loadGenres();
  }
});
</script>

<style scoped>
.step-genre {
  max-width: 800px;
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

.genre-section {
  margin-bottom: 32px;
}

.genre-section h3 {
  font-size: 16px;
  margin-bottom: 16px;
}

.required {
  color: #f56c6c;
}

.optional {
  color: #909399;
  font-weight: normal;
  font-size: 13px;
}

.genre-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.genre-card {
  position: relative;
  padding: 16px;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.genre-card:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.genre-card.active {
  border-color: #409eff;
  background: #ecf5ff;
  color: #409eff;
  font-weight: 600;
}

.genre-card.sub.active .check-icon {
  position: absolute;
  top: 4px;
  right: 4px;
  color: #409eff;
}

.genre-label {
  font-size: 15px;
}

.step-footer {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}
</style>
