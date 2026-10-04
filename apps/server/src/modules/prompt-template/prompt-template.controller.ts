import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { PromptTemplateService } from './prompt-template.service';

@Controller('api/prompts')
export class PromptTemplateController {
  constructor(private readonly promptTemplateService: PromptTemplateService) {}

  @Get()
  async listTemplates(@Query('type') type?: string, @Query('enabled') enabled?: string) {
    if (type) {
      return this.promptTemplateService.findByType(type);
    }
    if (enabled !== undefined) {
      return this.promptTemplateService.findAllWithFilter(enabled === 'true');
    }
    return this.promptTemplateService.findAll();
  }

  @Get('types')
  async listTypes() {
    return this.promptTemplateService.getDistinctTypes();
  }

  @Get(':id')
  async getTemplate(@Param('id') id: string) {
    return this.promptTemplateService.findById(id);
  }

  @Post()
  async createTemplate(
    @Body()
    body: {
      name: string;
      type: string;
      content: string;
      variables?: Record<string, string>;
      version?: string;
      enabled?: boolean;
    },
  ) {
    return this.promptTemplateService.create(body);
  }

  @Put(':id')
  async updateTemplate(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      type?: string;
      content?: string;
      variables?: Record<string, string>;
      version?: string;
      enabled?: boolean;
    },
  ) {
    return this.promptTemplateService.update(id, body);
  }

  @Post(':id/copy')
  async copyTemplate(@Param('id') id: string) {
    return this.promptTemplateService.copyTemplate(id);
  }

  @Post(':id/new-version')
  async createNewVersion(
    @Param('id') id: string,
    @Body() body: { content: string; variables?: Record<string, string>; version?: string },
  ) {
    return this.promptTemplateService.createNewVersion(id, body);
  }

  @Patch(':id/toggle')
  async toggleTemplate(@Param('id') id: string) {
    return this.promptTemplateService.toggleEnabled(id);
  }

  @Delete(':id')
  async deleteTemplate(@Param('id') id: string) {
    await this.promptTemplateService.remove(id);
    return { success: true };
  }
}
