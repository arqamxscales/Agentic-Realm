import { buildSystemPrompt, getAgentBySlug, routeAgent } from '@/lib/agents';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export function createConversationContext(messages: ChatMessage[], agentSlug?: string) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';
  const routedAgent = routeAgent(latestUserMessage);
  const selectedAgent = agentSlug ? getAgentBySlug(agentSlug) : routedAgent;
  const trimmedMessages = messages.slice(-12).map((message) => ({
    role: message.role,
    content: message.content
  }));

  return {
    agent: selectedAgent,
    systemPrompt: buildSystemPrompt(selectedAgent.slug),
    messages: trimmedMessages
  };
}

export async function requestOpenAIResponse(messages: Array<{ role: string; content: string }>, systemPrompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY_MISSING');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.4,
      messages: [{ role: 'system', content: systemPrompt }, ...messages]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let openaiErrorCode: string | undefined;

    try {
      const parsedError = JSON.parse(errorText) as {
        error?: {
          code?: string;
          type?: string;
        };
      };

      openaiErrorCode = parsedError.error?.code ?? parsedError.error?.type;
    } catch {
      // Ignore JSON parse failure and map by status code below.
    }

    if (openaiErrorCode === 'insufficient_quota') {
      throw new Error('OPENAI_QUOTA_EXCEEDED');
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error('OPENAI_AUTH_INVALID');
    }

    throw new Error('OPENAI_PROVIDER_UNAVAILABLE');
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  return payload.choices?.[0]?.message?.content?.trim() ?? 'I could not generate a response right now.';
}
