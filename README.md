# QoderNovel - 本地 AI 自动小说创作工具

一个运行在本机上的 Web 应用，通过浏览器访问，用于创建、管理、生成和阅读中文网络小说。

## 功能概览

- **小说创建向导**：13 步引导式流程，从题材选择到角色生成，一站式完成小说设定
- **AI 章节生成**：基于大纲和设定自动生成章节内容，支持写作计划、内容生成、自动审核与重写
- **章节续写/扩写/缩写**：对已有章节进行续写、扩写或缩写操作
- **自动续写系统**：基于任务队列的批量章节生成，支持顺序生成、失败重试、暂停/恢复
- **任务中心**：异步 AI 任务管理，查看任务状态、进度和日志
- **Prompt 管理**：可视化管理所有 AI 提示词模板，支持版本控制、启用/禁用
- **章节版本管理**：章节修改历史追踪
- **小说阅读**：内置阅读模式

## 技术栈

### 前端
- Vue 3.4 (Composition API, `<script setup>`)
- TypeScript
- Vite 5
- Element Plus 2.5
- Pinia 2.1 (状态管理)
- Vue Router 4.2
- Axios
- SCSS

### 后端
- NestJS 10.3
- TypeScript
- TypeORM 0.3.19
- PostgreSQL
- OpenAI SDK 7.20
- Winston (日志)
- class-validator / class-transformer

### 项目结构
- pnpm workspace monorepo

## 目录结构

```
QoderNovel/
├── apps/
│   ├── server/                          # NestJS 后端
│   │   ├── src/
│   │   │   ├── main.ts                  # 入口文件
│   │   │   ├── app.module.ts            # 根模块
│   │   │   ├── common/                  # 公共模块
│   │   │   │   ├── enums.ts             # 全局枚举
│   │   │   │   ├── filters/             # 全局异常过滤器
│   │   │   │   ├── interceptors/        # 响应拦截器
│   │   │   │   └── logger/              # Winston 日志服务
│   │   │   ├── config/                  # 配置模块
│   │   │   │   ├── configuration.ts     # 应用配置
│   │   │   │   ├── database.config.ts   # 数据库配置
│   │   │   │   └── ormconfig.ts         # TypeORM 配置
│   │   │   ├── database/                # 数据库模块
│   │   │   │   ├── database.module.ts   # 数据库模块定义
│   │   │   │   └── seed.ts              # 种子数据（题材、Prompt 模板）
│   │   │   ├── migrations/              # 数据库迁移
│   │   │   └── modules/                 # 业务模块
│   │   │       ├── ai/                  # AI 服务（OpenAI 调用、Prompt 渲染）
│   │   │       ├── ai-task/             # AI 任务实体与服务
│   │   │       ├── chapter-generation/  # 章节生成（生成、审核、重写、续写、扩写、缩写）
│   │   │       ├── health/              # 健康检查
│   │   │       ├── novel/               # 小说 CRUD、小说创建流程
│   │   │       ├── novel-chapter/       # 章节管理、版本管理
│   │   │       ├── novel-character/     # 角色管理
│   │   │       ├── novel-genre/         # 题材管理
│   │   │       ├── novel-outline/       # 大纲管理
│   │   │       ├── prompt-template/     # Prompt 模板管理
│   │   │       └── task-center/         # 任务中心
│   │   └── ...
│   └── web/                             # Vue 3 前端
│       ├── src/
│       │   ├── main.ts                  # 入口文件
│       │   ├── App.vue                  # 根组件
│       │   ├── api/                     # API 调用层
│       │   │   ├── request.ts           # Axios 实例
│       │   │   ├── novel.ts             # 小说 API
│       │   │   ├── creation.ts          # 创建向导 API
│       │   │   ├── chapter-generation.ts # 章节生成 API
│       │   │   ├── prompt.ts            # Prompt 管理 API
│       │   │   └── ...
│       │   ├── components/              # 公共组件
│       │   ├── layouts/                 # 布局组件
│       │   ├── router/                  # 路由配置
│       │   ├── stores/                  # Pinia 状态管理
│       │   ├── styles/                  # 全局样式
│       │   ├── types/                   # TypeScript 类型定义
│       │   └── views/                   # 页面
│       │       ├── Home.vue             # 首页
│       │       ├── TaskCenter.vue       # 任务中心
│       │       ├── novel/               # 小说相关页面
│       │       │   ├── NovelList.vue    # 小说列表
│       │       │   ├── NovelCreate.vue  # 创建入口
│       │       │   ├── NovelChapters.vue # 章节管理
│       │       │   ├── NovelRead.vue    # 阅读模式
│       │       │   ├── NovelContinuation.vue # 续写
│       │       │   ├── wizard/          # 创建向导（13 步）
│       │       │   └── ...
│       │       └── settings/
│       │           └── PromptManagement.vue # Prompt 管理
│       └── ...
├── .env.example                         # 环境变量示例
├── pnpm-workspace.yaml                  # pnpm 工作区配置
└── README.md
```

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL >= 14

### 1. 克隆项目

```bash
git clone <repository-url>
cd QoderNovel
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
cp .env.example apps/server/.env
```

编辑 `apps/server/.env`，填入你的配置：

```ini
# 服务端口
SERVER_PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=qoder_novel

# OpenAI 配置
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4

# 日志级别
LOG_LEVEL=debug
```

### 4. 初始化数据库

```bash
# 创建数据库
createdb qoder_novel

# 或使用 psql
psql -U postgres -c "CREATE DATABASE qoder_novel;"
```

### 5. 运行数据库迁移和种子数据

