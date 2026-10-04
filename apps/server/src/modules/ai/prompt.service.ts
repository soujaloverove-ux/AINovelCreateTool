import { Injectable } from '@nestjs/common';
import { PromptTemplateService } from '../prompt-template/prompt-template.service';
import { PromptTemplate } from '../prompt-template/prompt-template.entity';
import { AppLogger } from '../../common/logger/logger.service';

export type PromptVariables = Record<string, string | number | undefined>;

export class PromptVariableMissingError extends Error {
  constructor(
    public readonly missingVariables: string[],
    public readonly templateType: string,
    public readonly templateName?: string,
  ) {
    const location = templateName ? `${templateType}/${templateName}` : templateType;
    super(`Prompt 模板 [${location}] 缺少变量: ${missingVariables.join(', ')}`);
    this.name = 'PromptVariableMissingError';
  }
}

@Injectable()
export class PromptService {
  constructor(
    private readonly templateService: PromptTemplateService,
    private readonly logger: AppLogger,
  ) {}

  async getTemplate(type: string, name?: string): Promise<PromptTemplate | null> {
    const templates = await this.templateService.findByType(type);
    if (templates.length === 0) return null;

    if (name) {
      return templates.find((t) => t.name === name) || templates[0];
    }
    return templates[0];
  }

  validateVariables(template: string, variables: PromptVariables): string[] {
    const required = this.extractVariables(template);
    const missing = required.filter((key) => {
      const value = variables[key];
      return value === undefined || value === null;
    });
    return missing;
  }

  async render(
    type: string,
    variables: PromptVariables,
    name?: string,
    strict = true,
  ): Promise<string> {
    const template = await this.getTemplate(type, name);
    if (!template) {
      this.logger.warn(`Prompt template not found: type=${type}, name=${name}`, 'PromptService');
      throw new Error(`Prompt 模板不存在: ${type}${name ? `/${name}` : ''}`);
    }

    if (strict) {
      const missing = this.validateVariables(template.content, variables);
      if (missing.length > 0) {
        throw new PromptVariableMissingError(missing, type, name);
      }
    }

    return this.renderString(template.content, variables);
  }

  async renderWithSystem(
    type: string,
    variables: PromptVariables,
    systemPrompt?: string,
    name?: string,
    strict = true,
  ): Promise<{ role: 'system' | 'user'; content: string }[]> {
    const userContent = await this.render(type, variables, name, strict);
    const messages: { role: 'system' | 'user'; content: string }[] = [];

    if (systemPrompt) {
      if (strict) {
        const missing = this.validateVariables(systemPrompt, variables);
        if (missing.length > 0) {
          throw new PromptVariableMissingError(missing, type, name);
        }
      }
      messages.push({ role: 'system', content: this.renderString(systemPrompt, variables) });
    }
    messages.push({ role: 'user', content: userContent });

    return messages;
  }

  renderString(template: string, variables: PromptVariables): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
      const value = variables[key];
      if (value === undefined || value === null) {
        this.logger.debug(`Prompt variable "${key}" is undefined`, 'PromptService');
        return '';
      }
      return String(value);
    });
  }

  extractVariables(template: string): string[] {
    const matches = template.matchAll(/\{\{(\w+)\}\}/g);
    return [...new Set([...matches].map((m) => m[1]))];
  }
}
