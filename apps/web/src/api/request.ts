import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '';

const LOG_STORAGE_KEY = 'qoder-api-logs';
const MAX_LOG_ENTRIES = 200;
const MAX_VALUE_LENGTH = 2000;
const MAX_ARRAY_ITEMS = 50;
const MAX_DEPTH = 6;
const SENSITIVE_KEY_PATTERN = /api[_-]?key|password|passwd|secret|token|authorization/i;

interface ApiLogEntry {
  time: string;
  type: 'request' | 'response' | 'error';
  method: string;
  url: string;
  params?: unknown;
  body?: unknown;
  status?: number;
  data?: unknown;
  error?: string;
}

function sanitize(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > MAX_DEPTH) return '[max-depth]';
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_ITEMS).map((v) => sanitize(v, depth + 1));
    if (value.length > MAX_ARRAY_ITEMS) {
      items.push(`...[${value.length - MAX_ARRAY_ITEMS} more]`);
    }
    return items;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = SENSITIVE_KEY_PATTERN.test(k) ? '******' : sanitize(v, depth + 1);
    }
    return result;
  }
  if (typeof value === 'string' && value.length > MAX_VALUE_LENGTH) {
    return `${value.slice(0, MAX_VALUE_LENGTH)}...[truncated ${value.length - MAX_VALUE_LENGTH} chars]`;
  }
  return value;
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function saveLog(entry: ApiLogEntry): void {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    const logs: ApiLogEntry[] = raw ? JSON.parse(raw) : [];
    logs.push(entry);
    while (logs.length > MAX_LOG_ENTRIES) logs.shift();
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // localStorage 满或不可用时忽略，不影响请求
  }
}

export function getApiLogs(): ApiLogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearApiLogs(): void {
  try {
    localStorage.removeItem(LOG_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function fullUrl(config: AxiosRequestConfig): string {
  return `${config.baseURL || ''}${config.url || ''}`;
}

const instance: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

instance.interceptors.request.use(
  (config) => {
    const entry: ApiLogEntry = {
      time: new Date().toISOString(),
      type: 'request',
      method: (config.method || 'get').toUpperCase(),
      url: fullUrl(config),
      params: config.params ? sanitize(config.params) : undefined,
      body: config.data
        ? sanitize(typeof config.data === 'string' ? tryParseJson(config.data) : config.data)
        : undefined,
    };
    console.log('[API REQ]', entry.method, entry.url, entry.params ?? '', entry.body ?? '');
    saveLog(entry);
    return config;
  },
  (error) => Promise.reject(error),
);

instance.interceptors.response.use(
  (response: AxiosResponse) => {
    const entry: ApiLogEntry = {
      time: new Date().toISOString(),
      type: 'response',
      method: (response.config?.method || 'get').toUpperCase(),
      url: fullUrl(response.config || {}),
      status: response.status,
      data: sanitize(response.data),
    };
    console.log('[API RES]', entry.status, entry.url, entry.data);
    saveLog(entry);
    return response.data;
  },
  (error) => {
    const config = error.config || {};
    const entry: ApiLogEntry = {
      time: new Date().toISOString(),
      type: 'error',
      method: (config.method || 'get').toUpperCase(),
      url: fullUrl(config),
      status: error.response?.status,
      error: error.response?.data?.message || error.message || '请求失败',
    };
    console.error('[API ERR]', entry.status, entry.url, entry.error);
    saveLog(entry);
    const message = entry.error;
    console.error('[API Error]', message);
    return Promise.reject(error);
  },
);

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return instance.get(url, config) as Promise<T>;
}

export async function post<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  return instance.post(url, data, config) as Promise<T>;
}

export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return instance.put(url, data, config) as Promise<T>;
}

export async function patch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  return instance.patch(url, data, config) as Promise<T>;
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return instance.delete(url, config) as Promise<T>;
}

export default instance;
