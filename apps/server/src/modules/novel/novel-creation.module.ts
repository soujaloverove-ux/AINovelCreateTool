import { Module } from '@nestjs/common';
import { NovelCreationController } from './novel-creation.controller';
import { AiModule } from '../ai/ai.module';
import { NovelModule } from '../novel/novel.module';
import { NovelGenreModule } from '../novel-genre/novel-genre.module';
import { NovelCharacterModule } from '../novel-character/novel-character.module';
import { NovelOutlineModule } from '../novel-outline/novel-outline.module';
import { NovelChapterModule } from '../novel-chapter/novel-chapter.module';

@Module({
  imports: [
    AiModule,
    NovelModule,
    NovelGenreModule,
    NovelCharacterModule,
    NovelOutlineModule,
    NovelChapterModule,
  ],
  controllers: [NovelCreationController],
})
export class NovelCreationModule {}
