<template>
  <div class="step-basic">
    <div class="step-header">
      <h2>基础设定</h2>
      <p class="step-desc">设置小说的基本参数</p>
    </div>

    <el-form label-position="top" class="basic-form">
      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="章节数量">
            <el-input-number
              v-model="form.chapterCount"
              :min="10"
              :max="500"
              :step="10"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="每章字数">
            <el-input-number
              v-model="form.wordsPerChapter"
              :min="1000"
              :max="10000"
              :step="500"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="目标总字数">
            <el-input-number
              v-model="form.targetWordCount"
              :min="10000"
              :max="2000000"
              :step="10000"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="写作风格">
            <el-select v-model="form.writingStyle" style="width: 100%">
              <el-option label="轻松幽默" value="轻松幽默" />
              <el-option label="严肃深沉" value="严肃深沉" />
              <el-option label="热血激昂" value="热血激昂" />
              <el-option label="温馨治愈" value="温馨治愈" />
              <el-option label="黑暗压抑" value="黑暗压抑" />
              <el-option label="爽文节奏" value="爽文节奏" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="叙事视角">
            <el-select v-model="form.pointOfView" style="width: 100%">
              <el-option label="第一人称" value="第一人称" />
              <el-option label="第三人称" value="第三人称" />
              <el-option label="全知视角" value="全知视角" />
              <el-option label="多视角切换" value="多视角切换" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="节奏">
            <el-select v-model="form.pacing" style="width: 100%">
              <el-option label="快节奏" value="快节奏" />
              <el-option label="中等" value="中等" />
              <el-option label="慢热" value="慢热" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="目标读者">
            <el-select v-model="form.targetAudience" style="width: 100%">
              <el-option label="男性" value="男性" />
              <el-option label="女性" value="女性" />
              <el-option label="通用" value="通用" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="关键词">
            <el-select
              v-model="form.keywords"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="输入后回车添加"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <div class="step-footer">
      <el-button @click="store.prevStep()">上一步</el-button>
      <el-button type="primary" @click="saveAndNext">下一步</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { useWizardStore } from '@/stores/wizard';

const store = useWizardStore();

const form = reactive({ ...store.state.basicSetting });

function saveAndNext() {
  store.setBasicSetting({ ...form });
  store.nextStep();
}
</script>

<style scoped>
.step-basic {
  max-width: 700px;
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

.step-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
}
</style>
