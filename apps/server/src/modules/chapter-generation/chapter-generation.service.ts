import { Injectable } from '@nestjs/common';
import { AiService, ChatMessage } from '../ai/ai.service';
import { AiTaskService } from '../ai-task/ai-task.service';
import { NovelService } from '../novel/novel.service';
import { NovelChapterService } from '../novel-chapter/novel-chapter.service';
import { NovelGenreService } from '../novel-genre/novel-genre.service';
import {
  ChapterContextService,
  ChapterContext,
  WritingPlan,
  ReviewResult,
} from './chapter-context.service';
import { PromptService } from '../ai/prompt.service';
import { TaskType, TaskStatus, ChapterStatus, GenerationStatus } from '../../common/enums';

export interface GenerationProgress {
  stage:
    | 'preparing'
    | 'planning'
    | 'generating'
    | 'reviewing'
    | 'rewriting'
    | 'saving'
    | 'complete'
    | 'error';
  message: string;
  progress: number;
  chapterNumber?: number;
  totalChapters?: number;
}

export type ProgressCallback = (progress: GenerationProgress) => void;

export interface GenerateChapterOptions {
  novelId: string;
  chapterNumber: number;
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
}

export interface BatchGenerateOptions {
  novelId: string;
  startChapter: number;
  endChapter: number;
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
}

const MAX_REWRITE_ATTEMPTS = 2;
const MIN_QUALITY_SCORE = 6;

@Injectable()
export class ChapterGenerationService {
  constructor(
    private readonly aiService: AiService,
    private readonly aiTaskService: AiTaskService,
    private readonly novelService: NovelService,
    private readonly chapterService: NovelChapterService,
    private readonly genreService: NovelGenreService,
    private readonly contextService: ChapterContextService,
    private readonly promptService: PromptService,
  ) {}

  async generateChapter(options: GenerateChapterOptions): Promise<{
    taskId: string;
    chapterId: string;
    content: string;
    wordCount: number;
  }> {
    const { novelId, chapterNumber, onProgress, signal } = options;

    const taskId = await this.aiService.createTask(TaskType.GENERATE_CHAPTER, novelId, {
      chapterNumber,
    });

    this.checkAborted(signal);

    try {
      await this.aiTaskService.updateStatus(taskId, TaskStatus.RUNNING);

      const result = await this.executeGeneration(
        novelId,
        chapterNumber,
        taskId,
        onProgress,
        signal,
      );

      await this.aiService.updateTaskSuccess(taskId, {
        chapterId: result.chapterId,
        wordCount: result.wordCount,
        content: result.content.substring(0, 500),
      });

      return { taskId, ...result };
    } catch (err) {
      const errorMsg = (err as Error).message;
      await this.aiTaskService.updateStatus(taskId, TaskStatus.FAILED, undefined, errorMsg);
      throw err;
    }
  }

  async executeChapterGeneration(
    novelId: string,
    chapterNumber: number,
    taskId: string,
    onProgress?: ProgressCallback,
    signal?: AbortSignal,
  ): Promise<{ chapterId: string; content: string; wordCount: number }> {
    return this.executeGeneration(novelId, chapterNumber, taskId, onProgress, signal);
  }

