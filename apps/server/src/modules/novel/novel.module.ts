import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Novel } from './novel.entity';
import { NovelService } from './novel.service';
import { NovelController } from './novel.controller';
import { NovelGenreModule } from '../novel-genre/novel-genre.module';

@Module({
  imports: [TypeOrmModule.forFeature([Novel]), forwardRef(() => NovelGenreModule)],
  controllers: [NovelController],
  providers: [NovelService],
  exports: [NovelService],
})
export class NovelModule {}
