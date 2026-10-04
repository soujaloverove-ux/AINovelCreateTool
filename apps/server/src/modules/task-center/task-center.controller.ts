import { Controller, Get, Post, Param, Query, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AiTaskService } from '../ai-task/ai-task.service';
import { NovelContinuationService } from '../chapter-generation/novel-continuation.service';
import { TaskStatus, TaskType } from '../../common/enums';

@Controller('api/tasks')
export class TaskCenterController {
  constructor(
    private readonly aiTaskService: AiTaskService,
    private readonly continuationService: NovelContinuationService,
  ) {}

  @Get()
  async listTasks(
    @Query('novelId') novelId?: string,
    @Query('status') status?: TaskStatus,
    @Query('taskType') taskType?: TaskType,
  ) {
    const tasks = await this.aiTaskService.findWithFilters({
      novelId,
      status,
      taskType,
    });
    return tasks.filter((t) => !t.parentId);
  }

  @Get(':id')
  async getTaskDetail(@Param('id') id: string) {
    const task = await this.aiTaskService.findById(id);
    const children = await this.aiTaskService.findChildren(id);
    return { ...task, children };
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  async pauseTask(@Param('id') id: string) {
    await this.continuationService.pauseContinuation(id);
    return { message: '任务已暂停' };
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  async resumeTask(@Param('id') id: string) {
    await this.continuationService.resumeContinuation(id);
    return { message: '任务已恢复' };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelTask(@Param('id') id: string) {
    await this.continuationService.cancelContinuation(id);
    return { message: '任务已取消' };
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  async retryChapter(@Param('id') id: string, @Body() body: { chapterNumber: number }) {
    await this.continuationService.retryChapter(id, body.chapterNumber);
    return { message: `开始重试第${body.chapterNumber}章` };
  }

  @Get('novel/:novelId/active')
  async getActiveTask(@Param('novelId') novelId: string) {
    const state = this.continuationService.getActiveTaskState(novelId);
    if (state) {
      const task = await this.aiTaskService.findById(state.parentTaskId);
      return task;
    }
    const task = await this.aiTaskService.findActiveTaskByNovelAndType(
      novelId,
      TaskType.CONTINUE_NOVEL,
    );
    return task;
  }
}