  async batchGenerate(options: BatchGenerateOptions): Promise<{
    taskId: string;
    results: Array<{ chapterNumber: number; success: boolean; error?: string }>;
  }> {
    const { novelId, startChapter, endChapter, onProgress, signal } = options;

    const taskId = await this.aiService.createTask(TaskType.GENERATE_CHAPTERS, novelId, {
      startChapter,
      endChapter,
    });

    try {
      await this.aiTaskService.updateStatus(taskId, TaskStatus.RUNNING);

      const totalChapters = endChapter - startChapter + 1;
      const results: Array<{ chapterNumber: number; success: boolean; error?: string }> = [];

      for (let i = 0; i < totalChapters; i++) {
        this.checkAborted(signal);

        const chapterNumber = startChapter + i;

        onProgress?.({
          stage: 'preparing',
          message: `准备生成第${chapterNumber}章 (${i + 1}/${totalChapters})`,
          progress: Math.floor((i / totalChapters) * 100),
          chapterNumber,
          totalChapters,
        });

        try {
          const chapterProgressCallback: ProgressCallback = (p) => {
            onProgress?.({
              ...p,
              progress:
                Math.floor((i / totalChapters) * 100) + Math.floor(p.progress / totalChapters),
              chapterNumber,
              totalChapters,
            });
          };

          await this.executeGeneration(
            novelId,
            chapterNumber,
            taskId,
            chapterProgressCallback,
            signal,
          );
          results.push({ chapterNumber, success: true });
        } catch (err) {
          results.push({ chapterNumber, success: false, error: (err as Error).message });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      await this.aiTaskService.updateStatus(taskId, TaskStatus.COMPLETED, {
        totalChapters,
        successCount,
        results,
      });

      return { taskId, results };
    } catch (err) {
      await this.aiTaskService.updateStatus(
        taskId,
        TaskStatus.FAILED,
        undefined,
        (err as Error).message,
      );
      throw err;
    }
  }

  async pauseTask(taskId: string): Promise<void> {
    await this.aiTaskService.updateStatus(taskId, TaskStatus.PAUSED);
  }

  async resumeTask(taskId: string): Promise<void> {
    await this.aiTaskService.updateStatus(taskId, TaskStatus.RUNNING);
  }

  async cancelTask(taskId: string): Promise<void> {
    await this.aiTaskService.updateStatus(taskId, TaskStatus.CANCELLED);
  }

  async rewriteChapter(
    novelId: string,
    chapterId: string,
    reviewFeedback: string,
  ): Promise<{ content: string; wordCount: number }> {
    const chapter = await this.chapterService.findById(chapterId);
    const novel = await this.novelService.findById(novelId);
    const context = await this.contextService.buildContext(novelId, chapter.chapterNumber);
    const genres = await this.genreService.findGenresByNovelId(novelId);
    const genreText = genres.map((g) => g.label).join('、');

    const plan = context.chapterPlanContext;

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是一个专业的网络小说作家。请根据审核反馈，重新撰写章节。直接输出正文。',
      },
      {
        role: 'user',
        content: `请重写以下章节：

## 小说信息
- 书名：${novel.title}
- 类型：${genreText}
- 写作风格：${novel.writingStyle || '未指定'}
- 叙事视角：${novel.pointOfView || '第三人称'}

## 本章规划
- 章节标题：${plan.title}
- 剧情概要：${plan.summary}
- 关键事件：${plan.keyEvents}
- 冲突：${plan.conflict}
- 爽点：${plan.highlight}
- 结尾钩子：${plan.endingHook}

## 审核反馈
${reviewFeedback}

## 原章节正文
${chapter.content}

## 世界观
${context.worldSettingContext}

## 相关角色设定
${context.characterDetailsContext}

## 上一章结尾
${context.previousChapterContext}

请直接输出重写后的章节正文。
章节标题格式：第${chapter.chapterNumber}章 ${plan.title}`,
      },
    ];

    const content = await this.aiService.generateText({
      messages,
      temperature: 0.8,
      maxTokens: 6000,
      timeout: 120_000,
    });

    const cleanedContent = this.cleanContent(content, chapter.chapterNumber, plan.title);
    const wordCount = this.countChineseChars(cleanedContent);

    await this.chapterService.update(chapterId, {
      content: cleanedContent,
      wordCount,
      generationStatus: GenerationStatus.COMPLETED,
      status: ChapterStatus.DRAFT,
    });

    return { content: cleanedContent, wordCount };
  }

  async continueChapter(
    novelId: string,
    chapterId: string,
    targetWordCount?: number,
  ): Promise<{ content: string; wordCount: number }> {
    const chapter = await this.chapterService.findById(chapterId);
    const novel = await this.novelService.findById(novelId);
    const context = await this.contextService.buildContext(novelId, chapter.chapterNumber);
    const genres = await this.genreService.findGenresByNovelId(novelId);
    const genreText = genres.map((g) => g.label).join('、');

    const plan = context.chapterPlanContext;

    const messages = await this.promptService.renderWithSystem(
      'chapter_continue',
      {
        title: novel.title,
        genreText,
        writingStyle: novel.writingStyle || '未指定',
        pointOfView: novel.pointOfView || '第三人称',
        chapterTitle: plan.title,
        chapterSummary: plan.summary,
        endingHook: plan.endingHook,
        existingContent: chapter.content,
        targetWordCount: targetWordCount || 1000,
        characterDetailsContext: context.characterDetailsContext,
      },
      undefined,
      undefined,
      false,
    );

    const continuation = await this.aiService.generateText({
      messages,
      temperature: 0.8,
      maxTokens: 4000,
      timeout: 120_000,
    });

    const newContent = chapter.content + '\n' + continuation.trim();
    const wordCount = this.countChineseChars(newContent);

    await this.chapterService.update(chapterId, {
      content: newContent,
      wordCount,
    });

    return { content: newContent, wordCount };
  }

