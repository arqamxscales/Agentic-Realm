'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import Image from 'next/image';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { agents, type AgentSlug, getAgentBySlug } from '@/lib/agents';
import { AuthPanel } from '@/components/auth-panel';
import { MagicLinkHero } from '@/components/magic-link-hero';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

type ChatEntry = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentSlug?: AgentSlug;
};

type ConversationSummary = {
  id: string;
  title: string;
  agent_slug: AgentSlug;
  updated_at: string;
};

const initialMessages: ChatEntry[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      'Welcome to Agentic Realm. Choose a field or let auto-routing detect the best agent, then chat or use voice.'
  }
];

export function AppShell() {
  const [selectedAgentSlug, setSelectedAgentSlug] = useState<AgentSlug>('technology');
  const [autoRoute, setAutoRoute] = useState(true);
  const [voiceMode, setVoiceMode] = useState(true);
  const [messages, setMessages] = useState<ChatEntry[]>(initialMessages);
  const [input, setInput] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [conversationList, setConversationList] = useState<ConversationSummary[]>([]);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState('Ready');
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const activeAgent = useMemo(() => getAgentBySlug(selectedAgentSlug), [selectedAgentSlug]);

  async function loadConversationById(conversationId: string) {
    const response = await fetch(`/api/chat/conversations/${conversationId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Unable to load conversation details.');
    }

    const data = (await response.json()) as {
      conversation: { id: string; agent_slug: AgentSlug };
      messages: Array<{ id: string; role: 'user' | 'assistant'; content: string }>;
    };

    setCurrentConversationId(data.conversation.id);

    const agentSlug = data.conversation.agent_slug;
    if (agents.some((agent) => agent.slug === agentSlug)) {
      setSelectedAgentSlug(agentSlug);
    }

    if (!data.messages.length) {
      setMessages(initialMessages);
      return;
    }

    setMessages(
      data.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        agentSlug
      }))
    );
  }

  async function loadConversationList(preferredConversationId?: string) {
    setSidebarLoading(true);

    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Unable to load conversations.');
      }

      const data = (await response.json()) as {
        authenticated: boolean;
        conversations: ConversationSummary[];
      };

      setIsAuthenticated(data.authenticated);

      if (!data.authenticated) {
        setConversationList([]);
        setCurrentConversationId(null);
        return;
      }

      setConversationList(data.conversations ?? []);

      const fallbackId = data.conversations?.[0]?.id;
      const targetConversationId = preferredConversationId ?? currentConversationId ?? fallbackId;

      if (!targetConversationId) {
        setCurrentConversationId(null);
        setMessages(initialMessages);
        return;
      }

      await loadConversationById(targetConversationId);
    } finally {
      setSidebarLoading(false);
    }
  }

  async function createConversationThread() {
    if (!isAuthenticated) {
      setStatus('Sign in to create cloud conversation threads.');
      return;
    }

    setSidebarLoading(true);

    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'New conversation',
          agentSlug: selectedAgentSlug
        })
      });

      const data = (await response.json()) as {
        conversation?: ConversationSummary;
        error?: string;
      };

      if (!response.ok || !data.conversation) {
        throw new Error(data.error ?? 'Unable to create a new thread.');
      }

      setConversationList((current) => [data.conversation as ConversationSummary, ...current]);
      setCurrentConversationId(data.conversation.id);
      setMessages(initialMessages);
      setStatus('New conversation created.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create a new thread.';
      setStatus(message);
    } finally {
      setSidebarLoading(false);
    }
  }

  useEffect(() => {
    const storedMessages = window.localStorage.getItem('agentic-realm-messages');
    const storedAgent = window.localStorage.getItem('agentic-realm-agent') as AgentSlug | null;
    const storedAutoRoute = window.localStorage.getItem('agentic-realm-auto-route');
    const storedVoice = window.localStorage.getItem('agentic-realm-voice');

    if (storedMessages) {
      try {
        setMessages(JSON.parse(storedMessages));
      } catch {
        setMessages(initialMessages);
      }
    }

    if (storedAgent && agents.some((agent) => agent.slug === storedAgent)) {
      setSelectedAgentSlug(storedAgent);
    }

    if (storedAutoRoute !== null) {
      setAutoRoute(storedAutoRoute === 'true');
    }

    if (storedVoice !== null) {
      setVoiceMode(storedVoice === 'true');
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    void supabase.auth.getSession().then(async ({ data }) => {
      const sessionExists = Boolean(data.session);
      setIsAuthenticated(sessionExists);

      if (sessionExists) {
        await loadConversationList();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        const sessionExists = Boolean(session);
        setIsAuthenticated(sessionExists);

        if (!sessionExists) {
          setConversationList([]);
          setCurrentConversationId(null);
          setMessages(initialMessages);
          return;
        }

        await loadConversationList();
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }

    window.localStorage.setItem('agentic-realm-messages', JSON.stringify(messages));
  }, [isAuthenticated, messages]);

  useEffect(() => {
    window.localStorage.setItem('agentic-realm-agent', selectedAgentSlug);
  }, [selectedAgentSlug]);

  useEffect(() => {
    window.localStorage.setItem('agentic-realm-auto-route', String(autoRoute));
  }, [autoRoute]);

  useEffect(() => {
    window.localStorage.setItem('agentic-realm-voice', String(voiceMode));
  }, [voiceMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const SpeechRecognitionApi = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = async (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setInput(transcript);
        await submitMessage(transcript);
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) {
      return;
    }

    const userMessage: ChatEntry = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      agentSlug: autoRoute ? undefined : selectedAgentSlug
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setStatus('Agent responding...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          agentSlug: autoRoute ? undefined : selectedAgentSlug,
          conversationId: currentConversationId
        })
      });

      const data = (await response.json()) as {
        answer?: string;
        agent?: { slug: AgentSlug; name: string };
        conversationId?: string | null;
        persisted?: boolean;
        provider?: 'openai' | 'gemini' | 'continuity';
        usage?: {
          plan?: string;
          used?: number;
          limit?: number;
          field?: string;
        };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to generate a response.');
      }

      if (data.agent?.slug) {
        setSelectedAgentSlug(data.agent.slug);
      }

      if (data.conversationId) {
        setCurrentConversationId(data.conversationId);
      }

      const assistantMessage: ChatEntry = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer ?? 'No response received.',
        agentSlug: data.agent?.slug ?? selectedAgentSlug
      };

      const updatedMessages = [...nextMessages, assistantMessage];
      setMessages(updatedMessages);
      const usageBadge = data.usage ? ` • ${String(data.usage.plan ?? '').toUpperCase()} ${data.usage.used}/${data.usage.limit}` : '';
      const providerBadge = data.provider ? ` • ${data.provider}` : '';

      if (data.persisted) {
        setStatus(
          data.agent
            ? `${data.agent.name} answered${providerBadge}${usageBadge} • Synced to cloud`
            : `Response ready${providerBadge}${usageBadge} • Synced to cloud`
        );
        void loadConversationList(data.conversationId ?? undefined);
      } else {
        setStatus(data.agent ? `${data.agent.name} answered${providerBadge}${usageBadge}` : `Response ready${providerBadge}${usageBadge}`);
      }

      if (voiceMode && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(assistantMessage.content);
        utterance.rate = 1.03;
        utterance.pitch = 1.02;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong.';
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'assistant', content: errorMessage, agentSlug: selectedAgentSlug }
      ]);
      setStatus('Error');
    } finally {
      setLoading(false);
    }
  }

  function toggleListening() {
    if (!recognitionRef.current) {
      setStatus('Your browser does not support voice input.');
      return;
    }

    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    setStatus('Listening...');
    setListening(true);
    recognitionRef.current.start();
  }

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-sm backdrop-blur xl:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">
                <Image src="/logo.png" alt="Agentic Realm logo" width={16} height={16} className="rounded-full" />
                Agentic Realm
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  One web app. Six specialist AI agents. Chat or voice.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Economics, finance, technology, medical, law, and media agents auto-route user questions, answer in a clean chat interface, and speak back with browser voice mode.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="rounded-full bg-sun-100 px-3 py-1 font-medium text-slate-800">White + Yellow + Blue</span>
                <span className="rounded-full bg-sky-100 px-3 py-1 font-medium text-slate-800">Next.js + Tailwind</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-slate-800">Supabase-ready auth</span>
                <span
                  className={clsx(
                    'rounded-full px-3 py-1 font-medium',
                    isAuthenticated ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                  )}
                >
                  {isAuthenticated ? 'Cloud history active' : 'Local history mode'}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[28rem] lg:grid-cols-1 xl:grid-cols-3">
              <StatCard label="Agents" value="6" tone="bg-sky-50 text-sky-700" />
              <StatCard label="Modes" value="Chat + Voice" tone="bg-sun-50 text-slate-800" />
              <StatCard label="Deploy" value="Vercel" tone="bg-blue-50 text-blue-700" />
            </div>
          </div>

          <div className="mt-5 max-w-2xl">
            <MagicLinkHero />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.72fr_1.18fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-600">Threads</p>
                  <h2 className="text-lg font-semibold text-slate-900">Conversation manager</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void createConversationThread();
                  }}
                  disabled={!isAuthenticated || sidebarLoading}
                  className="rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  New thread
                </button>
              </div>

              {!isAuthenticated ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-900">
                  Sign in to unlock multi-thread cloud history.
                </div>
              ) : (
                <div className="space-y-2">
                  {conversationList.length ? (
                    conversationList.map((conversation) => (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => {
                          void loadConversationById(conversation.id);
                          setStatus('Conversation switched.');
                        }}
                        className={clsx(
                          'w-full rounded-2xl border px-3 py-3 text-left transition',
                          currentConversationId === conversation.id
                            ? 'border-sky-300 bg-sky-50'
                            : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/40'
                        )}
                      >
                        <p className="truncate text-sm font-semibold text-slate-900">{conversation.title}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{conversation.agent_slug}</span>
                          <span className="text-[11px] text-slate-500">
                            {new Date(conversation.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                      No cloud threads yet. Create one to get started.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {agents.map((agent) => (
                <button
                  key={agent.slug}
                  type="button"
                  onClick={() => {
                    setSelectedAgentSlug(agent.slug);
                    setAutoRoute(false);
                  }}
                  className={clsx(
                    'group rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-glow',
                    selectedAgentSlug === agent.slug
                      ? 'border-sky-300 bg-white shadow-glow'
                      : 'border-slate-200 bg-white/90'
                  )}
                >
                  <div className={clsx('mb-4 h-2 w-full rounded-full bg-gradient-to-r', agent.accent)} />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950">{agent.name}</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{agent.description}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{agent.shortName}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-600">Live assistant</p>
                  <h2 className="text-2xl font-semibold text-slate-950">{activeAgent.name}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <ToggleButton active={autoRoute} onClick={() => setAutoRoute((value) => !value)} label={autoRoute ? 'Auto-route on' : 'Auto-route off'} tone="sky" />
                  <ToggleButton active={voiceMode} onClick={() => setVoiceMode((value) => !value)} label={voiceMode ? 'Voice on' : 'Voice off'} tone="sun" />
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={clsx(
                      'rounded-full px-4 py-2 text-sm font-semibold transition',
                      listening ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-slate-900 text-white hover:bg-slate-800'
                    )}
                  >
                    {listening ? 'Stop mic' : 'Talk now'}
                  </button>
                </div>
              </div>

              <div className="mt-5 h-[34rem] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50/80">
                <div className="flex h-full flex-col">
                  <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
                    {messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                    {loading ? (
                      <div className="max-w-[80%] rounded-3xl rounded-bl-md border border-sky-100 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                        Thinking...
                      </div>
                    ) : null}
                    <div ref={chatEndRef} />
                  </div>

                  <form
                    className="border-t border-slate-200 bg-white p-3 sm:p-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitMessage();
                    }}
                  >
                    <div className="flex gap-3">
                      <textarea
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        placeholder={`Ask the ${activeAgent.shortName.toLowerCase()} agent anything...`}
                        className="min-h-[56px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="rounded-2xl bg-sun-400 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-sun-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Send
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Status: {status}</p>
                  </form>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <AuthPanel />

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-600">How it works</p>
              <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>1. Pick a field or leave auto-routing on.</li>
                <li>2. Ask via chat or press Talk to use browser speech input.</li>
                <li>3. The assistant answers with the matched agent voice style.</li>
                <li>4. Deploy to Vercel and connect Supabase + OpenAI env vars.</li>
              </ol>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MessageBubble({ message }: { message: ChatEntry }) {
  const isUser = message.role === 'user';
  const agent = message.agentSlug ? getAgentBySlug(message.agentSlug) : getAgentBySlug('technology');

  return (
    <div className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-[82%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm',
          isUser
            ? 'rounded-br-md bg-slate-900 text-white'
            : 'rounded-bl-md border border-sky-100 bg-white text-slate-800'
        )}
      >
        <div className="mb-1 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.22em]">
          <span className={isUser ? 'text-slate-400' : 'text-sky-600'}>{isUser ? 'You' : agent.shortName}</span>
        </div>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={clsx('rounded-3xl p-4 shadow-sm ring-1 ring-slate-100', tone)}>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  tone
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone: 'sky' | 'sun';
}) {
  const styles = tone === 'sky' ? 'border-sky-200 text-sky-700 bg-sky-50' : 'border-sun-200 text-slate-800 bg-sun-50';

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx('rounded-full border px-4 py-2 text-sm font-semibold transition', active ? styles : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50')}
    >
      {label}
    </button>
  );
}
