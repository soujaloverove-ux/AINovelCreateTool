import { strict as assert } from 'node:assert';
import * as sse from '../src/api/sse.ts';

const { parseSseChunk } = sse;

let buffer = '';
const received: unknown[] = [];

for (const chunk of [
  'data: {"event":"progress","data":{"completed":0,',
  '"total":45}}\n\ndata: {"event":"batch","data":{"completed":20}}\n',
  '\ndata: {"event":"done","data":{"total":45}}\n\n',
]) {
  const parsed = parseSseChunk(buffer, chunk);
  buffer = parsed.buffer;
  received.push(...parsed.events);
}

assert.equal(buffer, '', '完整事件处理后不应留下缓冲数据');
assert.deepEqual(received, [
  { event: 'progress', data: { completed: 0, total: 45 } },
  { event: 'batch', data: { completed: 20 } },
  { event: 'done', data: { total: 45 } },
]);

const abortRequestBeforeNavigate = (
  sse as unknown as {
    abortRequestBeforeNavigate?: (controller: AbortController | null, navigate: () => void) => void;
  }
).abortRequestBeforeNavigate;

assert.equal(
  typeof abortRequestBeforeNavigate,
  'function',
  '应提供先终止请求、再执行返回的生命周期方法',
);

if (abortRequestBeforeNavigate) {
  const actions: string[] = [];
  const controller = new AbortController();
  controller.signal.addEventListener('abort', () => actions.push('abort'));

  abortRequestBeforeNavigate(controller, () => actions.push('navigate'));

  assert.deepEqual(actions, ['abort', 'navigate'], '必须先终止当前请求，再返回上一步');
  assert.equal(controller.signal.aborted, true, '当前请求应被标记为已终止');

  const idleActions: string[] = [];
  abortRequestBeforeNavigate(null, () => idleActions.push('navigate'));
  assert.deepEqual(idleActions, ['navigate'], '没有执行中的请求时也应正常返回上一步');
}

console.log('SSE parser test passed');
