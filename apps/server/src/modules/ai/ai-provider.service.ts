import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppLogger } from '../../common/logger/logger.service';
import { EncryptionService } from '../encryption/encryption.service';
import { AiProviderConfigEntity } from './entities/ai-provider-config.entity';
import { CreateProviderDto, UpdateProviderDto, TestConnectionResult } from './dto/provider.dto';
import { ProviderFactory } from './providers/provider.factory';

/**
 * Provider 配置公开信息 (不包含加密的 API Key)
 */
export interface ProviderConfigInfo {
  id: string;
  name: string;
  label: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  priority: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AiProviderService {
  constructor(
    @InjectRepository(AiProviderConfigEntity)
    private readonly providerRepo: Repository<AiProviderConfigEntity>,
    private readonly encryptionService: EncryptionService,
    private readonly providerFactory: ProviderFactory,
    private readonly logger: AppLogger,
  ) {}

  /**
   * 获取所有 Provider 列表 (不返回加密的 API Key)
   */
  async findAll(): Promise<ProviderConfigInfo[]> {
    const providers = await this.providerRepo.find({
      order: { priority: 'ASC', createdAt: 'DESC' },
    });
    return providers.map((p) => this.toPublicInfo(p));
  }

  /**
   * 获取单个 Provider 配置 (不返回加密的 API Key)
   */
  async findOne(id: string): Promise<ProviderConfigInfo> {
    const provider = await this.providerRepo.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`Provider config not found: ${id}`);
    }
    return this.toPublicInfo(provider);
  }

  /**
   * 根据 name 获取 Provider 配置 (内部使用，包含加密 Key)
   */
  async findOneByName(name: string): Promise<AiProviderConfigEntity | null> {
    return this.providerRepo.findOne({ where: { name } });
  }

  /**
   * 获取所有启用的 Provider 配置 (内部使用，包含加密 Key)
   */
  async findEnabled(): Promise<AiProviderConfigEntity[]> {
    return this.providerRepo.find({
      where: { enabled: true },
      order: { priority: 'ASC' },
      select: ['id', 'name', 'label', 'baseUrl', 'apiKeyEncrypted', 'model', 'enabled', 'priority', 'metadata', 'createdAt', 'updatedAt'],
    });
  }

  /**
   * 创建新 Provider 配置
   * API Key 会被加密后存储
   */
  async create(dto: CreateProviderDto): Promise<ProviderConfigInfo> {
    // 检查是否已存在同名 Provider
    const existing = await this.providerRepo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new Error(`Provider already exists: ${dto.name}. Use update instead.`);
    }

    const encryptedApiKey = this.encryptionService.encrypt(dto.apiKey);

    const provider = this.providerRepo.create({
      name: dto.name,
      label: dto.label,
      baseUrl: dto.baseUrl,
      apiKeyEncrypted: encryptedApiKey,
      model: dto.model,
      enabled: dto.enabled ?? true,
      priority: dto.priority ?? 0,
      ...(dto.metadata ? { metadata: dto.metadata } : {}),
    });

    const saved = await this.providerRepo.save(provider);
    this.logger.log(`Provider created: ${saved.name} (${saved.label})`, 'AiProviderService');

    return this.toPublicInfo(saved);
  }

  /**
   * 更新 Provider 配置
   * 如果提供新的 API Key，会重新加密存储
   */
  async update(id: string, dto: UpdateProviderDto): Promise<ProviderConfigInfo> {
    const provider = await this.providerRepo.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`Provider config not found: ${id}`);
    }

    if (dto.label !== undefined) provider.label = dto.label;
    if (dto.baseUrl !== undefined) provider.baseUrl = dto.baseUrl;
    if (dto.model !== undefined) provider.model = dto.model;
    if (dto.enabled !== undefined) provider.enabled = dto.enabled;
    if (dto.priority !== undefined) provider.priority = dto.priority;
    if (dto.metadata !== undefined) provider.metadata = dto.metadata;

    // 如果提供了新的 API Key，重新加密
    if (dto.apiKey) {
      provider.apiKeyEncrypted = this.encryptionService.encrypt(dto.apiKey);
      this.logger.log(`API key updated for provider: ${provider.name}`, 'AiProviderService');
    }

    const saved = await this.providerRepo.save(provider);
    this.logger.log(`Provider updated: ${saved.name}`, 'AiProviderService');

    return this.toPublicInfo(saved);
  }

  /**
   * 删除 Provider 配置
   */
  async delete(id: string): Promise<void> {
    const provider = await this.providerRepo.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`Provider config not found: ${id}`);
    }

    await this.providerRepo.remove(provider);
    this.logger.log(`Provider deleted: ${provider.name}`, 'AiProviderService');
  }

  /**
   * 启用/禁用 Provider
   */
  async toggle(id: string): Promise<ProviderConfigInfo> {
    const provider = await this.providerRepo.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`Provider config not found: ${id}`);
    }

    provider.enabled = !provider.enabled;
    const saved = await this.providerRepo.save(provider);

    this.logger.log(
      `Provider ${saved.name} ${saved.enabled ? 'enabled' : 'disabled'}`,
      'AiProviderService',
    );

    return this.toPublicInfo(saved);
  }

  /**
   * 测试 Provider 连接
   * 解密 API Key → 创建临时 Provider 实例 → 发送测试请求
   */
  async testConnection(id: string): Promise<TestConnectionResult> {
    const provider = await this.providerRepo.findOne({
      where: { id },
      select: ['id', 'name', 'label', 'baseUrl', 'apiKeyEncrypted', 'model', 'enabled'],
    });
    if (!provider) {
      throw new NotFoundException(`Provider config not found: ${id}`);
    }

    if (!provider.enabled) {
      return { ok: false, error: 'Provider is disabled' };
    }

    // 解密 API Key
    const decryptedApiKey = this.encryptionService.decrypt(provider.apiKeyEncrypted);

    // 创建临时 Provider 实例进行测试
    try {
      const tempProvider = this.providerFactory.createProvider({
        name: provider.name,
        label: provider.label,
        apiKey: decryptedApiKey,
        baseUrl: provider.baseUrl,
        model: provider.model,
      });

      const result = await tempProvider.testConnection();
      return {
        ok: result.ok,
        latency: result.latency,
        error: result.error,
        model: result.model || provider.model,
      };
    } catch (err) {
      return {
        ok: false,
        error: (err as Error).message,
        model: provider.model,
      };
    }
  }

  /**
   * 获取解密的 API Key (仅供内部服务使用)
   */
  async getDecryptedApiKey(name: string): Promise<string | null> {
    const provider = await this.providerRepo.findOne({ where: { name, enabled: true } });
    if (!provider) {
      return null;
    }
    return this.encryptionService.decrypt(provider.apiKeyEncrypted);
  }

  /**
   * 将实体转换为公开信息 (去除加密的 API Key)
   */
  private toPublicInfo(entity: AiProviderConfigEntity): ProviderConfigInfo {
    return {
      id: entity.id,
      name: entity.name,
      label: entity.label,
      baseUrl: entity.baseUrl,
      model: entity.model,
      enabled: entity.enabled,
      priority: entity.priority,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
