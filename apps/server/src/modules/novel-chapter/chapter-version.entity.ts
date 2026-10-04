import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { NovelChapter } from '../novel-chapter/novel-chapter.entity';

@Entity('chapter_version')
@Index(['chapterId', 'version'], { unique: true })
export class ChapterVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  chapterId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'int', default: 0 })
  wordCount: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  changeNote: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => NovelChapter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chapterId' })
  chapter: NovelChapter;
}