  async expandChapter(
    novelId: string,
    chapterId: string,
    targetWordCount: number,
  ): Promise<{ content: string; wordCount: number }> {
    const chapter = await this.chapterService.findById(chapterId);
    const novel = await this.novelService.findById(novelId);
    const context = await this.contextService.buildContext(novelId, chapter.chapterNumber);
    const plan = context.chapterPlanContext;

    const messages = await this.promptService.renderWithSystem(
      'chapter_expand',
      {
        title: novel.title,
        genreText: '',
        writingStyle: novel.writingStyle || '未指定',
        chapterNumber: chapter.chapterNumber,
        chapterTitle: plan.title,
        chapterSummary: plan.summary,
        chapterContent: chapter.content,
        currentWordCount: chapter.wordCount,
        targetWordCount,
      },
      undefined,
      undefined,
      false,
    );

    const content = await this.aiService.generateText({
      messages,
      temperature: 0.8,
      maxTokens: 8000,
      timeout: 180_000,
    });

    const cleanedContent = this.cleanContent(content, chapter.chapterNumber, plan.title);
    const wordCount = this.countChineseChars(cleanedContent);

    await this.chapterService.update(chapterId, {
      content: cleanedContent,
      wordCount,
    });

    return { content: cleanedContent, wordCount };
  }

  async shortenChapter(
    novelId: string,
    chapterId: string,
    targetWordCount: number,
  ): Promise<{ content: string; wordCount: number }> {
    const chapter = await this.chapterService.findById(chapterId);
    const novel = await this.novelService.findById(novelId);
    const context = await this.contextService.buildContext(novelId, chapter.chapterNumber);
    const plan = context.chapterPlanContext;

    const messages = await this.promptService.renderWithSystem(
      'chapter_shorten',
      {
        title: novel.title,
        genreText: '',
        chapterNumber: chapter.chapterNumber,
        chapterTitle: plan.title,
        chapterSummary: plan.summary,
        keyEvents: plan.keyEvents,
        chapterContent: chapter.content,
        currentWordCount: chapter.wordCount,
        targetWordCount,
      },
      undefined,
      undefined,
      false,
    );

    const content = await this.aiService.generateText({
      messages,
      temperature: 0.5,
      maxTokens: 6000,
      timeout: 120_000,
    });

    const cleanedContent = this.cleanContent(content, chapter.chapterNumber, plan.title);
    const wordCount = this.countChineseChars(cleanedContent);

    await this.chapterService.update(chapterId, {
      content: cleanedContent,
      wordCount,
    });

    return { content: cleanedContent, wordCount };
  }

