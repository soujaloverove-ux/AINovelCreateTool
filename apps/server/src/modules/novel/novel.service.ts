import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Novel } from './novel.entity';

@Injectable()
export class NovelService {
  constructor(
    @InjectRepository(Novel)
    private readonly novelRepository: Repository<Novel>,
  ) {}

  async findAll(): Promise<Novel[]> {
    return this.novelRepository.find({
      order: { updatedAt: 'DESC' },
      relations: ['genreMaps', 'genreMaps.genre'],
    });
  }

  async findById(id: string): Promise<Novel> {
    const novel = await this.novelRepository.findOne({
      where: { id },
      relations: ['genreMaps', 'genreMaps.genre'],
    });
    if (!novel) {
      throw new NotFoundException(`小说 ${id} 不存在`);
    }
    return novel;
  }

  async create(data: Partial<Novel>): Promise<Novel> {
    const novel = this.novelRepository.create(data);
    return this.novelRepository.save(novel);
  }

  async update(id: string, data: Partial<Novel>): Promise<Novel> {
    const novel = await this.findById(id);
    Object.assign(novel, data);
    return this.novelRepository.save(novel);
  }

  async remove(id: string): Promise<void> {
    const result = await this.novelRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`小说 ${id} 不存在`);
    }
  }
}
