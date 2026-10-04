import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NovelGenre } from './novel-genre.entity';
import { NovelGenreMap } from './novel-genre-map.entity';
import { NovelGenreService } from './novel-genre.service';
import { NovelGenreController } from './novel-genre.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NovelGenre, NovelGenreMap])],
  controllers: [NovelGenreController],
  providers: [NovelGenreService],
  exports: [NovelGenreService],
})
export class NovelGenreModule {}