  async polishChapter(
    novelId: string,
    chapterId: string,
  ): Promise<{ content: string; wordCount: number }> {
    const chapter = await this.chapterService.findById(chapterId);
    const novel = await this.novelService.findById(novelId);
    const genres = await this.genreService.findGenresByNovelId(novelId);
    const genreText = genres.map((g) => g.label).join('、');

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是一个专业的网络小说编辑。请润色章节内容，提升文笔质量。直接输出完整正文。',
      },
      {
        role: 'user',
        content: `请润色以下章节：

## 小说信息
- 书名：${novel.title}
- 类型：${genreText}
- 写作风格：${novel.writingStyle || '未指定'}

## 当前正文
${chapter.content}

## 润色要求
1. 改善语句表达，使其更加流畅自然
2. 丰富描写，增强画面感
3. 优化对话，使其更符合角色性格
4. 修正语法和用词问题
5. 保持原有剧情和结构不变
6. 不要大幅改变字数

请直接输出润色后的完整章节正文。`,
      },
    ];

    const content = await this.aiService.generateText({
      messages,
      temperature: 0.7,
      maxTokens: 8000,
      timeout: 180_000,
    });

    const cleanedContent = content.trim();
    const wordCount = this.countChineseChars(cleanedContent);

    await this.chapterService.update(chapterId, {
      content: cleanedContent,
      wordCount,
    });

    return { content: cleanedContent, wordCount };
  }

  async processTextSelection(
    novelId: string,
    selectedText: string,
    operation: 'continue' | 'rewrite' | 'expand' | 'shorten' | 'polish',
    context?: { before?: string; after?: string },
  ): Promise<string> {
    const novel = await this.novelService.findById(novelId);
    const genres = await this.genreService.findGenresByNovelId(novelId);
    const genreText = genres.map((g) => g.label).join('、');

    let systemPrompt = '';
    let userPrompt = '';

    const contextBefore = context?.before ? `\n## 选中内容前文\n${context.before.slice(-500)}` : '';
    const contextAfter = context?.after ? `\n## 选中内容后文\n${context.after.slice(0, 500)}` : '';

    switch (operation) {
      case 'continue':
        systemPrompt = '你是一个专业的网络小说作家。请从选中内容的结尾继续写作。直接输出续写内容。';
        userPrompt = `请续写以下内容：

## 小说信息
- 书名：${novel.title}
- 类型：${genreText}

## 选中内容
${selectedText}
${contextBefore}${contextAfter}

请直接输出续写内容，保持风格一致。`;
        break;

      case 'rewrite':
        systemPrompt = '你是一个专业的网络小说作家。请改写选中的内容。直接输出改写后的内容。';
        userPrompt = `请改写以下内容：

## 小说信息
- 书名：${novel.title}
- 类型：${genreText}

## 选中内容
${selectedText}
${contextBefore}${contextAfter}

请直接输出改写后的内容。`;
        break;

      case 'expand':
        systemPrompt =
          '你是一个专业的网络小说作家。请扩写选中的内容，增加更多细节。直接输出扩写后的内容。';
        userPrompt = `请扩写以下内容：

## 小说信息
- 书名：${novel.title}

## 选中内容
${selectedText}
${contextBefore}${contextAfter}

## 扩写要求
1. 增加场景描写和细节
2. 丰富角色心理活动
3. 细化动作和对话
4. 不要改变原有剧情

请直接输出扩写后的内容。`;
        break;

      case 'shorten':
        systemPrompt = '你是一个专业的网络小说作家。请精简选中的内容。直接输出精简后的内容。';
        userPrompt = `请精简以下内容：

## 小说信息
- 书名：${novel.title}

## 选中内容
${selectedText}
${contextBefore}${contextAfter}

## 精简要求
1. 删除冗余描写
2. 保留核心信息
3. 保持语句通顺

请直接输出精简后的内容。`;
        break;

      case 'polish':
        systemPrompt = '你是一个专业的网络小说编辑。请润色选中的内容。直接输出润色后的内容。';
        userPrompt = `请润色以下内容：

## 小说信息
- 书名：${novel.title}
- 类型：${genreText}

## 选中内容
${selectedText}
${contextBefore}${contextAfter}

## 润色要求
1. 改善语句表达
2. 增强画面感
3. 修正语法问题
4. 保持原意不变

请直接输出润色后的内容。`;
        break;
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const result = await this.aiService.generateText({
      messages,
      temperature: 0.75,
      maxTokens: 4000,
      timeout: 60_000,
    });

    return result.trim();
  }

  private async executeGeneration(
    novelId: string,
    chapterNumber: number,
    _taskId: string,
    onProgress?: ProgressCallback,
    signal?: AbortSignal,
  ): Promise<{ chapterId: string; content: string; wordCount: number }> {
    const novel = await this.novelService.findById(novelId);

    onProgress?.({
      stage: 'preparing',
      message: `准备第${chapterNumber}章上下文...`,
      progress: 5,
      chapterNumber,
    });

    this.checkAborted(signal);

    const context = await this.contextService.buildContext(novelId, chapterNumber);
    const genres = await this.genreService.findGenresByNovelId(novelId);
    const genreText = genres.map((g) => g.label).join('、');

    onProgress?.({
      stage: 'planning',
      message: `生成第${chapterNumber}章写作计划...`,
      progress: 15,
      chapterNumber,
    });

    this.checkAborted(signal);

    const writingPlan = await this.contextService.generateWritingPlan(
      context,
      novel.title,
      novel.writingStyle || '未指定',
      novel.pointOfView || '第三人称',
    );

    const writingPlanText = this.contextService.formatWritingPlan(writingPlan);

    onProgress?.({
      stage: 'generating',
      message: `正在生成第${chapterNumber}章正文...`,
      progress: 30,
      chapterNumber,
    });

    this.checkAborted(signal);

    const content = await this.generateContent(
      novel,
      context,
      genreText,
      writingPlanText,
      onProgress,
      chapterNumber,
      signal,
    );

    const cleanedContent = this.cleanContent(
      content,
      chapterNumber,
      context.chapterPlanContext.title,
    );
    let wordCount = this.countChineseChars(cleanedContent);

    onProgress?.({
      stage: 'reviewing',
      message: `审核第${chapterNumber}章正文...`,
      progress: 75,
      chapterNumber,
    });

    this.checkAborted(signal);

    let finalContent = cleanedContent;
    const review = await this.contextService.reviewChapter(
      novel.title,
      genreText,
      context.chapterPlanContext,
      context.characterDetailsContext,
      cleanedContent,
    );

    if (review.qualityScore < MIN_QUALITY_SCORE && review.issues.length > 0) {
      for (let attempt = 0; attempt < MAX_REWRITE_ATTEMPTS; attempt++) {
        onProgress?.({
          stage: 'rewriting',
          message: `重写第${chapterNumber}章（第${attempt + 1}次，质量分：${review.qualityScore}）...`,
          progress: 80 + attempt * 5,
          chapterNumber,
        });

        this.checkAborted(signal);

        const feedback = this.formatReviewFeedback(review);
        const rewritten = await this.rewriteContent(
          novel,
          context,
          genreText,
          cleanedContent,
          feedback,
        );

        finalContent = this.cleanContent(
          rewritten,
          chapterNumber,
          context.chapterPlanContext.title,
        );
        wordCount = this.countChineseChars(finalContent);

        const newReview = await this.contextService.reviewChapter(
          novel.title,
          genreText,
          context.chapterPlanContext,
          context.characterDetailsContext,
          finalContent,
        );

        if (newReview.qualityScore >= MIN_QUALITY_SCORE) break;
      }
    }

    onProgress?.({
      stage: 'saving',
      message: `保存第${chapterNumber}章...`,
      progress: 95,
      chapterNumber,
    });

    const chapter = await this.saveChapter(
      novelId,
      chapterNumber,
      context.chapterPlanContext.title,
      finalContent,
      wordCount,
    );

    await this.novelService.update(novelId, {
      currentChapter: Math.max(novel.currentChapter, chapterNumber),
    });

    onProgress?.({
      stage: 'complete',
      message: `第${chapterNumber}章生成完成（${wordCount}字）`,
      progress: 100,
      chapterNumber,
    });

    return { chapterId: chapter.id, content: finalContent, wordCount };
  }

  private async generateContent(
    novel: { title: string; writingStyle?: string; pointOfView?: string; targetWordCount?: number },
    context: ChapterContext,
    genreText: string,
    writingPlanText: string,
    onProgress?: ProgressCallback,
    chapterNumber?: number,
    signal?: AbortSignal,
  ): Promise<string> {
    const plan = context.chapterPlanContext;
    const wordsPerChapter = novel.targetWordCount
      ? Math.floor(
          novel.targetWordCount /
            Math.max(1, (novel as { chapterCount?: number }).chapterCount || 50),
        )
      : 3000;

    const messages = await this.promptService.renderWithSystem(
      'chapter_generate',
      {
        chapterNumber: plan.chapterNumber,
        title: novel.title,
        genreText,
        writingStyle: novel.writingStyle || '未指定',
        pointOfView: novel.pointOfView || '第三人称',
        targetWordCount: wordsPerChapter,
        writingPlanContext: writingPlanText,
        chapterTitle: plan.title,
        chapterSummary: plan.summary,
        keyEvents: plan.keyEvents,
        conflict: plan.conflict,
        highlight: plan.highlight,
        endingHook: plan.endingHook,
        characters: plan.characters,
        location: plan.location,
        worldSettingContext: context.worldSettingContext,
        powerSystemContext: context.powerSystemContext,
        characterDetailsContext: context.characterDetailsContext,
        previousChapterContext: context.previousChapterContext,
      },
      undefined,
      undefined,
      false,
    );

    let fullContent = '';
    const stream = this.aiService.stream({
      messages,
      temperature: 0.85,
      maxTokens: 8000,
      timeout: 180_000,
      signal: signal || undefined,
    });

    let chunkCount = 0;
    for await (const chunk of stream) {
      if (chunk.content) {
        fullContent += chunk.content;
        chunkCount++;

        if (onProgress && chunkCount % 20 === 0) {
          const genProgress = 30 + Math.min(40, Math.floor((chunkCount / 200) * 40));
          onProgress({
            stage: 'generating',
            message: `生成中... 已生成约${this.countChineseChars(fullContent)}字`,
            progress: genProgress,
            chapterNumber,
          });
        }
      }
    }

    return fullContent;
  }

  private async rewriteContent(
    novel: { title: string; writingStyle?: string; pointOfView?: string },
    context: ChapterContext,
    genreText: string,
    originalContent: string,
    feedback: string,
  ): Promise<string> {
    const plan = context.chapterPlanContext;

    const messages = await this.promptService.renderWithSystem(
      'chapter_rewrite',
      {
        title: novel.title,
        genreText,
        writingStyle: novel.writingStyle || '未指定',
        pointOfView: novel.pointOfView || '第三人称',
        chapterNumber: plan.chapterNumber,
        chapterTitle: plan.title,
        chapterSummary: plan.summary,
        keyEvents: plan.keyEvents,
        conflict: plan.conflict,
        highlight: plan.highlight,
        endingHook: plan.endingHook,
        reviewFeedback: feedback,
        originalContent,
        worldSettingContext: context.worldSettingContext,
        characterDetailsContext: context.characterDetailsContext,
        previousChapterContext: context.previousChapterContext,
      },
      undefined,
      undefined,
      false,
    );

    return this.aiService.generateText({
      messages,
      temperature: 0.85,
      maxTokens: 8000,
      timeout: 180_000,
    });
  }

  private async saveChapter(
    novelId: string,
    chapterNumber: number,
    title: string,
    content: string,
    wordCount: number,
  ) {
    const chapters = await this.chapterService.findByNovelId(novelId);
    const existing = chapters.find((c) => c.chapterNumber === chapterNumber);

    if (existing) {
      return this.chapterService.update(existing.id, {
        title,
        content,
        wordCount,
        generationStatus: GenerationStatus.COMPLETED,
        status: ChapterStatus.DRAFT,
      });
    }

    return this.chapterService.create({
      novelId,
      chapterNumber,
      title,
      content,
      wordCount,
      generationStatus: GenerationStatus.COMPLETED,
      status: ChapterStatus.DRAFT,
    });
  }

  private cleanContent(content: string, chapterNumber: number, title: string): string {
    let cleaned = content.trim();

    const titlePatterns = [
      new RegExp(`^第${chapterNumber}章\\s*${this.escapeRegex(title)}\\s*\\n*`),
      new RegExp(`^第${chapterNumber}章\\s*.*\\n*`),
      /^#+\s*.*\n*/,
    ];

    for (const pattern of titlePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    cleaned = cleaned.replace(/^(作者的话|PS：|注：)[\s\S]*$/m, '').trim();

    return cleaned;
  }

  private countChineseChars(text: string): number {
    const chinese = text.match(/[\u4e00-\u9fff]/g);
    return chinese ? chinese.length : text.length;
  }

  private formatReviewFeedback(review: ReviewResult): string {
    const parts: string[] = [];

    if (review.plotConsistency && review.plotConsistency !== '通过') {
      parts.push(`剧情一致性问题：${review.plotConsistency}`);
    }
    if (review.characterConsistency && review.characterConsistency !== '通过') {
      parts.push(`角色一致性问题：${review.characterConsistency}`);
    }
    if (review.logicCheck && review.logicCheck !== '通过') {
      parts.push(`逻辑问题：${review.logicCheck}`);
    }
    if (review.pacingCheck && review.pacingCheck !== '通过') {
      parts.push(`节奏问题：${review.pacingCheck}`);
    }
    if (review.continuityCheck && review.continuityCheck !== '通过') {
      parts.push(`连贯性问题：${review.continuityCheck}`);
    }
    if (review.issues?.length) {
      parts.push(`具体问题：\n${review.issues.map((i) => `- ${i}`).join('\n')}`);
    }
    if (review.suggestions?.length) {
      parts.push(`修改建议：\n${review.suggestions.map((s) => `- ${s}`).join('\n')}`);
    }

    return parts.join('\n\n') || '质量评分偏低，请提升整体质量。';
  }

  private checkAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new Error('任务已取消');
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
