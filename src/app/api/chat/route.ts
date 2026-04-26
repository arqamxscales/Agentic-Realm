import { NextResponse } from 'next/server';
import { createConversationContext, requestModelResponse } from '@/lib/openai';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  buildQuotaExceededMessage,
  getMonthlyWindowStartIso,
  getPromptsPerFieldLimit,
  normalizePlan,
  WHATSAPP_CONTACT
} from '@/lib/subscription';

export const runtime = 'nodejs';

function buildContinuityFallback(agentName: string, userMessage: string, reason: string) {
  const normalizedReason = reason.toUpperCase();
  const outageMessage = normalizedReason.includes('OPENAI_QUOTA_EXCEEDED')
    ? 'AI provider quota is currently exhausted.'
    : normalizedReason.includes('OPENAI_QUOTA_EXCEEDED') || normalizedReason.includes('GEMINI_QUOTA_EXCEEDED')
      ? 'AI provider quota is currently exhausted.'
    : normalizedReason.includes('OPENAI_API_KEY_MISSING') || normalizedReason.includes('OPENAI_AUTH_INVALID')
      || normalizedReason.includes('GEMINI_API_KEY_MISSING') || normalizedReason.includes('GEMINI_AUTH_INVALID')
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

    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: `Sign in required for subscription plans. Contact WhatsApp ${WHATSAPP_CONTACT} for quick access.` },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle();
    const plan = normalizePlan(profile?.plan);
    const promptsPerFieldLimit = getPromptsPerFieldLimit(plan);
    const monthStartIso = getMonthlyWindowStartIso();

    const { data: userConversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user.id)
      .eq('agent_slug', agent.slug);

    const conversationIds = (userConversations ?? []).map((conversation) => conversation.id);
    let usedPromptsThisField = 0;

    if (conversationIds.length) {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'user')
        .gte('created_at', monthStartIso)
        .in('conversation_id', conversationIds);

      usedPromptsThisField = count ?? 0;
    }

    if (usedPromptsThisField >= promptsPerFieldLimit) {
      return NextResponse.json(
        {
          error: buildQuotaExceededMessage(plan, agent.slug),
          quota: {
            plan,
            field: agent.slug,
            used: usedPromptsThisField,
            limit: promptsPerFieldLimit,
            whatsappContact: WHATSAPP_CONTACT
          }
        },
        { status: 429 }
      );
    }

    let answer: string;
    let provider: 'openai' | 'gemini' | 'continuity' = 'continuity';

    try {
      const result = await requestModelResponse(trimmedMessages, systemPrompt);
      answer = result.answer;
      provider = result.provider;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'OPENAI_PROVIDER_UNAVAILABLE';
      answer = buildContinuityFallback(agent.name, latestUserMessage, reason);
      provider = 'continuity';
    }

    let conversationId: string | null = payload.conversationId ?? null;
    let persisted = false;

    try {
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
      persisted,
      provider,
      usage: {
        plan,
        field: agent.slug,
        used: usedPromptsThisField + 1,
        limit: promptsPerFieldLimit
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
