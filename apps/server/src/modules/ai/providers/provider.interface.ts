export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiRequestOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
  provider?: string;
}

export interface AiResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface TestConnectionResult {
  ok: boolean;
  latency?: number;
  error?: string;
  model?: string;
}

/**
 * AI Provider 适配器接口
 * 所有供应商必须实现此接口
 */
export interface IAiProvider {
  /** Provider 唯一标识 (如 'ollama', 'groq', 'deepseek') */
  readonly name: string;

  /** 显示名称 (如 'Ollama (本地)') */
  readonly label: string;

  /** 是否已正确配置 */
  isConfigured(): boolean;

  /** 获取默认模型 */
  getDefaultModel(): string;

  /** 聊天补全 */
  chat(options: AiRequestOptions): Promise<AiResponse>;

  /** 流式聊天 */
  stream(options: AiRequestOptions): AsyncGenerator<StreamChunk>;

  /** JSON 结构化输出 */
  generateJson<T = Record<string, unknown>>(
    options: AiRequestOptions,
  ): Promise<{ data: T; usage?: AiResponse['usage'] }>;

  /** 健康检查 / 测试连接 */
  testConnection(): Promise<TestConnectionResult>;
}
