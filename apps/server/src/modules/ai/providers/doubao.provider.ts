import { AppLogger } from '../../../common/logger/logger.service';
import {
  IAiProvider,
  AiRequestOptions,
  AiResponse,
  StreamChunk,
  TestConnectionResult,
} from './provider.interface';

export interface DoubaoConfig {
  name: string;
  label: string;
  apiKey: string; // 火山引擎 API Key
  baseUrl: string; // 火山引擎端点
  model: string; // 豆包模型 ID
}

/**
 * 豆包 (Doubao) Provider 适配器
 * 使用火山引擎大模型 API
 * 注意: 如果火山引擎提供 OpenAI 兼容接口，可直接使用 OpenAiCompatibleProvider
 */
export class DoubaoProvider implements IAiProvider {
  private configured = false;

  constructor(
    private readonly config: DoubaoConfig,
    private readonly logger: AppLogger,
  ) {
    if (config.apiKey && config.apiKey !== 'sk-your-api-key-here') {
      this.configured = true;
      this.logger.log(
        `Provider [${config.name}] initialized: model=${config.model}, baseUrl=${config.baseUrl}`,
        'DoubaoProvider',
      );
    } else {
      this.logger.warn(
        `Provider [${config.name}] not configured: missing or placeholder API key`,
        'DoubaoProvider',
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
    return this.configured;
  }

  getDefaultModel(): string {
    return this.config.model;
  }

  async chat(options: AiRequestOptions): Promise<AiResponse> {
    if (!this.configured) {
      throw new Error(`Provider [${this.name}] is not configured`);
    }

    // TODO: 实现火山引擎 API 调用
    // 火山引擎 API 文档: https://www.volcengine.com/docs/82379/1263482
    // 如果火山引擎提供 OpenAI 兼容接口，建议直接使用 OpenAiCompatibleProvider

    throw new Error('DoubaoProvider.chat() not yet implemented - use OpenAiCompatibleProvider for OpenAI-compatible endpoints');
  }

  async *stream(_options: AiRequestOptions): AsyncGenerator<StreamChunk> {
    if (!this.configured) {
      throw new Error(`Provider [${this.name}] is not configured`);
    }
    // TODO: 实现流式调用
    throw new Error('DoubaoProvider.stream() not yet implemented');
  }

  async generateJson<T = Record<string, unknown>>(
    options: AiRequestOptions,
  ): Promise<{ data: T; usage?: AiResponse['usage'] }> {
    if (!this.configured) {
      throw new Error(`Provider [${this.name}] is not configured`);
    }
    // TODO: 实现 JSON 输出
    throw new Error('DoubaoProvider.generateJson() not yet implemented');
  }

  async testConnection(): Promise<TestConnectionResult> {
    if (!this.configured) {
      return { ok: false, error: 'API Key 未配置' };
    }
    // TODO: 实现连接测试
    return { ok: false, error: 'DoubaoProvider.testConnection() not yet implemented' };
  }
}
