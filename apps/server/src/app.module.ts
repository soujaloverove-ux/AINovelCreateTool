import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { LoggerModule } from './common/logger/logger.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { NovelModule } from './modules/novel/novel.module';
import { NovelGenreModule } from './modules/novel-genre/novel-genre.module';
import { NovelCharacterModule } from './modules/novel-character/novel-character.module';
import { NovelOutlineModule } from './modules/novel-outline/novel-outline.module';
import { NovelChapterModule } from './modules/novel-chapter/novel-chapter.module';
import { AiTaskModule } from './modules/ai-task/ai-task.module';
import { PromptTemplateModule } from './modules/prompt-template/prompt-template.module';
import { AiModule } from './modules/ai/ai.module';
import { NovelCreationModule } from './modules/novel/novel-creation.module';
import { ChapterGenerationModule } from './modules/chapter-generation/chapter-generation.module';
import { TaskCenterModule } from './modules/task-center/task-center.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),
    DatabaseModule,
    LoggerModule,
    HealthModule,
    NovelModule,
    NovelGenreModule,
    NovelCharacterModule,
    NovelOutlineModule,
    NovelChapterModule,
    AiTaskModule,
    PromptTemplateModule,
    AiModule,
    NovelCreationModule,
    ChapterGenerationModule,
    TaskCenterModule,
  ],
})
export class AppModule {}
