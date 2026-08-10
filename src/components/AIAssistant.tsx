import {
  Bot,
  ChevronDown,
  ExternalLink,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  type AssistantRequestMessage,
  type AssistantSource,
  type AssistantTrace,
  streamAssistantResponse,
} from '../utils/assistant';

type DisplayMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AssistantSource[];
  trace?: AssistantTrace;
  pending?: boolean;
  error?: string;
};

const STORAGE_KEY = 'luxudong-ai-session-v1';
const API_URL = import.meta.env.VITE_AI_API_URL?.trim() || '';
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || '';
const ENABLED = import.meta.env.VITE_AI_ASSISTANT_ENABLED === 'true'
  && Boolean(API_URL)
  && (Boolean(TURNSTILE_SITE_KEY) || import.meta.env.DEV);
const prompts = [
  '介绍一下鲁旭东',
  '他做过哪些 AI 探索？',
  '找关于 React Server Components 的文章',
];

const createId = () => crypto.randomUUID();

const getVisitorId = () => {
  const stored = sessionStorage.getItem('luxudong-ai-visitor');
  if (stored) return stored;
  const next = createId();
  sessionStorage.setItem('luxudong-ai-visitor', next);
  return next;
};

const restoreMessages = (): DisplayMessage[] => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]') as DisplayMessage[];
    return Array.isArray(parsed)
      ? parsed.filter((message) => (
        message
        && (message.role === 'user' || message.role === 'assistant')
        && typeof message.content === 'string'
      )).slice(-12)
      : [];
  } catch {
    return [];
  }
};

