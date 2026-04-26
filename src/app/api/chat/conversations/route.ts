import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({ authenticated: false, conversations: [] });
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ authenticated: false, conversations: [] });
    }

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, title, agent_slug, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ authenticated: true, conversations: conversations ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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

    const payload = (await request.json()) as {
      title?: string;
      agentSlug?: string;
    };

    const title = payload.title?.trim() || 'New conversation';
    const agentSlug = payload.agentSlug?.trim() || 'technology';

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title: title.slice(0, 100),
        agent_slug: agentSlug
      })
      .select('id, title, agent_slug, updated_at')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
