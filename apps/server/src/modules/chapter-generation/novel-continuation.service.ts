import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { AiTaskService } from '../ai-task/ai-task.service';
import { NovelService } from '../novel/novel.service';
import { NovelChapterService } from '../novel-chapter/novel-chapter.service';
import { ChapterGenerationService, ProgressCallback } from './chapter-generation.service';
import { TaskType, TaskStatus } from '../../common/enums';

export type ContinuationMode = 'nextChapter' | 'count' | 'toChapter' | 'toWordCount';

export interface StartContinuationOptions {
  novelId: string;
  mode: ContinuationMode;
  count?: number;
  toChapter?: number;
  toWordCount?: number;
  maxRetries?: number;
}

interface ContinuationState {
  abortController: AbortController;
  parentTaskId: string;
  novelId: string;
}

@Injectable()
export class NovelContinuationService {
  private readonly logger = new Logger(NovelContinuationService.name);
  private readonly activeTasks = new Map<string, ContinuationState>();

  constructor(
    private readonly aiTaskService: AiTaskService,
    private readonly novelService: NovelService,
    private readonly chapterService: NovelChapterService,
    private readonly generationService: ChapterGenerationService,
  ) {}

  async startContinuation(
    options: StartContinuationOptions,
  ): Promise<{ parentTaskId: string; message: string }> {
    const { novelId, mode, maxRetries = 3 } = options;

    const existing = await this.aiTaskService.findActiveTaskByNovelAndType(
      novelId,
      TaskType.CONTINUE_NOVEL,
    );
    if (existing) {
      throw new BadRequestException('该小说已有正在运行的续写任务');
    }

    const novel = await this.novelService.findById(novelId);
    const nextChapter = await this.chapterService.findNextChapterNumber(novelId);

    const totalChapters = this.calculateTotalChapters(mode, options, nextChapter, novel);

    const parentTask = await this.aiTaskService.create({
      taskType: TaskType.CONTINUE_NOVEL,
      status: TaskStatus.RUNNING,
      novelId,
      input: {
        mode,
        count: options.count,
        toChapter: options.toChapter,
        toWordCount: options.toWordCount,
        startChapter: nextChapter,
        totalChapters,
      } as Record<string, unknown>,
      maxRetries,
    });

    const abortController = new AbortController();
    this.activeTasks.set(parentTask.id, {
      abortController,
      parentTaskId: parentTask.id,
      novelId,
    });

    this.runContinuationLoop(
      parentTask.id,
      novelId,
      nextChapter,
      totalChapters,
      mode,
      options,
      abortController.signal,
    ).catch((err) => {
      this.logger.error(`续写任务异常: ${err.message}`, err.stack);
    });

    return {
      parentTaskId: parentTask.id,
      message: `开始续写，从第${nextChapter}章起`,
    };
  }

  async pauseContinuation(parentTaskId: string): Promise<void> {
    const state = this.activeTasks.get(parentTaskId);
    if (state) {
      state.abortController.abort();
      this.activeTasks.delete(parentTaskId);
    }
    await this.aiTaskService.updateStatus(parentTaskId, TaskStatus.PAUSED);
  }

  async resumeContinuation(parentTaskId: string): Promise<void> {
    const parentTask = await this.aiTaskService.findById(parentTaskId);

    if (parentTask.status !== TaskStatus.PAUSED) {
      throw new BadRequestException('只能恢复已暂停的任务');
    }

    await this.aiTaskService.updateStatus(parentTaskId, TaskStatus.RUNNING);

    const input = parentTask.input || {};
    const mode = input.mode as ContinuationMode;
    const novelId = parentTask.novelId;

    const children = await this.aiTaskService.findChildren(parentTaskId);
    const completedChapters = children.filter(
      (c) => c.status === TaskStatus.COMPLETED && c.taskType === TaskType.GENERATE_CHAPTER,
    );
    const lastChapterNumber =
      completedChapters.length > 0
        ? Math.max(...completedChapters.map((c) => c.chapterNumber || 0))
        : (input.startChapter as number) - 1;
    const nextChapter = lastChapterNumber + 1;

    const novel = await this.novelService.findById(novelId);
    const totalChapters =
      (input.totalChapters as number) ||
      this.calculateTotalChapters(
        mode,
        {
          count: input.count as number,
          toChapter: input.toChapter as number,
          toWordCount: input.toWordCount as number,
        },
        nextChapter,
        novel,
      );

    const remainingChapters = totalChapters - completedChapters.length;
    if (remainingChapters <= 0) {
      await this.aiTaskService.updateStatus(parentTaskId, TaskStatus.COMPLETED, {
        message: '所有章节已生成完成',
      });
      return;
    }

    const abortController = new AbortController();
    this.activeTasks.set(parentTaskId, {
      abortController,
      parentTaskId,
      novelId,
    });

    this.runContinuationLoop(
      parentTaskId,
      novelId,
      nextChapter,
      remainingChapters,
      mode,
      {
        toChapter: input.toChapter as number,
        toWordCount: input.toWordCount as number,
      },
      abortController.signal,
    ).catch((err) => {
      this.logger.error(`恢复续写任务异常: ${err.message}`, err.stack);
    });
  }

