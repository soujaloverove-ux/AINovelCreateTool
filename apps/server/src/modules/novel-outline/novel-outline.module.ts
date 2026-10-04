import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NovelOutline } from './novel-outline.entity';
import { NovelOutlineService } from './novel-outline.service';
import { NovelOutlineController } from './novel-outline.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NovelOutline])],
  controllers: [NovelOutlineController],
  providers: [NovelOutlineService],
  exports: [NovelOutlineService],
})
export class NovelOutlineModule {}
