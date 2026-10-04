import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NovelCharacter } from './novel-character.entity';
import { NovelCharacterService } from './novel-character.service';
import { NovelCharacterController } from './novel-character.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NovelCharacter])],
  controllers: [NovelCharacterController],
  providers: [NovelCharacterService],
  exports: [NovelCharacterService],
})
export class NovelCharacterModule {}
