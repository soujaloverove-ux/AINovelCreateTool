import { Controller, Get, Post, Body, Res, Sse, MessageEvent, Query } from '@nestjs/common';
import { Response } from 'express';
import { Observable, Subject } from 'rxjs';
import { AiService, ChatMessage } from './ai.service';
import { PromptService, PromptVariables } from './prompt.service';
import { AiTestDto, PromptRenderDto } from './ai.dto';

@Controller('api/ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly promptService: PromptService,
  ) {}

  @Get('status')
  getStatus() {
    return {
      configured: this.aiService.isConfigured(),
      model: this.aiService.getModel(),
      defaultProvider: this.aiService.getDefaultProvider(),
      status: this.aiService.isConfigured() ? 'ready' : 'unconfigured',
    };
  }

  @Post('test')
  async testConnection(@Body() body: { provider?: string }) {
    return this.aiService.testConnection(body?.provider);
  }

  @Post('chat')
  async chat(@Body() body: { messages: ChatMessage[]; model?: string; provider?: string }) {
    return this.aiService.chat({
      messages: body.messages,
      model: body.model,
      provider: body.provider,
    });
  }

  @Post('json')
  async generateJson(@Body() body: { messages: ChatMessage[]; model?: string; provider?: string }) {
    return this.aiService.generateJson(
      body.messages.length
        ? { messages: body.messages, model: body.model, provider: body.provider }
        : { messages: [{ role: 'user', content: '{"test": true}' }] },
    );
  }

  @Post('stream')
  async streamText(
    @Body() body: { messages: ChatMessage[]; model?: string; provider?: string },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const stream = this.aiService.stream({
        messages: body.messages,
        model: body.model,
        provider: body.provider,
      });

      for await (const chunk of stream) {
        if (chunk.usage) {
          res.write(`data: ${JSON.stringify({ type: 'usage', ...chunk.usage })}\n\n`);
        } else if (chunk.content) {
          res.write(`data: ${JSON.stringify({ type: 'content', content: chunk.content })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: (err as Error).message })}\n\n`);
      res.end();
    }
  }

  @Sse('stream-sse')
  streamSse(
    @Body() body: { messages: ChatMessage[]; model?: string; provider?: string },
  ): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    (async () => {
      try {
        const stream = this.aiService.stream({
          messages: body.messages,
          model: body.model,
          provider: body.provider,
        });

        for await (const chunk of stream) {
          if (chunk.usage) {
            subject.next({ data: { type: 'usage', ...chunk.usage } });
          } else if (chunk.content) {
            subject.next({ data: { type: 'content', content: chunk.content } });
          }
        }
        subject.next({ data: { type: 'done' } });
        subject.complete();
      } catch (err) {
        subject.next({ data: { type: 'error', error: (err as Error).message } });
        subject.complete();
      }
    })();

    return subject.asObservable();
  }

  @Post('prompt/render')
  async renderPrompt(@Body() dto: PromptRenderDto) {
    const content = await this.promptService.render(
      dto.type,
      dto.variables as PromptVariables,
      dto.name,
    );
    return { content };
  }
}
