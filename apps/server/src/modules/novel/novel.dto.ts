import { IsString, IsOptional, IsNumber, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNovelDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  cover?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  targetWordCount?: number;

  @IsNumber()
  @IsOptional()
  chapterCount?: number;

  @IsNumber()
  @IsOptional()
  currentChapter?: number;

  @IsString()
  @IsOptional()
  writingStyle?: string;

  @IsString()
  @IsOptional()
  pointOfView?: string;

  @IsString()
  @IsOptional()
  targetAudience?: string;

  @IsString()
  @IsOptional()
  worldSetting?: string;

  @IsString()
  @IsOptional()
  protagonistSetting?: string;

  @IsString()
  @IsOptional()
  powerSystem?: string;

  @IsString()
  @IsOptional()
  coreConflict?: string;

  @IsString()
  @IsOptional()
  mainStoryDirection?: string;

  @IsObject()
  @IsOptional()
  creationConfig?: Record<string, unknown>;
}

export class UpdateNovelDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  cover?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  targetWordCount?: number;

  @IsNumber()
  @IsOptional()
  chapterCount?: number;

  @IsNumber()
  @IsOptional()
  currentChapter?: number;

  @IsString()
  @IsOptional()
  writingStyle?: string;

  @IsString()
  @IsOptional()
  pointOfView?: string;

  @IsString()
  @IsOptional()
  targetAudience?: string;

  @IsString()
  @IsOptional()
  worldSetting?: string;

  @IsString()
  @IsOptional()
  protagonistSetting?: string;

  @IsString()
  @IsOptional()
  powerSystem?: string;

  @IsString()
  @IsOptional()
  coreConflict?: string;

  @IsString()
  @IsOptional()
  mainStoryDirection?: string;

  @IsObject()
  @IsOptional()
  creationConfig?: Record<string, unknown>;
}

export class WizardBasicSettingDto {
  @IsNumber()
  @IsOptional()
  chapterCount?: number;

  @IsNumber()
  @IsOptional()
  wordsPerChapter?: number;

  @IsNumber()
  @IsOptional()
  targetWordCount?: number;

  @IsString()
  @IsOptional()
  writingStyle?: string;

  @IsString()
  @IsOptional()
  pointOfView?: string;

  @IsString()
  @IsOptional()
  pacing?: string;

  @IsString()
  @IsOptional()
  targetAudience?: string;

  @IsArray()
  @IsOptional()
  keywords?: string[];
}

export class WizardWorldSettingDto {
  @IsString()
  @IsOptional()
  background?: string;

  @IsString()
  @IsOptional()
  geography?: string;

  @IsString()
  @IsOptional()
  socialStructure?: string;

  @IsString()
  @IsOptional()
  factions?: string;

  @IsString()
  @IsOptional()
  era?: string;

  @IsString()
  @IsOptional()
  specialRules?: string;
}

export class WizardProtagonistDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  age?: string;

  @IsString()
  @IsOptional()
  identity?: string;

  @IsString()
  @IsOptional()
  personality?: string;

  @IsString()
  @IsOptional()
  appearance?: string;

  @IsString()
  @IsOptional()
  ability?: string;

  @IsString()
  @IsOptional()
  background?: string;

  @IsString()
  @IsOptional()
  goals?: string;

  @IsString()
  @IsOptional()
  goldenFinger?: string;
}

export class WizardCharacterDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  identity?: string;

  @IsString()
  @IsOptional()
  personality?: string;

  @IsString()
  @IsOptional()
  ability?: string;

  @IsString()
  @IsOptional()
  background?: string;

  @IsString()
  @IsOptional()
  relationship?: string;

  @IsString()
  @IsOptional()
  goals?: string;

  @IsString()
  @IsOptional()
  roleType?: string;
}

export class WizardPlotDirectionDto {
  @IsString()
  @IsOptional()
  mainGoal?: string;

  @IsString()
  @IsOptional()
  coreConflict?: string;

  @IsString()
  @IsOptional()
  storyDirection?: string;

  @IsString()
  @IsOptional()
  highlights?: string;

  @IsString()
  @IsOptional()
  upgradeDirection?: string;

  @IsString()
  @IsOptional()
  romanceLine?: string;

  @IsString()
  @IsOptional()
  importantPlot?: string;

  @IsString()
  @IsOptional()
  forbiddenContent?: string;
}

export class WizardOutlineDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WizardOutlineDto)
  children?: WizardOutlineDto[];
}

export class WizardChapterPlanDto {
  @IsNumber()
  chapterNumber: number;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  coreEvent?: string;

  @IsString()
  @IsOptional()
  conflict?: string;

  @IsString()
  @IsOptional()
  highlight?: string;

  @IsString()
  @IsOptional()
  hook?: string;
}

export class CreateNovelWizardDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  genreIds?: string[];

  @ValidateNested()
  @Type(() => WizardBasicSettingDto)
  @IsOptional()
  basicSetting?: WizardBasicSettingDto;

  @ValidateNested()
  @Type(() => WizardWorldSettingDto)
  @IsOptional()
  worldSetting?: WizardWorldSettingDto;

  @ValidateNested()
  @Type(() => WizardProtagonistDto)
  @IsOptional()
  protagonist?: WizardProtagonistDto;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WizardCharacterDto)
  characters?: WizardCharacterDto[];

  @IsObject()
  @IsOptional()
  coreSetting?: Record<string, unknown>;

  @ValidateNested()
  @Type(() => WizardPlotDirectionDto)
  @IsOptional()
  plotDirection?: WizardPlotDirectionDto;

  @ValidateNested()
  @Type(() => WizardOutlineDto)
  @IsOptional()
  outline?: WizardOutlineDto;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WizardChapterPlanDto)
  chapterPlan?: WizardChapterPlanDto[];
}
