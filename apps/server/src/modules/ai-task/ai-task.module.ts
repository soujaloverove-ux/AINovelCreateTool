import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiTask } from './ai-task.entity';
import { AiTaskService } from './ai-task.service';

@Module({
  imports: [TypeOrmModule.forFeature([AiTask])],
  providers: [AiTaskService],
  exports: [AiTaskService],
})
export class AiTaskModule {}
