import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NovelGenre } from './novel-genre.entity';
import { NovelGenreMap } from './novel-genre-map.entity';

@Injectable()
export class NovelGenreService {
  constructor(
    @InjectRepository(NovelGenre)
    private readonly genreRepository: Repository<NovelGenre>,
    @InjectRepository(NovelGenreMap)
    private readonly genreMapRepository: Repository<NovelGenreMap>,
  ) {}

  async findAll(): Promise<NovelGenre[]> {
    return this.genreRepository.find({ order: { sortOrder: 'ASC' } });
  }

  async findById(id: string): Promise<NovelGenre> {
    const genre = await this.genreRepository.findOne({ where: { id } });
    if (!genre) {
      throw new NotFoundException(`类型 ${id} 不存在`);
    }
    return genre;
  }

  async create(data: Partial<NovelGenre>): Promise<NovelGenre> {
    const genre = this.genreRepository.create(data);
    return this.genreRepository.save(genre);
  }

  async findGenresByNovelId(novelId: string): Promise<NovelGenre[]> {
    const maps = await this.genreMapRepository.find({
      where: { novelId },
      relations: ['genre'],
      order: { createdAt: 'ASC' },
    });
    return maps.map((map) => map.genre);
  }

  async assignGenresToNovel(novelId: string, genreIds: string[]): Promise<void> {
    await this.genreMapRepository.delete({ novelId });
    const maps = genreIds.map((genreId) => this.genreMapRepository.create({ novelId, genreId }));
    await this.genreMapRepository.save(maps);
  }
}
