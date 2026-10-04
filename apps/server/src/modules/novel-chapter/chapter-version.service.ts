import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChapterVersion } from './chapter-version.entity';

@Injectable()
export class ChapterVersionService {
  constructor(
    @InjectRepository(ChapterVersion)
    private readonly versionRepository: Repository<ChapterVersion>,
  ) {}

  async findByChapterId(chapterId: string): Promise<ChapterVersion[]> {
    return this.versionRepository.find({
      where: { chapterId },
      order: { version: 'DESC' },
    });
  }

  async findById(id: string): Promise<ChapterVersion | null> {
    return this.versionRepository.findOne({ where: { id } });
  }

  async findLatest(chapterId: string): Promise<ChapterVersion | null> {
    return this.versionRepository.findOne({
      where: { chapterId },
      order: { version: 'DESC' },
    });
  }

  async create(data: {
    chapterId: string;
    title: string;
    content: string;
    wordCount: number;
    changeNote?: string;
  }): Promise<ChapterVersion> {
    const latest = await this.findLatest(data.chapterId);
    const version = latest ? latest.version + 1 : 1;

    const versionEntity = this.versionRepository.create({
      ...data,
      version,
    });

    return this.versionRepository.save(versionEntity);
  }

  async remove(id: string): Promise<void> {
    await this.versionRepository.delete(id);
  }

  async removeByChapterId(chapterId: string): Promise<void> {
    await this.versionRepository.delete({ chapterId });
  }
}
