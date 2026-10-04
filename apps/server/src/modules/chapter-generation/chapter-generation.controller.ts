import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  HttpCode,
  HttpStatus,
  OnModuleDestroy,
} from '@nestjs/common';
import { Response } from 'express';
import { EventEmitter } from 'events';
import { ChapterGenerationService, GenerationProgress } from './chapter-generation.service';
import { NovelContinuationService, ContinuationMode } from './novel-continuation.service';
import { AiTaskService } from '../ai-task/ai-task.service';
import { NovelChapterService } from '../novel-chapter/novel-chapter.service';
import { ChapterVersionService } from '../novel-chapter/chapter-version.service';
import { NovelService } from '../novel/novel.service';

interface TaskAbortController {
  controller: AbortController;
}

@Controller('api/chapter-generation')
export class ChapterGenerationController implements OnModuleDestroy {
  private readonly emitter = new EventEmitter();
  private readonly abortControllers = new Map<string, TaskAbortController>();

  constructor(
    private readonly generationService: ChapterGenerationService,
    private readonly continuationService: NovelContinuationService,
    private readonly aiTaskService: AiTaskService,
    private readonly chapterService: NovelChapterService,
    private readonly versionService: ChapterVersionService,
    private readonly novelService: NovelService,
  ) {
    this.emitter.setMaxListeners(100);
  }

