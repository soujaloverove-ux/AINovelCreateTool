import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromptTemplate } from './prompt-template.entity';

@Injectable()
export class PromptTemplateService {
  constructor(
    @InjectRepository(PromptTemplate)
    private readonly templateRepository: Repository<PromptTemplate>,
  ) {}

  async findAll(): Promise<PromptTemplate[]> {
    return this.templateRepository.find({ order: { type: 'ASC', name: 'ASC' } });
  }

  async findAllWithFilter(enabled: boolean): Promise<PromptTemplate[]> {
    return this.templateRepository.find({
      where: { enabled },
      order: { type: 'ASC', name: 'ASC' },
    });
  }

  async findEnabled(): Promise<PromptTemplate[]> {
    return this.templateRepository.find({
      where: { enabled: true },
      order: { type: 'ASC', name: 'ASC' },
    });
  }

  async findByType(type: string): Promise<PromptTemplate[]> {
    return this.templateRepository.find({
      where: { type, enabled: true },
      order: { version: 'DESC' },
    });
  }

  async getDistinctTypes(): Promise<string[]> {
    const result = await this.templateRepository
      .createQueryBuilder('t')
      .select('DISTINCT t.type', 'type')
      .orderBy('t.type', 'ASC')
      .getRawMany();
    return result.map((r) => r.type);
  }

  async findById(id: string): Promise<PromptTemplate> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`模板 ${id} 不存在`);
    }
    return template;
  }

  async create(data: Partial<PromptTemplate>): Promise<PromptTemplate> {
    const template = this.templateRepository.create(data);
    return this.templateRepository.save(template);
  }

  async update(id: string, data: Partial<PromptTemplate>): Promise<PromptTemplate> {
    const template = await this.findById(id);
    Object.assign(template, data);
    return this.templateRepository.save(template);
  }

  async copyTemplate(id: string): Promise<PromptTemplate> {
    const source = await this.findById(id);
    const copy = this.templateRepository.create({
      name: `${source.name}_copy`,
      type: source.type,
      content: source.content,
      variables: source.variables,
      version: '1.0.0',
      enabled: false,
    });
    return this.templateRepository.save(copy);
  }

  async createNewVersion(
    id: string,
    data: { content: string; variables?: Record<string, string>; version?: string },
  ): Promise<PromptTemplate> {
    const source = await this.findById(id);
    const newVersion = this.templateRepository.create({
      name: source.name,
      type: source.type,
      content: data.content,
      variables: data.variables ?? source.variables,
      version: data.version ?? this.incrementVersion(source.version),
      enabled: true,
    });
    return this.templateRepository.save(newVersion);
  }

  async toggleEnabled(id: string): Promise<PromptTemplate> {
    const template = await this.findById(id);
    template.enabled = !template.enabled;
    return this.templateRepository.save(template);
  }

  async remove(id: string): Promise<void> {
    const result = await this.templateRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`模板 ${id} 不存在`);
    }
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      return '1.0.0';
    }
    parts[2] += 1;
    return parts.join('.');
  }
}
