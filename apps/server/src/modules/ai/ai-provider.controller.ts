import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiProviderService, ProviderConfigInfo } from './ai-provider.service';
import { AiService } from './ai.service';
import { CreateProviderDto, UpdateProviderDto, TestConnectionResult } from './dto/provider.dto';

export interface ProviderListItem extends ProviderConfigInfo {
  configured: boolean;
}

@Controller('api/ai/providers')
export class AiProviderController {
  constructor(
    private readonly providerService: AiProviderService,
    private readonly aiService: AiService,
  ) {}

  /** 获取所有 Provider 列表 (含运行时 configured 状态与默认 Provider) */
  @Get()
  async getAllProviders(): Promise<{
    providers: ProviderListItem[];
    defaultProvider: string;
  }> {
    const providers = await this.providerService.findAll();
    const runtime = new Map(this.aiService.getProviders().map((p) => [p.name, p.configured]));
    return {
      providers: providers.map((p) => ({
        ...p,
        configured: runtime.get(p.name) ?? false,
      })),
      defaultProvider: this.aiService.getDefaultProvider(),
    };
  }

  /** 获取单个 Provider 配置 (不返回加密的 API Key) */
  @Get(':id')
  async getProvider(@Param('id') id: string): Promise<ProviderConfigInfo> {
    return this.providerService.findOne(id);
  }

  /** 创建新 Provider */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProvider(@Body() dto: CreateProviderDto): Promise<ProviderConfigInfo> {
    const created = await this.providerService.create(dto);
    await this.aiService.reloadProviders();
    return created;
  }

  /** 更新 Provider */
  @Put(':id')
  async updateProvider(
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto,
  ): Promise<ProviderConfigInfo> {
    const updated = await this.providerService.update(id, dto);
    await this.aiService.reloadProviders();
    return updated;
  }

  /** 删除 Provider */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProvider(@Param('id') id: string): Promise<void> {
    await this.providerService.delete(id);
    await this.aiService.reloadProviders();
  }

  /** 启用/禁用 Provider */
  @Patch(':id/toggle')
  async toggleProvider(@Param('id') id: string): Promise<ProviderConfigInfo> {
    const toggled = await this.providerService.toggle(id);
    await this.aiService.reloadProviders();
    return toggled;
  }

  /** 测试连接 */
  @Post(':id/test')
  async testConnection(@Param('id') id: string): Promise<TestConnectionResult> {
    return this.providerService.testConnection(id);
  }
}
