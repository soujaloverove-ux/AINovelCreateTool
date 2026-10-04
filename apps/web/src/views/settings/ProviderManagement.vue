<template>
  <div class="provider-management">
    <div class="page-header">
      <div class="header-content">
        <div class="breadcrumb">个人中心</div>
        <h1>AI Key 配置</h1>
        <p class="description">Key 仅用于对应供应商请求，页面不会回填已保存的 Key。</p>
      </div>
      <el-button size="large" @click="$router.back()">返回</el-button>
    </div>

    <div v-loading="loading" class="providers-grid">
      <el-card v-for="provider in providers" :key="provider.id" class="provider-card" shadow="hover">
        <div class="card-header">
          <div class="provider-info">
            <h3>{{ provider.label }}</h3>
            <span class="provider-name">{{ provider.name.toUpperCase() }}</span>
          </div>
          <el-tag :type="getStatusTagType(provider)" size="large">
            {{ getStatusText(provider) }}
          </el-tag>
        </div>

        <div class="provider-details">
          <div class="detail-row">
            <div class="detail-item">
              <div class="detail-label">已保存 Key</div>
              <div class="detail-value">{{ maskApiKey(provider.id) }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">最近验证</div>
              <div class="detail-value">{{ getLastVerifiedTime(provider.id) }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">当前模型</div>
              <div class="detail-value">{{ provider.model }}</div>
            </div>
          </div>
        </div>

        <div class="provider-actions">
          <div class="action-section">
            <label class="section-label">替换 Key</label>
            <el-input
              v-model="newKeys[provider.id]"
              placeholder="输入新 Key"
              clearable
              show-password
              size="large"
            />
          </div>

          <div class="button-group">
            <el-button
              :disabled="!newKeys[provider.id]"
              @click="handleReplaceKey(provider.id)"
              size="large"
            >
              替换 Key
            </el-button>
            <el-button @click="handleTestConnection(provider.id)" size="large">
              测试连接
            </el-button>
            <el-button type="danger" plain @click="handleDelete(provider.id)" size="large">
              删除 Key
            </el-button>
          </div>

          <div class="action-section">
            <label class="section-label">模型</label>
            <el-input v-model="providerModels[provider.id]" size="large" />
          </div>

          <div class="model-action">
            <el-button
              type="primary"
              :disabled="!providerModels[provider.id] || providerModels[provider.id] === provider.model"
              @click="handleChangeModel(provider.id)"
              size="large"
            >
              更换模型
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- Add New Provider Card -->
      <el-card class="provider-card add-provider-card" shadow="hover" @click="showAddDialog = true">
        <div class="add-provider-content">
          <el-icon :size="48" color="#909399"><Plus /></el-icon>
          <p>添加新的 AI 提供商</p>
        </div>
      </el-card>
    </div>

    <!-- Add Provider Dialog -->
    <el-dialog v-model="showAddDialog" title="添加 AI 提供商" width="600px">
      <el-form :model="newProvider" label-position="top">
        <el-form-item label="提供商名称" required>
          <el-select v-model="newProvider.name" placeholder="选择提供商" style="width: 100%">
            <el-option label="DeepSeek" value="deepseek" />
            <el-option label="Ollama (本地)" value="ollama" />
            <el-option label="Groq" value="groq" />
            <el-option label="Krill-Code" value="krill-code" />
            <el-option label="豆包 (Doubao)" value="doubao" />
            <el-option label="OpenAI" value="openai" />
            <el-option label="SiliconFlow" value="siliconflow" />
            <el-option label="Moonshot" value="moonshot" />
            <el-option label="通义千问 (Qwen)" value="qwen" />
          </el-select>
        </el-form-item>
        <el-form-item label="显示标签" required>
          <el-input v-model="newProvider.label" placeholder="例如：DeepSeek" />
        </el-form-item>
        <el-form-item label="API Base URL" required>
          <el-input v-model="newProvider.baseUrl" placeholder="https://api.example.com/v1" />
        </el-form-item>
        <el-form-item label="API Key" required>
          <el-input v-model="newProvider.apiKey" placeholder="sk-..." show-password />
        </el-form-item>
        <el-form-item label="默认模型" required>
          <el-input v-model="newProvider.model" placeholder="例如：gpt-4" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-input-number v-model="newProvider.priority" :min="0" :max="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" :loading="adding" @click="handleAddProvider">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { aiApi, type ProviderConfig, type CreateProviderDto } from '@/api/ai';

const loading = ref(false);
const adding = ref(false);
const providers = ref<ProviderConfig[]>([]);
const newKeys = reactive<Record<string, string>>({});
const providerModels = reactive<Record<string, string>>({});
const lastVerifiedTimes = reactive<Record<string, string>>({});
const showAddDialog = ref(false);

const newProvider = reactive<CreateProviderDto>({
  name: '',
  label: '',
  baseUrl: '',
  apiKey: '',
  model: '',
  priority: 0,
});

// Predefined base URLs for common providers
const providerDefaults: Record<string, { baseUrl: string; defaultModel: string }> = {
  deepseek: { baseUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-chat' },
  ollama: { baseUrl: 'http://localhost:11434/v1', defaultModel: 'qwen2.5:3b' },
  groq: { baseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile' },
  'krill-code': { baseUrl: 'https://api.krill.com/v1', defaultModel: 'gpt-4' },
  doubao: { baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', defaultModel: 'doubao-seed-1-6-250615' },
  openai: { baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4' },
  siliconflow: { baseUrl: 'https://api.siliconflow.cn/v1', defaultModel: 'Qwen/Qwen2.5-7B-Instruct' },
  moonshot: { baseUrl: 'https://api.moonshot.cn/v1', defaultModel: 'moonshot-v1-8k' },
  qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-turbo' },
};

onMounted(() => {
  loadProviders();
});

async function loadProviders() {
  loading.value = true;
  try {
    const response = await aiApi.getAllProviderConfigs();
    if (response.code === 0 && response.data) {
      providers.value = response.data.providers;

      // Initialize models and keys
      providers.value.forEach((p) => {
        providerModels[p.id] = p.model;
        newKeys[p.id] = '';
      });
    } else {
      ElMessage.error(response.message || '加载提供商列表失败');
    }
  } catch (error) {
    console.error('Failed to load providers:', error);
    ElMessage.error('加载提供商列表失败');
  } finally {
    loading.value = false;
  }
}

function maskApiKey(id: string): string {
  // Since we can't get the actual key from backend (security), show placeholder
  return '••••' + id.substring(0, 4);
}

function getLastVerifiedTime(id: string): string {
  return lastVerifiedTimes[id] || '尚未验证';
}

function getStatusTagType(provider: ProviderConfig): 'success' | 'warning' | 'danger' | 'info' {
  if (!provider.enabled) return 'info';
  const verified = lastVerifiedTimes[provider.id];
  if (!verified) return 'warning';
  return 'success';
}

function getStatusText(provider: ProviderConfig): string {
  if (!provider.enabled) return '已禁用';
  const verified = lastVerifiedTimes[provider.id];
  if (!verified) return '已保存未验证';
  return '已验证';
}

async function handleReplaceKey(id: string) {
  const newKey = newKeys[id];
  if (!newKey) {
    ElMessage.warning('请输入新的 API Key');
    return;
  }

  try {
    const provider = providers.value.find((p) => p.id === id);
    if (!provider) return;

    const response = await aiApi.updateProviderConfig(id, { apiKey: newKey });
    if (response.code === 0) {
      ElMessage.success('API Key 更新成功');
      newKeys[id] = '';
    } else {
      ElMessage.error(response.message || '更新失败');
    }
  } catch (error) {
    console.error('Failed to update API key:', error);
    ElMessage.error('更新 API Key 失败');
  }
}

async function handleTestConnection(id: string) {
  try {
    ElMessage.info('正在测试连接...');
    const response = await aiApi.testProviderConnection(id);

    if (response.code === 0 && response.data) {
      const result = response.data;
      const now = new Date().toLocaleString('zh-CN');
      lastVerifiedTimes[id] = now;

      if (result.ok) {
        ElMessage.success(`连接成功！延迟: ${result.latency}ms`);
      } else {
        ElMessage.error(result.error || '连接失败');
      }
    } else {
      ElMessage.error(response.message || '测试失败');
    }
  } catch (error) {
    console.error('Failed to test connection:', error);
    ElMessage.error('测试连接失败');
  }
}

async function handleChangeModel(id: string) {
  const newModel = providerModels[id];
  if (!newModel) {
    ElMessage.warning('请输入模型名称');
    return;
  }

  try {
    const response = await aiApi.updateProviderConfig(id, { model: newModel });
    if (response.code === 0) {
      ElMessage.success('模型更新成功');
      await loadProviders();
    } else {
      ElMessage.error(response.message || '更新失败');
    }
  } catch (error) {
    console.error('Failed to update model:', error);
    ElMessage.error('更新模型失败');
  }
}

async function handleDelete(id: string) {
  try {
    await ElMessageBox.confirm('确定要删除此提供商配置吗？此操作不可恢复。', '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });

    const response = await aiApi.deleteProviderConfig(id);
    if (response.code === 0) {
      ElMessage.success('删除成功');
      await loadProviders();
    } else {
      ElMessage.error(response.message || '删除失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete provider:', error);
      ElMessage.error('删除失败');
    }
  }
}

async function handleAddProvider() {
  if (!newProvider.name || !newProvider.label || !newProvider.apiKey || !newProvider.model) {
    ElMessage.warning('请填写所有必填字段');
    return;
  }

  adding.value = true;
  try {
    // Set default baseUrl if not provided
    if (!newProvider.baseUrl && providerDefaults[newProvider.name]) {
      newProvider.baseUrl = providerDefaults[newProvider.name].baseUrl;
    }

    const response = await aiApi.createProviderConfig(newProvider);
    if (response.code === 0) {
      ElMessage.success('提供商添加成功');
      showAddDialog.value = false;

      // Reset form
      Object.assign(newProvider, {
        name: '',
        label: '',
        baseUrl: '',
        apiKey: '',
        model: '',
        priority: 0,
      });

      await loadProviders();
    } else {
      ElMessage.error(response.message || '添加失败');
    }
  } catch (error) {
    console.error('Failed to add provider:', error);
    ElMessage.error('添加提供商失败');
  } finally {
    adding.value = false;
  }
}

// Watch for provider name changes to auto-fill defaults
import { watch } from 'vue';
watch(
  () => newProvider.name,
  (newName) => {
    if (newName && providerDefaults[newName]) {
      const defaults = providerDefaults[newName];
      if (!newProvider.baseUrl) {
        newProvider.baseUrl = defaults.baseUrl;
      }
      if (!newProvider.model) {
        newProvider.model = defaults.defaultModel;
      }
    }
  }
);
</script>

<style scoped>
.provider-management {
  min-height: 100vh;
  background: #faf8f5;
  padding: 40px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 40px;
}

.header-content {
  flex: 1;
}

.breadcrumb {
  font-size: 14px;
  color: #8b7355;
  margin-bottom: 12px;
}

.page-header h1 {
  font-size: 48px;
  font-weight: 600;
  color: #2c2c2c;
  margin: 0 0 16px 0;
  letter-spacing: -0.5px;
}

.description {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.providers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
  gap: 24px;
}

.provider-card {
  border-radius: 12px;
  border: 1px solid #e8e4df;
  background: #fff;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.provider-info h3 {
  font-size: 24px;
  font-weight: 600;
  color: #2c2c2c;
  margin: 0 0 4px 0;
}

.provider-name {
  font-size: 12px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.provider-details {
  background: #faf8f5;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.detail-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 12px;
  color: #999;
}

.detail-value {
  font-size: 14px;
  color: #2c2c2c;
  font-weight: 500;
  word-break: break-all;
}

.provider-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 14px;
  font-weight: 500;
  color: #2c2c2c;
}

.button-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.button-group .el-button {
  flex: 1;
  min-width: 120px;
}

.model-action {
  display: flex;
  justify-content: center;
}

.add-provider-card {
  cursor: pointer;
  transition: all 0.3s;
  border: 2px dashed #d9d9d9;
}

.add-provider-card:hover {
  border-color: #409eff;
  background: #f0f9ff;
}

.add-provider-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  color: #909399;
}

.add-provider-content p {
  margin-top: 16px;
  font-size: 16px;
}

@media (max-width: 1200px) {
  .providers-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .provider-management {
    padding: 20px;
  }

  .page-header h1 {
    font-size: 32px;
  }

  .detail-row {
    grid-template-columns: 1fr;
  }

  .button-group {
    flex-direction: column;
  }

  .button-group .el-button {
    width: 100%;
  }
}
</style>
