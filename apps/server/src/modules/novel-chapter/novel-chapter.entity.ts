import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Novel } from '../novel/novel.entity';
import { NovelOutline } from '../novel-outline/novel-outline.entity';
import { ChapterStatus, GenerationStatus } from '../../common/enums';

@Entity('novel_chapter')
@Index(['novelId', 'chapterNumber'], { unique: true })
export class NovelChapter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  novelId: string;

  @Column({ type: 'int' })
  chapterNumber: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'int', default: 0 })
  wordCount: number;

  @Column({ type: 'enum', enum: ChapterStatus, default: ChapterStatus.DRAFT })
  @Index()
  status: ChapterStatus;

  @Column({
    type: 'enum',
    enum: GenerationStatus,
    default: GenerationStatus.PENDING,
  })
  @Index()
  generationStatus: GenerationStatus;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  outlineId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Novel, (novel) => novel.chapters, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'novelId' })
  novel: Novel;

  @ManyToOne(() => NovelOutline, (outline) => outline.chapters, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'outlineId' })
  outline: NovelOutline;
}
