<template>
  <div class="prompt-management">
    <div class="page-header">
      <h2>Prompt 管理</h2>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        创建 Prompt
      </el-button>
    </div>

    <div class="filter-bar">
      <el-select v-model="filterType" placeholder="按类型筛选" clearable @change="loadPrompts">
        <el-option v-for="type in promptTypes" :key="type" :label="type" :value="type" />
      </el-select>
      <el-select v-model="filterEnabled" placeholder="按状态筛选" clearable @change="loadPrompts">
        <el-option label="已启用" :value="true" />
        <el-option label="已禁用" :value="false" />
      </el-select>
    </div>

    <el-table v-loading="loading" :data="prompts" border>
      <el-table-column prop="name" label="名称" width="200" />
      <el-table-column prop="type" label="类型" width="180" />
      <el-table-column prop="version" label="版本" width="100" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'">
            {{ row.enabled ? '已启用' : '已禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="updatedAt" label="更新时间" width="180">
        <template #default="{ row }">
          {{ formatTime(row.updatedAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" width="280">
        <template #default="{ row }">
          <el-button size="small" @click="handleView(row as PromptTemplate)">查看</el-button>
          <el-button size="small" type="primary" @click="handleEdit(row as PromptTemplate)"
            >编辑</el-button
          >
          <el-button size="small" @click="handleCopy(row as PromptTemplate)">复制</el-button>
          <el-button size="small" @click="handleNewVersion(row as PromptTemplate)"
            >新版本</el-button
          >
          <el-button
            size="small"
            :type="(row as PromptTemplate).enabled ? 'warning' : 'success'"
            @click="handleToggle(row as PromptTemplate)"
          >
            {{ (row as PromptTemplate).enabled ? '停用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="formData.name" :disabled="isViewMode" />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-input v-model="formData.type" :disabled="isViewMode" />
        </el-form-item>
        <el-form-item label="版本">
          <el-input v-model="formData.version" :disabled="isViewMode" />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input
            v-model="formData.content"
            type="textarea"
            :rows="20"
            :disabled="isViewMode"
            placeholder="输入 Prompt 内容，使用 {{variable}} 作为变量占位符"
          />
        </el-form-item>
        <el-form-item label="变量说明">
          <div class="variable-hint">
            <p>
              使用
              <code>&#123;&#123;variableName&#125;&#125;</code>
              格式定义变量，例如：<code>&#123;&#123;title&#125;&#125;</code>、<code
                >&#123;&#123;chapter&#125;&#125;</code
              >
            </p>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button v-if="!isViewMode" type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { promptApi } from '@/api/prompt';
import type { PromptTemplate } from '@/types';

const loading = ref(false);
const submitting = ref(false);
const prompts = ref<PromptTemplate[]>([]);
const promptTypes = ref<string[]>([]);
const filterType = ref<string>('');
const filterEnabled = ref<boolean | undefined>(undefined);

const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit' | 'view' | 'newVersion'>('create');
const currentPrompt = ref<PromptTemplate | null>(null);
const formData = ref({
  name: '',
  type: '',
  content: '',
  version: '1.0.0',
});

const isViewMode = computed(() => dialogMode.value === 'view');
const dialogTitle = computed(() => {
  const titles = {
    create: '创建 Prompt',
    edit: '编辑 Prompt',
    view: '查看 Prompt',
    newVersion: '创建新版本',
  };
  return titles[dialogMode.value];
});

function formatTime(dateStr: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN');
}

async function loadPromptTypes() {
  try {
    const res = await promptApi.getTypes();
    promptTypes.value = res.data || [];
  } catch {
    console.error('Failed to load prompt types');
  }
}

async function loadPrompts() {
  loading.value = true;
  try {
    const res = await promptApi.list(filterType.value || undefined, filterEnabled.value);
    prompts.value = res.data || [];
  } catch {
    ElMessage.error('加载 Prompt 列表失败');
  } finally {
    loading.value = false;
  }
}

function handleCreate() {
  dialogMode.value = 'create';
  currentPrompt.value = null;
  formData.value = {
    name: '',
    type: '',
    content: '',
    version: '1.0.0',
  };
  dialogVisible.value = true;
}

function handleView(prompt: PromptTemplate) {
  dialogMode.value = 'view';
  currentPrompt.value = prompt;
  formData.value = {
    name: prompt.name,
    type: prompt.type,
    content: prompt.content,
    version: prompt.version,
  };
  dialogVisible.value = true;
}

function handleEdit(prompt: PromptTemplate) {
  dialogMode.value = 'edit';
  currentPrompt.value = prompt;
  formData.value = {
    name: prompt.name,
    type: prompt.type,
    content: prompt.content,
    version: prompt.version,
  };
  dialogVisible.value = true;
}

async function handleCopy(prompt: PromptTemplate) {
  try {
    await ElMessageBox.confirm(`确定要复制 "${prompt.name}" 吗？`, '确认', {
      type: 'info',
    });
    await promptApi.copy(prompt.id);
    ElMessage.success('复制成功');
    await loadPrompts();
  } catch {
    // User cancelled
  }
}

function handleNewVersion(prompt: PromptTemplate) {
  dialogMode.value = 'newVersion';
  currentPrompt.value = prompt;
  formData.value = {
    name: prompt.name,
    type: prompt.type,
    content: prompt.content,
    version: prompt.version,
  };
  dialogVisible.value = true;
}

async function handleToggle(prompt: PromptTemplate) {
  try {
    const action = prompt.enabled ? '停用' : '启用';
    await ElMessageBox.confirm(`确定要${action} "${prompt.name}" 吗？`, '确认', {
      type: 'warning',
    });
    await promptApi.toggle(prompt.id);
    ElMessage.success(`${action}成功`);
    await loadPrompts();
  } catch {
    // User cancelled
  }
}

async function handleSubmit() {
  if (!formData.value.name || !formData.value.type || !formData.value.content) {
    ElMessage.warning('请填写必填项');
    return;
  }

  submitting.value = true;
  try {
    if (dialogMode.value === 'create') {
      await promptApi.create(formData.value);
      ElMessage.success('创建成功');
    } else if (dialogMode.value === 'edit' && currentPrompt.value) {
      await promptApi.update(currentPrompt.value.id, formData.value);
      ElMessage.success('更新成功');
    } else if (dialogMode.value === 'newVersion' && currentPrompt.value) {
      await promptApi.createNewVersion(currentPrompt.value.id, {
        content: formData.value.content,
        version: formData.value.version,
      });
      ElMessage.success('新版本创建成功');
    }
    dialogVisible.value = false;
    await loadPrompts();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  loadPromptTypes();
  loadPrompts();
});
</script>

<style scoped lang="scss">
.prompt-management {
  padding: 20px;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h2 {
      margin: 0;
      font-size: 24px;
      color: #303133;
    }
  }

  .filter-bar {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
  }

  .variable-hint {
    padding: 12px;
    background: #f5f7fa;
    border-radius: 4px;
    font-size: 14px;
    color: #606266;

    code {
      padding: 2px 6px;
      background: #fff;
      border: 1px solid #dcdfe6;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
  }
}
</style>
