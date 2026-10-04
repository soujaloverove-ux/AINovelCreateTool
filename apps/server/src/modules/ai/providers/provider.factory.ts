import { Injectable } from '@nestjs/common';
import { AppLogger } from '../../../common/logger/logger.service';
import { IAiProvider } from './provider.interface';
import { OpenAiCompatibleProvider, OpenAiCompatibleConfig } from './openai-compatible.provider';
import { DoubaoProvider, DoubaoConfig } from './doubao.provider';

export interface ProviderConfigData {
  name: string;
  label: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

/**
 * AI Provider 工厂
 * 根据配置数据创建对应的 Provider 实例
 *
 * 新增供应商只需:
 * 1. 创建新的 Provider 类实现 IAiProvider
 * 2. 在此工厂的 create() 方法中添加 case 分支
 */
@Injectable()
export class ProviderFactory {
  constructor(private readonly logger: AppLogger) {}

  /**
   * 根据配置创建 Provider 实例
   */
  createProvider(config: ProviderConfigData): IAiProvider {
    switch (config.name) {
      // OpenAI 兼容接口的供应商
      case 'ollama':
      case 'groq':
      case 'deepseek':
      case 'krill-code':
      case 'openai':
      case 'siliconflow':
      case 'moonshot':
      case 'qwen':
        return this.createOpenAiCompatible(config);

      // 豆包火山引擎 API
      case 'doubao':
        return this.createDoubao(config);

      default:
        this.logger.warn(
          `Unknown provider type: ${config.name}, attempting OpenAI compatible adapter`,
          'ProviderFactory',
        );
        // 未知供应商默认尝试 OpenAI 兼容适配器
        return this.createOpenAiCompatible(config);
    }
  }

  private createOpenAiCompatible(config: ProviderConfigData): OpenAiCompatibleProvider {
    const openAiConfig: OpenAiCompatibleConfig = {
      name: config.name,
      label: config.label,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
    };
    return new OpenAiCompatibleProvider(openAiConfig, this.logger);
  }

  private createDoubao(config: ProviderConfigData): DoubaoProvider {
    const doubaoConfig: DoubaoConfig = {
      name: config.name,
      label: config.label,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
    };
    return new DoubaoProvider(doubaoConfig, this.logger);
  }
}
