import { get, post } from './request';
import type { ApiResponse, AiTask, NovelChapter } from '@/types';

export interface GenerationProgress {
  stage:
    | 'preparing'
    | 'planning'
    | 'generating'
    | 'reviewing'
    | 'rewriting'
    | 'saving'
    | 'complete'
    | 'error';
  message: string;
  progress: number;
  chapterNumber?: number;
  totalChapters?: number;
  chapterId?: string;
}

export interface ChapterVersion {
  id: string;
  chapterId: string;
  version: number;
  title: string;
  content: string;
  wordCount: number;
  changeNote?: string;
  createdAt: string;
}

export type TextOperation = 'continue' | 'rewrite' | 'expand' | 'shorten' | 'polish';

export const chapterGenerationApi = {
  generateChapter: (novelId: string, chapterNumber: number) =>
    post<ApiResponse<{ taskId: string; message: string }>>(
      `/api/chapter-generation/${novelId}/chapters/generate`,
      { chapterNumber },
    ),

  batchGenerate: (novelId: string, startChapter: number, endChapter: number) =>
    post<ApiResponse<{ message: string }>>(
      `/api/chapter-generation/${novelId}/chapters/generate-batch`,
      { startChapter, endChapter },
    ),

  rewriteChapter: (novelId: string, chapterId: string, reviewFeedback: string) =>
    post<ApiResponse<{ content: string; wordCount: number }>>(
      `/api/chapter-generation/${novelId}/chapters/${chapterId}/rewrite`,
      { reviewFeedback },
    ),

  continueChapter: (novelId: string, chapterId: string, targetWordCount?: number) =>
    post<ApiResponse<{ content: string; wordCount: number }>>(
      `/api/chapter-generation/${novelId}/chapters/${chapterId}/continue`,
      { targetWordCount },
    ),

  expandChapter: (novelId: string, chapterId: string, targetWordCount: number) =>
    post<ApiResponse<{ content: string; wordCount: number }>>(
      `/api/chapter-generation/${novelId}/chapters/${chapterId}/expand`,
      { targetWordCount },
    ),

  shortenChapter: (novelId: string, chapterId: string, targetWordCount: number) =>
    post<ApiResponse<{ content: string; wordCount: number }>>(
      `/api/chapter-generation/${novelId}/chapters/${chapterId}/shorten`,
      { targetWordCount },
    ),

  polishChapter: (novelId: string, chapterId: string) =>
    post<ApiResponse<{ content: string; wordCount: number }>>(
      `/api/chapter-generation/${novelId}/chapters/${chapterId}/polish`,
    ),

  processTextSelection: (
    novelId: string,
    selectedText: string,
    operation: TextOperation,
    context?: { before?: string; after?: string },
  ) =>
    post<ApiResponse<{ result: string }>>(`/api/chapter-generation/${novelId}/text/process`, {
      selectedText,
      operation,
      context,
    }),

  autoSave: (
    novelId: string,
    chapterId: string,
    data: {
      title?: string;
      content: string;
      wordCount: number;
      createVersion?: boolean;
    },
  ) =>
    post<ApiResponse<NovelChapter>>(
      `/api/chapter-generation/${novelId}/chapters/${chapterId}/autosave`,
      data,
    ),

  getVersions: (novelId: string, chapterId: string) =>
    get<ApiResponse<ChapterVersion[]>>(
      `/api/chapter-generation/${novelId}/chapters/${chapterId}/versions`,
    ),

  restoreVersion: (novelId: string, chapterId: string, versionId: string) =>
    post<ApiResponse<NovelChapter>>(
      `/api/chapter-generation/${novelId}/chapters/${chapterId}/versions/${versionId}/restore`,
    ),

  saveReadingPosition: (novelId: string, chapterId: string) =>
    post<ApiResponse<{ success: boolean }>>(`/api/chapter-generation/${novelId}/reading-position`, {
      chapterId,
    }),

  getReadingPosition: (novelId: string) =>
    get<ApiResponse<{ chapterId: string | null }>>(
      `/api/chapter-generation/${novelId}/reading-position`,
    ),

  pauseTask: (taskId: string) =>
    post<ApiResponse<{ message: string }>>(`/api/chapter-generation/tasks/${taskId}/pause`),

  resumeTask: (taskId: string) =>
    post<ApiResponse<{ message: string }>>(`/api/chapter-generation/tasks/${taskId}/resume`),

  cancelTask: (taskId: string, novelId?: string) =>
    post<ApiResponse<{ message: string }>>(`/api/chapter-generation/tasks/${taskId}/cancel`, {
      novelId,
    }),

  getTasks: (novelId: string) =>
    get<ApiResponse<AiTask[]>>(`/api/chapter-generation/${novelId}/chapters/tasks`),

  createProgressStream: (novelId: string): EventSource => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    return new EventSource(
      `${baseUrl}/api/chapter-generation/${novelId}/chapters/generate-progress`,
    );
  },

  startContinuation: (
    novelId: string,
    options: {
      mode: 'nextChapter' | 'count' | 'toChapter' | 'toWordCount';
      count?: number;
      toChapter?: number;
      toWordCount?: number;
    },
  ) =>
    post<ApiResponse<{ parentTaskId: string; message: string }>>(
      `/api/chapter-generation/${novelId}/continuation/start`,
      options,
    ),

  getContinuationStatus: (novelId: string) =>
    get<ApiResponse<{ active: boolean; task?: AiTask; children?: AiTask[] }>>(
      `/api/chapter-generation/${novelId}/continuation/status`,
    ),
};

export const taskCenterApi = {
  listTasks: (params?: { novelId?: string; status?: string; taskType?: string }) => {
    const query = new URLSearchParams();
    if (params?.novelId) query.set('novelId', params.novelId);
    if (params?.status) query.set('status', params.status);
    if (params?.taskType) query.set('taskType', params.taskType);
    const qs = query.toString();
    return get<ApiResponse<AiTask[]>>(`/api/tasks${qs ? `?${qs}` : ''}`);
  },

  getTaskDetail: (id: string) =>
    get<ApiResponse<AiTask & { children: AiTask[] }>>(`/api/tasks/${id}`),

  pauseTask: (id: string) => post<ApiResponse<{ message: string }>>(`/api/tasks/${id}/pause`),

  resumeTask: (id: string) => post<ApiResponse<{ message: string }>>(`/api/tasks/${id}/resume`),

  cancelTask: (id: string) => post<ApiResponse<{ message: string }>>(`/api/tasks/${id}/cancel`),

  retryChapter: (id: string, chapterNumber: number) =>
    post<ApiResponse<{ message: string }>>(`/api/tasks/${id}/retry`, { chapterNumber }),

  getActiveTask: (novelId: string) =>
    get<ApiResponse<AiTask | null>>(`/api/tasks/novel/${novelId}/active`),
};
