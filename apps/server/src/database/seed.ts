import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Novel } from '../modules/novel/novel.entity';
import { NovelGenre } from '../modules/novel-genre/novel-genre.entity';
import { NovelGenreMap } from '../modules/novel-genre/novel-genre-map.entity';
import { NovelCharacter } from '../modules/novel-character/novel-character.entity';
import { NovelOutline } from '../modules/novel-outline/novel-outline.entity';
import { NovelChapter } from '../modules/novel-chapter/novel-chapter.entity';
import { AiTask } from '../modules/ai-task/ai-task.entity';
import { PromptTemplate } from '../modules/prompt-template/prompt-template.entity';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const genres = [
  { name: 'system', label: '系统', sortOrder: 1 },
  { name: 'isekai', label: '穿越', sortOrder: 2 },
  { name: 'cultivation', label: '修仙', sortOrder: 3 },
  { name: 'fantasy', label: '玄幻', sortOrder: 4 },
  { name: 'urban', label: '都市', sortOrder: 5 },
  { name: 'historical', label: '历史', sortOrder: 6 },
  { name: 'scifi', label: '科幻', sortOrder: 7 },
  { name: 'apocalypse', label: '末世', sortOrder: 8 },
  { name: 'game', label: '游戏', sortOrder: 9 },
  { name: 'multiverse', label: '诸天', sortOrder: 10 },
  { name: 'rebirth', label: '重生', sortOrder: 11 },
  { name: 'mystery', label: '悬疑', sortOrder: 12 },
  { name: 'other', label: '其他', sortOrder: 13 },
];