  onModuleDestroy() {
    this.emitter.removeAllListeners();
    for (const { controller } of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
  }

  @Post(':novelId/chapters/generate')
  @HttpCode(HttpStatus.OK)
  async generateChapter(
    @Param('novelId') novelId: string,
    @Body() body: { chapterNumber: number },
  ) {
    const abortController = new AbortController();

    const onProgress = (progress: GenerationProgress) => {
      this.emitter.emit(`progress:${novelId}`, progress);
    };

    const generationPromise = this.generationService.generateChapter({
      novelId,
      chapterNumber: body.chapterNumber,
      onProgress,
      signal: abortController.signal,
    });

    generationPromise
      .then((result) => {
        this.emitter.emit(`progress:${novelId}`, {
          stage: 'complete',
          message: `第${body.chapterNumber}章生成完成（${result.wordCount}字）`,
          progress: 100,
          chapterNumber: body.chapterNumber,
          chapterId: result.chapterId,
        });
      })
      .catch((err) => {
        this.emitter.emit(`progress:${novelId}`, {
          stage: 'error',
          message: (err as Error).message,
          progress: 0,
          chapterNumber: body.chapterNumber,
        });
      })
      .finally(() => {
        this.abortControllers.delete(novelId);
      });

    this.abortControllers.set(novelId, { controller: abortController });

    const task = await this.aiTaskService.findByNovelId(novelId);
    const runningTask = task.find((t) => t.status === 'running' || t.status === 'pending');

    return {
      taskId: runningTask?.id || null,
      message: `开始生成第${body.chapterNumber}章`,
    };
  }

  @Post(':novelId/chapters/generate-batch')
  @HttpCode(HttpStatus.OK)
  async batchGenerate(
    @Param('novelId') novelId: string,
    @Body() body: { startChapter: number; endChapter: number },
  ) {
    const abortController = new AbortController();

    const onProgress = (progress: GenerationProgress) => {
      this.emitter.emit(`progress:${novelId}`, progress);
    };

    const batchPromise = this.generationService.batchGenerate({
      novelId,
      startChapter: body.startChapter,
      endChapter: body.endChapter,
      onProgress,
      signal: abortController.signal,
    });

    batchPromise
      .then((result) => {
        const successCount = result.results.filter((r) => r.success).length;
        this.emitter.emit(`progress:${novelId}`, {
          stage: 'complete',
          message: `批量生成完成：${successCount}/${result.results.length}章成功`,
          progress: 100,
        });
      })
      .catch((err) => {
        this.emitter.emit(`progress:${novelId}`, {
          stage: 'error',
          message: (err as Error).message,
          progress: 0,
        });
      })
      .finally(() => {
        this.abortControllers.delete(novelId);
      });

    this.abortControllers.set(novelId, { controller: abortController });

    return {
      message: `开始批量生成第${body.startChapter}-${body.endChapter}章`,
    };
  }

  @Get(':novelId/chapters/generate-progress')
  async streamProgress(@Param('novelId') novelId: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const onProgress = (progress: GenerationProgress & { chapterId?: string }) => {
      this.sendSSE(res, 'progress', progress);
    };

    this.emitter.on(`progress:${novelId}`, onProgress);

    res.on('close', () => {
      this.emitter.off(`progress:${novelId}`, onProgress);
    });

    this.sendSSE(res, 'connected', { novelId });
  }

  @Post(':novelId/chapters/:chapterId/rewrite')
  @HttpCode(HttpStatus.OK)
  async rewriteChapter(
    @Param('novelId') novelId: string,
    @Param('chapterId') chapterId: string,
    @Body() body: { reviewFeedback: string },
  ) {
    const result = await this.generationService.rewriteChapter(
      novelId,
      chapterId,
      body.reviewFeedback,
    );
    return result;
  }

  @Post(':novelId/chapters/:chapterId/continue')
  @HttpCode(HttpStatus.OK)
  async continueChapter(
    @Param('novelId') novelId: string,
    @Param('chapterId') chapterId: string,
    @Body() body: { targetWordCount?: number },
  ) {
    const result = await this.generationService.continueChapter(
      novelId,
      chapterId,
      body.targetWordCount,
    );
    return result;
  }

  @Post(':novelId/chapters/:chapterId/expand')
  @HttpCode(HttpStatus.OK)
  async expandChapter(
    @Param('novelId') novelId: string,
    @Param('chapterId') chapterId: string,
    @Body() body: { targetWordCount: number },
  ) {
    const result = await this.generationService.expandChapter(
      novelId,
      chapterId,
      body.targetWordCount,
    );
    return result;
  }

  @Post(':novelId/chapters/:chapterId/shorten')
  @HttpCode(HttpStatus.OK)
  async shortenChapter(
    @Param('novelId') novelId: string,
    @Param('chapterId') chapterId: string,
    @Body() body: { targetWordCount: number },
  ) {
    const result = await this.generationService.shortenChapter(
      novelId,
      chapterId,
      body.targetWordCount,
    );
    return result;
  }

  @Post(':novelId/chapters/:chapterId/polish')
  @HttpCode(HttpStatus.OK)
  async polishChapter(@Param('novelId') novelId: string, @Param('chapterId') chapterId: string) {
    const result = await this.generationService.polishChapter(novelId, chapterId);
    return result;
  }

  @Post(':novelId/text/process')
  @HttpCode(HttpStatus.OK)
  async processTextSelection(
    @Param('novelId') novelId: string,
    @Body()
    body: {
      selectedText: string;
      operation: 'continue' | 'rewrite' | 'expand' | 'shorten' | 'polish';
      context?: { before?: string; after?: string };
    },
  ) {
    const result = await this.generationService.processTextSelection(
      novelId,
      body.selectedText,
      body.operation,
      body.context,
    );
    return { result };
  }

  @Post(':novelId/chapters/:chapterId/autosave')
  @HttpCode(HttpStatus.OK)
  async autoSaveChapter(
    @Param('novelId') _novelId: string,
    @Param('chapterId') chapterId: string,
    @Body() body: { title?: string; content: string; wordCount: number; createVersion?: boolean },
  ) {
    const chapter = await this.chapterService.findById(chapterId);

    if (body.createVersion && chapter.content !== body.content) {
      await this.versionService.create({
        chapterId,
        title: chapter.title,
        content: chapter.content,
        wordCount: chapter.wordCount,
        changeNote: '自动保存',
      });
    }

    const updated = await this.chapterService.update(chapterId, {
      title: body.title,
      content: body.content,
      wordCount: body.wordCount,
    });

    return updated;
  }

  @Get(':novelId/chapters/:chapterId/versions')
  async getVersions(@Param('novelId') _novelId: string, @Param('chapterId') chapterId: string) {
    return this.versionService.findByChapterId(chapterId);
  }

  @Post(':novelId/chapters/:chapterId/versions/:versionId/restore')
  @HttpCode(HttpStatus.OK)
  async restoreVersion(
    @Param('novelId') _novelId: string,
    @Param('chapterId') chapterId: string,
    @Param('versionId') versionId: string,
  ) {
    const version = await this.versionService.findById(versionId);
    if (!version || version.chapterId !== chapterId) {
      return { error: '版本不存在' };
    }

    const currentChapter = await this.chapterService.findById(chapterId);

    await this.versionService.create({
      chapterId,
      title: currentChapter.title,
      content: currentChapter.content,
      wordCount: currentChapter.wordCount,
      changeNote: '恢复前备份',
    });

    const updated = await this.chapterService.update(chapterId, {
      title: version.title,
      content: version.content,
      wordCount: version.wordCount,
    });

    return updated;
  }

  @Post(':novelId/reading-position')
  @HttpCode(HttpStatus.OK)
  async saveReadingPosition(
    @Param('novelId') novelId: string,
    @Body() body: { chapterId: string },
  ) {
    await this.novelService.update(novelId, {
      readingPosition: body.chapterId,
    });
    return { success: true };
  }

  @Get(':novelId/reading-position')
  async getReadingPosition(@Param('novelId') novelId: string) {
    const novel = await this.novelService.findById(novelId);
    return { chapterId: novel.readingPosition };
  }

  @Post('tasks/:taskId/pause')
  @HttpCode(HttpStatus.OK)
  async pauseTask(@Param('taskId') taskId: string) {
    await this.generationService.pauseTask(taskId);
    return { message: '任务已暂停' };
  }

  @Post('tasks/:taskId/resume')
  @HttpCode(HttpStatus.OK)
  async resumeTask(@Param('taskId') taskId: string) {
    await this.generationService.resumeTask(taskId);
    return { message: '任务已恢复' };
  }

  @Post('tasks/:taskId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelTask(@Param('taskId') taskId: string, @Body() body: { novelId?: string }) {
    await this.generationService.cancelTask(taskId);

    if (body.novelId) {
      const ac = this.abortControllers.get(body.novelId);
      if (ac) {
        ac.controller.abort();
        this.abortControllers.delete(body.novelId);
      }
    }

    return { message: '任务已取消' };
  }

  @Get(':novelId/chapters/tasks')
  async getTasks(@Param('novelId') novelId: string) {
    return this.aiTaskService.findByNovelId(novelId);
  }

  @Post(':novelId/continuation/start')
  @HttpCode(HttpStatus.OK)
  async startContinuation(
    @Param('novelId') novelId: string,
    @Body()
    body: {
      mode: ContinuationMode;
      count?: number;
      toChapter?: number;
      toWordCount?: number;
    },
  ) {
    return this.continuationService.startContinuation({
      novelId,
      mode: body.mode,
      count: body.count,
      toChapter: body.toChapter,
      toWordCount: body.toWordCount,
    });
  }

  @Get(':novelId/continuation/status')
  async getContinuationStatus(@Param('novelId') novelId: string) {
    const state = this.continuationService.getActiveTaskState(novelId);
    if (!state) {
      return { active: false };
    }
    const task = await this.aiTaskService.findById(state.parentTaskId);
    const children = await this.aiTaskService.findChildren(state.parentTaskId);
    return { active: true, task, children };
  }

  private sendSSE(res: Response, event: string, data: unknown): void {
    res.write(`data: ${JSON.stringify({ event, data })}\n\n`);
  }
}
