import { Controller, Post, Body, Res, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AiService, ChatMessage } from '../ai/ai.service';
import { PromptService } from '../ai/prompt.service';
import { NovelService } from '../novel/novel.service';
import { NovelGenreService } from '../novel-genre/novel-genre.service';
import { NovelCharacterService } from '../novel-character/novel-character.service';
import { NovelOutlineService } from '../novel-outline/novel-outline.service';
import { NovelChapterService } from '../novel-chapter/novel-chapter.service';
import { CharacterRoleType, OutlineType } from '../../common/enums';

interface TitleCandidate {
  title: string;
  description: string;
}

const PLACEHOLDER_TITLE_PATTERN = /^(书名|标题|示例|测试|sample|test|title)\s*\d*$/i;
const MIN_DESCRIPTION_LENGTH = 60;
const CHAPTER_PLAN_BATCH_SIZE = 20;
const OLLAMA_CHAPTER_PLAN_BATCH_SIZE = 10;
const CHAPTER_PLAN_BATCH_TIMEOUT = 600_000;

function isInvalidTitleCandidate(candidate: TitleCandidate): boolean {
  const title = (candidate?.title || '').trim();
  const description = (candidate?.description || '').trim();
  return (
    title.length < 2 ||
    PLACEHOLDER_TITLE_PATTERN.test(title) ||
    description.length < MIN_DESCRIPTION_LENGTH
  );
}

interface GeneratedWorldSetting {
  background: string;
  geography: string;
  socialStructure: string;
  factions: string;
  era: string;
  specialRules: string;
}

interface GeneratedProtagonist {
  name: string;
  gender: string;
  age: string;
  identity: string;
  personality: string;
  appearance: string;
  ability: string;
  background: string;
  goals: string;
  goldenFinger: string;
}

interface GeneratedCharacter {
  name: string;
  identity: string;
  personality: string;
  ability: string;
  background: string;
  relationship: string;
  goals: string;
  roleType: string;
}

interface GeneratedPlotDirection {
  mainGoal: string;
  coreConflict: string;
  storyDirection: string;
  highlights: string;
  upgradeDirection: string;
  romanceLine: string;
  importantPlot: string;
  forbiddenContent: string;
}

interface VolumeOutline {
  volumeNumber: number;
  title: string;
  summary: string;
  arcs: ArcOutline[];
}

interface ArcOutline {
  arcNumber: number;
  title: string;
  summary: string;
  chapters: ChapterPlanItem[];
}

interface ChapterPlanItem {
  chapterNumber: number;
  title: string;
  summary: string;
  keyEvents?: string[];
  coreEvent?: string;
  conflict: string;
  highlight: string;
  endingHook?: string;
  hook?: string;
  characters?: string[];
  location?: string;
}

interface OutlineResult {
  volumes: VolumeOutline[];
}

interface WizardContext {
  title?: string;
  description?: string;
  mainGenre: string;
  subGenres: string[];
  worldSetting?: Record<string, string>;
  protagonist?: Record<string, string>;
  characters?: Array<Record<string, string>>;
  coreSetting?: Record<string, unknown>;
  plotDirection?: Record<string, string>;
  basicSetting?: Record<string, unknown>;
  outlineContent?: string;
  chapterCount?: number;
}

interface ChapterPlanRequest {
  outline?: string | OutlineResult;
  chapterCount?: number;
  title?: string;
  mainGenre?: string;
  subGenres?: string[];
  writingStyle?: string;
  worldSetting?: Record<string, string>;
  protagonist?: Record<string, string>;
  characters?: Array<Record<string, string>>;
  coreSetting?: Record<string, unknown>;
  plotDirection?: Record<string, string>;
  provider?: string;
}

@Controller('api/novels/creation')
export class NovelCreationController {
  constructor(
    private readonly aiService: AiService,
    private readonly promptService: PromptService,
    private readonly novelService: NovelService,
    private readonly genreService: NovelGenreService,
    private readonly characterService: NovelCharacterService,
    private readonly outlineService: NovelOutlineService,
    private readonly chapterService: NovelChapterService,
  ) {}

  @Post('generate-titles')
  @HttpCode(HttpStatus.OK)
  async generateTitles(
    @Body()
    body: {
      mainGenre: string;
      subGenres: string[];
      keywords?: string[];
      provider?: string;
    },
  ): Promise<{ candidates: TitleCandidate[] }> {
    const provider = body.provider;
    const genreText = [body.mainGenre, ...body.subGenres].join('、');
    const keywordText = body.keywords?.length ? `，关键词：${body.keywords.join('、')}` : '';

    const systemPrompt =
      '你是一个资深的网络小说策划编辑与命名专家。你要为给定的小说类型和关键词创作原创、有吸引力的书名与简介。' +
      '硬性规则：1) 书名必须是2-10个字的原创内容，严禁使用"书名1""标题""示例""测试"等占位式名称或纯编号；' +
      '2) 简介必须是100-200字的连贯文字，写清主角、核心冲突与卖点；' +
      '3) 只输出JSON，不要任何解释或代码块。';

    const buildMessages = (extraRequirement?: string): ChatMessage[] => {
      const userContent = `请为以下类型的网络小说生成7个书名和简介方案：

小说类型：${genreText}${keywordText}

要求：
1. 书名符合该类型读者的喜好，7个方案之间风格要有差异（热血、悬疑、诗意、口语化等）
2. 简介100-200字，写清主角是谁、遭遇什么危机或机遇、核心卖点是什么
3. 每个书名都必须是真正可用的小说名，禁止"书名1""示例"这类占位词
${extraRequirement ? `\n${extraRequirement}\n` : ''}
参考示例（仅模仿格式与质量，内容必须按上面的类型原创）：
{"candidates":[{"title":"焚天凡尘","description":"仙门覆灭后，少年沈昭带着最后一缕天火坠入凡尘，隐姓埋名，白天为市井杂役，夜里偷偷修行。旧秩序残余追踪天火而至，逼他暴露锋芒，也让他结识了同样背负灭门之仇的伙伴。他一路收拢陨天散星，逆伐而上，要烧的不只是九天，更是那盘以苍生为子的千年棋局。"}]}

请直接返回JSON格式：{"candidates":[{"title":"<原创书名>","description":"<100-200字简介>"}, ...]}`;

      return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ];
    };

