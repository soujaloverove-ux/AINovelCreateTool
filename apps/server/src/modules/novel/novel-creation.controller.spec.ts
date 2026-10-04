import { strict as assert } from 'node:assert';
import { NovelCreationController } from './novel-creation.controller';
import type { AiRequestOptions } from '../ai/providers/provider.interface';

async function main(): Promise<void> {
  const aiCalls: AiRequestOptions[] = [];
  const renderedVariables: Array<Record<string, string>> = [];

  const aiService = {
    async generateJson(options: AiRequestOptions) {
      aiCalls.push(options);
      const instruction = options.messages.at(-1)?.content || '';
      const range = instruction.match(/第(\d+)至(\d+)章/);
      const start = range ? Number(range[1]) : 1;
      const end = range ? Number(range[2]) : 45;

      return {
        data: {
          chapters: Array.from({ length: end - start + 1 }, (_, index) => ({
            chapterNumber: start + index,
            title: `第${start + index}章`,
            summary: '测试概要',
            conflict: '测试冲突',
            highlight: '测试看点',
          })),
        },
      };
    },
  };

  const promptService = {
    async renderWithSystem(_type: string, variables: Record<string, string>) {
      renderedVariables.push(variables);
      return [{ role: 'user' as const, content: `生成${variables.chapterCount}章` }];
    },
  };

  const controller = new NovelCreationController(
    aiService as never,
    promptService as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  const result = await controller.generateChapterPlan('temp', {
    outline: '第一卷：主角进入迷宫。',
    chapterCount: 45,
    title: '测试小说',
    mainGenre: '系统',
    provider: 'ollama',
  });

  assert.equal(aiCalls.length, 5, 'Ollama 的 45 章应拆成 5 个不超过 10 章的模型请求');
  assert.ok(
    aiCalls.every((call) => call.timeout === 600_000),
    '每个小批次应有独立的 10 分钟上限，不再使用整份规划共用的 5 分钟上限',
  );
  assert.deepEqual(
    result.chapters.map((chapter) => chapter.chapterNumber),
    Array.from({ length: 45 }, (_, index) => index + 1),
    '分批结果应合并为连续的 1-45 章',
  );

  aiCalls.length = 0;
  renderedVariables.length = 0;

  let structuredOutlineError: unknown;
  try {
    await controller.generateChapterPlan('temp', {
      outline: {
        volumes: [
          {
            volumeNumber: 1,
            title: '迷宫初醒',
            summary: '主角进入第一层迷宫。',
            arcs: [
              {
                arcNumber: 1,
                title: '封印松动',
                summary: '主角发现系统裂缝。',
                chapters: [],
              },
            ],
          },
        ],
      } as never,
      chapterCount: 1,
      title: '测试小说',
      mainGenre: '系统',
      provider: 'ollama',
    });
  } catch (error) {
    structuredOutlineError = error;
  }

  assert.equal(structuredOutlineError, undefined, '结构化总纲应能直接用于章节规划');
  assert.match(
    renderedVariables[0]?.outlineContext || '',
    /迷宫初醒[\s\S]*封印松动/,
    '模型提示词应包含上一步保存的卷与剧情弧，而不是空总纲',
  );

  aiCalls.length = 0;
  renderedVariables.length = 0;

  const chunks: string[] = [];
  const headers: Record<string, string> = {};
  let ended = false;
  const response = {
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
    flushHeaders() {},
    write(chunk: string) {
      chunks.push(chunk);
      return true;
    },
    end() {
      ended = true;
    },
    on() {
      return response;
    },
  };

  const streamMethod = (
    controller as unknown as {
      generateChapterPlanStream?: (
        novelId: string,
        body: Record<string, unknown>,
        res: typeof response,
      ) => Promise<void>;
    }
  ).generateChapterPlanStream;

  assert.equal(typeof streamMethod, 'function', '章节规划应提供不会被浏览器总超时截断的流式接口');
  await streamMethod?.call(
    controller,
    'temp',
    {
      outline: '第一卷：主角进入迷宫。',
      chapterCount: 45,
      title: '测试小说',
      mainGenre: '系统',
      provider: 'ollama',
    },
    response,
  );

  const events = chunks
    .filter((chunk) => chunk.startsWith('data: '))
    .map((chunk) => JSON.parse(chunk.slice(6)) as { event: string; data: Record<string, unknown> });

  assert.equal(headers['Content-Type'], 'text/event-stream');
  assert.equal(ended, true, '生成结束后应关闭事件流');
  assert.deepEqual(
    events.filter((event) => event.event === 'batch').map((event) => event.data.completed),
    [10, 20, 30, 40, 45],
    '每个批次完成后都应立即报告累计进度',
  );
  assert.equal(events.at(-1)?.event, 'done', '全部 45 章完成后应发送 done 事件');

  console.log('chapter plan batching test passed');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
