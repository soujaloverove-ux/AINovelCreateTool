import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NovelCharacter } from './novel-character.entity';

@Injectable()
export class NovelCharacterService {
  constructor(
    @InjectRepository(NovelCharacter)
    private readonly characterRepository: Repository<NovelCharacter>,
  ) {}

  async findByNovelId(novelId: string): Promise<NovelCharacter[]> {
    return this.characterRepository.find({
      where: { novelId },
      order: { sortOrder: 'ASC' },
    });
  }

  async findById(id: string): Promise<NovelCharacter> {
    const character = await this.characterRepository.findOne({ where: { id } });
    if (!character) {
      throw new NotFoundException(`角色 ${id} 不存在`);
    }
    return character;
  }

  async create(data: Partial<NovelCharacter>): Promise<NovelCharacter> {
    const character = this.characterRepository.create(data);
    return this.characterRepository.save(character);
  }

  async update(id: string, data: Partial<NovelCharacter>): Promise<NovelCharacter> {
    const character = await this.findById(id);
    Object.assign(character, data);
    return this.characterRepository.save(character);
  }

  async remove(id: string): Promise<void> {
    const result = await this.characterRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`角色 ${id} 不存在`);
    }
  }
}
