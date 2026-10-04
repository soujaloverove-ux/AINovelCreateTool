import { IsString, IsOptional, IsBoolean, IsInt, IsObject, Min } from 'class-validator';

/**
 * 创建 Provider 配置请求
 */
export class CreateProviderDto {
  @IsString()
  name: string;

  @IsString()
  label: string;

  @IsString()
  baseUrl: string;

  /** 明文 API Key (服务端加密后存储) */
  @IsString()
  apiKey: string;

  @IsString()
  model: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * 更新 Provider 配置请求
 */
export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  /** 如果提供则重新加密存储 */
  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * 测试连接响应
 */
export interface TestConnectionResult {
  ok: boolean;
  latency?: number;
  error?: string;
  model?: string;
}
