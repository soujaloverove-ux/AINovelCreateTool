import { IsString, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class AiTestDto {
  @IsString()
  @IsOptional()
  message?: string;
}

export class PromptRenderDto {
  @IsString()
  type: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @Type(() => Object)
  variables: Record<string, string>;
}
