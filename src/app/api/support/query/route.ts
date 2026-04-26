import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type KnowledgeArticle = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  priority: number;
};

function scoreArticle(article: KnowledgeArticle, query: string) {
  const normalized = query.toLowerCase();
  const words = normalized.split(/\s+/).filter((word) => word.length >= 3);

  let score = article.priority;

  if (article.title.toLowerCase().includes(normalized)) {
    score += 24;
  }

  if (article.content.toLowerCase().includes(normalized)) {
    score += 16;
  }

  for (const word of words) {
    if (article.title.toLowerCase().includes(word)) {
      score += 6;
    }

    if (article.content.toLowerCase().includes(word)) {
      score += 2;
    }

    if (article.tags.some((tag) => tag.toLowerCase().includes(word))) {
      score += 7;
    }
  }

  return score;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { query?: string };
    const query = payload.query?.trim();

    if (!query) {
      return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({
        answer: 'Support knowledge base is not available right now. Contact WhatsApp +923554776466 for quick assistance.',
        matches: []
      });
    }

    const { data, error } = await supabase
      .from('support_knowledge_base')
      .select('id, title, content, tags, priority')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as KnowledgeArticle[];

    if (!rows.length) {
      return NextResponse.json({
        answer: 'Knowledge base is empty. Contact WhatsApp +923554776466 for quick assistance.',
        matches: []
      });
    }

    const ranked = rows
      .map((article) => ({ article, score: scoreArticle(article, query) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const best = ranked[0]?.article;

    if (!best) {
      return NextResponse.json({
        answer: 'No direct match found. Please contact WhatsApp +923554776466 with your account email for quick support.',
        matches: []
      });
    }

    const answer = [
      `Best support match: ${best.title}`,
      best.content,
      '',
      'For urgent account action, contact WhatsApp +923554776466.'
    ].join('\n');

    return NextResponse.json({
      answer,
      matches: ranked.map((entry) => ({
        id: entry.article.id,
        title: entry.article.title,
        tags: entry.article.tags,
        priority: entry.article.priority,
        score: entry.score
      }))
    });
  } catch {
    return NextResponse.json({
      answer: 'Support service is temporarily unavailable. Contact WhatsApp +923554776466 for quick assistance.',
      matches: []
    });
  }
}
