import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { PromptService } from './prompt.service';
import { AiController } from './ai.controller';
import { AiProviderController } from './ai-provider.controller';
import { AiProviderService } from './ai-provider.service';
import { AiTaskModule } from '../ai-task/ai-task.module';
import { PromptTemplateModule } from '../prompt-template/prompt-template.module';
import { ProvidersModule } from './providers/providers.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { AiProviderConfigEntity } from './entities/ai-provider-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiProviderConfigEntity]),
    AiTaskModule,
    PromptTemplateModule,
    ProvidersModule,
    EncryptionModule,
  ],
  controllers: [AiController, AiProviderController],
  providers: [AiService, PromptService, AiProviderService],
  exports: [AiService, PromptService, AiProviderService],
})
export class AiModule {}
