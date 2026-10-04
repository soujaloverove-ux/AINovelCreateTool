import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AiTask } from './ai-task.entity';
import { TaskStatus, TaskType } from '../../common/enums';

@Injectable()
export class AiTaskService {
  constructor(
    @InjectRepository(AiTask)
    private readonly taskRepository: Repository<AiTask>,
  ) {}

  async findByNovelId(novelId: string): Promise<AiTask[]> {
    return this.taskRepository.find({
      where: { novelId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<AiTask> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`任务 ${id} 不存在`);
    }
    return task;
  }

  async create(data: Partial<AiTask>): Promise<AiTask> {
    const task = this.taskRepository.create(data);
    return this.taskRepository.save(task);
  }

  async updateStatus(
    id: string,
    status: TaskStatus,
    output?: Record<string, unknown>,
    error?: string,
  ): Promise<AiTask> {
    const task = await this.findById(id);
    task.status = status;
    if (output !== undefined) task.output = output;
    if (error !== undefined) task.error = error;
    if (status === TaskStatus.RUNNING && !task.startedAt) {
      task.startedAt = new Date();
    }
    if (
      status === TaskStatus.COMPLETED ||
      status === TaskStatus.FAILED ||
      status === TaskStatus.CANCELLED
    ) {
      task.completedAt = new Date();
    }
    return this.taskRepository.save(task);
  }

  async updateProgress(id: string, progress: number): Promise<AiTask> {
    const task = await this.findById(id);
    task.progress = Math.min(100, Math.max(0, progress));
    return this.taskRepository.save(task);
  }

  async updateTokenUsage(
    id: string,
    tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number },
  ): Promise<AiTask> {
    const task = await this.findById(id);
    task.tokenUsage = tokenUsage;
    return this.taskRepository.save(task);
  }

  async findPendingTasks(limit = 10): Promise<AiTask[]> {
    return this.taskRepository.find({
      where: { status: TaskStatus.PENDING },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  async findChildren(parentId: string): Promise<AiTask[]> {
    return this.taskRepository.find({
      where: { parentId },
      order: { createdAt: 'ASC' },
    });
  }

  async findActiveTaskByNovelAndType(novelId: string, taskType: TaskType): Promise<AiTask | null> {
    return this.taskRepository.findOne({
      where: {
        novelId,
        taskType,
        status: TaskStatus.RUNNING,
        parentId: IsNull(),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findRootTasks(novelId?: string): Promise<AiTask[]> {
    const where: Record<string, unknown> = { parentId: IsNull() };
    if (novelId) where.novelId = novelId;
    return this.taskRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findWithFilters(filters: {
    novelId?: string;
    status?: TaskStatus;
    taskType?: TaskType;
  }): Promise<AiTask[]> {
    const where: Record<string, unknown> = {};
    if (filters.novelId) where.novelId = filters.novelId;
    if (filters.status) where.status = filters.status;
    if (filters.taskType) where.taskType = filters.taskType;
    return this.taskRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async incrementRetryCount(id: string): Promise<number> {
    const task = await this.findById(id);
    task.retryCount += 1;
    await this.taskRepository.save(task);
    return task.retryCount;
  }
}
