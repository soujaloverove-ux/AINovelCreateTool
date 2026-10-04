import { get, post } from './request';
import type { ApiResponse, NovelGenre } from '@/types';
import axios from 'axios';
import { parseSseChunk } from './sse';

export interface TitleCandidate {
  title: string;
  description: string;
}

export interface WorldSetting {
  background: string;
  geography: string;
  socialStructure: string;
  factions: string;
  era: string;
  specialRules: string;
}

export interface Protagonist {
  name: string;
  gender: string;
  age: string;
  identity: string;
  personality: string;
  appearance: string;
  ability: string;
  background: string;
  goals: string;
  goldenFinger: string;
}

export interface CharacterDraft {
  name: string;
  identity: string;
  personality: string;
  ability: string;
  background: string;
  relationship: string;
  goals: string;
  roleType: string;
}

export interface PlotDirection {
  mainGoal: string;
  coreConflict: string;
  storyDirection: string;
  highlights: string;
  upgradeDirection: string;
  romanceLine: string;
  importantPlot: string;
  forbiddenContent: string;
}

export interface ChapterPlanItem {
  chapterNumber: number;
  title: string;
  summary: string;
  coreEvent: string;
  conflict: string;
  highlight: string;
  hook: string;
  keyEvents?: string[] | string;
  characters?: string[] | string;
  location?: string;
}

export interface ArcOutline {
  arcNumber: number;
  title: string;
  summary: string;
  chapters: ChapterPlanItem[];
}

export interface VolumeOutline {
  volumeNumber: number;
  title: string;
  summary: string;
  arcs: ArcOutline[];
}

export interface OutlineResult {
  volumes: VolumeOutline[];
}

export interface SSEEvent {
  event: string;
  data: unknown;
}

const AI_TIMEOUT = 300_000;

