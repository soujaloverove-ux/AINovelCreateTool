import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Novel } from '../novel/novel.entity';
import { NovelGenre } from './novel-genre.entity';

@Entity('novel_genre_map')
@Index(['novelId', 'genreId'], { unique: true })
export class NovelGenreMap {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  novelId: string;

  @Column({ type: 'uuid' })
  @Index()
  genreId: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Novel, (novel) => novel.genreMaps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'novelId' })
  novel: Novel;

  @ManyToOne(() => NovelGenre, (genre) => genre.novelMaps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'genreId' })
  genre: NovelGenre;
}
