import OpenAI from 'openai';
import { AppLogger } from '../../../common/logger/logger.service';
import {
  IAiProvider,
  AiRequestOptions,
  AiResponse,
  StreamChunk,
  TestConnectionResult,
} from './provider.interface';

export interface OpenAiCompatibleConfig {
  name: string;
  label: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

/**
 * OpenAI 兼容 API 的通用 Provider 适配器
 * 适用于: Ollama, Groq, DeepSeek, Krill-Code, OpenAI 等
 */
export class OpenAiCompatibleProvider implements IAiProvider {
  private client: OpenAI | null = null;

  constructor(
    private readonly config: OpenAiCompatibleConfig,
    private readonly logger: AppLogger,
  ) {
    if (config.apiKey && config.apiKey !== 'sk-your-api-key-here') {
      this.client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      });
      this.logger.log(
        `Provider [${config.name}] initialized: model=${config.model}, baseUrl=${config.baseUrl}`,
        'OpenAiCompatibleProvider',
      );
    } else {
      this.logger.warn(
        `Provider [${config.name}] not configured: missing or placeholder API key`,
        'OpenAiCompatibleProvider',
      );
    }
  }

  get name(): string {
    return this.config.name;
  }

  get label(): string {
    return this.config.label;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  getDefaultModel(): string {
    return this.config.model;
  }

  async chat(options: AiRequestOptions): Promise<AiResponse> {
    if (!this.client) {
      throw new Error(`Provider [${this.name}] is not configured`);
    }

    const controller = new AbortController();
    const timeout = options.timeout ?? 300_000;
    const timer = setTimeout(() => controller.abort(), timeout);

    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const response = await this.client.chat.completions.create(
        {
          model: options.model || this.config.model,
          messages: options.messages,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
        },
        { signal: controller.signal },
      );

      clearTimeout(timer);

      const choice = response.choices?.[0];
      const usage = response.usage;

      const result: AiResponse = {
        content: choice?.message?.content || '',
        finishReason: choice?.finish_reason,
      };

      if (usage) {
        result.usage = {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        };
      }

      return result;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  async *stream(options: AiRequestOptions): AsyncGenerator<StreamChunk> {
    if (!this.client) {
      throw new Error(`Provider [${this.name}] is not configured`);
    }

    const controller = new AbortController();
    const timeout = options.timeout ?? 300_000;
    const timer = setTimeout(() => controller.abort(), timeout);

    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const streamResponse = await this.client.chat.completions.create(
        {
          model: options.model || this.config.model,
          messages: options.messages,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          stream: true,
          stream_options: { include_usage: true },
        },
        { signal: controller.signal },
      );

      clearTimeout(timer);

      for await (const chunk of streamResponse) {
        const delta = chunk.choices?.[0]?.delta;
        const content = delta?.content || '';

        if (chunk.usage) {
          yield {
            content: '',
            done: true,
            usage: {
              promptTokens: chunk.usage.prompt_tokens,
              completionTokens: chunk.usage.completion_tokens,
              totalTokens: chunk.usage.total_tokens,
            },
          };
        } else if (content) {
          yield { content, done: false };
        }
      }
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  async generateJson<T = Record<string, unknown>>(
    options: AiRequestOptions,
  ): Promise<{ data: T; usage?: AiResponse['usage'] }> {
    if (!this.client) {
      throw new Error(`Provider [${this.name}] is not configured`);
    }

    const controller = new AbortController();
    const timeout = options.timeout ?? 300_000;
    const timer = setTimeout(() => controller.abort(), timeout);

    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const response = await this.client.chat.completions.create(
        {
          model: options.model || this.config.model,
          messages: options.messages,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          response_format: { type: 'json_object' },
        },
        { signal: controller.signal },
      );

      clearTimeout(timer);

      const choice = response.choices?.[0];
      const raw = choice?.message?.content || '{}';
      const usage = response.usage;

      let data: T;
      try {
        data = JSON.parse(raw);
      } catch {
        // Try to extract JSON from response
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          data = JSON.parse(match[0]);
        } else {
          data = {} as T;
        }
      }

      const result: { data: T; usage?: AiResponse['usage'] } = { data };
      if (usage) {
        result.usage = {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        };
      }

      return result;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  async testConnection(): Promise<TestConnectionResult> {
    if (!this.client) {
      return { ok: false, error: 'API Key 未配置' };
    }

    const start = Date.now();
    try {
      await this.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 5,
        timeout: 15_000,
      });
      return {
        ok: true,
        latency: Date.now() - start,
        model: this.config.model,
      };
    } catch (err) {
      return {
        ok: false,
        error: (err as Error).message,
        model: this.config.model,
      };
    }
  }
}
