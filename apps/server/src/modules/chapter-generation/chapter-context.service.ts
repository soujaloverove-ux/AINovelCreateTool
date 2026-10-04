import { Injectable } from '@nestjs/common';
import { NovelService } from '../novel/novel.service';
import { NovelGenreService } from '../novel-genre/novel-genre.service';
import { NovelCharacterService } from '../novel-character/novel-character.service';
import { NovelOutlineService } from '../novel-outline/novel-outline.service';
import { NovelChapterService } from '../novel-chapter/novel-chapter.service';
import { AiService, ChatMessage } from '../ai/ai.service';
import { PromptService } from '../ai/prompt.service';
import { CharacterRoleType } from '../../common/enums';

export interface ChapterContext {
  novelInfo: string;
  genreText: string;
  worldSettingContext: string;
  powerSystemContext: string;
  characterDetailsContext: string;
  volumeArcContext: string;
  chapterPlanContext: {
    chapterNumber: number;
    title: string;
    summary: string;
    keyEvents: string;
    conflict: string;
    highlight: string;
    endingHook: string;
    characters: string;
    location: string;
  };
  previousChapterContext: string;
  recentSummariesContext: string;
}

export interface WritingPlan {
  sceneBreakdown: Array<{
    location: string;
    characters: string[];
    event: string;
    mood: string;
  }>;
  characterStates: Array<{
    name: string;
    startState: string;
    endState: string;
  }>;
  plotPoints: string[];
  emotionalArc: string;
  foreshadowing: string;
  wordCountTarget: number;
}

export interface ReviewResult {
  plotConsistency: string;
  characterConsistency: string;
  logicCheck: string;
  pacingCheck: string;
  continuityCheck: string;
  qualityScore: number;
  issues: string[];
  suggestions: string[];
}

const MAX_CONTEXT_CHARS = 8000;
const MAX_PREVIOUS_CONTENT_CHARS = 3000;
const MAX_SUMMARY_CHARS = 500;
const MAX_RECENT_SUMMARIES = 3;

@Injectable()
export class ChapterContextService {
  constructor(
    private readonly novelService: NovelService,
    private readonly genreService: NovelGenreService,
    private readonly characterService: NovelCharacterService,
    private readonly outlineService: NovelOutlineService,
    private readonly chapterService: NovelChapterService,
    private readonly aiService: AiService,
    private readonly promptService: PromptService,
  ) {}

  async buildContext(novelId: string, chapterNumber: number): Promise<ChapterContext> {
    const [novel, genres, characters, outlines, chapters] = await Promise.all([
      this.novelService.findById(novelId),
      this.genreService.findGenresByNovelId(novelId),
      this.characterService.findByNovelId(novelId),
      this.outlineService.findByNovelId(novelId),
      this.chapterService.findByNovelId(novelId),
    ]);

    const genreText = this.buildGenreText(genres);
    const novelInfo = this.buildNovelInfo(novel);
    const worldSettingContext = this.truncate(novel.worldSetting || '未设定', MAX_CONTEXT_CHARS);
    const powerSystemContext = this.truncate(novel.powerSystem || '未设定', MAX_CONTEXT_CHARS);

    const chapter = chapters.find((c) => c.chapterNumber === chapterNumber);
    const chapterPlanContext = this.buildChapterPlanContext(chapter);

    const volumeArcContext = this.buildVolumeArcContext(outlines, chapterNumber);

    const characterNames = this.extractCharacterNames(chapter);
    const characterDetailsContext = this.buildCharacterDetailsContext(characters, characterNames);

    const previousChapter = chapters.find((c) => c.chapterNumber === chapterNumber - 1);
    const previousChapterContext = await this.buildPreviousChapterContext(previousChapter);

    const recentSummariesContext = this.buildRecentSummariesContext(chapters, chapterNumber);

    return {
      novelInfo,
      genreText,
      worldSettingContext,
      powerSystemContext,
      characterDetailsContext,
      volumeArcContext,
      chapterPlanContext,
      previousChapterContext,
      recentSummariesContext,
    };
  }

  async generateWritingPlan(
    context: ChapterContext,
    novelTitle: string,
    writingStyle: string,
    pointOfView: string,
  ): Promise<WritingPlan> {
    const plan = context.chapterPlanContext;

    const messages = await this.promptService.renderWithSystem(
      'chapter_plan_prepare',
      {
        chapterNumber: plan.chapterNumber,
        title: novelTitle,
        genreText: context.genreText,
        writingStyle,
        pointOfView,
        chapterTitle: plan.title,
        chapterSummary: plan.summary,
        keyEvents: plan.keyEvents,
        conflict: plan.conflict,
        highlight: plan.highlight,
        endingHook: plan.endingHook,
        characters: plan.characters,
        location: plan.location,
        volumeArcContext: context.volumeArcContext,
        worldSettingContext: context.worldSettingContext,
        powerSystemContext: context.powerSystemContext,
        previousChapterContext: context.previousChapterContext,
        characterDetailsContext: context.characterDetailsContext,
      },
      undefined,
      undefined,
      false,
    );

    const result = await this.aiService.generateJson<WritingPlan>({
      messages,
      temperature: 0.7,
      maxTokens: 2000,
    });

    return result.data;
  }

