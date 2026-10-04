import { get, post, put, del, patch } from './request';
import type { ApiResponse, AiStatus } from '@/types';

export interface AiTestResult {
  ok: boolean;
  model: string;
  latency?: number;
  error?: string;
}

export interface ProviderInfo {
  name: string;
  label: string;
  model: string;
  configured: boolean;
}

export interface ProviderConfig {
  id: string;
  name: string;
  label: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  priority: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProviderDto {
  name: string;
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled?: boolean;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateProviderDto {
  label?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  enabled?: boolean;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export const aiApi = {
  getStatus: () => get<ApiResponse<AiStatus>>('/api/ai/status'),

  testConnection: (provider?: string) =>
    post<ApiResponse<AiTestResult>>('/api/ai/test', { provider }),

  getProviders: () =>
    get<ApiResponse<{ providers: ProviderInfo[]; defaultProvider: string }>>('/api/ai/providers'),

  // Provider Config Management
  getAllProviderConfigs: () =>
    get<ApiResponse<{ providers: ProviderConfig[] }>>('/api/ai/providers'),

  getProviderConfig: (id: string) =>
    get<ApiResponse<ProviderConfig>>(`/api/ai/providers/${id}`),

  createProviderConfig: (dto: CreateProviderDto) =>
    post<ApiResponse<ProviderConfig>>('/api/ai/providers', dto),

  updateProviderConfig: (id: string, dto: UpdateProviderDto) =>
    put<ApiResponse<ProviderConfig>>(`/api/ai/providers/${id}`, dto),

  deleteProviderConfig: (id: string) =>
    del<ApiResponse<void>>(`/api/ai/providers/${id}`),

  toggleProviderConfig: (id: string) =>
    patch<ApiResponse<ProviderConfig>>(`/api/ai/providers/${id}/toggle`, {}),

  testProviderConnection: (id: string) =>
    post<ApiResponse<AiTestResult>>(`/api/ai/providers/${id}/test`, {}),
};
