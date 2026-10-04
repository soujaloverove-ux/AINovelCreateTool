import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { NovelGenreMap } from '../novel-genre/novel-genre-map.entity';
import { NovelCharacter } from '../novel-character/novel-character.entity';
import { NovelOutline } from '../novel-outline/novel-outline.entity';
import { NovelChapter } from '../novel-chapter/novel-chapter.entity';
import { AiTask } from '../ai-task/ai-task.entity';
import { NovelStatus } from '../../common/enums';

@Entity('novel')
export class Novel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cover: string;

  @Column({ type: 'enum', enum: NovelStatus, default: NovelStatus.DRAFT })
  @Index()
  status: NovelStatus;

  @Column({ type: 'int', default: 0 })
  targetWordCount: number;

  @Column({ type: 'int', default: 0 })
  chapterCount: number;

  @Column({ type: 'int', default: 0 })
  currentChapter: number;

  @Column({ type: 'text', nullable: true })
  writingStyle: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  pointOfView: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  targetAudience: string;

  @Column({ type: 'text', nullable: true })
  worldSetting: string;

  @Column({ type: 'text', nullable: true })
  protagonistSetting: string;

  @Column({ type: 'text', nullable: true })
  powerSystem: string;

  @Column({ type: 'text', nullable: true })
  coreConflict: string;

  @Column({ type: 'text', nullable: true })
  mainStoryDirection: string;

  @Column({ type: 'jsonb', nullable: true })
  creationConfig: Record<string, unknown>;

  @Column({ type: 'uuid', nullable: true })
  readingPosition: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => NovelGenreMap, (map) => map.novel)
  genreMaps: NovelGenreMap[];

  @OneToMany(() => NovelCharacter, (character) => character.novel)
  characters: NovelCharacter[];

  @OneToMany(() => NovelOutline, (outline) => outline.novel)
  outlines: NovelOutline[];

  @OneToMany(() => NovelChapter, (chapter) => chapter.novel)
  chapters: NovelChapter[];

  @OneToMany(() => AiTask, (task) => task.novel)
  aiTasks: AiTask[];
}
