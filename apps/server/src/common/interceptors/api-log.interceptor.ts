import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import * as fs from 'fs';
import * as path from 'path';
import { AppLogger } from '../logger/logger.service';

const MAX_VALUE_LENGTH = 2000;
const MAX_ARRAY_ITEMS = 50;
const MAX_DEPTH = 6;
const SENSITIVE_KEY_PATTERN = /api[_-]?key|password|passwd|secret|token|authorization/i;

/**
 * 脱敏 + 截断，避免日志泄露 API Key 等敏感信息或撑爆日志文件
 */
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

interface ApiLogEntry {
  time: string;
  method: string;
  url: string;
  query?: unknown;
  body?: unknown;
  durationMs?: number;
  status?: number;
  response?: unknown;
  error?: string;
}

/**
 * 全局 API 日志拦截器：打印并保存每次接口调用的请求参数与请求结果
 * 保存位置: <cwd>/logs/api-requests.log (JSON Lines)
 */
@Injectable()
export class ApiLogInterceptor implements NestInterceptor {
  private stream: fs.WriteStream | null = null;

  constructor(private readonly logger: AppLogger) {}

  private getStream(): fs.WriteStream {
    if (!this.stream) {
      const dir = path.join(process.cwd(), 'logs');
      fs.mkdirSync(dir, { recursive: true });
      this.stream = fs.createWriteStream(path.join(dir, 'api-requests.log'), { flags: 'a' });
      this.stream.on('error', (err) => {
        this.logger.error(`API log file write error: ${err.message}`, undefined, 'ApiLog');
        this.stream = null;
      });
    }
    return this.stream;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;
    const url: string = req.url;
    const query = req.query && Object.keys(req.query).length ? sanitize(req.query) : undefined;
    const body = req.body && Object.keys(req.body).length ? sanitize(req.body) : undefined;
    const start = Date.now();

    const base: ApiLogEntry = {
      time: new Date(start).toISOString(),
      method,
      url,
      query,
      body,
    };

    return next.handle().pipe(
      tap((data) => {
        const entry: ApiLogEntry = {
          ...base,
          durationMs: Date.now() - start,
          response: sanitize(data),
        };
        this.write(entry);
      }),
      catchError((err) => {
        const entry: ApiLogEntry = {
          ...base,
          durationMs: Date.now() - start,
          status: err?.status,
          error: err?.message || String(err),
        };
        this.write(entry);
        return throwError(() => err);
      }),
    );
  }

  private write(entry: ApiLogEntry): void {
    const reqPart = JSON.stringify({ query: entry.query, body: entry.body });
    const resPart = entry.error
      ? JSON.stringify({ status: entry.status, error: entry.error })
      : JSON.stringify(entry.response);

    this.logger.log(
      `API ${entry.method} ${entry.url} ${entry.durationMs}ms | req: ${reqPart} | res: ${resPart}`,
      'ApiLog',
    );

    try {
      this.getStream().write(JSON.stringify(entry) + '\n');
    } catch (err) {
      this.logger.error(`Failed to save API log: ${(err as Error).message}`, undefined, 'ApiLog');
    }
  }
}
