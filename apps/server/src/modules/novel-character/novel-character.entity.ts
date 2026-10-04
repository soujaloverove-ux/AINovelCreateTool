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
import { CharacterRoleType } from '../../common/enums';

@Entity('novel_character')
@Index(['novelId', 'sortOrder'])
export class NovelCharacter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  novelId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'enum', enum: CharacterRoleType, default: CharacterRoleType.MINOR })
  roleType: CharacterRoleType;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  age: string;

  @Column({ type: 'text', nullable: true })
  identity: string;

  @Column({ type: 'text', nullable: true })
  personality: string;

  @Column({ type: 'text', nullable: true })
  appearance: string;

  @Column({ type: 'text', nullable: true })
  background: string;

  @Column({ type: 'text', nullable: true })
  ability: string;

  @Column({ type: 'text', nullable: true })
  relationship: string;

  @Column({ type: 'text', nullable: true })
  goals: string;

  @Column({ type: 'text', nullable: true })
  secrets: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Novel, (novel) => novel.characters, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'novelId' })
  novel: Novel;
}
