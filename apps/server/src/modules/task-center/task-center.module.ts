import { Module } from '@nestjs/common';
import { TaskCenterController } from './task-center.controller';
import { AiTaskModule } from '../ai-task/ai-task.module';
import { ChapterGenerationModule } from '../chapter-generation/chapter-generation.module';

@Module({
  imports: [AiTaskModule, ChapterGenerationModule],
  controllers: [TaskCenterController],
})
export class TaskCenterModule {}
