export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
  timestamp: string;
}

export interface Novel {
  id: string;
  title: string;
  description?: string;
  cover?: string;
  status: NovelStatus;
  targetWordCount: number;
  chapterCount: number;
  currentChapter: number;
  writingStyle?: string;
  pointOfView?: string;
  targetAudience?: string;
  worldSetting?: string;
  protagonistSetting?: string;
  powerSystem?: string;
  coreConflict?: string;
  mainStoryDirection?: string;
  creationConfig?: Record<string, unknown>;
  readingPosition?: string;
  createdAt: string;
  updatedAt: string;
}

export type NovelStatus = 'draft' | 'in_progress' | 'completed' | 'paused';

export interface NovelGenre {
  id: string;
  name: string;
  label: string;
  sortOrder: number;
}

export interface NovelGenreMap {
  id: string;
  novelId: string;
  genreId: string;
  genre?: NovelGenre;
}

export interface NovelCharacter {
  id: string;
  novelId: string;
  name: string;
  roleType: CharacterRoleType;
  gender?: string;
  age?: string;
  identity?: string;
  personality?: string;
  appearance?: string;
  background?: string;
  ability?: string;
  relationship?: string;
  goals?: string;
  secrets?: string;
  notes?: string;
  sortOrder: number;
}

export type CharacterRoleType = 'protagonist' | 'supporting' | 'antagonist' | 'minor';

export interface NovelOutline {
  id: string;
  novelId: string;
  type: OutlineType;
  title: string;
  summary?: string;
  content?: string;
  sortOrder: number;
  parentId?: string;
  children?: NovelOutline[];
}

export type OutlineType = 'general' | 'volume' | 'arc' | 'chapter_plan';

export interface NovelChapter {
  id: string;
  novelId: string;
  chapterNumber: number;
  title: string;
  summary?: string;
  content?: string;
  wordCount: number;
  status: ChapterStatus;
  generationStatus: GenerationStatus;
  outlineId?: string;
}

export type ChapterStatus = 'draft' | 'generating' | 'completed' | 'published';
export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface AiTask {
  id: string;
  taskType: TaskType;
  status: TaskStatus;
  novelId: string;
  chapterId?: string;
  outlineId?: string;
  parentId?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  progress: number;
  maxRetries: number;
  retryCount: number;
  chapterNumber?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  children?: AiTask[];
}

export type TaskType =
  | 'create_novel'
  | 'generate_title'
  | 'generate_description'
  | 'generate_character'
  | 'generate_world_setting'
  | 'generate_outline'
  | 'generate_chapter_plan'
  | 'generate_chapter'
  | 'generate_chapters'
  | 'continue_novel'
  | 'rewrite_chapter'
  | 'continue_chapter'
  | 'expand_chapter'
  | 'shorten_chapter'
  | 'review_chapter';

export type TaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface AiStatus {
  configured: boolean;
  model: string;
  status: 'ready' | 'unconfigured';
}

export interface PromptTemplate {
  id: string;
  name: string;
  type: string;
  content: string;
  variables?: Record<string, string>;
  version: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
