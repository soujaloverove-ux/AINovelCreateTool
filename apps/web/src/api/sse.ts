export function parseSseChunk<T>(buffer: string, chunk: string): { events: T[]; buffer: string } {
  const blocks = `${buffer}${chunk}`.split(/\r?\n\r?\n/);
  const remainder = blocks.pop() || '';
  const events: T[] = [];

  for (const block of blocks) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');

    if (!data) continue;

    try {
      events.push(JSON.parse(data) as T);
    } catch {
      // 忽略单条损坏事件，后续事件仍可继续处理。
    }
  }

  return { events, buffer: remainder };
}

export function abortRequestBeforeNavigate(
  controller: AbortController | null,
  navigate: () => void,
): void {
  controller?.abort();
  navigate();
}
