import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NovelChapter } from './novel-chapter.entity';

@Injectable()
export class NovelChapterService {
  constructor(
    @InjectRepository(NovelChapter)
    private readonly chapterRepository: Repository<NovelChapter>,
  ) {}

  async findByNovelId(novelId: string): Promise<NovelChapter[]> {
    return this.chapterRepository.find({
      where: { novelId },
      order: { chapterNumber: 'ASC' },
    });
  }

  async findById(id: string): Promise<NovelChapter> {
    const chapter = await this.chapterRepository.findOne({ where: { id } });
    if (!chapter) {
      throw new NotFoundException(`章节 ${id} 不存在`);
    }
    return chapter;
  }

  async create(data: Partial<NovelChapter>): Promise<NovelChapter> {
    const chapter = this.chapterRepository.create(data);
    return this.chapterRepository.save(chapter);
  }

  async update(id: string, data: Partial<NovelChapter>): Promise<NovelChapter> {
    const chapter = await this.findById(id);
    Object.assign(chapter, data);
    return this.chapterRepository.save(chapter);
  }

  async remove(id: string): Promise<void> {
    const result = await this.chapterRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`章节 ${id} 不存在`);
    }
  }

  async findNextChapterNumber(novelId: string): Promise<number> {
    const result = await this.chapterRepository
      .createQueryBuilder('chapter')
      .select('MAX(chapter.chapterNumber)', 'max')
      .where('chapter.novelId = :novelId', { novelId })
      .getRawOne();
    return (result?.max ?? 0) + 1;
  }
}
