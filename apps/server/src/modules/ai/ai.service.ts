import { Injectable, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from '../../common/logger/logger.service';
import { AiTaskService } from '../ai-task/ai-task.service';
import { TaskStatus, TaskType } from '../../common/enums';
import { IAiProvider, AiRequestOptions, AiResponse, StreamChunk, TestConnectionResult, ChatMessage } from './providers/provider.interface';
import { ProviderFactory, ProviderConfigData } from './providers/provider.factory';
import { AiProviderService } from './ai-provider.service';
import { EncryptionService } from '../encryption/encryption.service';

// Re-export types for backward compatibility with controllers
export type { ChatMessage, AiRequestOptions, AiResponse, StreamChunk };

export interface ProviderInfo {
  name: string;
  label: string;
  model: string;
  configured: boolean;
}

const DEFAULT_TIMEOUT = 300_000;
const DEFAULT_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

@Injectable()
export class AiService implements OnModuleInit {
  private providers: Map<string, IAiProvider> = new Map();
  private defaultProviderName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
    private readonly aiTaskService: AiTaskService,
    private readonly providerFactory: ProviderFactory,
    private readonly aiProviderService: AiProviderService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.loadProvidersFromDatabase();
    this.logger.log(
      `AI providers initialized: ${Array.from(this.providers.keys()).join(', ')}`,
      'AiService',
    );
  }

  /**
   * 配置变更后热加载 Provider (无需重启服务)
   */
  async reloadProviders(): Promise<void> {
    this.providers.clear();
    await this.loadProvidersFromDatabase();
    this.logger.log(
      `AI providers reloaded: ${Array.from(this.providers.keys()).join(', ')}`,
      'AiService',
    );
  }

  /**
   * 从数据库加载启用的 Provider 配置
   * 解密 API Key 并注册到 providers Map
   */
  private async loadProvidersFromDatabase(): Promise<void> {
    try {
      const enabledProviders = await this.aiProviderService.findEnabled();

      if (enabledProviders.length === 0) {
        this.logger.warn('No enabled providers found in database', 'AiService');
        this.defaultProviderName = '';
        return;
      }

      for (const config of enabledProviders) {
        try {
          const decryptedApiKey = this.encryptionService.decrypt(config.apiKeyEncrypted);

          this.registerProvider({
            name: config.name,
            label: config.label,
            apiKey: decryptedApiKey,
            baseUrl: config.baseUrl,
            model: config.model,
          });

          this.logger.log(
            `Loaded provider from database: ${config.name} (${config.label})`,
            'AiService',
          );
        } catch (err) {
          this.logger.error(
            `Failed to decrypt API key for provider ${config.name}: ${(err as Error).message}`,
            undefined,
            'AiService',
          );
        }
      }

      // 设置默认 Provider (优先级最高的启用 Provider)
      this.defaultProviderName = enabledProviders[0].name;
      this.logger.log(`Default provider set to: ${this.defaultProviderName}`, 'AiService');
    } catch (err) {
      this.logger.error(
        `Failed to load providers from database: ${(err as Error).message}`,
        undefined,
        'AiService',
      );
      this.defaultProviderName = '';
    }
  }

  /**
   * 注册一个 Provider
   */
  registerProvider(config: ProviderConfigData): void {
    try {
      const provider = this.providerFactory.createProvider(config);
      this.providers.set(config.name, provider);
      if (provider.isConfigured()) {
        this.logger.log(
          `Provider [${config.name}] registered: ${config.label} (${config.model})`,
          'AiService',
        );
      } else {
        this.logger.warn(`Provider [${config.name}] registered but not configured`, 'AiService');
      }
    } catch (err) {
      this.logger.error(
        `Failed to register provider [${config.name}]: ${(err as Error).message}`,
        undefined,
        'AiService',
      );
    }
  }

  /**
   * 获取所有已注册的 Provider 信息
   */
  getProviders(): ProviderInfo[] {
    const result: ProviderInfo[] = [];
    for (const [name, provider] of this.providers) {
      result.push({
        name,
        label: provider.label,
        model: provider.getDefaultModel(),
        configured: provider.isConfigured(),
      });
    }
    return result;
  }

  getDefaultProvider(): string {
    return this.defaultProviderName;
  }

  setDefaultProvider(provider: string): void {
    if (this.providers.has(provider)) {
      this.defaultProviderName = provider;
      this.logger.log(`Default provider set to: ${provider}`, 'AiService');
    } else {
      this.logger.warn(`Cannot set default provider: ${provider} not registered`, 'AiService');
    }
  }

  isConfigured(provider?: string): boolean {
    const p = provider || this.defaultProviderName;
    const prov = this.providers.get(p);
    return prov ? prov.isConfigured() : false;
  }

  getModel(provider?: string): string {
    const p = provider || this.defaultProviderName;
    const prov = this.providers.get(p);
    return prov ? prov.getDefaultModel() : 'unknown';
  }

  private getProvider(name?: string): IAiProvider {
    const p = name || this.defaultProviderName;
    const provider = this.providers.get(p);
    if (!provider) {
      const available = Array.from(this.providers.keys()).join(', ') || 'none';
      throw new ServiceUnavailableException(
        `AI 服务未配置：provider=${p}，可用 provider: ${available}`,
      );
    }
    if (!provider.isConfigured()) {
      throw new ServiceUnavailableException(
        `AI 服务 [${p}] 未正确配置，请检查 API Key`,
      );
    }
    return provider;
  }

  async chat(options: AiRequestOptions): Promise<AiResponse> {
    const provider = options.provider || this.defaultProviderName;
    const prov = this.getProvider(provider);
    const model = options.model || prov.getDefaultModel();
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;
    const maxRetries = options.retries ?? DEFAULT_RETRIES;

    this.logger.log(
      `[${provider}] AI chat request: model=${model}, messages=${options.messages.length}, maxTokens=${options.maxTokens || 'default'}`,
      'AiService',
    );

    const startTime = Date.now();

    return this.withRetry(
      async () => {
        try {
          this.logger.debug(`[${provider}] Sending request to ${model}...`, 'AiService');
          const response = await prov.chat({ ...options, model, timeout });

          const elapsed = Date.now() - startTime;
          this.logger.log(
            `[${provider}] Response received: ${elapsed}ms, finishReason=${response.finishReason}, contentLength=${response.content.length}`,
            'AiService',
          );

          if (response.usage) {
            this.logger.log(
              `[${provider}] Token usage: prompt=${response.usage.promptTokens}, completion=${response.usage.completionTokens}, total=${response.usage.totalTokens}`,
              'AiService',
            );
          }

          return response;
        } catch (err) {
          const elapsed = Date.now() - startTime;
          this.logger.error(
            `[${provider}] Request failed after ${elapsed}ms: ${(err as Error).message}`,
            (err as Error).stack,
            'AiService',
          );
          throw err;
        }
      },
      maxRetries,
      provider,
    );
  }

  async generateText(options: AiRequestOptions): Promise<string> {
    const response = await this.chat(options);
    return response.content;
  }

  async generateJson<T = Record<string, unknown>>(
    options: AiRequestOptions,
  ): Promise<{ data: T; usage?: AiResponse['usage'] }> {
    const provider = options.provider || this.defaultProviderName;
    const prov = this.getProvider(provider);
    const model = options.model || prov.getDefaultModel();
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;
    const maxRetries = options.retries ?? DEFAULT_RETRIES;

    this.logger.log(
      `[${provider}] AI JSON request: model=${model}, messages=${options.messages.length}, maxTokens=${options.maxTokens || 'default'}`,
      'AiService',
    );

    const startTime = Date.now();

    return this.withRetry(
      async () => {
        try {
          this.logger.debug(`[${provider}] Sending JSON request to ${model}...`, 'AiService');
          const result = await prov.generateJson<T>({ ...options, model, timeout });

          const elapsed = Date.now() - startTime;
          this.logger.log(
            `[${provider}] JSON response received: ${elapsed}ms`,
            'AiService',
          );

          return result;
        } catch (err) {
          const elapsed = Date.now() - startTime;
          this.logger.error(
            `[${provider}] JSON request failed after ${elapsed}ms: ${(err as Error).message}`,
            (err as Error).stack,
            'AiService',
          );
          throw err;
        }
      },
      maxRetries,
      provider,
    );
  }

  async *stream(options: AiRequestOptions): AsyncGenerator<StreamChunk> {
    const provider = options.provider || this.defaultProviderName;
    const prov = this.getProvider(provider);
    const model = options.model || prov.getDefaultModel();
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;
    const maxRetries = options.retries ?? DEFAULT_RETRIES;

    this.logger.log(
      `[${provider}] AI stream request: model=${model}, messages=${options.messages.length}`,
      'AiService',
    );

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        this.logger.warn(
          `[${provider}] Stream retry attempt ${attempt}/${maxRetries}`,
          'AiService',
        );
        await this.sleep(RETRY_DELAY_MS * attempt);
      }

      try {
        this.logger.debug(`[${provider}] Starting stream from ${model}...`, 'AiService');
        for await (const chunk of prov.stream({ ...options, model, timeout })) {
          yield chunk;
        }
        return;
      } catch (err) {
        lastError = err as Error;
        this.logger.error(
          `[${provider}] Stream error: ${lastError.message}`,
          lastError.stack,
          'AiService',
        );

        if (!this.isRetryable(err)) {
          throw this.wrapError(err, provider);
        }
      }
    }

    throw this.wrapError(lastError, provider);
  }

  async createTask(
    taskType: TaskType,
    novelId: string,
    input: Record<string, unknown>,
    chapterId?: string,
    outlineId?: string,
  ): Promise<string> {
    const task = await this.aiTaskService.create({
      taskType,
      novelId,
      chapterId,
      outlineId,
      input,
      status: TaskStatus.PENDING,
    });

    this.logger.log(
      `AI task created: id=${task.id}, type=${taskType}, novelId=${novelId}`,
      'AiService',
    );

    return task.id;
  }

  async updateTaskSuccess(
    taskId: string,
    output: Record<string, unknown>,
    usage?: AiResponse['usage'],
  ): Promise<void> {
    await this.aiTaskService.updateStatus(taskId, TaskStatus.COMPLETED, output);
    if (usage) {
      await this.aiTaskService.updateTokenUsage(taskId, {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      });
      this.logger.log(`Task ${taskId} completed: tokens=${usage.totalTokens}`, 'AiService');
    } else {
      this.logger.log(`Task ${taskId} completed`, 'AiService');
    }
  }

  async updateTaskFailed(taskId: string, error: string): Promise<void> {
    await this.aiTaskService.updateStatus(taskId, TaskStatus.FAILED, undefined, error);
    this.logger.error(`Task ${taskId} failed: ${error}`, undefined, 'AiService');
  }

  async testConnection(provider?: string): Promise<{
    ok: boolean;
    provider: string;
    model: string;
    latency?: number;
    error?: string;
  }> {
    const p = provider || this.defaultProviderName;
    if (!this.isConfigured(p)) {
      return { ok: false, provider: p, model: this.getModel(p), error: 'API Key 未配置' };
    }

    const prov = this.getProvider(p);
    const start = Date.now();
    try {
      const result = await prov.testConnection();
      return {
        ok: result.ok,
        provider: p,
        model: result.model || this.getModel(p),
        latency: result.latency,
        error: result.error,
      };
    } catch (err) {
      return {
        ok: false,
        provider: p,
        model: this.getModel(p),
        error: (err as Error).message,
      };
    }
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    provider: string,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err as Error;

        if (!this.isRetryable(err)) {
          throw this.wrapError(err, provider);
        }

        if (attempt < maxRetries) {
          this.logger.warn(
            `[${provider}] AI request failed (attempt ${attempt + 1}/${maxRetries + 1}): ${lastError.message}`,
            'AiService',
          );
          await this.sleep(RETRY_DELAY_MS * (attempt + 1));
        }
      }
    }

    throw this.wrapError(lastError, provider);
  }

  private isRetryable(err: unknown): boolean {
    // Check for common retryable errors
    const message = (err as Error)?.message?.toLowerCase() || '';
    if (message.includes('connection') || message.includes('timeout')) return true;
    if (message.includes('rate limit') || message.includes('429')) return true;
    if (message.includes('internal server error') || message.includes('500')) return true;
    if ((err as Error)?.name === 'AbortError') return false;
    return false;
  }

  private wrapError(err: unknown, provider: string): Error {
    const message = (err as Error)?.message || '';

    if (message.includes('authentication') || message.includes('401') || message.includes('invalid api key')) {
      return new ServiceUnavailableException(`[${provider}] AI 认证失败：API Key 无效`);
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return new ServiceUnavailableException(`[${provider}] AI 请求频率超限，请稍后重试`);
    }
    if (message.includes('timeout') || message.includes('abort')) {
      return new ServiceUnavailableException(`[${provider}] AI 请求超时`);
    }
    if (message.includes('connection') || message.includes('network')) {
      return new ServiceUnavailableException(`[${provider}] AI 服务连接失败`);
    }
    if (err instanceof Error) {
      return new ServiceUnavailableException(`[${provider}] AI 请求失败: ${err.message}`);
    }
    return new ServiceUnavailableException(`[${provider}] AI 请求未知错误`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
