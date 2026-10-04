export enum NovelStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  PAUSED = 'paused',
}

export enum ChapterStatus {
  DRAFT = 'draft',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  PUBLISHED = 'published',
}

export enum GenerationStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum OutlineType {
  GENERAL = 'general',
  VOLUME = 'volume',
  ARC = 'arc',
  CHAPTER_PLAN = 'chapter_plan',
}

export enum TaskType {
  CREATE_NOVEL = 'create_novel',
  GENERATE_TITLE = 'generate_title',
  GENERATE_DESCRIPTION = 'generate_description',
  GENERATE_CHARACTER = 'generate_character',
  GENERATE_WORLD_SETTING = 'generate_world_setting',
  GENERATE_OUTLINE = 'generate_outline',
  GENERATE_CHAPTER_PLAN = 'generate_chapter_plan',
  GENERATE_CHAPTER = 'generate_chapter',
  GENERATE_CHAPTERS = 'generate_chapters',
  CONTINUE_NOVEL = 'continue_novel',
  REWRITE_CHAPTER = 'rewrite_chapter',
  CONTINUE_CHAPTER = 'continue_chapter',
  EXPAND_CHAPTER = 'expand_chapter',
  SHORTEN_CHAPTER = 'shorten_chapter',
  REVIEW_CHAPTER = 'review_chapter',
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum CharacterRoleType {
  PROTAGONIST = 'protagonist',
  SUPPORTING = 'supporting',
  ANTAGONIST = 'antagonist',
  MINOR = 'minor',
}
