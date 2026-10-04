import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NovelChapter } from './novel-chapter.entity';
import { ChapterVersion } from './chapter-version.entity';
import { NovelChapterService } from './novel-chapter.service';
import { ChapterVersionService } from './chapter-version.service';
import { NovelChapterController } from './novel-chapter.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NovelChapter, ChapterVersion])],
  controllers: [NovelChapterController],
  providers: [NovelChapterService, ChapterVersionService],
  exports: [NovelChapterService, ChapterVersionService],
})
export class NovelChapterModule {}
