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
import { NovelService } from './novel.service';
import { Novel } from './novel.entity';
import { CreateNovelDto, UpdateNovelDto, CreateNovelWizardDto } from './novel.dto';
import { NovelStatus } from '../../common/enums';

@Controller('api/novels')
export class NovelController {
  constructor(private readonly novelService: NovelService) {}

  @Get()
  findAll(): Promise<Novel[]> {
    return this.novelService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<Novel> {
    return this.novelService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateNovelDto): Promise<Novel> {
    return this.novelService.create({ ...dto, status: dto.status as NovelStatus });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNovelDto): Promise<Novel> {
    return this.novelService.update(id, { ...dto, status: dto.status as NovelStatus });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.novelService.remove(id);
  }

  @Post('wizard/create')
  @HttpCode(HttpStatus.CREATED)
  async createFromWizard(@Body() dto: CreateNovelWizardDto): Promise<{ id: string }> {
    const novel = await this.novelService.create({
      title: dto.title,
      description: dto.description,
      status: 'draft' as any,
      writingStyle: dto.basicSetting?.writingStyle,
      pointOfView: dto.basicSetting?.pointOfView,
      targetAudience: dto.basicSetting?.targetAudience,
      targetWordCount: dto.basicSetting?.targetWordCount || 0,
      worldSetting: dto.worldSetting?.background ? JSON.stringify(dto.worldSetting) : undefined,
      protagonistSetting: dto.protagonist?.name ? JSON.stringify(dto.protagonist) : undefined,
      powerSystem: dto.coreSetting ? JSON.stringify(dto.coreSetting) : undefined,
      coreConflict: dto.plotDirection?.coreConflict,
      mainStoryDirection: dto.plotDirection?.storyDirection,
      creationConfig: {
        chapterCount: dto.basicSetting?.chapterCount,
        wordsPerChapter: dto.basicSetting?.wordsPerChapter,
        pacing: dto.basicSetting?.pacing,
        keywords: dto.basicSetting?.keywords,
        genreIds: dto.genreIds,
      },
    });

    return { id: novel.id };
  }
}
