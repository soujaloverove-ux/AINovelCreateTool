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
import { NovelChapter } from '../novel-chapter/novel-chapter.entity';
import { NovelOutline } from '../novel-outline/novel-outline.entity';
import { TaskType, TaskStatus } from '../../common/enums';

@Entity('ai_task')
@Index(['novelId', 'status'])
@Index(['status', 'createdAt'])
export class AiTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TaskType })
  @Index()
  taskType: TaskType;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  @Index()
  status: TaskStatus;

  @Column({ type: 'uuid' })
  @Index()
  novelId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  chapterId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  outlineId: string;

  @Column({ type: 'jsonb', nullable: true })
  input: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ type: 'jsonb', nullable: true })
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  @Column({ type: 'real', default: 0 })
  progress: number;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  parentId: string;

  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'int', nullable: true })
  chapterNumber: number;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Novel, (novel) => novel.aiTasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'novelId' })
  novel: Novel;

  @ManyToOne(() => NovelChapter, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chapterId' })
  chapter: NovelChapter;

  @ManyToOne(() => NovelOutline, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'outlineId' })
  outline: NovelOutline;
}
