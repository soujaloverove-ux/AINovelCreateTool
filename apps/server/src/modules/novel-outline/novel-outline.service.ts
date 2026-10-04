import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NovelOutline } from './novel-outline.entity';

@Injectable()
export class NovelOutlineService {
  constructor(
    @InjectRepository(NovelOutline)
    private readonly outlineRepository: Repository<NovelOutline>,
  ) {}

  async findByNovelId(novelId: string): Promise<NovelOutline[]> {
    return this.outlineRepository.find({
      where: { novelId },
      order: { sortOrder: 'ASC' },
      relations: ['children'],
    });
  }

  async findTreeByNovelId(novelId: string): Promise<NovelOutline[]> {
    return this.outlineRepository.find({
      where: { novelId, parentId: undefined as unknown as string },
      order: { sortOrder: 'ASC' },
      relations: ['children'],
    });
  }

  async findById(id: string): Promise<NovelOutline> {
    const outline = await this.outlineRepository.findOne({
      where: { id },
      relations: ['children'],
    });
    if (!outline) {
      throw new NotFoundException(`大纲 ${id} 不存在`);
    }
    return outline;
  }

  async create(data: Partial<NovelOutline>): Promise<NovelOutline> {
    const outline = this.outlineRepository.create(data);
    return this.outlineRepository.save(outline);
  }

  async update(id: string, data: Partial<NovelOutline>): Promise<NovelOutline> {
    const outline = await this.findById(id);
    Object.assign(outline, data);
    return this.outlineRepository.save(outline);
  }

  async remove(id: string): Promise<void> {
    const result = await this.outlineRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`大纲 ${id} 不存在`);
    }
  }
}