const promptTemplates = [
  {
    name: 'generate_title',
    type: 'title_generate',
    content: `你是一个专业的网络小说命名师。根据小说的基本信息，生成{{count}}个有吸引力的小说书名。

## 小说信息
- 类型：{{genreText}}
- 简介：{{description}}
- 主角：{{protagonistName}}
- 核心设定：{{coreSetting}}

## 命名要求
1. 书名要简洁有力，一般2-8个字
2. 要能体现小说类型和核心卖点
3. 要有网文风格，吸引目标读者
4. 避免过于俗套或雷同
5. 可以考虑以下命名方式：
   - 主角名字/称号 + 动作/状态
   - 核心设定/道具名称
   - 意境/氛围型
   - 悬念/疑问型
   - 反差/对比型

## 输出格式
直接返回JSON格式：
{"titles":["书名1","书名2","书名3",...]}`,
    variables: {
      genreText: 'string',
      description: 'string',
      protagonistName: 'string',
      coreSetting: 'string',
      count: 'number',
    },
    version: '1.0.0',
    enabled: true,
  },
  {
    name: 'generate_description',
    type: 'description_generate',
    content: `你是一个专业的网络小说文案师。根据小说的基本信息，生成{{count}}个吸引人的小说简介。

## 小说信息
- 书名：{{title}}
- 类型：{{genreText}}
- 主角：{{protagonistName}}
- 核心设定：{{coreSetting}}
- 世界观：{{worldSetting}}

## 简介要求
1. 每个简介100-200字
2. 要能快速吸引目标读者
3. 突出核心卖点和爽点
4. 制造悬念和期待感
5. 语言要有网文风格
6. 避免剧透关键剧情
7. 可以使用以下结构：
   - 主角身份/处境 + 金手指/机遇 + 目标/追求
   - 悬念开头 + 核心设定 + 期待感结尾
   - 冲突开头 + 反转 + 展望

## 输出格式
直接返回JSON格式：
{"descriptions":["简介1","简介2","简介3",...]}`,
    variables: {
      title: 'string',
      genreText: 'string',
      protagonistName: 'string',
      coreSetting: 'string',
      worldSetting: 'string',
      count: 'number',
    },
    version: '1.0.0',
    enabled: true,
  },
  {
    name: 'generate_world_setting',
    type: 'world_generate',
    content: `你是一个专业的网络小说世界观设计师。根据小说的基本信息，设计完整且自洽的世界观设定。

## 小说信息
- 书名：{{title}}
- 简介：{{description}}
- 类型：{{genreText}}
{{writingStyleContext}}
{{protagonistContext}}

## 设计要求
请设计以下世界观要素，确保各要素之间逻辑自洽，与小说类型和主角设定高度匹配：

1. **background** - 世界背景（200-300字）：世界的起源、历史脉络、当前状态
2. **geography** - 地理环境（100-200字）：主要地域、地形特征、重要地点
3. **socialStructure** - 社会结构（100-200字）：社会阶层、权力分布、文化特征
4. **factions** - 主要势力（100-200字）：3-5个主要势力，各自的立场和目标
5. **era** - 时代背景（50-100字）：当前时代特征、技术水平、社会风貌
6. **specialRules** - 特殊规则/法则（100-200字）：这个世界的独特规则或限制

## 输出格式
直接返回JSON格式：
{"worldSetting":{"background":"...","geography":"...","socialStructure":"...","factions":"...","era":"...","specialRules":"..."}}`,
    variables: {
      title: 'string',
      description: 'string',
      genreText: 'string',
      writingStyleContext: 'string',
      protagonistContext: 'string',
    },
    version: '1.0.0',
    enabled: true,
  },
  {
    name: 'generate_character',
    type: 'character_generate',
    content: `你是一个专业的网络小说角色设计师。根据小说的类型、世界观和主角信息，设计{{count}}个有血有肉的重要角色。

## 小说信息
- 书名：{{title}}
- 类型：{{genreText}}
- 世界观：{{worldSettingContext}}

## 主角信息
{{protagonistContext}}

## 设计要求
设计{{count}}个重要角色，要求：
- 角色类型多样化：包含盟友、对手、导师、爱人等不同类型
- 每个角色有鲜明的个性、动机和成长弧线
- 与主角有明确的关系和互动方式
- 角色之间存在复杂的网络关系
- 角色的能力、身份与世界观设定一致
- 避免角色功能重复，每个角色都有不可替代的作用

## 每个角色包含
- name: 姓名（符合类型风格）
- identity: 身份/职业
- personality: 性格特点（50-100字，要具体）
- ability: 能力/技能
- background: 背景故事（100-200字）
- relationship: 与主角的关系
- goals: 个人目标/动机
- roleType: 角色类型（supporting/antagonist/minor）

## 输出格式
直接返回JSON格式：
{"characters":[{"name":"...","identity":"...","personality":"...","ability":"...","background":"...","relationship":"...","goals":"...","roleType":"..."}, ...]}`,
    variables: {
      title: 'string',
      genreText: 'string',
      worldSettingContext: 'string',
      protagonistContext: 'string',
      count: 'number',
    },
    version: '1.0.0',
    enabled: true,
  },
  {
    name: 'generate_power_system',
    type: 'power_system_generate',
    content: `你是一个专业的网络小说设定师。根据小说类型和世界观，设计完整的力量体系/核心设定。

## 小说信息
- 书名：{{title}}
- 类型：{{genreText}}
- 世界观背景：{{worldSettingContext}}

## 设计要求
设计一套完整、自洽、有层次感的力量体系，要求：
- 体系要有清晰的等级/层次划分
- 每个等级有明确的特征和能力范围
- 升级条件和方式要合理
- 体系的限制和代价要明确
- 与世界观的社会结构、势力分布相呼应
- 为后续剧情发展留有空间

{{genreSpecificPrompt}}

## 输出格式
返回JSON格式的核心设定对象，包含该类型所需的所有设定要素。
键名使用中文，值使用详细描述。
外层必须使用 coreSetting 包装：{"coreSetting": {...}}`,
    variables: {
      title: 'string',
      genreText: 'string',
      worldSettingContext: 'string',
      genreSpecificPrompt: 'string',
    },
    version: '1.0.0',
    enabled: true,
  },
  {
    name: 'generate_main_plot',
    type: 'main_plot_generate',
    content: `你是一个专业的网络小说剧情策划师。根据小说的所有设定信息，规划完整的故事主线。

## 小说信息
- 书名：{{title}}
- 简介：{{description}}
- 类型：{{genreText}}
- 写作风格：{{writingStyle}}
- 叙事视角：{{pointOfView}}
- 目标字数：{{targetWordCount}}字

## 世界观
{{worldSettingContext}}

## 主角
{{protagonistContext}}

## 主要角色
{{charactersContext}}

## 力量体系
{{powerSystemContext}}

## 设计要求
规划完整的故事主线，确保：
- 主线目标清晰，与主角的动机和能力匹配
- 核心冲突有层次感，从个人到世界逐步升级
- 故事走向有起伏，节奏张弛有度
- 爽点设计符合目标读者喜好
- 升级方向与力量体系一致
- 感情线自然融入主线
- 重要剧情节点分布合理
- 明确禁止出现的内容

## 输出内容
1. mainGoal - 主线目标（主角最终要达成什么，100-200字）
2. coreConflict - 核心冲突（主要矛盾是什么，100-200字）
3. storyDirection - 故事走向（整体发展趋势，200-300字）
4. highlights - 爽点设计（读者最期待的看点，100-200字）
5. upgradeDirection - 升级方向（主角如何变强，100-200字）
6. romanceLine - 感情线（是否有感情线，如何发展，100-200字）
7. importantPlot - 重要剧情要求（必须出现的关键剧情，100-200字）
8. forbiddenContent - 禁止出现的内容（避雷项，50-100字）

## 输出格式
直接返回JSON格式：
{"plotDirection":{"mainGoal":"...","coreConflict":"...","storyDirection":"...","highlights":"...","upgradeDirection":"...","romanceLine":"...","importantPlot":"...","forbiddenContent":"..."}}`,
    variables: {
      title: 'string',
      description: 'string',
      genreText: 'string',
      writingStyle: 'string',
      pointOfView: 'string',
      targetWordCount: 'number',
      worldSettingContext: 'string',
      protagonistContext: 'string',
      charactersContext: 'string',
      powerSystemContext: 'string',
    },
    version: '1.0.0',
    enabled: true,
  },
  {
    name: 'generate_outline',
    type: 'outline_generate',
    content: `你是一个专业的网络小说总纲策划师。根据提供的所有设定信息，生成结构化的小说总纲。

## 小说信息
- 书名：{{title}}
- 简介：{{description}}
- 类型：{{genreText}}
- 写作风格：{{writingStyle}}
- 叙事视角：{{pointOfView}}
- 目标字数：{{targetWordCount}}字
- 计划章节数：{{chapterCount}}章

## 世界观
{{worldSettingContext}}

## 主角
{{protagonistContext}}

## 主要角色
{{charactersContext}}

## 力量体系
{{powerSystemContext}}

## 剧情方向
{{plotDirectionContext}}

## 总纲结构要求
总纲分为{{volumeCount}}卷，每卷包含若干剧情弧（Arc），每个Arc包含若干章节。

结构：
StoryOutline
├── Volume（卷）
│    ├── Arc（剧情弧）
│    │    ├── ChapterPlan（章节规划）

每卷要求：
- 有明确的卷名和主题
- 包含2-4个剧情弧（Arc）
- 每卷结尾有大高潮

每个Arc要求：
- 有明确的弧名和核心事件
- 包含3-8个章节
- 有起承转合的完整结构

每个ChapterPlan包含：
- chapterNumber: 章节序号
- title: 章节标题
- summary: 剧情概要（50-100字）
- keyEvents: 关键事件列表
- conflict: 冲突
- highlight: 爽点/看点
- endingHook: 结尾钩子
- characters: 出场角色
- location: 场景地点

## 角色一致性要求
- 角色行为必须符合其性格设定
- 角色不能使用尚未获得的能力
- 角色不知道的信息不能突然出现
- 角色关系发展要有铺垫

## 输出格式
直接返回JSON格式：
{"volumes":[{"volumeNumber":1,"title":"卷名","summary":"卷概要","arcs":[{"arcNumber":1,"title":"弧名","summary":"弧概要","chapters":[{"chapterNumber":1,"title":"...","summary":"...","keyEvents":["事件1","事件2"],"conflict":"...","highlight":"...","endingHook":"...","characters":["角色1","角色2"],"location":"地点"}]}]}]}`,
    variables: {
      title: 'string',
      description: 'string',
      genreText: 'string',
      writingStyle: 'string',
      pointOfView: 'string',
      targetWordCount: 'number',
      chapterCount: 'number',
      worldSettingContext: 'string',
      protagonistContext: 'string',
      charactersContext: 'string',
      powerSystemContext: 'string',
      plotDirectionContext: 'string',
      volumeCount: 'number',
    },
    version: '1.0.0',
    enabled: true,
  },
  {
    name: 'generate_chapter_plan',
    type: 'chapter_plan_generate',
    content: `你是一个专业的网络小说章节规划师。根据总纲和所有设定，生成详细的章节规划。

## 小说信息
- 书名：{{title}}
- 类型：{{genreText}}
- 写作风格：{{writingStyle}}
- 目标章节数：{{chapterCount}}章

## 世界观
{{worldSettingContext}}

## 主角
{{protagonistContext}}

## 主要角色
{{charactersContext}}

## 力量体系
{{powerSystemContext}}

## 剧情方向
{{plotDirectionContext}}

## 总纲内容
{{outlineContext}}

## 章节规划要求
为{{chapterCount}}个章节生成详细规划，每个章节包含：
- chapterNumber: 章节序号（从1开始连续）
- title: 章节标题（有吸引力，符合风格）
- summary: 剧情概要（50-100字）
- keyEvents: 关键事件（2-4个）
- conflict: 本章冲突
- highlight: 爽点/看点
- endingHook: 结尾钩子（吸引读者继续阅读）
- characters: 出场角色名单
- location: 场景地点

## 角色一致性要求
- 严格按照角色设定描写行为
- 能力使用要符合当前进度
- 信息获取要有合理来源
- 性格保持一致性

## 节奏要求
- 每3-5章一个小高潮
- 每卷结尾一个大高潮
- 张弛有度，不要全程高压
- 适当安排日常/过渡章节

## 输出格式
直接返回JSON格式：
{"chapters":[{"chapterNumber":1,"title":"...","summary":"...","keyEvents":["事件1","事件2"],"conflict":"...","highlight":"...","endingHook":"...","characters":["角色1"],"location":"地点"}, ...]}`,
    variables: {
      title: 'string',
      genreText: 'string',
      writingStyle: 'string',
      chapterCount: 'number',
      worldSettingContext: 'string',
      protagonistContext: 'string',
      charactersContext: 'string',
      powerSystemContext: 'string',
      plotDirectionContext: 'string',
      outlineContext: 'string',
    },
    version: '1.0.0',
    enabled: true,
  },
  {
    name: 'regenerate_volume_outline',
    type: 'outline_generate',
    content: `你是一个专业的网络小说总纲策划师。请重新生成第{{volumeNumber}}卷的大纲。

## 小说信息
- 书名：{{title}}
- 类型：{{genreText}}

## 世界观
{{worldSettingContext}}

## 主角
{{protagonistContext}}

## 主要角色
{{charactersContext}}

## 力量体系
{{powerSystemContext}}

## 剧情方向
{{plotDirectionContext}}

## 现有总纲（其他卷内容，仅供参考，不要修改）
{{existingOutlineContext}}

## 当前第{{volumeNumber}}卷内容（将被替换）
{{currentVolumeContext}}

## 要求
重新设计第{{volumeNumber}}卷的大纲，保持与其他卷的连贯性。

结构：
Volume
├── Arc（剧情弧）
│    ├── ChapterPlan（章节规划）

每个ChapterPlan包含：
- chapterNumber, title, summary, keyEvents, conflict, highlight, endingHook, characters, location

## 输出格式
直接返回JSON格式：
{"volumeNumber":{{volumeNumber}},"title":"卷名","summary":"卷概要","arcs":[{"arcNumber":1,"title":"弧名","summary":"弧概要","chapters":[...]}]}`,
    variables: {
      volumeNumber: 'number',
      title: 'string',
      genreText: 'string',
      worldSettingContext: 'string',
      protagonistContext: 'string',
      charactersContext: 'string',
      powerSystemContext: 'string',
      plotDirectionContext: 'string',
      existingOutlineContext: 'string',
      currentVolumeContext: 'string',
    },
    version: '1.0.0',
    enabled: true,
  },
  {
    name: 'regenerate_arc_chapters',
    type: 'chapter_plan_generate',
    content: `你是一个专业的网络小说章节规划师。请重新生成第{{volumeNumber}}卷第{{arcNumber}}弧的章节规划。

## 小说信息
- 书名：{{title}}
- 类型：{{genreText}}

## 世界观
{{worldSettingContext}}

## 主角
{{protagonistContext}}

## 主要角色
{{charactersContext}}

## 力量体系
{{powerSystemContext}}

## 剧情方向
{{plotDirectionContext}}

## 第{{volumeNumber}}卷第{{arcNumber}}弧信息
- 弧名：{{arcTitle}}
- 弧概要：{{arcSummary}}

## 角色一致性要求
- 严格按照角色设定描写行为
- 能力使用要符合当前进度
- 信息获取要有合理来源

## 要求
重新设计该弧的章节规划，每个章节包含：
- chapterNumber, title, summary, keyEvents, conflict, highlight, endingHook, characters, location

## 输出格式
直接返回JSON格式：
{"volumeNumber":{{volumeNumber}},"arcNumber":{{arcNumber}},"chapters":[{"chapterNumber":1,"title":"...","summary":"...","keyEvents":["事件"],"conflict":"...","highlight":"...","endingHook":"...","characters":["角色"],"location":"地点"}]}`,
    variables: {
      volumeNumber: 'number',
      arcNumber: 'number',
      title: 'string',
      genreText: 'string',
      worldSettingContext: 'string',
      protagonistContext: 'string',
      charactersContext: 'string',
      powerSystemContext: 'string',
      plotDirectionContext: 'string',
      arcTitle: 'string',
      arcSummary: 'string',
    },
    version: '1.0.0',
    enabled: true,
  },
  {
    name: 'chapter_plan_prepare',
    type: 'chapter_plan_prepare',
    content: `你是一个专业的网络小说写作助手。根据以下信息，为第{{chapterNumber}}章生成详细的写作计划。

## 小说信息
- 书名：{{title}}
- 类型：{{genreText}}
- 写作风格：{{writingStyle}}
- 叙事视角：{{pointOfView}}

## 本章规划
- 章节序号：{{chapterNumber}}
- 章节标题：{{chapterTitle}}
- 剧情概要：{{chapterSummary}}
- 关键事件：{{keyEvents}}
- 冲突：{{conflict}}
- 爽点：{{highlight}}
- 结尾钩子：{{endingHook}}
- 出场角色：{{characters}}
- 场景地点：{{location}}

## 所属卷/弧信息
{{volumeArcContext}}

## 世界观
{{worldSettingContext}}

## 力量体系
{{powerSystemContext}}

## 上一章状态
{{previousChapterContext}}

## 相关角色详细设定
{{characterDetailsContext}}

## 要求
请生成详细的写作计划，包含：
1. sceneBreakdown - 场景分解（3-6个场景，每个场景包含地点、人物、事件、情绪基调）
2. characterStates - 角色状态（每个出场角色的起始状态和结束状态）
3. plotPoints - 情节点（必须出现的关键情节）
4. emotionalArc - 情绪曲线（从什么情绪开始，经历什么变化，到什么情绪结束）
5. foreshadowing - 伏笔/铺垫（需要埋下或呼应的内容）
6. wordCountTarget - 字数目标

## 输出格式
直接返回JSON格式：
{"sceneBreakdown":[{"location":"地点","characters":["角色"],"event":"事件","mood":"情绪基调"}],"characterStates":[{"name":"角色名","startState":"起始状态","endState":"结束状态"}],"plotPoints":["情节点1","情节点2"],"emotionalArc":"情绪曲线描述","foreshadowing":"伏笔/铺垫","wordCountTarget":3000}`,
    variables: {
      chapterNumber: 'number',
      title: 'string',
      genreText: 'string',
      writingStyle: 'string',
      pointOfView: 'string',
      chapterTitle: 'string',
      chapterSummary: 'string',
      keyEvents: 'string',
      conflict: 'string',
      highlight: 'string',
      endingHook: 'string',
      characters: 'string',
      location: 'string',
      volumeArcContext: 'string',
      worldSettingContext: 'string',
      powerSystemContext: 'string',
      previousChapterContext: 'string',
      characterDetailsContext: 'string',
    },
    version: '1.0.0',
    enabled: true,
  },
  {
    name: 'chapter_generate',
    type: 'chapter_generate',
    content: `你是一个专业的网络小说作家。请根据以下信息，撰写小说的第{{chapterNumber}}章正文。

## 小说信息
- 书名：{{title}}
- 类型：{{genreText}}
- 写作风格：{{writingStyle}}
- 叙事视角：{{pointOfView}}
- 每章目标字数：{{targetWordCount}}字

## 本章写作计划
{{writingPlanContext}}

## 本章规划
- 章节标题：{{chapterTitle}}
- 剧情概要：{{chapterSummary}}
- 关键事件：{{keyEvents}}
- 冲突：{{conflict}}
- 爽点/看点：{{highlight}}
- 结尾钩子：{{endingHook}}
- 出场角色：{{characters}}
- 场景地点：{{location}}

## 世界观
{{worldSettingContext}}

## 力量体系
{{powerSystemContext}}

## 相关角色设定
{{characterDetailsContext}}

## 上一章结尾
{{previousChapterContext}}

## 写作要求
1. 严格按照写作计划展开，确保所有情节点都覆盖到
2. 对话要符合角色性格，自然流畅
3. 场景描写要有画面感，但不要过度堆砌
4. 剧情推进要有节奏感，张弛有度
5. 冲突要有层次感，逐步升级
6. 爽点要铺垫充分，爆发有力
7. 结尾钩子要自然，吸引读者继续阅读
8. 禁止水字数、重复描述、剧情停滞
9. 角色行为必须符合设定，不能突然获得新能力或知识
10. 保持与上一章的连贯性

## 输出要求
直接输出章节正文，不需要任何标记或说明。
章节标题格式：第{{chapterNumber}}章 {{chapterTitle}}
正文从标题后换行开始。`,
    variables: {
      chapterNumber: 'number',
      title: 'string',
      genreText: 'string',
      writingStyle: 'string',
      pointOfView: 'string',
      targetWordCount: 'number',
      writingPlanContext: 'string',
      chapterTitle: 'string',
      chapterSummary: 'string',
      keyEvents: 'string',
      conflict: 'string',
      highlight: 'string',
      endingHook: 'string',
      characters: 'string',
      location: 'string',
      worldSettingContext: 'string',
      powerSystemContext: 'string',
      characterDetailsContext: 'string',
      previousChapterContext: 'string',
    },
    version: '1.0.0',
    enabled: true,
  },
  {
    name: 'chapter_review',
    type: 'chapter_review',
    content: `你是一个专业的网络小说编辑。请审核以下章节正文，检查是否存在问题。

## 小说信息
- 书名：{{title}}
- 类型：{{genreText}}

## 本章规划
- 章节标题：{{chapterTitle}}
- 剧情概要：{{chapterSummary}}
- 关键事件：{{keyEvents}}
- 冲突：{{conflict}}
- 爽点：{{highlight}}
- 结尾钩子：{{endingHook}}

## 角色设定
{{characterDetailsContext}}

## 章节正文
{{chapterContent}}

## 审核项目
请逐项检查：
1. plotConsistency - 剧情一致性（是否按照规划展开，有无遗漏关键事件）
2. characterConsistency - 角色一致性（行为是否符合设定，有无OOC）
3. logicCheck - 逻辑检查（有无逻辑漏洞、前后矛盾）
4. pacingCheck - 节奏检查（是否水字数、剧情是否停滞）
5. continuityCheck - 连贯性检查（与上一章是否衔接自然）
6. qualityScore - 质量评分（1-10分）
7. issues - 发现的问题列表
8. suggestions - 修改建议

## 输出格式
直接返回JSON格式：
{"plotConsistency":"通过/问题描述","characterConsistency":"通过/问题描述","logicCheck":"通过/问题描述","pacingCheck":"通过/问题描述","continuityCheck":"通过/问题描述","qualityScore":8,"issues":["问题1","问题2"],"suggestions":["建议1","建议2"]}`,
    variables: {
      title: 'string',
      genreText: 'string',
      chapterTitle: 'string',
      chapterSummary: 'string',
      keyEvents: 'string',
      conflict: 'string',
      highlight: 'string',
      endingHook: 'string',
      characterDetailsContext: 'string',
      chapterContent: 'string',
    },
    version: '1.0.0',
    enabled: true,
  },
  {
    name: 'chapter_rewrite',
    type: 'chapter_rewrite',
    content: `你是一个专业的网络小说作家。请根据审核反馈，重新撰写以下章节。

## 小说信息
- 书名：{{title}}
- 类型：{{genreText}}
- 写作风格：{{writingStyle}}
- 叙事视角：{{pointOfView}}

## 本章规划
- 章节标题：{{chapterTitle}}
- 剧情概要：{{chapterSummary}}
- 关键事件：{{keyEvents}}
- 冲突：{{conflict}}
- 爽点：{{highlight}}
- 结尾钩子：{{endingHook}}

## 审核反馈
{{reviewFeedback}}

## 原章节正文
{{originalContent}}

## 世界观
{{worldSettingContext}}

## 相关角色设定
{{characterDetailsContext}}

## 上一章结尾
{{previousChapterContext}}

## 重写要求
1. 根据审核反馈修正所有问题
2. 保持原有的优点，不要过度修改
3. 确保修正后的内容与其他设定保持一致
4. 保持章节的完整性和连贯性

## 输出要求
直接输出重写后的章节正文。
章节标题格式：第{{chapterNumber}}章 {{chapterTitle}}`,
    variables: {
      title: 'string',
      genreText: 'string',
      writingStyle: 'string',
      pointOfView: 'string',
      chapterNumber: 'number',
      chapterTitle: 'string',
      chapterSummary: 'string',
      keyEvents: 'string',
      conflict: 'string',
      highlight: 'string',
      endingHook: 'string',
      reviewFeedback: 'string',
      originalContent: 'string',
      worldSettingContext: 'string',
      characterDetailsContext: 'string',
      previousChapterContext: 'string',
    },
    version: '1.0.0',
    enabled: true,
  },
  {
    name: 'chapter_continue',
    type: 'chapter_continue',
    content: `你是一个专业的网络小说作家。请续写以下章节，从指定位置继续。

## 小说信息
- 书名：{{title}}
- 类型：{{genreText}}
- 写作风格：{{writingStyle}}
- 叙事视角：{{pointOfView}}

## 本章规划
- 章节标题：{{chapterTitle}}
- 剧情概要：{{chapterSummary}}
- 结尾钩子：{{endingHook}}

## 已有内容
{{existingContent}}

## 续写要求
- 从已有内容的最后一句开始续写
- 保持风格和语气的一致性
- 继续推进剧情直到章节完成
- 目标续写字数：{{targetWordCount}}字

## 相关角色设定
{{characterDetailsContext}}

## 输出要求
直接输出续写内容，不需要重复已有内容。`,
    variables: {
      title: 'string',
      genreText: 'string',
      writingStyle: 'string',
      pointOfView: 'string',
      chapterTitle: 'string',
      chapterSummary: 'string',
      endingHook: 'string',
      existingContent: 'string',
      targetWordCount: 'number',
      characterDetailsContext: 'string',
    },
    version: '1.0.0',
    enabled: true,
  },
  {
    name: 'chapter_expand',
    type: 'chapter_expand',
    content: `你是一个专业的网络小说作家。请扩写以下章节，增加更多细节和描写。

## 小说信息
- 书名：{{title}}
- 类型：{{genreText}}
- 写作风格：{{writingStyle}}

## 本章规划
- 章节标题：{{chapterTitle}}
- 剧情概要：{{chapterSummary}}

## 当前正文
{{chapterContent}}

## 当前字数：{{currentWordCount}}字
## 目标字数：{{targetWordCount}}字

## 扩写要求
1. 增加场景描写和环境渲染
2. 丰富角色心理活动
3. 细化动作描写和对话
4. 增加感官细节（视觉、听觉、触觉等）
5. 不要增加新的剧情事件，只丰富现有内容
6. 不要水字数，每段增加的内容都要有意义
7. 保持原有的节奏和结构

## 输出要求
直接输出扩写后的完整章节正文。
章节标题格式：第{{chapterNumber}}章 {{chapterTitle}}`,
    variables: {
      title: 'string',
      genreText: 'string',
      writingStyle: 'string',
      chapterNumber: 'number',
      chapterTitle: 'string',
      chapterSummary: 'string',
      chapterContent: 'string',
      currentWordCount: 'number',
      targetWordCount: 'number',
    },
    version: '1.0.0',
    enabled: true,
  },
  {
    name: 'chapter_shorten',
    type: 'chapter_shorten',
    content: `你是一个专业的网络小说作家。请精简以下章节，去除冗余内容。

## 小说信息
- 书名：{{title}}
- 类型：{{genreText}}

## 本章规划
- 章节标题：{{chapterTitle}}
- 剧情概要：{{chapterSummary}}
- 关键事件：{{keyEvents}}

## 当前正文
{{chapterContent}}

## 当前字数：{{currentWordCount}}字
## 目标字数：{{targetWordCount}}字

## 精简要求
1. 删除冗余的描写和重复的内容
2. 精简过长的对话和心理活动
3. 保留所有关键事件和剧情推进
4. 保留爽点和冲突
5. 保持章节的完整性
6. 确保精简后仍然通顺流畅
7. 不要删除重要的铺垫和伏笔

## 输出要求
直接输出精简后的完整章节正文。
章节标题格式：第{{chapterNumber}}章 {{chapterTitle}}`,
    variables: {
      title: 'string',
      genreText: 'string',
      chapterNumber: 'number',
      chapterTitle: 'string',
      chapterSummary: 'string',
      keyEvents: 'string',
      chapterContent: 'string',
      currentWordCount: 'number',
      targetWordCount: 'number',
    },
    version: '1.0.0',
    enabled: true,
  },
];

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'qoder_novel',
    entities: [
      Novel,
      NovelGenre,
      NovelGenreMap,
      NovelCharacter,
      NovelOutline,
      NovelChapter,
      AiTask,
      PromptTemplate,
    ],
  });

  await dataSource.initialize();
  console.log('数据库连接成功');

  const genreRepo = dataSource.getRepository(NovelGenre);

  for (const genre of genres) {
    const existing = await genreRepo.findOne({ where: { name: genre.name } });
    if (!existing) {
      await genreRepo.save(genreRepo.create(genre));
      console.log(`已创建类型: ${genre.label} (${genre.name})`);
    } else {
      console.log(`类型已存在: ${genre.label} (${genre.name})`);
    }
  }

  const templateRepo = dataSource.getRepository(PromptTemplate);

  for (const template of promptTemplates) {
    const existing = await templateRepo.findOne({ where: { name: template.name } });
    if (!existing) {
      await templateRepo.save(templateRepo.create(template));
      console.log(`已创建模板: ${template.name} (${template.type})`);
    } else {
      await templateRepo.save({ ...existing, ...template });
      console.log(`已更新模板: ${template.name} (${template.type})`);
    }
  }

  await dataSource.destroy();
  console.log('种子数据初始化完成');
}

seed().catch((err) => {
  console.error('种子数据初始化失败:', err);
  process.exit(1);
});
