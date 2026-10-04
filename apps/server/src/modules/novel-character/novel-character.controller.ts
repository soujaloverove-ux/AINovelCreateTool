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
import { NovelCharacterService } from './novel-character.service';
import { NovelCharacter } from './novel-character.entity';
import { CharacterRoleType } from '../../common/enums';

class CreateCharacterDto {
  novelId: string;
  name: string;
  roleType?: CharacterRoleType;
  gender?: string;
  age?: string;
  identity?: string;
  personality?: string;
  appearance?: string;
  background?: string;
  ability?: string;
  relationship?: string;
  goals?: string;
  secrets?: string;
  notes?: string;
  sortOrder?: number;
}

class UpdateCharacterDto {
  name?: string;
  roleType?: CharacterRoleType;
  gender?: string;
  age?: string;
  identity?: string;
  personality?: string;
  appearance?: string;
  background?: string;
  ability?: string;
  relationship?: string;
  goals?: string;
  secrets?: string;
  notes?: string;
  sortOrder?: number;
}

@Controller('api/novels/:novelId/characters')
export class NovelCharacterController {
  constructor(private readonly characterService: NovelCharacterService) {}

  @Get()
  findByNovelId(@Param('novelId') novelId: string): Promise<NovelCharacter[]> {
    return this.characterService.findByNovelId(novelId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('novelId') novelId: string,
    @Body() dto: CreateCharacterDto,
  ): Promise<NovelCharacter> {
    return this.characterService.create({ ...dto, novelId });
  }

  @Put(':id')
  update(
    @Param('novelId') _novelId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCharacterDto,
  ): Promise<NovelCharacter> {
    return this.characterService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('novelId') _novelId: string, @Param('id') id: string): Promise<void> {
    return this.characterService.remove(id);
  }
}
