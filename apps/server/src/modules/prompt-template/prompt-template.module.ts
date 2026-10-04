import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromptTemplate } from './prompt-template.entity';
import { PromptTemplateService } from './prompt-template.service';
import { PromptTemplateController } from './prompt-template.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PromptTemplate])],
  providers: [PromptTemplateService],
  controllers: [PromptTemplateController],
  exports: [PromptTemplateService],
})
export class PromptTemplateModule {}
