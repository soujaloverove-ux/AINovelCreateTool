<template>
  <div class="step-characters">
    <div class="step-header">
      <h2>主要角色</h2>
      <p class="step-desc">AI 生成或手动添加重要配角</p>
    </div>

    <div class="action-area">
      <el-button type="primary" :loading="generating" @click="generate">
        {{ store.state.characters.length > 0 ? '重新生成' : 'AI 生成角色' }}
      </el-button>
      <el-button @click="addEmpty">手动添加</el-button>
    </div>

    <el-alert
      v-if="error"
      :title="error"
      type="error"
      show-icon
      closable
      class="error-alert"
      @close="error = ''"
    />

    <div v-if="store.state.characters.length > 0" class="characters-list">
      <el-collapse v-model="expandedItems">
        <el-collapse-item
          v-for="(char, index) in store.state.characters"
          :key="index"
          :name="index"
        >
          <template #title>
            <div class="char-header">
              <span class="char-name">{{ char.name || '未命名角色' }}</span>
              <el-tag size="small" :type="roleTagType(char.roleType)">{{
                roleLabel(char.roleType)
              }}</el-tag>
              <el-button type="danger" size="small" text @click.stop="store.removeCharacter(index)">
                删除
              </el-button>
            </div>
          </template>

          <el-form label-position="top">
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="姓名">
                  <el-input
                    :model-value="char.name"
                    @input="(v: string) => store.updateCharacter(index, { name: v })"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="角色类型">
                  <el-select
                    :model-value="char.roleType"
                    style="width: 100%"
                    @change="(v: string) => store.updateCharacter(index, { roleType: v })"
                  >
                    <el-option label="配角" value="supporting" />
                    <el-option label="反派" value="antagonist" />
                    <el-option label="次要" value="minor" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="与主角关系">
                  <el-input
                    :model-value="char.relationship"
                    @input="(v: string) => store.updateCharacter(index, { relationship: v })"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="身份">
              <el-input
                :model-value="char.identity"
                @input="(v: string) => store.updateCharacter(index, { identity: v })"
              />
            </el-form-item>
            <el-form-item label="性格">
              <el-input
                :model-value="char.personality"
                type="textarea"
                :rows="2"
                @input="(v: string) => store.updateCharacter(index, { personality: v })"
              />
            </el-form-item>
            <el-form-item label="能力">
              <el-input
                :model-value="char.ability"
                @input="(v: string) => store.updateCharacter(index, { ability: v })"
              />
            </el-form-item>
            <el-form-item label="背景">
              <el-input
                :model-value="char.background"
                type="textarea"
                :rows="2"
                @input="(v: string) => store.updateCharacter(index, { background: v })"
              />
            </el-form-item>
            <el-form-item label="目标">
              <el-input
                :model-value="char.goals"
                type="textarea"
                :rows="2"
                @input="(v: string) => store.updateCharacter(index, { goals: v })"
              />
            </el-form-item>
          </el-form>
        </el-collapse-item>
      </el-collapse>
    </div>

    <div class="step-footer">
      <el-button @click="store.prevStep()">上一步</el-button>
      <el-button type="primary" @click="store.nextStep()">下一步</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useWizardStore } from '@/stores/wizard';
import { creationApi } from '@/api/creation';

const store = useWizardStore();
const generating = ref(false);
const error = ref('');
const expandedItems = ref<number[]>([]);

async function generate() {
  generating.value = true;
  error.value = '';
  try {
    const mainGenre = store.mainGenre;
    const subGenres = store.subGenres;
    const res = await creationApi.generateCharacters({
      title: store.state.title,
      mainGenre: mainGenre?.label || '',
      subGenres: subGenres.map((g) => g.label),
      protagonist: store.state.protagonist || undefined,
      count: 5,
      provider: store.state.aiProvider || undefined,
    });
    store.setCharacters(res.data.characters);
    expandedItems.value = res.data.characters.map((_, i) => i);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    error.value = err.response?.data?.message || err.message || '生成失败，请重试';
  } finally {
    generating.value = false;
  }
}

function addEmpty() {
  store.addCharacter({
    name: '',
    identity: '',
    personality: '',
    ability: '',
    background: '',
    relationship: '',
    goals: '',
    roleType: 'supporting',
  });
  expandedItems.value.push(store.state.characters.length - 1);
}

function roleLabel(type: string): string {
  const map: Record<string, string> = {
    supporting: '配角',
    antagonist: '反派',
    minor: '次要',
  };
  return map[type] || type;
}

function roleTagType(type: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    supporting: 'primary',
    antagonist: 'danger',
    minor: 'info',
  };
  return map[type] || 'primary';
}
</script>

<style scoped>
.step-characters {
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

.action-area {
  text-align: center;
  margin-bottom: 24px;
}

.error-alert {
  margin-bottom: 24px;
}

.char-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.char-name {
  font-weight: 600;
  font-size: 15px;
}

.step-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
}
</style>
