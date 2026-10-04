import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NovelChapterService } from './novel-chapter.service';
import { NovelChapter } from './novel-chapter.entity';

class CreateChapterDto {
  novelId: string;
  chapterNumber: number;
  title: string;
  summary?: string;
  content?: string;
  wordCount?: number;
  outlineId?: string;
}

class UpdateChapterDto {
  title?: string;
  summary?: string;
  content?: string;
  wordCount?: number;
  chapterNumber?: number;
  outlineId?: string;
}

@Controller('api/novels/:novelId/chapters')
export class NovelChapterController {
  constructor(private readonly chapterService: NovelChapterService) {}

  @Get()
  findByNovelId(@Param('novelId') novelId: string): Promise<NovelChapter[]> {
    return this.chapterService.findByNovelId(novelId);
  }

  @Get(':id')
  findById(@Param('novelId') _novelId: string, @Param('id') id: string): Promise<NovelChapter> {
    return this.chapterService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Param('novelId') novelId: string, @Body() dto: CreateChapterDto): Promise<NovelChapter> {
    return this.chapterService.create({ ...dto, novelId });
  }

  @Put(':id')
  update(
    @Param('novelId') _novelId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChapterDto,
  ): Promise<NovelChapter> {
    return this.chapterService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('novelId') _novelId: string, @Param('id') id: string): Promise<void> {
    return this.chapterService.remove(id);
  }
}
