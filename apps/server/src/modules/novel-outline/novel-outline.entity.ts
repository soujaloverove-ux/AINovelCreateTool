import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Novel } from '../novel/novel.entity';
import { NovelChapter } from '../novel-chapter/novel-chapter.entity';
import { OutlineType } from '../../common/enums';

@Entity('novel_outline')
@Index(['novelId', 'sortOrder'])
export class NovelOutline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  novelId: string;

  @Column({ type: 'enum', enum: OutlineType })
  @Index()
  type: OutlineType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  parentId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Novel, (novel) => novel.outlines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'novelId' })
  novel: Novel;

  @ManyToOne(() => NovelOutline, (outline) => outline.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentId' })
  parent: NovelOutline;

  @OneToMany(() => NovelOutline, (outline) => outline.parent)
  children: NovelOutline[];

  @OneToMany(() => NovelChapter, (chapter) => chapter.outline)
  chapters: NovelChapter[];
}
