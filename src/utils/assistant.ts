export type AssistantRole = 'user' | 'assistant';

export type AssistantSource = {
  id: string;
  title: string;
  url: string;
  type: 'profile' | 'career' | 'project' | 'blog';
  excerpt: string;
  score: number;
};

export type AssistantTrace = {
  requestId: string;
  model: string;
  embeddingModel: string;
  retrieval: string[];
  mode: 'rag' | 'search-only' | 'profile';
  indexUpdatedAt: string | null;
  elapsedMs?: number;
  retrievedCount?: number;
};

export type AssistantEvent =
  | { type: 'metadata'; data: AssistantTrace }
  | { type: 'delta'; data: { text: string } }
  | { type: 'sources'; data: { sources: AssistantSource[] } }
  | { type: 'done'; data: { elapsedMs: number; retrievedCount: number } }
  | { type: 'error'; data: { message: string; code?: string } };

export type AssistantRequestMessage = {
  role: AssistantRole;
  content: string;
};

const parseEventBlock = (block: string): AssistantEvent | null => {
  let eventType = '';
  const dataLines: string[] = [];

  block.split(/\r?\n/).forEach((line) => {
    if (line.startsWith('event:')) eventType = line.slice(6).trim();
    if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
  });

  if (!eventType || dataLines.length === 0) return null;

  try {
    return {
      type: eventType,
      data: JSON.parse(dataLines.join('\n')),
    } as AssistantEvent;
  } catch {
    return null;
  }
};

export async function streamAssistantResponse(options: {
  apiUrl: string;
  messages: AssistantRequestMessage[];
  language: string;
  visitorId: string;
  turnstileToken: string;
  signal: AbortSignal;
  onEvent: (event: AssistantEvent) => void;
}) {
  const response = await fetch(`${options.apiUrl.replace(/\/$/, '')}/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: options.messages,
      language: options.language,
      visitorId: options.visitorId,
      turnstileToken: options.turnstileToken,
    }),
    signal: options.signal,
  });

  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || `AI assistant request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || '';

    blocks.forEach((block) => {
      const event = parseEventBlock(block);
      if (event) options.onEvent(event);
    });

    if (done) break;
  }

  if (buffer.trim()) {
    const event = parseEventBlock(buffer);
    if (event) options.onEvent(event);
  }
}