```bash
# 在 apps/server 目录下
cd apps/server

# 运行迁移
pnpm typeorm migration:run -d dist/config/ormconfig.js

# 初始化种子数据（题材、Prompt 模板）
pnpm seed
```

### 6. 启动开发服务器

```bash
# 启动后端 (默认端口 3000)
pnpm dev:server

# 启动前端 (默认端口 5173)
pnpm dev:web
```

访问 http://localhost:5173 查看前端应用。

## 环境变量说明

| 变量 | 默认值 | 说明 |
|---|---|---|
| `SERVER_PORT` | `3000` | 后端服务端口 |
| `DB_HOST` | `localhost` | PostgreSQL 主机地址 |
| `DB_PORT` | `5432` | PostgreSQL 端口 |
| `DB_USERNAME` | `postgres` | 数据库用户名 |
| `DB_PASSWORD` | `postgres` | 数据库密码 |
| `DB_DATABASE` | `qoder_novel` | 数据库名称 |
| `OPENAI_API_KEY` | - | OpenAI API 密钥（仅后端使用，不会暴露到前端） |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI API 地址，可替换为兼容接口 |
| `OPENAI_MODEL` | `gpt-4` | 默认使用的 AI 模型 |
| `LOG_LEVEL` | `debug` | 日志级别（debug / info / warn / error） |

## 开发命令

```bash
# 安装依赖
pnpm install

# 启动后端开发服务器
pnpm dev:server

# 启动前端开发服务器
pnpm dev:web

# 代码检查
pnpm lint

# 代码格式化
pnpm format

# 检查格式
pnpm format:check
```

## 生产构建

```bash
# 构建后端
pnpm build:server

# 构建前端
pnpm build:web

# 启动生产后端
cd apps/server
node dist/main.js
```

## 小说创建流程

创建小说通过 13 步向导完成：

1. **选择题材** - 玄幻、修仙、都市、科幻等 13 种题材
2. **基础设定** - 小说名称、简介、核心卖点
3. **主角设计** - 姓名、性格、能力、背景
4. **世界设定** - 世界观、地理、势力、时代
5. **核心设定** - 力量体系、升级规则
6. **剧情方向** - 主线目标、冲突、发展方向
7. **生成大纲** - AI 生成卷 → 弧 → 章节计划的大纲结构
8. **章节计划** - AI 细化每章的事件、冲突、钩子
9. **生成标题** - AI 生成候选标题
10. **编辑标题** - 选择或修改标题
11. **生成角色** - AI 生成重要配角
12. **确认** - 检查所有设定
13. **完成** - 创建小说

创建完成后可在小说工作区管理章节、续写、阅读。

## Prompt 模板

系统内置 17 个 Prompt 模板，覆盖完整的小说创作流程：

| 类型 | 说明 |
|---|---|
| `title_generate` | 生成小说标题 |
| `description_generate` | 生成小说简介 |
| `world_generate` | 生成世界设定 |
| `character_generate` | 生成角色 |
| `power_system_generate` | 生成力量体系 |
| `main_plot_generate` | 生成主线剧情 |
| `outline_generate` | 生成大纲 |
| `chapter_plan_generate` | 生成章节计划 |
| `chapter_plan_prepare` | 准备写作计划 |
| `chapter_generate` | 生成章节内容 |
| `chapter_review` | 审核章节质量 |
| `chapter_rewrite` | 重写章节 |
| `chapter_continue` | 续写章节 |
| `chapter_expand` | 扩写章节 |
| `chapter_shorten` | 缩写章节 |

可在 `/settings/prompts` 页面查看、编辑、复制、创建新版本或启用/禁用模板。

模板使用 `{{变量名}}` 语法引用变量，系统会严格校验变量是否齐全。

## 安全说明

- OpenAI API Key 仅存储在后端环境变量中
- 前端绝不直接接触 API Key
- 所有 AI 调用通过后端统一处理
- 前端通过环境变量 `VITE_API_BASE_URL` 配置后端地址

## 常见问题

### Q: 启动后端时报数据库连接错误？

确认 PostgreSQL 服务已启动，且 `.env` 中的数据库配置正确。可以先用 `psql -U postgres -c "\l"` 测试连接。

### Q: AI 调用失败？

1. 检查 `OPENAI_API_KEY` 是否正确配置
2. 如果使用代理或第三方 API，确认 `OPENAI_BASE_URL` 设置正确
3. 检查网络连接是否能访问 OpenAI API

### Q: 如何更换 AI 模型？

修改 `apps/server/.env` 中的 `OPENAI_MODEL` 值，如 `gpt-4o`、`gpt-3.5-turbo` 等。

### Q: 前端页面空白或 API 报错？

确认后端服务已启动（默认端口 3000），前端 `VITE_API_BASE_URL` 指向正确的后端地址。

### Q: 如何初始化种子数据？

```bash
cd apps/server
pnpm seed
```

种子数据包括 13 种小说题材和 17 个 Prompt 模板。

### Q: 数据库迁移失败？

```bash
cd apps/server

# 回滚最近一次迁移
pnpm typeorm migration:revert -d dist/config/ormconfig.js

# 重新运行
pnpm typeorm migration:run -d dist/config/ormconfig.js
```

## License

[MIT License](LICENSE) © 2026 [soujaloverove-ux](https://github.com/soujaloverove-ux)

## 给作者打赏

如果这个项目对你有帮助，欢迎请作者喝杯咖啡。感谢你的支持！

<p align="center">
  <img src="assets/donate/wechat.jpg" alt="微信收款二维码" width="360" />
  <img src="assets/donate/alipay.jpg" alt="支付宝收款二维码" width="360" />
</p>