export const AIAssistant = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>(restoreMessages);
  const [draft, setDraft] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileReady, setTurnstileReady] = useState(
    !TURNSTILE_SITE_KEY && import.meta.env.DEV,
  );
  const [generating, setGenerating] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const challengeRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string>();
  const abortRef = useRef<AbortController>();

  const canSend = Boolean(draft.trim())
    && !generating
    && (turnstileReady || import.meta.env.DEV);

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        sources: message.sources,
        trace: message.trace,
        error: message.error,
      }))),
    );
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [open, messages]);

  useEffect(() => {
    if (!open || !TURNSTILE_SITE_KEY || !challengeRef.current) return;

    const renderWidget = () => {
      if (!challengeRef.current || widgetIdRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(challengeRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'dark',
        size: 'flexible',
        appearance: 'interaction-only',
        callback: (token: string) => {
          setTurnstileToken(token);
          setTurnstileReady(true);
        },
        'expired-callback': () => {
          setTurnstileToken('');
          setTurnstileReady(false);
        },
        'error-callback': () => {
          setTurnstileToken('');
          setTurnstileReady(false);
        },
      });
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-luxudong-turnstile]');
    const script = existing || document.createElement('script');
    script.addEventListener('load', renderWidget, { once: true });
    if (!existing) {
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.luxudongTurnstile = 'true';
      document.head.append(script);
    }

    return () => script.removeEventListener('load', renderWidget);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (generating) abortRef.current?.abort();
        setOpen(false);
        launcherRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [generating, open]);

  const requestMessages = useMemo<AssistantRequestMessage[]>(() => (
    messages
      .filter((message) => message.content && !message.error)
      .slice(-11)
      .map(({ role, content }) => ({ role, content }))
  ), [messages]);

  const resetChallenge = () => {
    setTurnstileToken('');
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      setTurnstileReady(false);
    }
  };

  const ask = async (question: string) => {
    const trimmed = question.trim().slice(0, 500);
    if (!trimmed || generating) return;

    const userMessage: DisplayMessage = { id: createId(), role: 'user', content: trimmed };
    const responseId = createId();
    const assistantMessage: DisplayMessage = {
      id: responseId,
      role: 'assistant',
      content: '',
      pending: true,
    };
    const nextRequestMessages = [...requestMessages, { role: 'user' as const, content: trimmed }];
    const controller = new AbortController();

    abortRef.current = controller;
    setMessages((current) => [...current, userMessage, assistantMessage].slice(-12));
    setDraft('');
    setGenerating(true);

    try {
      await streamAssistantResponse({
        apiUrl: API_URL,
        messages: nextRequestMessages,
        language: navigator.language || 'zh-CN',
        visitorId: getVisitorId(),
        turnstileToken: turnstileToken || (import.meta.env.DEV ? 'dev-bypass' : ''),
        signal: controller.signal,
        onEvent: (event) => {
          setMessages((current) => current.map((message) => {
            if (message.id !== responseId) return message;
            if (event.type === 'metadata') return { ...message, trace: event.data };
            if (event.type === 'delta') {
              return { ...message, content: `${message.content}${event.data.text}` };
            }
            if (event.type === 'sources') return { ...message, sources: event.data.sources };
            if (event.type === 'done') {
              return {
                ...message,
                pending: false,
                trace: message.trace
                  ? {
                    ...message.trace,
                    elapsedMs: event.data.elapsedMs,
                    retrievedCount: event.data.retrievedCount,
                  }
                  : message.trace,
              };
            }
            if (event.type === 'error') {
              return { ...message, pending: false, error: event.data.message };
            }
            return message;
          }));
        },
      });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setMessages((current) => current.map((message) => (
          message.id === responseId
            ? {
              ...message,
              pending: false,
              error: '助手暂时无法回答，请稍后再试或直接浏览博客。',
            }
            : message
        )));
      } else {
        setMessages((current) => current.map((message) => (
          message.id === responseId
            ? { ...message, pending: false, error: message.content ? undefined : '已停止生成。' }
            : message
        )));
      }
    } finally {
      setGenerating(false);
      abortRef.current = undefined;
      resetChallenge();
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canSend) void ask(draft);
  };

  const clearConversation = () => {
    abortRef.current?.abort();
    setMessages([]);
    sessionStorage.removeItem(STORAGE_KEY);
    inputRef.current?.focus();
  };

  if (!ENABLED) return null;

  return (
    <>
      <button
        className={`ai-launcher${open ? ' is-open' : ''}`}
        type="button"
        ref={launcherRef}
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? '关闭 AI 助手' : '打开鲁旭东的 AI 助手'}
        aria-expanded={open}
        aria-controls="ai-assistant-panel"
      >
        {open ? <X aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
        {!open && <span>AI</span>}
      </button>

      <div
        className={`ai-assistant-backdrop${open ? ' is-open' : ''}`}
        aria-hidden="true"
        onClick={() => {
          setOpen(false);
          launcherRef.current?.focus();
        }}
      />

      <aside
        className={`ai-assistant${open ? ' is-open' : ''}`}
        id="ai-assistant-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-assistant-title"
        aria-hidden={!open}
      >
        <header className="ai-assistant-header">
          <div className="ai-assistant-identity">
            <span className="ai-assistant-avatar"><Bot aria-hidden="true" /></span>
            <div>
              <div className="ai-assistant-title-row">
                <h2 id="ai-assistant-title">鲁旭东的 AI 助手</h2>
                <span className="ai-assistant-status">RAG ONLINE</span>
              </div>
              <p>只依据公开档案和博客回答</p>
            </div>
          </div>
          <div className="ai-assistant-actions">
            <button type="button" onClick={clearConversation} aria-label="清空会话">
              <Trash2 aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                launcherRef.current?.focus();
              }}
              aria-label="关闭助手"
            >
              <X aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="ai-assistant-messages" aria-live="polite">
          {messages.length === 0 && (
            <section className="ai-assistant-intro">
              <span><Sparkles aria-hidden="true" /></span>
              <h3>想了解鲁旭东？问我就好。</h3>
              <p>我会检索他的个人档案、职业经历、项目和博客，并把依据一起交给你。</p>
              <div className="ai-assistant-prompts">
                {prompts.map((prompt) => (
                  <button type="button" key={prompt} onClick={() => void ask(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            </section>
          )}

          {messages.map((message) => (
            <article
              className={`ai-message is-${message.role}`}
              key={message.id}
              aria-label={message.role === 'user' ? '你的问题' : 'AI 助手回答'}
            >
              <div className="ai-message-label">
                {message.role === 'user' ? 'YOU' : 'LUXUDONG / AI'}
              </div>
              <div className="ai-message-bubble">
                {message.content && message.role === 'assistant' ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                ) : (
                  message.content
                )}
                {message.pending && !message.content && (
                  <span className="ai-thinking">
                    <i /><i /><i />
                    正在检索公开资料
                  </span>
                )}
                {message.error && <p className="ai-message-error">{message.error}</p>}
              </div>

              {message.sources && message.sources.length > 0 && (
                <div className="ai-sources" aria-label="回答来源">
                  <p>引用来源</p>
                  {message.sources.map((source) => (
                    <a href={source.url} key={source.id} onClick={() => setOpen(false)}>
                      <span>
                        <strong>{source.title}</strong>
                        <small>{source.excerpt}</small>
                      </span>
                      <ExternalLink aria-hidden="true" />
                    </a>
                  ))}
                </div>
              )}

              {message.trace && (
                <details className="ai-trace">
                  <summary>
                    <span>这条回答如何生成</span>
                    <ChevronDown aria-hidden="true" />
                  </summary>
                  <dl>
                    <div><dt>生成模型</dt><dd>{message.trace.model}</dd></div>
                    <div><dt>Embedding</dt><dd>{message.trace.embeddingModel}</dd></div>
                    <div>
                      <dt>检索</dt>
                      <dd>{message.trace.retrieval.join(' + ')}</dd>
                    </div>
                    <div>
                      <dt>模式</dt>
                      <dd>
                        {message.trace.mode === 'rag'
                          ? '检索增强生成'
                          : message.trace.mode === 'profile'
                            ? '结构化档案直答'
                            : '只检索降级'}
                      </dd>
                    </div>
                    {message.trace.retrievedCount !== undefined && (
                      <div><dt>命中片段</dt><dd>{message.trace.retrievedCount}</dd></div>
                    )}
                    {message.trace.elapsedMs !== undefined && (
                      <div><dt>总耗时</dt><dd>{message.trace.elapsedMs} ms</dd></div>
                    )}
                  </dl>
                </details>
              )}
            </article>
          ))}
          <div ref={endRef} />
        </div>

        <footer className="ai-assistant-composer">
          <div className="ai-turnstile" ref={challengeRef} />
          <form onSubmit={submit}>
            <textarea
              ref={inputRef}
              value={draft}
              maxLength={500}
              rows={1}
              placeholder="询问经历、项目或博客…"
              aria-label="向 AI 助手提问"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  if (canSend) void ask(draft);
                }
              }}
            />
            {generating ? (
              <button
                className="ai-send-button"
                type="button"
                onClick={() => abortRef.current?.abort()}
                aria-label="停止生成"
              >
                <Square aria-hidden="true" />
              </button>
            ) : (
              <button className="ai-send-button" type="submit" disabled={!canSend} aria-label="发送">
                <Send aria-hidden="true" />
              </button>
            )}
          </form>
          <p><ShieldCheck aria-hidden="true" /> 不保存聊天内容 · 回答可能有误，请以来源为准</p>
        </footer>
      </aside>
    </>
  );
};
