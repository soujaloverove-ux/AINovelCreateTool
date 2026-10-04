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
import { NovelOutlineService } from './novel-outline.service';
import { NovelOutline } from './novel-outline.entity';
import { OutlineType } from '../../common/enums';

class CreateOutlineDto {
  novelId: string;
  type: OutlineType;
  title: string;
  summary?: string;
  content?: string;
  sortOrder?: number;
  parentId?: string;
}

class UpdateOutlineDto {
  title?: string;
  summary?: string;
  content?: string;
  sortOrder?: number;
}

@Controller('api/novels/:novelId/outlines')
export class NovelOutlineController {
  constructor(private readonly outlineService: NovelOutlineService) {}

  @Get()
  findByNovelId(@Param('novelId') novelId: string): Promise<NovelOutline[]> {
    return this.outlineService.findByNovelId(novelId);
  }

  @Get('tree')
  findTree(@Param('novelId') novelId: string): Promise<NovelOutline[]> {
    return this.outlineService.findTreeByNovelId(novelId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Param('novelId') novelId: string, @Body() dto: CreateOutlineDto): Promise<NovelOutline> {
    return this.outlineService.create({ ...dto, novelId });
  }

  @Put(':id')
  update(
    @Param('novelId') _novelId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOutlineDto,
  ): Promise<NovelOutline> {
    return this.outlineService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('novelId') _novelId: string, @Param('id') id: string): Promise<void> {
    return this.outlineService.remove(id);
  }
}