export const creationApi = {
  generateTitles: (params: {
    mainGenre: string;
    subGenres: string[];
    keywords?: string[];
    provider?: string;
  }) =>
    post<ApiResponse<{ candidates: TitleCandidate[] }>>(
      '/api/novels/creation/generate-titles',
      params,
      { timeout: AI_TIMEOUT },
    ),

  generateWorldSetting: (params: {
    title?: string;
    description?: string;
    mainGenre: string;
    subGenres: string[];
    provider?: string;
  }) =>
    post<ApiResponse<{ worldSetting: WorldSetting }>>(
      '/api/novels/creation/generate-world-setting',
      params,
      { timeout: AI_TIMEOUT },
    ),

  generateProtagonist: (params: {
    title?: string;
    description?: string;
    mainGenre: string;
    subGenres: string[];
    worldSetting?: Partial<WorldSetting>;
    provider?: string;
  }) =>
    post<ApiResponse<{ protagonist: Protagonist }>>(
      '/api/novels/creation/generate-protagonist',
      params,
      { timeout: AI_TIMEOUT },
    ),

  generateCharacters: (params: {
    title?: string;
    mainGenre: string;
    subGenres: string[];
    protagonist?: Partial<Protagonist>;
    count?: number;
    provider?: string;
  }) =>
    post<ApiResponse<{ characters: CharacterDraft[] }>>(
      '/api/novels/creation/generate-characters',
      params,
      { timeout: AI_TIMEOUT },
    ),

  generateCoreSetting: (params: {
    mainGenre: string;
    subGenres: string[];
    worldSetting?: Partial<WorldSetting>;
    provider?: string;
  }) =>
    post<ApiResponse<{ coreSetting: Record<string, unknown> }>>(
      '/api/novels/creation/generate-core-setting',
      params,
      { timeout: AI_TIMEOUT },
    ),

  generatePlotDirection: (params: {
    title?: string;
    description?: string;
    mainGenre: string;
    subGenres: string[];
    protagonist?: Partial<Protagonist>;
    provider?: string;
  }) =>
    post<ApiResponse<{ plotDirection: PlotDirection }>>(
      '/api/novels/creation/generate-plot-direction',
      params,
      { timeout: AI_TIMEOUT },
    ),

  generateOutlineStream: (
    novelId: string,
    params: Record<string, unknown>,
    onEvent: (event: SSEEvent) => void,
    onError: (error: Error) => void,
  ): AbortController => {
    const controller = new AbortController();

    (async () => {
      try {
        const response = await axios.post(
          `/api/novels/creation/${novelId}/generate-outline-stream`,
          params,
          {
            signal: controller.signal,
            responseType: 'text',
            headers: { Accept: 'text/event-stream' },
            timeout: AI_TIMEOUT,
          },
        );

        const text: string = response.data;
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              onEvent(parsed);
            } catch {
              // skip malformed lines
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          onError(err as Error);
        }
      }
    })();

    return controller;
  },

  generateChapterPlan: (
    novelId: string,
    params: {
      outline?: string;
      chapterCount?: number;
      title?: string;
      mainGenre?: string;
      provider?: string;
    },
  ) =>
    post<ApiResponse<{ chapters: ChapterPlanItem[] }>>(
      `/api/novels/creation/${novelId}/generate-chapter-plan`,
      params,
      { timeout: AI_TIMEOUT },
    ),

  generateChapterPlanStream: (
    novelId: string,
    params: {
      outline?: string | OutlineResult;
      chapterCount?: number;
      title?: string;
      mainGenre?: string;
      subGenres?: string[];
      writingStyle?: string;
      worldSetting?: WorldSetting;
      protagonist?: Protagonist;
      characters?: CharacterDraft[];
      coreSetting?: Record<string, unknown>;
      plotDirection?: PlotDirection;
      provider?: string;
    },
    onEvent: (event: SSEEvent) => void,
    onError: (error: Error) => void,
  ): AbortController => {
    const controller = new AbortController();

    (async () => {
      try {
        const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
        const response = await fetch(
          `${apiBaseUrl}/api/novels/creation/${novelId}/generate-chapter-plan-stream`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'text/event-stream',
            },
            body: JSON.stringify(params),
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          const body = await response.text();
          let message = body || `请求失败 (${response.status})`;
          try {
            const parsed = JSON.parse(body) as { message?: string };
            message = parsed.message || message;
          } catch {
            // 使用原始响应文本。
          }
          throw new Error(message);
        }

        if (!response.body) {
          throw new Error('浏览器不支持读取章节规划进度');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          const parsed = parseSseChunk<SSEEvent>(
            buffer,
            done ? decoder.decode() + '\n\n' : decoder.decode(value, { stream: true }),
          );
          buffer = parsed.buffer;
          parsed.events.forEach(onEvent);
          if (done) break;
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          onError(error as Error);
        }
      }
    })();

    return controller;
  },

  regenerateVolume: (
    novelId: string,
    params: {
      volumeNumber: number;
      title: string;
      mainGenre: string;
      subGenres?: string[];
      worldSetting?: Record<string, string>;
      protagonist?: Record<string, string>;
      characters?: Array<Record<string, string>>;
      coreSetting?: Record<string, unknown>;
      plotDirection?: Record<string, string>;
      existingOutline?: string;
      currentVolume?: string;
      provider?: string;
    },
  ) =>
    post<ApiResponse<{ preview: VolumeOutline }>>(
      `/api/novels/creation/${novelId}/regenerate-volume`,
      params,
      { timeout: AI_TIMEOUT },
    ),

  regenerateArcChapters: (
    novelId: string,
    params: {
      volumeNumber: number;
      arcNumber: number;
      title: string;
      mainGenre: string;
      subGenres?: string[];
      worldSetting?: Record<string, string>;
      protagonist?: Record<string, string>;
      characters?: Array<Record<string, string>>;
      coreSetting?: Record<string, unknown>;
      plotDirection?: Record<string, string>;
      arcTitle?: string;
      arcSummary?: string;
      provider?: string;
    },
  ) =>
    post<
      ApiResponse<{
        preview: { volumeNumber: number; arcNumber: number; chapters: ChapterPlanItem[] };
      }>
    >(`/api/novels/creation/${novelId}/regenerate-arc-chapters`, params, {
      timeout: AI_TIMEOUT,
    }),

  finalizeNovel: (novelId: string, data: Record<string, unknown>) =>
    post<ApiResponse<{ id: string }>>(`/api/novels/creation/${novelId}/finalize`, data),

  createFromWizard: (data: Record<string, unknown>) =>
    post<ApiResponse<{ id: string }>>('/api/novels/wizard/create', data),
};

export const genreApi = {
  findAll: () => get<ApiResponse<NovelGenre[]>>('/api/genres'),
};
