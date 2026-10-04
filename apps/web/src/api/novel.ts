import { get, post, put, del } from './request';
import type {
  ApiResponse,
  Novel,
  NovelGenre,
  NovelCharacter,
  NovelOutline,
  NovelChapter,
} from '@/types';

export const novelApi = {
  findAll: () => get<ApiResponse<Novel[]>>('/api/novels'),

  findById: (id: string) => get<ApiResponse<Novel>>(`/api/novels/${id}`),

  create: (data: Partial<Novel>) => post<ApiResponse<Novel>>('/api/novels', data),

  update: (id: string, data: Partial<Novel>) => put<ApiResponse<Novel>>(`/api/novels/${id}`, data),

  remove: (id: string) => del<ApiResponse<void>>(`/api/novels/${id}`),
};

export const genreApi = {
  findAll: () => get<ApiResponse<NovelGenre[]>>('/api/genres'),

  assignToNovel: (novelId: string, genreIds: string[]) =>
    post<ApiResponse<void>>(`/api/genres/assign`, { novelId, genreIds }),
};

export const characterApi = {
  findByNovelId: (novelId: string) =>
    get<ApiResponse<NovelCharacter[]>>(`/api/novels/${novelId}/characters`),

  create: (novelId: string, data: Partial<NovelCharacter>) =>
    post<ApiResponse<NovelCharacter>>(`/api/novels/${novelId}/characters`, data),

  update: (novelId: string, id: string, data: Partial<NovelCharacter>) =>
    put<ApiResponse<NovelCharacter>>(`/api/novels/${novelId}/characters/${id}`, data),

  remove: (novelId: string, id: string) =>
    del<ApiResponse<void>>(`/api/novels/${novelId}/characters/${id}`),
};

export const outlineApi = {
  findByNovelId: (novelId: string) =>
    get<ApiResponse<NovelOutline[]>>(`/api/novels/${novelId}/outlines`),

  findTree: (novelId: string) =>
    get<ApiResponse<NovelOutline[]>>(`/api/novels/${novelId}/outlines/tree`),

  create: (novelId: string, data: Partial<NovelOutline>) =>
    post<ApiResponse<NovelOutline>>(`/api/novels/${novelId}/outlines`, data),

  update: (novelId: string, id: string, data: Partial<NovelOutline>) =>
    put<ApiResponse<NovelOutline>>(`/api/novels/${novelId}/outlines/${id}`, data),

  remove: (novelId: string, id: string) =>
    del<ApiResponse<void>>(`/api/novels/${novelId}/outlines/${id}`),
};

export const chapterApi = {
  findByNovelId: (novelId: string) =>
    get<ApiResponse<NovelChapter[]>>(`/api/novels/${novelId}/chapters`),

  findById: (novelId: string, id: string) =>
    get<ApiResponse<NovelChapter>>(`/api/novels/${novelId}/chapters/${id}`),

  create: (novelId: string, data: Partial<NovelChapter>) =>
    post<ApiResponse<NovelChapter>>(`/api/novels/${novelId}/chapters`, data),

  update: (novelId: string, id: string, data: Partial<NovelChapter>) =>
    put<ApiResponse<NovelChapter>>(`/api/novels/${novelId}/chapters/${id}`, data),

  remove: (novelId: string, id: string) =>
    del<ApiResponse<void>>(`/api/novels/${novelId}/chapters/${id}`),
};
