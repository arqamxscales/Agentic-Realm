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
    throw new Error('OPENAI_API_KEY is missing. Add it to your environment variables (local and deployment).');
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
    throw new Error(errorText || 'OpenAI request failed.');
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
