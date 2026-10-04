import { get, post, put, del, patch } from './request';
import type { PromptTemplate, ApiResponse } from '@/types';

export const promptApi = {
  list(type?: string, enabled?: boolean) {
    const params: Record<string, string> = {};
    if (type) params.type = type;
    if (enabled !== undefined) params.enabled = String(enabled);
    return get<ApiResponse<PromptTemplate[]>>('/api/prompts', { params });
  },

  getTypes() {
    return get<ApiResponse<string[]>>('/api/prompts/types');
  },

  getById(id: string) {
    return get<ApiResponse<PromptTemplate>>(`/api/prompts/${id}`);
  },

  create(data: {
    name: string;
    type: string;
    content: string;
    variables?: Record<string, string>;
    version?: string;
    enabled?: boolean;
  }) {
    return post<ApiResponse<PromptTemplate>>('/api/prompts', data);
  },

  update(
    id: string,
    data: {
      name?: string;
      type?: string;
      content?: string;
      variables?: Record<string, string>;
      version?: string;
      enabled?: boolean;
    },
  ) {
    return put<ApiResponse<PromptTemplate>>(`/api/prompts/${id}`, data);
  },

  copy(id: string) {
    return post<ApiResponse<PromptTemplate>>(`/api/prompts/${id}/copy`);
  },

  createNewVersion(
    id: string,
    data: { content: string; variables?: Record<string, string>; version?: string },
  ) {
    return post<ApiResponse<PromptTemplate>>(`/api/prompts/${id}/new-version`, data);
  },

  toggle(id: string) {
    return patch<ApiResponse<PromptTemplate>>(`/api/prompts/${id}/toggle`);
  },

  delete(id: string) {
    return del<ApiResponse<void>>(`/api/prompts/${id}`);
  },
};
