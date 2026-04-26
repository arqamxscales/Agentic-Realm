import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteParams) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, title, agent_slug, updated_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (conversationError) {
      throw conversationError;
    }

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', id)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    return NextResponse.json({ conversation, messages: messages ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
