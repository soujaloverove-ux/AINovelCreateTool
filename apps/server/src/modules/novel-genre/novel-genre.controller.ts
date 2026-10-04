import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { NovelGenreService } from './novel-genre.service';
import { NovelGenre } from './novel-genre.entity';

@Controller('api/genres')
export class NovelGenreController {
  constructor(private readonly genreService: NovelGenreService) {}

  @Get()
  findAll(): Promise<NovelGenre[]> {
    return this.genreService.findAll();
  }

  @Get('novel/:novelId')
  findByNovelId(@Param('novelId') novelId: string): Promise<NovelGenre[]> {
    return this.genreService.findGenresByNovelId(novelId);
  }

  @Post('assign')
  @HttpCode(HttpStatus.OK)
  assignGenres(@Body() body: { novelId: string; genreIds: string[] }): Promise<void> {
    return this.genreService.assignGenresToNovel(body.novelId, body.genreIds);
  }
}
