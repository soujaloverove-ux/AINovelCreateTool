import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * AI Provider 配置实体
 *
 * 存储每个 AI 供应商的配置信息，API Key 使用 AES-256-GCM 加密存储
 */
@Entity('ai_provider_config')
@Index(['name'], { unique: true })
@Index(['enabled'])
export class AiProviderConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Provider 唯一标识
   * 例如: 'ollama', 'groq', 'deepseek', 'doubao', 'krill-code'
   */
  @Column({ type: 'varchar', length: 50 })
  name: string;

  /**
   * 显示名称
   * 例如: 'Ollama (本地)', 'Groq (云端)', 'DeepSeek'
   */
  @Column({ type: 'varchar', length: 100 })
  label: string;

  /**
   * API 端点地址
   * 例如: 'http://localhost:11434/v1', 'https://api.groq.com/openai/v1'
   */
  @Column({ type: 'text' })
  baseUrl: string;

  /**
   * 加密后的 API Key
   * 格式: base64(iv):base64(authTag):base64(ciphertext)
   * 前端永远无法获取真实 Key
   */
  @Column({ type: 'text', select: false }) // 默认查询不返回
  apiKeyEncrypted: string;

  /**
   * 默认模型名称
   * 例如: 'qwen2.5:3b', 'llama-3.3-70b-versatile', 'deepseek-chat'
   */
  @Column({ type: 'varchar', length: 100 })
  model: string;

  /**
   * 是否启用
   */
  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  /**
   * 优先级 (数字越小优先级越高)
   * 用于故障转移和默认选择
   */
  @Column({ type: 'int', default: 0 })
  priority: number;

  /**
   * 额外元数据 (JSON)
   * 可存储超时时间、最大重试次数等自定义配置
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