  async cancelContinuation(parentTaskId: string): Promise<void> {
    const state = this.activeTasks.get(parentTaskId);
    if (state) {
      state.abortController.abort();
      this.activeTasks.delete(parentTaskId);
    }

    await this.aiTaskService.updateStatus(parentTaskId, TaskStatus.CANCELLED);

    const children = await this.aiTaskService.findChildren(parentTaskId);
    for (const child of children) {
      if (child.status === TaskStatus.PENDING || child.status === TaskStatus.RUNNING) {
        await this.aiTaskService.updateStatus(child.id, TaskStatus.CANCELLED);
      }
    }
  }

  async retryChapter(parentTaskId: string, chapterNumber: number): Promise<void> {
    const parentTask = await this.aiTaskService.findById(parentTaskId);

    const children = await this.aiTaskService.findChildren(parentTaskId);
    const failedChild = children.find(
      (c) => c.chapterNumber === chapterNumber && c.status === TaskStatus.FAILED,
    );

    if (!failedChild) {
      throw new BadRequestException(`第${chapterNumber}章没有失败的任务记录`);
    }

    await this.aiTaskService.updateStatus(failedChild.id, TaskStatus.PENDING);
    await this.aiTaskService.create({
      id: undefined,
      taskType: TaskType.GENERATE_CHAPTER,
      status: TaskStatus.PENDING,
      novelId: parentTask.novelId,
      parentId: parentTaskId,
      chapterNumber,
      maxRetries: parentTask.maxRetries,
    });

    const abortController = new AbortController();
    this.activeTasks.set(parentTaskId, {
      abortController,
      parentTaskId,
      novelId: parentTask.novelId,
    });

    this.executeSingleChapter(
      parentTaskId,
      parentTask.novelId,
      chapterNumber,
      abortController.signal,
    )
      .then(() => {
        this.activeTasks.delete(parentTaskId);
      })
      .catch((err) => {
        this.logger.error(`重试第${chapterNumber}章失败: ${err.message}`);
        this.activeTasks.delete(parentTaskId);
      });
  }

  getActiveTaskState(novelId: string): { parentTaskId: string; status: string } | null {
    for (const [taskId, state] of this.activeTasks.entries()) {
      if (state.novelId === novelId) {
        return { parentTaskId: taskId, status: 'running' };
      }
    }
    return null;
  }

  private calculateTotalChapters(
    mode: ContinuationMode,
    options: { count?: number; toChapter?: number; toWordCount?: number },
    nextChapter: number,
    novel: { targetWordCount?: number; chapterCount?: number },
  ): number {
    switch (mode) {
      case 'nextChapter':
        return 1;
      case 'count':
        return options.count || 5;
      case 'toChapter':
        return Math.max(1, (options.toChapter || nextChapter) - nextChapter + 1);
      case 'toWordCount': {
        const wordsPerChapter = novel.targetWordCount
          ? Math.floor(novel.targetWordCount / Math.max(1, novel.chapterCount || 50))
          : 3000;
        const targetWords = options.toWordCount || 0;
        return Math.max(1, Math.ceil(targetWords / wordsPerChapter));
      }
      default:
        return 5;
    }
  }