  async reviewChapter(
    novelTitle: string,
    genreText: string,
    chapterPlan: ChapterContext['chapterPlanContext'],
    characterDetails: string,
    content: string,
  ): Promise<ReviewResult> {
    const messages = await this.promptService.renderWithSystem(
      'chapter_review',
      {
        title: novelTitle,
        genreText,
        chapterTitle: chapterPlan.title,
        chapterSummary: chapterPlan.summary,
        keyEvents: chapterPlan.keyEvents,
        conflict: chapterPlan.conflict,
        highlight: chapterPlan.highlight,
        endingHook: chapterPlan.endingHook,
        characterDetailsContext: characterDetails,
        chapterContent: content,
      },
      undefined,
      undefined,
      false,
    );

    const result = await this.aiService.generateJson<ReviewResult>({
      messages,
      temperature: 0.3,
      maxTokens: 1500,
    });

    return result.data;
  }

  async summarizeContent(content: string): Promise<string> {
    if (content.length <= MAX_SUMMARY_CHARS) {
      return content;
    }

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          '你是一个专业的文本摘要助手。请将以下内容压缩为简洁的摘要，保留关键情节、角色状态和重要细节。摘要不超过500字。',
      },
      {
        role: 'user',
        content: content.substring(0, MAX_CONTEXT_CHARS),
      },
    ];

    const result = await this.aiService.generateText({
      messages,
      temperature: 0.3,
      maxTokens: 800,
    });

    return result;
  }

  formatWritingPlan(plan: WritingPlan): string {
    const parts: string[] = [];

    if (plan.sceneBreakdown?.length) {
      parts.push('## 场景分解');
      plan.sceneBreakdown.forEach((scene, i) => {
        parts.push(
          `${i + 1}. [${scene.location}] ${scene.event}（角色：${scene.characters.join('、')}，情绪：${scene.mood}）`,
        );
      });
    }

    if (plan.characterStates?.length) {
      parts.push('\n## 角色状态');
      plan.characterStates.forEach((cs) => {
        parts.push(`- ${cs.name}：${cs.startState} → ${cs.endState}`);
      });
    }

    if (plan.plotPoints?.length) {
      parts.push('\n## 情节点');
      plan.plotPoints.forEach((p, i) => {
        parts.push(`${i + 1}. ${p}`);
      });
    }

    if (plan.emotionalArc) {
      parts.push(`\n## 情绪曲线\n${plan.emotionalArc}`);
    }

    if (plan.foreshadowing) {
      parts.push(`\n## 伏笔/铺垫\n${plan.foreshadowing}`);
    }

    if (plan.wordCountTarget) {
      parts.push(`\n## 字数目标\n${plan.wordCountTarget}字`);
    }

    return parts.join('\n');
  }

  private buildGenreText(genres: Array<{ label: string }>): string {
    return genres.map((g) => g.label).join('、') || '未指定';
  }

  private buildNovelInfo(novel: {
    title: string;
    description?: string;
    writingStyle?: string;
    pointOfView?: string;
    targetWordCount?: number;
  }): string {
    const parts = [`书名：${novel.title}`];
    if (novel.description) parts.push(`简介：${novel.description}`);
    if (novel.writingStyle) parts.push(`写作风格：${novel.writingStyle}`);
    if (novel.pointOfView) parts.push(`叙事视角：${novel.pointOfView}`);
    if (novel.targetWordCount) parts.push(`目标字数：${novel.targetWordCount}字`);
    return parts.join('\n');
  }

  private buildChapterPlanContext(chapter?: {
    chapterNumber?: number;
    title?: string;
    summary?: string;
    content?: string;
  }): ChapterContext['chapterPlanContext'] {
    if (!chapter) {
      return {
        chapterNumber: 0,
        title: '未规划',
        summary: '无',
        keyEvents: '无',
        conflict: '无',
        highlight: '无',
        endingHook: '无',
        characters: '无',
        location: '无',
      };
    }

    const summary = chapter.summary || '';
    return {
      chapterNumber: chapter.chapterNumber || 0,
      title: chapter.title || '未命名',
      summary: summary || '无',
      keyEvents:
        this.extractField(summary, 'keyEvents') || this.extractField(summary, '关键事件') || '无',
      conflict:
        this.extractField(summary, 'conflict') || this.extractField(summary, '冲突') || '无',
      highlight:
        this.extractField(summary, 'highlight') || this.extractField(summary, '爽点') || '无',
      endingHook:
        this.extractField(summary, 'endingHook') || this.extractField(summary, '钩子') || '无',
      characters:
        this.extractField(summary, 'characters') || this.extractField(summary, '角色') || '无',
      location:
        this.extractField(summary, 'location') || this.extractField(summary, '地点') || '无',
    };
  }

  private extractField(text: string, field: string): string | null {
    const patterns = [
      new RegExp(`${field}[：:]\\s*([^\\n]+)`),
      new RegExp(`"${field}"\\s*[：:]\\s*"([^"]+)"`),
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  }

  private buildVolumeArcContext(
    outlines: Array<{
      type: string;
      title: string;
      summary?: string;
      parentId?: string;
      children?: Array<{ type: string; title: string; summary?: string }>;
    }>,
    _chapterNumber: number,
  ): string {
    const volumes = outlines.filter(
      (o) => o.type === 'volume' || (!o.parentId && o.type !== 'general'),
    );
    if (!volumes.length) return '无分卷信息';

    const parts: string[] = [];
    for (const volume of volumes) {
      parts.push(`## ${volume.title}`);
      if (volume.summary) parts.push(volume.summary);
      if (volume.children?.length) {
        for (const arc of volume.children) {
          parts.push(`### ${arc.title}`);
          if (arc.summary) parts.push(arc.summary);
        }
      }
    }

    return this.truncate(parts.join('\n'), MAX_CONTEXT_CHARS);
  }

  private extractCharacterNames(chapter?: { summary?: string }): string[] {
    if (!chapter?.summary) return [];
    const nameMatches = chapter.summary.match(/["""]([^"""]+)["""]/g);
    if (nameMatches) {
      return nameMatches.map((m) => m.replace(/["""]/g, ''));
    }
    return [];
  }

  private buildCharacterDetailsContext(
    characters: Array<{
      name: string;
      roleType: CharacterRoleType;
      identity?: string;
      personality?: string;
      ability?: string;
      background?: string;
      relationship?: string;
      goals?: string;
      notes?: string;
    }>,
    relevantNames: string[],
  ): string {
    const relevant = relevantNames.length
      ? characters.filter(
          (c) => relevantNames.includes(c.name) || c.roleType === CharacterRoleType.PROTAGONIST,
        )
      : characters.slice(0, 5);

    if (!relevant.length) return '无角色设定';

    return relevant
      .map((c) => {
        const parts = [`【${c.name}】`];
        if (c.identity) parts.push(`身份：${c.identity}`);
        if (c.personality) parts.push(`性格：${this.truncate(c.personality, 200)}`);
        if (c.ability) parts.push(`能力：${c.ability}`);
        if (c.background) parts.push(`背景：${this.truncate(c.background, 200)}`);
        if (c.relationship) parts.push(`关系：${c.relationship}`);
        if (c.goals) parts.push(`目标：${c.goals}`);
        if (c.notes) parts.push(`备注：${c.notes}`);
        return parts.join('\n');
      })
      .join('\n\n');
  }

  private async buildPreviousChapterContext(previousChapter?: {
    title?: string;
    content?: string;
    summary?: string;
    chapterNumber?: number;
  }): Promise<string> {
    if (!previousChapter) return '这是第一章，没有上一章内容。';

    const parts = [`第${previousChapter.chapterNumber}章 ${previousChapter.title || '未命名'}`];

    if (previousChapter.content) {
      const tailContent = previousChapter.content.slice(-MAX_PREVIOUS_CONTENT_CHARS);
      parts.push(`\n## 上一章结尾内容\n${tailContent}`);
    } else if (previousChapter.summary) {
      parts.push(`\n## 上一章摘要\n${previousChapter.summary}`);
    }

    return parts.join('\n');
  }

  private buildRecentSummariesContext(
    chapters: Array<{ chapterNumber: number; summary?: string; title?: string }>,
    currentChapterNumber: number,
  ): string {
    const recent = chapters
      .filter(
        (c) =>
          c.chapterNumber < currentChapterNumber &&
          c.chapterNumber >= currentChapterNumber - MAX_RECENT_SUMMARIES,
      )
      .sort((a, b) => b.chapterNumber - a.chapterNumber);

    if (!recent.length) return '';

    return (
      '## 最近章节摘要\n' +
      recent
        .map((c) => `第${c.chapterNumber}章 ${c.title || ''}：${c.summary || '无摘要'}`)
        .join('\n')
    );
  }

  private truncate(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars) + '...（已截断）';
  }
}