    const requestOptions = { temperature: 0.9, maxTokens: 4000, provider };

    let result = await this.aiService.generateJson<{ candidates: TitleCandidate[] }>({
      messages: buildMessages(),
      ...requestOptions,
    });
    let candidates = result.data.candidates || [];

    if (candidates.length === 0 || candidates.some(isInvalidTitleCandidate)) {
      result = await this.aiService.generateJson<{ candidates: TitleCandidate[] }>({
        messages: buildMessages(
          '特别强调：上一次结果不合格——书名不得使用"书名1""标题"等占位式名称，简介不得少于100字。请重新创作7个方案。',
        ),
        ...requestOptions,
      });
      candidates = result.data.candidates || [];
    }

    return { candidates: candidates.slice(0, 7) };
  }

  @Post('generate-world-setting')
  @HttpCode(HttpStatus.OK)
  async generateWorldSetting(
    @Body()
    body: {
      title?: string;
      description?: string;
      mainGenre: string;
      subGenres: string[];
      writingStyle?: string;
      protagonist?: Partial<GeneratedProtagonist>;
      provider?: string;
    },
  ): Promise<{ worldSetting: GeneratedWorldSetting }> {
    const provider = body.provider;
    const genreText = [body.mainGenre, ...body.subGenres].join('、');
    const writingStyleContext = body.writingStyle ? `\n- 写作风格：${body.writingStyle}` : '';
    const protagonistContext = body.protagonist?.name
      ? `\n\n## 主角参考\n- 姓名：${body.protagonist.name}\n- 身份：${body.protagonist.identity || '未设定'}\n- 性格：${body.protagonist.personality || '未设定'}`
      : '';

    const variables = {
      title: body.title || '未命名',
      description: body.description || '未设定',
      genreText,
      writingStyleContext,
      protagonistContext,
    };

    const messages = await this.promptService.renderWithSystem(
      'world_generate',
      variables,
      '你是一个专业的网络小说世界观设计师。根据小说的基本信息，设计完整且自洽的世界观设定。直接返回JSON对象。',
    );

    const result = await this.aiService.generateJson<{ worldSetting: GeneratedWorldSetting }>({
      messages,
      temperature: 0.8,
      maxTokens: 2000,
      provider,
    });

    return { worldSetting: result.data.worldSetting };
  }

  @Post('generate-protagonist')
  @HttpCode(HttpStatus.OK)
  async generateProtagonist(
    @Body()
    body: {
      title?: string;
      description?: string;
      mainGenre: string;
      subGenres: string[];
      worldSetting?: Partial<GeneratedWorldSetting>;
      provider?: string;
    },
  ): Promise<{ protagonist: GeneratedProtagonist }> {
    const provider = body.provider;
    const genreText = [body.mainGenre, ...body.subGenres].join('、');
    const worldContext = body.worldSetting?.background
      ? `\n- 世界背景：${body.worldSetting.background.substring(0, 300)}`
      : '';

    const systemPrompt =
      '你是一个专业的网络小说角色设计师。根据小说类型和世界观，设计一个有魅力的主角。直接返回JSON对象。';
    const userContent = `请为以下小说设计主角设定。

## 小说信息
- 书名：${body.title || '未命名'}
- 简介：${body.description || '未设定'}
- 类型：${genreText}${worldContext}

请包含以下内容：
1. name - 姓名（符合类型风格）
2. gender - 性别
3. age - 年龄
4. identity - 身份
5. personality - 性格特点（50-100字）
6. appearance - 外貌特征（50-100字）
7. ability - 初始能力
8. background - 背景故事（100-200字）
9. goals - 目标追求
10. goldenFinger - 金手指/特殊优势

直接返回JSON格式：{"protagonist":{"name":"...","gender":"...","age":"...","identity":"...","personality":"...","appearance":"...","ability":"...","background":"...","goals":"...","goldenFinger":"..."}}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    const result = await this.aiService.generateJson<{ protagonist: GeneratedProtagonist }>({
      messages,
      temperature: 0.85,
      maxTokens: 2000,
      provider,
    });

    return { protagonist: result.data.protagonist };
  }

  @Post('generate-characters')
  @HttpCode(HttpStatus.OK)
  async generateCharacters(
    @Body()
    body: {
      title?: string;
      mainGenre: string;
      subGenres: string[];
      worldSetting?: Partial<GeneratedWorldSetting>;
      protagonist?: Partial<GeneratedProtagonist>;
      count?: number;
      provider?: string;
    },
  ): Promise<{ characters: GeneratedCharacter[] }> {
    const provider = body.provider;
    const genreText = [body.mainGenre, ...body.subGenres].join('、');
    const count = body.count || 5;
    const worldSettingContext = body.worldSetting?.background
      ? body.worldSetting.background.substring(0, 300)
      : '未设定';
    const protagonistContext = body.protagonist?.name
      ? `- 姓名：${body.protagonist.name}\n- 身份：${body.protagonist.identity || '未设定'}\n- 性格：${body.protagonist.personality || '未设定'}\n- 能力：${body.protagonist.ability || '未设定'}\n- 目标：${body.protagonist.goals || '未设定'}`
      : '未设定';

    const variables = {
      title: body.title || '未命名',
      genreText,
      worldSettingContext,
      protagonistContext,
      count: String(count),
    };

    const messages = await this.promptService.renderWithSystem(
      'character_generate',
      variables,
      '你是一个专业的网络小说角色设计师。根据小说的类型、世界观和主角信息，设计多个有血有肉的重要角色。直接返回JSON对象。',
    );

    const result = await this.aiService.generateJson<{ characters: GeneratedCharacter[] }>({
      messages,
      temperature: 0.85,
      maxTokens: 3000,
      provider,
    });

    return { characters: result.data.characters || [] };
  }

  @Post('generate-core-setting')
  @HttpCode(HttpStatus.OK)
  async generateCoreSetting(
    @Body()
    body: {
      title?: string;
      mainGenre: string;
      subGenres: string[];
      worldSetting?: Partial<GeneratedWorldSetting>;
      provider?: string;
    },
  ): Promise<{ coreSetting: Record<string, unknown> }> {
    const provider = body.provider;
    const genreText = [body.mainGenre, ...body.subGenres].join('、');
    const worldSettingContext = body.worldSetting?.background
      ? body.worldSetting.background.substring(0, 200)
      : '未设定';
    const genreSpecificPrompt = this.getGenreSpecificPrompt(body.mainGenre);

    const variables = {
      title: body.title || '未命名',
      genreText,
      worldSettingContext,
      genreSpecificPrompt,
    };

    const messages = await this.promptService.renderWithSystem(
      'power_system_generate',
      variables,
      '你是一个专业的网络小说设定师。根据小说类型和世界观，设计完整的力量体系/核心设定。直接返回JSON对象。',
    );

    const result = await this.aiService.generateJson<{ coreSetting: Record<string, unknown> }>({
      messages,
      temperature: 0.8,
      maxTokens: 2000,
      provider,
    });

    return { coreSetting: result.data.coreSetting || {} };
  }

  @Post('generate-plot-direction')
  @HttpCode(HttpStatus.OK)
  async generatePlotDirection(
    @Body()
    body: {
      title?: string;
      description?: string;
      mainGenre: string;
      subGenres: string[];
      writingStyle?: string;
      pointOfView?: string;
      targetWordCount?: number;
      worldSetting?: Partial<GeneratedWorldSetting>;
      protagonist?: Partial<GeneratedProtagonist>;
      characters?: Partial<GeneratedCharacter>[];
      coreSetting?: Record<string, unknown>;
      provider?: string;
    },
  ): Promise<{ plotDirection: GeneratedPlotDirection }> {
    const provider = body.provider;
    const genreText = [body.mainGenre, ...body.subGenres].join('、');
    const worldSettingContext = this.formatWorldSetting(body.worldSetting);
    const protagonistContext = this.formatProtagonist(body.protagonist);
    const charactersContext = this.formatCharacters(body.characters);
    const powerSystemContext = body.coreSetting
      ? JSON.stringify(body.coreSetting).substring(0, 500)
      : '未设定';

    const variables = {
      title: body.title || '未命名',
      description: body.description || '未设定',
      genreText,
      writingStyle: body.writingStyle || '未设定',
      pointOfView: body.pointOfView || '未设定',
      targetWordCount: String(body.targetWordCount || 150000),
      worldSettingContext,
      protagonistContext,
      charactersContext,
      powerSystemContext,
    };

    const messages = await this.promptService.renderWithSystem(
      'main_plot_generate',
      variables,
      '你是一个专业的网络小说剧情策划师。根据小说的所有设定信息，规划完整的故事主线。直接返回JSON对象。',
    );

    const result = await this.aiService.generateJson<{ plotDirection: GeneratedPlotDirection }>({
      messages,
      temperature: 0.85,
      maxTokens: 2000,
      provider,
    });

    return { plotDirection: result.data.plotDirection };
  }

  @Post(':novelId/generate-outline-stream')
  async generateOutlineStream(
    @Param('novelId') _novelId: string,
    @Body() body: WizardContext & { outlineContent?: string; provider?: string },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const chapterCount = body.chapterCount || 50;
    const volumeCount = Math.ceil(chapterCount / 20);

    const genreText = [body.mainGenre, ...(body.subGenres || [])].join('、');
    const worldSettingContext = this.formatWorldSetting(
      body.worldSetting as Record<string, string>,
    );
    const protagonistContext = this.formatProtagonist(body.protagonist as Record<string, string>);
    const charactersContext = this.formatCharacters(
      body.characters as Array<Record<string, string>>,
    );
    const powerSystemContext = body.coreSetting
      ? JSON.stringify(body.coreSetting).substring(0, 500)
      : '未设定';
    const plotDirectionContext = this.formatPlotDirection(
      body.plotDirection as Record<string, string>,
    );

    const variables = {
      title: body.title || '未命名',
      description: body.description || '未设定',
      genreText,
      writingStyle: (body.basicSetting?.writingStyle as string) || '未设定',
      pointOfView: (body.basicSetting?.pointOfView as string) || '未设定',
      targetWordCount: String((body.basicSetting?.targetWordCount as number) || 150000),
      chapterCount: String(chapterCount),
      volumeCount: String(volumeCount),
      worldSettingContext,
      protagonistContext,
      charactersContext,
      powerSystemContext,
      plotDirectionContext,
    };

    let messages: ChatMessage[];
    try {
      messages = await this.promptService.renderWithSystem(
        'outline_generate',
        variables,
        '你是一个专业的网络小说总纲策划师。根据提供的所有设定信息，生成结构化的小说总纲。',
      );
    } catch {
      messages = this.buildFallbackOutlineMessages(body, chapterCount, volumeCount);
    }

    try {
      this.sendSSE(res, 'progress', { stage: 'starting', message: '开始生成总纲...' });

      const stream = this.aiService.stream({
        messages,
        temperature: 0.8,
        maxTokens: 8000,
        provider: body.provider,
      });

      let fullContent = '';
      let chunkCount = 0;

      this.sendSSE(res, 'progress', { stage: 'generating', message: 'AI 正在生成总纲...' });

      for await (const chunk of stream) {
        if (chunk.usage) {
          this.sendSSE(res, 'usage', chunk.usage);
        } else if (chunk.content) {
          fullContent += chunk.content;
          chunkCount++;

          if (chunkCount % 20 === 0) {
            const progress = Math.min(90, Math.floor((chunkCount / 200) * 90));
            this.sendSSE(res, 'progress', {
              stage: 'generating',
              message: `生成中... 已生成 ${chunkCount} 个文本块`,
              progress,
            });
          }
        }
      }

      this.sendSSE(res, 'progress', { stage: 'parsing', message: '解析总纲结构...', progress: 95 });

      const outline = this.parseOutlineFromText(fullContent, volumeCount);

      this.sendSSE(res, 'progress', {
        stage: 'complete',
        message: '总纲生成完成！',
        progress: 100,
      });
      this.sendSSE(res, 'outline', outline);
      this.sendSSE(res, 'done', {});
      res.end();
    } catch (err) {
      this.sendSSE(res, 'error', { error: (err as Error).message });
      res.end();
    }
  }

  @Post(':novelId/generate-chapter-plan')
  @HttpCode(HttpStatus.OK)
  async generateChapterPlan(
    @Param('novelId') _novelId: string,
    @Body() body: ChapterPlanRequest,
  ): Promise<{ chapters: ChapterPlanItem[] }> {
    return this.createChapterPlan(body);
  }

  @Post(':novelId/generate-chapter-plan-stream')
  async generateChapterPlanStream(
    @Param('novelId') _novelId: string,
    @Body() body: ChapterPlanRequest,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const controller = new AbortController();
    let disconnected = false;
    res.on('close', () => {
      disconnected = true;
      controller.abort();
    });

    const heartbeat = setInterval(() => {
      if (!disconnected) {
        this.sendSSE(res, 'heartbeat', { message: '章节规划仍在生成中' });
      }
    }, 15_000);

    try {
      const total = Math.max(1, Math.floor(body.chapterCount || 50));
      this.sendSSE(res, 'progress', {
        completed: 0,
        total,
        message: `开始分批生成 ${total} 章规划`,
      });

      await this.createChapterPlan(
        body,
        (batch, completed, batchTotal) => {
          if (!disconnected) {
            this.sendSSE(res, 'batch', {
              chapters: batch,
              completed,
              total: batchTotal,
              message: `已完成 ${completed}/${batchTotal} 章`,
            });
          }
        },
        controller.signal,
      );

      if (!disconnected) {
        this.sendSSE(res, 'done', { total });
        res.end();
      }
    } catch (err) {
      if (!disconnected) {
        this.sendSSE(res, 'error', { error: (err as Error).message });
        res.end();
      }
    } finally {
      clearInterval(heartbeat);
    }
  }

  private async createChapterPlan(
    body: ChapterPlanRequest,
    onBatch?: (batch: ChapterPlanItem[], completed: number, total: number) => void,
    signal?: AbortSignal,
  ): Promise<{ chapters: ChapterPlanItem[] }> {
    const chapterCount = Math.max(1, Math.floor(body.chapterCount || 50));
    const genreText = [body.mainGenre || '未指定', ...(body.subGenres || [])].join('、');
    const worldSettingContext = this.formatWorldSetting(body.worldSetting);
    const protagonistContext = this.formatProtagonist(body.protagonist);
    const charactersContext = this.formatCharacters(body.characters);
    const powerSystemContext = body.coreSetting
      ? JSON.stringify(body.coreSetting).substring(0, 500)
      : '未设定';
    const plotDirectionContext = this.formatPlotDirection(body.plotDirection);
    const batchSize =
      body.provider?.toLowerCase() === 'ollama'
        ? OLLAMA_CHAPTER_PLAN_BATCH_SIZE
        : CHAPTER_PLAN_BATCH_SIZE;

    const chapters: ChapterPlanItem[] = [];

    for (let start = 1; start <= chapterCount; start += batchSize) {
      const end = Math.min(start + batchSize - 1, chapterCount);
      const batchCount = end - start + 1;
      const outlineContext = this.formatChapterPlanOutline(body.outline, start, end);
      const variables = {
        title: body.title || '未命名',
        genreText,
        writingStyle: body.writingStyle || '未设定',
        chapterCount: String(batchCount),
        worldSettingContext,
        protagonistContext,
        charactersContext,
        powerSystemContext,
        plotDirectionContext,
        outlineContext,
      };

      const messages = await this.promptService.renderWithSystem(
        'chapter_plan_generate',
        variables,
        '你是一个专业的网络小说章节规划师。根据总纲和所有设定，生成详细的章节规划。直接返回JSON对象。',
      );
      messages.push({
        role: 'user',
        content:
          `这是全书共${chapterCount}章中的一个批次。` +
          `本次只生成第${start}至${end}章，共${batchCount}章。` +
          `chapterNumber 必须从${start}连续编号到${end}，不得生成范围外章节。`,
      });

      const result = await this.aiService.generateJson<{ chapters: ChapterPlanItem[] }>({
        messages,
        temperature: 0.8,
        maxTokens: 6000,
        timeout: CHAPTER_PLAN_BATCH_TIMEOUT,
        retries: 1,
        signal,
        provider: body.provider,
      });
      const batch = (result.data.chapters || []).slice(0, batchCount);

      if (batch.length !== batchCount) {
        throw new Error(
          `章节规划第${start}-${end}章生成不完整：期望${batchCount}章，实际${batch.length}章`,
        );
      }

      chapters.push(
        ...batch.map((chapter, index) => ({
          ...chapter,
          chapterNumber: start + index,
        })),
      );
      onBatch?.(chapters.slice(-batchCount), chapters.length, chapterCount);
    }

    return { chapters };
  }

  @Post(':novelId/regenerate-volume')
  @HttpCode(HttpStatus.OK)
  async regenerateVolume(
    @Param('novelId') _novelId: string,
    @Body()
    body: {
      provider?: string;
      volumeNumber: number;
      title: string;
      mainGenre: string;
      subGenres?: string[];
      worldSetting?: Record<string, string>;
      protagonist?: Record<string, string>;
      characters?: Array<Record<string, string>>;
      coreSetting?: Record<string, unknown>;
      plotDirection?: Record<string, string>;
      existingOutline?: string;
      currentVolume?: string;
    },
  ): Promise<{ preview: VolumeOutline }> {
    const genreText = [body.mainGenre, ...(body.subGenres || [])].join('、');
    const worldSettingContext = this.formatWorldSetting(body.worldSetting);
    const protagonistContext = this.formatProtagonist(body.protagonist);
    const charactersContext = this.formatCharacters(body.characters);
    const powerSystemContext = body.coreSetting
      ? JSON.stringify(body.coreSetting).substring(0, 500)
      : '未设定';
    const plotDirectionContext = this.formatPlotDirection(body.plotDirection);

    const variables = {
      volumeNumber: String(body.volumeNumber),
      title: body.title,
      genreText,
      worldSettingContext,
      protagonistContext,
      charactersContext,
      powerSystemContext,
      plotDirectionContext,
      existingOutlineContext: body.existingOutline?.substring(0, 3000) || '无其他卷内容',
      currentVolumeContext: body.currentVolume?.substring(0, 2000) || '无现有内容',
    };

    const messages = await this.promptService.renderWithSystem(
      'outline_generate',
      variables,
      '你是一个专业的网络小说总纲策划师。请重新生成指定卷的大纲，保持与其他卷的连贯性。直接返回JSON对象。',
      'regenerate_volume_outline',
    );

    const result = await this.aiService.generateJson<{ preview: VolumeOutline }>({
      messages,
      temperature: 0.85,
      maxTokens: 6000,
      provider: body.provider,
    });

    return { preview: result.data.preview };
  }

  @Post(':novelId/regenerate-arc-chapters')
  @HttpCode(HttpStatus.OK)
  async regenerateArcChapters(
    @Param('novelId') _novelId: string,
    @Body()
    body: {
      volumeNumber: number;
      arcNumber: number;
      title: string;
      mainGenre: string;
      subGenres?: string[];
      worldSetting?: Record<string, string>;
      protagonist?: Record<string, string>;
      characters?: Array<Record<string, string>>;
      coreSetting?: Record<string, unknown>;
      plotDirection?: Record<string, string>;
      arcTitle?: string;
      arcSummary?: string;
      provider?: string;
    },
  ): Promise<{
    preview: { volumeNumber: number; arcNumber: number; chapters: ChapterPlanItem[] };
  }> {
    const genreText = [body.mainGenre, ...(body.subGenres || [])].join('、');
    const worldSettingContext = this.formatWorldSetting(body.worldSetting);
    const protagonistContext = this.formatProtagonist(body.protagonist);
    const charactersContext = this.formatCharacters(body.characters);
    const powerSystemContext = body.coreSetting
      ? JSON.stringify(body.coreSetting).substring(0, 500)
      : '未设定';
    const plotDirectionContext = this.formatPlotDirection(body.plotDirection);

    const variables = {
      volumeNumber: String(body.volumeNumber),
      arcNumber: String(body.arcNumber),
      title: body.title,
      genreText,
      worldSettingContext,
      protagonistContext,
      charactersContext,
      powerSystemContext,
      plotDirectionContext,
      arcTitle: body.arcTitle || '未命名',
      arcSummary: body.arcSummary || '未设定',
    };

    const messages = await this.promptService.renderWithSystem(
      'chapter_plan_generate',
      variables,
      '你是一个专业的网络小说章节规划师。请重新生成指定弧的章节规划。直接返回JSON对象。',
      'regenerate_arc_chapters',
    );

    const result = await this.aiService.generateJson<{
      preview: { volumeNumber: number; arcNumber: number; chapters: ChapterPlanItem[] };
    }>({ messages, temperature: 0.85, maxTokens: 6000, provider: body.provider });

    return { preview: result.data.preview };
  }

  @Post(':novelId/finalize')
  @HttpCode(HttpStatus.CREATED)
  async finalizeNovel(
    @Param('novelId') _clientNovelId: string,
    @Body()
    body: {
      title: string;
      description?: string;
      genreIds?: string[];
      basicSetting?: Record<string, unknown>;
      worldSetting?: Record<string, unknown>;
      protagonist?: Record<string, unknown>;
      characters?: Array<Record<string, unknown>>;
      coreSetting?: Record<string, unknown>;
      plotDirection?: Record<string, unknown>;
      outline?: OutlineResult & {
        title?: string;
        summary?: string;
        content?: string;
        children?: unknown[];
      };
      chapterPlan?: ChapterPlanItem[];
    },
  ): Promise<{ id: string }> {
    const novel = await this.novelService.create({
      title: body.title,
      description: body.description,
      writingStyle: body.basicSetting?.writingStyle as string,
      pointOfView: body.basicSetting?.pointOfView as string,
      targetAudience: body.basicSetting?.targetAudience as string,
      targetWordCount: (body.basicSetting?.targetWordCount as number) || 0,
      chapterCount: this.countChaptersFromOutline(body.outline) || body.chapterPlan?.length || 0,
      worldSetting: body.worldSetting ? JSON.stringify(body.worldSetting) : undefined,
      protagonistSetting: body.protagonist ? JSON.stringify(body.protagonist) : undefined,
      powerSystem: body.coreSetting ? JSON.stringify(body.coreSetting) : undefined,
      coreConflict: body.plotDirection?.coreConflict as string,
      mainStoryDirection: body.plotDirection?.storyDirection as string,
      creationConfig: {
        ...body.basicSetting,
        genreIds: body.genreIds,
      },
    });
    const novelId = novel.id;

    if (body.genreIds?.length) {
      await this.genreService.assignGenresToNovel(novelId, body.genreIds);
    }

    if (body.protagonist?.name) {
      await this.characterService.create({
        novelId,
        name: body.protagonist.name as string,
        roleType: CharacterRoleType.PROTAGONIST,
        gender: body.protagonist.gender as string,
        age: body.protagonist.age as string,
        identity: body.protagonist.identity as string,
        personality: body.protagonist.personality as string,
        appearance: body.protagonist.appearance as string,
        ability: body.protagonist.ability as string,
        background: body.protagonist.background as string,
        goals: body.protagonist.goals as string,
        notes: body.protagonist.goldenFinger
          ? `金手指：${body.protagonist.goldenFinger}`
          : undefined,
        sortOrder: 0,
      });
    }

    if ((body.characters as unknown[])?.length) {
      const roleMap: Record<string, CharacterRoleType> = {
        supporting: CharacterRoleType.SUPPORTING,
        antagonist: CharacterRoleType.ANTAGONIST,
        minor: CharacterRoleType.MINOR,
      };

      await Promise.all(
        (body.characters as Array<Record<string, unknown>>).map((char, index) =>
          this.characterService.create({
            novelId,
            name: char.name as string,
            roleType: roleMap[char.roleType as string] || CharacterRoleType.SUPPORTING,
            identity: char.identity as string,
            personality: char.personality as string,
            ability: char.ability as string,
            background: char.background as string,
            relationship: char.relationship as string,
            goals: char.goals as string,
            sortOrder: index + 1,
          }),
        ),
      );
    }

    if (body.outline?.volumes?.length) {
      const generalOutline = await this.outlineService.create({
        novelId,
        type: OutlineType.GENERAL,
        title: body.outline.title || '小说总纲',
        summary: body.outline.summary,
        content: body.outline.content,
        sortOrder: 0,
      });

      for (const volume of body.outline.volumes) {
        const volumeOutline = await this.outlineService.create({
          novelId,
          type: OutlineType.VOLUME,
          title: volume.title,
          summary: volume.summary,
          content: JSON.stringify(volume),
          sortOrder: volume.volumeNumber,
          parentId: generalOutline.id,
        });

        if (volume.arcs?.length) {
          for (const arc of volume.arcs) {
            const arcOutline = await this.outlineService.create({
              novelId,
              type: OutlineType.ARC,
              title: arc.title,
              summary: arc.summary,
              content: JSON.stringify(arc),
              sortOrder: arc.arcNumber,
              parentId: volumeOutline.id,
            });

            if (arc.chapters?.length) {
              await Promise.all(
                arc.chapters.map((ch) =>
                  this.chapterService.create({
                    novelId,
                    chapterNumber: ch.chapterNumber,
                    title: ch.title,
                    summary: ch.summary,
                    content: '',
                    wordCount: 0,
                    outlineId: arcOutline.id,
                  }),
                ),
              );
            }
          }
        }
      }
    } else if (body.outline?.children?.length) {
      const generalOutline = await this.outlineService.create({
        novelId,
        type: OutlineType.GENERAL,
        title: body.outline.title || '小说总纲',
        summary: body.outline.summary,
        content: body.outline.content,
        sortOrder: 0,
      });

      await Promise.all(
        (body.outline.children as Array<{ title: string; summary?: string; content?: string }>).map(
          (child, index) =>
            this.outlineService.create({
              novelId,
              type: OutlineType.VOLUME,
              title: child.title,
              summary: child.summary,
              content: child.content,
              sortOrder: index,
              parentId: generalOutline.id,
            }),
        ),
      );
    }

    if (body.chapterPlan?.length && !body.outline?.volumes?.length) {
      await Promise.all(
        body.chapterPlan.map((ch) =>
          this.chapterService.create({
            novelId,
            chapterNumber: ch.chapterNumber,
            title: ch.title,
            summary: ch.summary,
            content: '',
            wordCount: 0,
          }),
        ),
      );
    }

    return { id: novel.id };
  }

  private formatWorldSetting(ws?: Record<string, string>): string {
    if (!ws) return '未设定';
    const parts: string[] = [];
    if (ws.background) parts.push(`背景：${ws.background}`);
    if (ws.geography) parts.push(`地理：${ws.geography}`);
    if (ws.socialStructure) parts.push(`社会结构：${ws.socialStructure}`);
    if (ws.factions) parts.push(`势力：${ws.factions}`);
    if (ws.era) parts.push(`时代：${ws.era}`);
    if (ws.specialRules) parts.push(`特殊规则：${ws.specialRules}`);
    return parts.length ? parts.join('\n') : '未设定';
  }

  private formatChapterPlanOutline(
    outline: string | OutlineResult | undefined,
    start: number,
    end: number,
  ): string {
    if (!outline) return '未提供';
    if (typeof outline === 'string') return outline.substring(0, 5000) || '未提供';

    const overview: string[] = [];
    const relevantChapters: string[] = [];

    for (const volume of outline.volumes || []) {
      overview.push(`第${volume.volumeNumber}卷 ${volume.title}：${volume.summary || ''}`);
      for (const arc of volume.arcs || []) {
        overview.push(`- Arc ${arc.arcNumber} ${arc.title}：${arc.summary || ''}`);
        for (const chapter of arc.chapters || []) {
          if (chapter.chapterNumber >= start && chapter.chapterNumber <= end) {
            relevantChapters.push(
              `第${chapter.chapterNumber}章 ${chapter.title}：${chapter.summary || ''}`,
            );
          }
        }
      }
    }

    const context = [
      `本批次原总纲章节（第${start}-${end}章）：`,
      relevantChapters.length
        ? relevantChapters.join('\n')
        : '总纲中没有逐章内容，请依据卷和剧情弧补全。',
      '全书卷与剧情弧：',
      overview.join('\n'),
    ].join('\n');

    return context.substring(0, 12_000) || '未提供';
  }

  private formatProtagonist(p?: Record<string, string>): string {
    if (!p?.name) return '未设定';
    const parts: string[] = [];
    if (p.name) parts.push(`姓名：${p.name}`);
    if (p.gender) parts.push(`性别：${p.gender}`);
    if (p.age) parts.push(`年龄：${p.age}`);
    if (p.identity) parts.push(`身份：${p.identity}`);
    if (p.personality) parts.push(`性格：${p.personality}`);
    if (p.ability) parts.push(`能力：${p.ability}`);
    if (p.background) parts.push(`背景：${p.background}`);
    if (p.goals) parts.push(`目标：${p.goals}`);
    if (p.goldenFinger) parts.push(`金手指：${p.goldenFinger}`);
    return parts.join('\n');
  }

  private formatCharacters(chars?: Array<Record<string, string>>): string {
    if (!chars?.length) return '未设定';
    return chars
      .map((c) => {
        const parts: string[] = [];
        if (c.name) parts.push(`姓名：${c.name}`);
        if (c.roleType) parts.push(`类型：${c.roleType}`);
        if (c.identity) parts.push(`身份：${c.identity}`);
        if (c.personality) parts.push(`性格：${c.personality}`);
        if (c.relationship) parts.push(`关系：${c.relationship}`);
        if (c.goals) parts.push(`目标：${c.goals}`);
        return parts.join('，');
      })
      .join('\n');
  }

  private formatPlotDirection(pd?: Record<string, string>): string {
    if (!pd) return '未设定';
    const parts: string[] = [];
    if (pd.mainGoal) parts.push(`主线目标：${pd.mainGoal}`);
    if (pd.coreConflict) parts.push(`核心冲突：${pd.coreConflict}`);
    if (pd.storyDirection) parts.push(`故事走向：${pd.storyDirection}`);
    if (pd.highlights) parts.push(`爽点：${pd.highlights}`);
    if (pd.upgradeDirection) parts.push(`升级方向：${pd.upgradeDirection}`);
    if (pd.romanceLine) parts.push(`感情线：${pd.romanceLine}`);
    if (pd.importantPlot) parts.push(`重要剧情：${pd.importantPlot}`);
    if (pd.forbiddenContent) parts.push(`禁止内容：${pd.forbiddenContent}`);
    return parts.length ? parts.join('\n') : '未设定';
  }

  private countChaptersFromOutline(outline?: OutlineResult): number {
    if (!outline?.volumes) return 0;
    let count = 0;
    for (const volume of outline.volumes) {
      if (volume.arcs) {
        for (const arc of volume.arcs) {
          count += arc.chapters?.length || 0;
        }
      }
    }
    return count;
  }

  private buildFallbackOutlineMessages(
    body: WizardContext,
    chapterCount: number,
    volumeCount: number,
  ): ChatMessage[] {
    const context = this.buildOutlineContext(body);
    return [
      {
        role: 'system',
        content: `你是一个专业的网络小说总纲策划师。你需要根据提供的所有设定信息，生成完整的小说总纲。

总纲结构要求：
- 分为${volumeCount}卷
- 每卷包含卷名、卷概要、包含的章节列表
- 每章包含：章节序号、章节标题、剧情概要、核心事件、冲突、爽点/看点、结尾钩子
- 总共约${chapterCount}章

请直接输出总纲内容，格式清晰，使用Markdown标题层级。`,
      },
      {
        role: 'user',
        content: `请根据以下设定生成完整的小说总纲：

${context}

要求：
1. 先输出总体概述（200-300字）
2. 然后按卷展开，每卷包含：
   - 卷名和卷概要
   - 该卷包含的章节（每章包含标题、概要、核心事件、冲突、爽点、钩子）
3. 章节总数约${chapterCount}章
4. 剧情要有起伏，节奏合理
5. 每卷结尾要有大高潮`,
      },
    ];
  }

  private buildOutlineContext(body: WizardContext): string {
    const parts: string[] = [];

    parts.push(`书名：${body.title || '未命名'}`);
    if (body.description) parts.push(`简介：${body.description}`);

    const genres = [body.mainGenre, ...(body.subGenres || [])].filter(Boolean).join('、');
    if (genres) parts.push(`类型：${genres}`);

    if (body.worldSetting) {
      const ws = body.worldSetting;
      const worldParts: string[] = [];
      if (ws.background) worldParts.push(`背景：${ws.background}`);
      if (ws.factions) worldParts.push(`势力：${ws.factions}`);
      if (ws.specialRules) worldParts.push(`特殊规则：${ws.specialRules}`);
      if (worldParts.length) parts.push(`世界观：${worldParts.join('；')}`);
    }

    if (body.protagonist) {
      const p = body.protagonist;
      const protoParts: string[] = [];
      if (p.name) protoParts.push(`姓名：${p.name}`);
      if (p.identity) protoParts.push(`身份：${p.identity}`);
      if (p.personality) protoParts.push(`性格：${p.personality}`);
      if (p.goldenFinger) protoParts.push(`金手指：${p.goldenFinger}`);
      if (p.goals) protoParts.push(`目标：${p.goals}`);
      if (protoParts.length) parts.push(`主角：${protoParts.join('，')}`);
    }

    if (body.characters?.length) {
      const charNames = body.characters
        .map((c) => `${c.name}（${c.relationship || '未定义关系'}）`)
        .join('、');
      parts.push(`其他角色：${charNames}`);
    }

    if (body.coreSetting) {
      parts.push(`核心设定：${JSON.stringify(body.coreSetting).substring(0, 500)}`);
    }

    if (body.plotDirection) {
      const pd = body.plotDirection;
      const plotParts: string[] = [];
      if (pd.mainGoal) plotParts.push(`主线目标：${pd.mainGoal}`);
      if (pd.coreConflict) plotParts.push(`核心冲突：${pd.coreConflict}`);
      if (pd.highlights) plotParts.push(`爽点：${pd.highlights}`);
      if (plotParts.length) parts.push(`剧情方向：${plotParts.join('；')}`);
    }

    return parts.join('\n');
  }

  private parseOutlineFromText(text: string, _volumeCount: number): OutlineResult {
    const lines = text.split('\n');
    const volumes: VolumeOutline[] = [];

    let currentVolume: VolumeOutline | null = null;
    let currentArc: ArcOutline | null = null;
    let chapterCounter = 1;
    let arcCounter = 1;
    let volumeCounter = 1;
    let generalSummary = '';
    let isGeneralSection = true;

    for (const line of lines) {
      const volumeMatch = line.match(/^#+\s+(第.+卷[：:].+|卷\d+[：:].+|Volume\s+\d+.*)/i);
      if (volumeMatch) {
        if (currentArc && currentVolume) {
          currentVolume.arcs.push(currentArc);
          currentArc = null;
        }
        if (currentVolume) {
          volumes.push(currentVolume);
        }
        currentVolume = {
          volumeNumber: volumeCounter++,
          title: volumeMatch[1].trim(),
          summary: '',
          arcs: [],
        };
        arcCounter = 1;
        isGeneralSection = false;
        continue;
      }

      const arcMatch = line.match(/^#{2,3}\s+(第.+弧[：:].+|Arc\s+\d+[：:].+|剧情弧[：:].+)/i);
      if (arcMatch && currentVolume) {
        if (currentArc) {
          currentVolume.arcs.push(currentArc);
        }
        currentArc = {
          arcNumber: arcCounter++,
          title: arcMatch[1].trim(),
          summary: '',
          chapters: [],
        };
        continue;
      }

      const chapterMatch = line.match(/^#{2,4}\s+(第?\d+[章节回][：:].+|Chapter\s+\d+.*)/i);
      if (chapterMatch && currentVolume) {
        if (!currentArc) {
          currentArc = {
            arcNumber: arcCounter++,
            title: `剧情弧${arcCounter - 1}`,
            summary: '',
            chapters: [],
          };
        }
        currentArc.chapters.push({
          chapterNumber: chapterCounter++,
          title: chapterMatch[1].trim(),
          summary: '',
          keyEvents: [],
          conflict: '',
          highlight: '',
          endingHook: '',
          characters: [],
          location: '',
        });
        continue;
      }

      if (isGeneralSection && line.trim().length > 20) {
        generalSummary += line.trim() + '\n';
      }

      if (currentArc?.chapters.length) {
        const lastChapter = currentArc.chapters[currentArc.chapters.length - 1];
        if (!lastChapter.summary && line.trim().length > 10 && line.trim().length < 200) {
          lastChapter.summary = line.trim();
        }
        lastChapter.conflict += line + '\n';
      }

      if (
        currentArc &&
        !currentArc.summary &&
        line.trim().length > 10 &&
        line.trim().length < 200
      ) {
        currentArc.summary = line.trim();
      }

      if (
        currentVolume &&
        !currentVolume.summary &&
        line.trim().length > 10 &&
        line.trim().length < 200
      ) {
        currentVolume.summary = line.trim();
      }
    }

    if (currentArc && currentVolume) {
      currentVolume.arcs.push(currentArc);
    }
    if (currentVolume) {
      volumes.push(currentVolume);
    }

    if (volumes.length === 0) {
      volumes.push({
        volumeNumber: 1,
        title: '第一卷',
        summary: generalSummary.trim().substring(0, 500),
        arcs: [
          {
            arcNumber: 1,
            title: '开篇',
            summary: '',
            chapters: [],
          },
        ],
      });
    }

    return { volumes };
  }

  private getGenreSpecificPrompt(genre: string): string {
    const prompts: Record<string, string> = {
      修仙: '请设计：境界体系（从低到高）、功法分类、灵根类型、宗门势力、天材地宝、修炼资源',
      系统: '请设计：系统名称、系统规则、系统功能列表、奖励机制、惩罚机制、升级条件',
      穿越: '请设计：穿越原因、穿越时间点、原世界身份、新世界身份、两个世界的联系',
      玄幻: '请设计：修炼体系、血脉/体质类型、武器/法宝等级、种族设定、大陆/世界格局',
      都市: '请设计：社会背景、主角职业、隐藏身份、都市中的超自然元素（如有）、人际关系网',
      科幻: '请设计：科技水平、核心科技设定、社会制度、星际/地球格局、科技限制',
      末世: '请设计：灾难类型、末世规则、生存资源、势力划分、变异/进化体系',
      游戏: '请设计：游戏类型、等级体系、职业/角色类型、装备系统、副本/关卡设计',
      历史: '请设计：历史时期、真实历史事件改编点、主角的历史介入方式、历史人物关系',
      悬疑: '请设计：核心谜团、线索体系、反转设计、真相层次、悬疑氛围营造方式',
      重生: '请设计：重生原因、重生时间点、前世记忆利用方式、改变命运的关键节点',
    };

    return prompts[genre] || '请设计该类型的核心设定体系，包含主要规则和机制。';
  }

  private sendSSE(res: Response, event: string, data: unknown): void {
    res.write(`data: ${JSON.stringify({ event, data })}\n\n`);
  }
}
