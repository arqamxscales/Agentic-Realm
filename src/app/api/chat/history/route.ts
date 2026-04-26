import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({
        authenticated: false,
        conversation: null,
        messages: []
      });
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        conversation: null,
        messages: []
      });
    }

    const url = new URL(request.url);
    const requestedConversationId = url.searchParams.get('conversationId');

    let conversationQuery = supabase
      .from('conversations')
      .select('id, title, agent_slug, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (requestedConversationId) {
      conversationQuery = supabase
        .from('conversations')
        .select('id, title, agent_slug, updated_at')
        .eq('id', requestedConversationId)
        .eq('user_id', user.id)
        .limit(1);
    }

    const { data: conversations, error: conversationError } = await conversationQuery;

    if (conversationError) {
      throw conversationError;
    }

    const conversation = conversations?.[0] ?? null;

    if (!conversation) {
      return NextResponse.json({
        authenticated: true,
        conversation: null,
        messages: []
      });
    }

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversation.id)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    return NextResponse.json({
      authenticated: true,
      conversation,
      messages: messages ?? []
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
