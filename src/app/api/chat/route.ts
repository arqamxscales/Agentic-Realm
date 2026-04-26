import { NextResponse } from 'next/server';
import { createConversationContext, requestOpenAIResponse } from '@/lib/openai';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function buildContinuityFallback(agentName: string, userMessage: string, reason: string) {
  const normalizedReason = reason.toUpperCase();
  const outageMessage = normalizedReason.includes('OPENAI_QUOTA_EXCEEDED')
    ? 'AI provider quota is currently exhausted.'
    : normalizedReason.includes('OPENAI_API_KEY_MISSING') || normalizedReason.includes('OPENAI_AUTH_INVALID')
      ? 'AI provider credentials are currently unavailable.'
      : 'AI provider is temporarily unavailable.';

  const safeSnippet = userMessage.trim().slice(0, 220) || 'your request';

  return [
    `${outageMessage} Running continuity mode so you can keep moving.`,
    '',
    `${agentName} quick draft for: "${safeSnippet}"`,
    '1) Clarify scope and target outcome in one sentence.',
    '2) List top constraints, risks, and assumptions.',
    '3) Build a step-by-step action plan with timeline and owner.',
    '',
    'Retry in a few minutes for full model-generated analysis.'
  ].join('\n');
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      agentSlug?: string;
      conversationId?: string;
      messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    const messages = payload.messages ?? [];
    const { agent, systemPrompt, messages: trimmedMessages } = createConversationContext(messages, payload.agentSlug);
    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';

    let answer: string;

    try {
      answer = await requestOpenAIResponse(trimmedMessages, systemPrompt);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'OPENAI_PROVIDER_UNAVAILABLE';
      answer = buildContinuityFallback(agent.name, latestUserMessage, reason);
    }

    let conversationId: string | null = payload.conversationId ?? null;
    let persisted = false;

    try {
      const supabase = await createSupabaseServerClient();

      if (supabase) {
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (user) {
          if (!conversationId) {
            const { data: createdConversation, error: conversationError } = await supabase
              .from('conversations')
              .insert({
                user_id: user.id,
                title: latestUserMessage.slice(0, 80) || 'New conversation',
                agent_slug: agent.slug
              })
              .select('id')
              .single();

            if (conversationError) {
              throw conversationError;
            }

            conversationId = createdConversation.id;
          }

          const existingRows = messages.slice(-2);
          const latestPair = existingRows.filter((entry) => entry.role === 'user').slice(-1);
          const userMessageToPersist = latestPair[0]?.content;

          if (userMessageToPersist) {
            const { error: userMessageError } = await supabase.from('messages').insert({
              conversation_id: conversationId,
              role: 'user',
              content: userMessageToPersist
            });

            if (userMessageError) {
              throw userMessageError;
            }
          }

          const { error: assistantMessageError } = await supabase.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: answer
          });

          if (assistantMessageError) {
            throw assistantMessageError;
          }

          const { error: conversationUpdateError } = await supabase
            .from('conversations')
            .update({
              agent_slug: agent.slug,
              updated_at: new Date().toISOString()
            })
            .eq('id', conversationId)
            .eq('user_id', user.id);

          if (conversationUpdateError) {
            throw conversationUpdateError;
          }

          persisted = true;
        }
      }
    } catch {
      persisted = false;
    }

    return NextResponse.json({
      agent: {
        slug: agent.slug,
        name: agent.name,
        description: agent.description
      },
      answer,
      conversationId,
      persisted
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