  private async runContinuationLoop(
    parentTaskId: string,
    novelId: string,
    startChapter: number,
    totalChapters: number,
    mode: ContinuationMode,
    options: { toChapter?: number; toWordCount?: number },
    signal: AbortSignal,
  ): Promise<void> {
    let completedCount = 0;

    const existingChildren = await this.aiTaskService.findChildren(parentTaskId);
    completedCount = existingChildren.filter(
      (c) => c.status === TaskStatus.COMPLETED && c.taskType === TaskType.GENERATE_CHAPTER,
    ).length;

    for (let i = 0; i < totalChapters; i++) {
      if (signal.aborted) {
        this.logger.log(`续写任务 ${parentTaskId} 已中止`);
        return;
      }

      const parentTask = await this.aiTaskService.findById(parentTaskId);
      if (parentTask.status === TaskStatus.PAUSED || parentTask.status === TaskStatus.CANCELLED) {
        this.logger.log(
          `续写任务 ${parentTaskId} 已${parentTask.status === TaskStatus.PAUSED ? '暂停' : '取消'}`,
        );
        return;
      }

      const chapterNumber = startChapter + i;

      if (mode === 'toWordCount' && options.toWordCount) {
        const chapters = await this.chapterService.findByNovelId(novelId);
        const totalWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
        if (totalWords >= options.toWordCount) {
          await this.aiTaskService.updateStatus(parentTaskId, TaskStatus.COMPLETED, {
            message: `已达到目标字数 ${options.toWordCount}`,
            totalWords,
          });
          return;
        }
      }

      const progress = Math.floor((completedCount / totalChapters) * 100);
      await this.aiTaskService.updateProgress(parentTaskId, progress);

      try {
        await this.executeSingleChapter(parentTaskId, novelId, chapterNumber, signal);
        completedCount++;
      } catch (err) {
        this.logger.error(`第${chapterNumber}章生成失败: ${(err as Error).message}`);

        const parentCheck = await this.aiTaskService.findById(parentTaskId);
        if (
          parentCheck.status === TaskStatus.PAUSED ||
          parentCheck.status === TaskStatus.CANCELLED
        ) {
          return;
        }

        await this.aiTaskService.updateStatus(
          parentTaskId,
          TaskStatus.FAILED,
          undefined,
          `第${chapterNumber}章生成失败: ${(err as Error).message}`,
        );
        this.activeTasks.delete(parentTaskId);
        return;
      }
    }

    await this.aiTaskService.updateStatus(parentTaskId, TaskStatus.COMPLETED, {
      message: `续写完成，共生成${totalChapters}章`,
      totalChapters,
    });
    this.activeTasks.delete(parentTaskId);
  }

  private async executeSingleChapter(
    parentTaskId: string,
    novelId: string,
    chapterNumber: number,
    signal: AbortSignal,
  ): Promise<void> {
    const parentTask = await this.aiTaskService.findById(parentTaskId);

    const childTask = await this.aiTaskService.create({
      taskType: TaskType.GENERATE_CHAPTER,
      status: TaskStatus.RUNNING,
      novelId,
      parentId: parentTaskId,
      chapterNumber,
      maxRetries: parentTask.maxRetries,
    });

    const onProgress: ProgressCallback = (progress) => {
      this.aiTaskService.updateProgress(childTask.id, progress.progress).catch(() => {});
    };

    try {
      await this.generationService.executeChapterGeneration(
        novelId,
        chapterNumber,
        childTask.id,
        onProgress,
        signal,
      );

      await this.aiTaskService.updateStatus(childTask.id, TaskStatus.COMPLETED, {
        chapterNumber,
        message: `第${chapterNumber}章生成完成`,
      });
    } catch (err) {
      if (signal.aborted) return;

      const errorMsg = (err as Error).message;
      let retryCount = childTask.retryCount;

      if (retryCount < childTask.maxRetries) {
        retryCount = await this.aiTaskService.incrementRetryCount(childTask.id);
        this.logger.warn(
          `第${chapterNumber}章失败，第${retryCount}次重试 (max: ${childTask.maxRetries})`,
        );

        await this.aiTaskService.updateStatus(childTask.id, TaskStatus.FAILED, undefined, errorMsg);

        const retryTask = await this.aiTaskService.create({
          taskType: TaskType.GENERATE_CHAPTER,
          status: TaskStatus.RUNNING,
          novelId,
          parentId: parentTaskId,
          chapterNumber,
          maxRetries: parentTask.maxRetries,
          retryCount,
        });

        try {
          await this.generationService.executeChapterGeneration(
            novelId,
            chapterNumber,
            retryTask.id,
            onProgress,
            signal,
          );

          await this.aiTaskService.updateStatus(retryTask.id, TaskStatus.COMPLETED, {
            chapterNumber,
            message: `第${chapterNumber}章重试成功`,
            retryCount,
          });
          return;
        } catch (retryErr) {
          if (signal.aborted) return;
          await this.aiTaskService.updateStatus(
            retryTask.id,
            TaskStatus.FAILED,
            undefined,
            (retryErr as Error).message,
          );
          throw retryErr;
        }
      }

      await this.aiTaskService.updateStatus(childTask.id, TaskStatus.FAILED, undefined, errorMsg);
      throw err;
    }
  }
}
