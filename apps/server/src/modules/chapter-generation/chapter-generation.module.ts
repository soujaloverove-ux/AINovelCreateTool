import { Module } from '@nestjs/common';
import { ChapterGenerationService } from './chapter-generation.service';
import { ChapterContextService } from './chapter-context.service';
import { NovelContinuationService } from './novel-continuation.service';
import { ChapterGenerationController } from './chapter-generation.controller';
import { AiModule } from '../ai/ai.module';
import { AiTaskModule } from '../ai-task/ai-task.module';
import { NovelModule } from '../novel/novel.module';
import { NovelChapterModule } from '../novel-chapter/novel-chapter.module';
import { NovelGenreModule } from '../novel-genre/novel-genre.module';
import { NovelCharacterModule } from '../novel-character/novel-character.module';
import { NovelOutlineModule } from '../novel-outline/novel-outline.module';

@Module({
  imports: [
    AiModule,
    AiTaskModule,
    NovelModule,
    NovelChapterModule,
    NovelGenreModule,
    NovelCharacterModule,
    NovelOutlineModule,
  ],
  controllers: [ChapterGenerationController],
  providers: [ChapterGenerationService, ChapterContextService, NovelContinuationService],
  exports: [ChapterGenerationService, ChapterContextService, NovelContinuationService],
})
export class ChapterGenerationModule {}
