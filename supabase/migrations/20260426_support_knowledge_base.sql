create table if not exists public.support_knowledge_base (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  content text not null,
  tags text[] not null default '{}',
  priority integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_knowledge_base_is_active_idx on public.support_knowledge_base (is_active);
create index if not exists support_knowledge_base_priority_idx on public.support_knowledge_base (priority desc);
create index if not exists support_knowledge_base_tags_gin_idx on public.support_knowledge_base using gin (tags);

alter table public.support_knowledge_base enable row level security;

drop policy if exists "Support KB is publicly readable" on public.support_knowledge_base;
create policy "Support KB is publicly readable" on public.support_knowledge_base
  for select using (is_active = true);

insert into public.support_knowledge_base (title, content, tags, priority, is_active)
values
  (
    'Upgrade and plan activation',
    'Use Subscription in the app to choose Silver, Gold, or Premium. For quick manual activation and billing confirmation, message WhatsApp +923554776466 with your account email and selected plan.',
    array['subscription', 'plan', 'upgrade', 'billing', 'premium', 'gold', 'silver'],
    100,
    true
  ),
  (
    'Prompt quota policy',
    'Prompt limits are monthly and per field. Silver: 2 prompts/field. Gold: 10 prompts/field ($15/month). Premium: 25 prompts/field ($40/month). Limits reset at start of each UTC month.',
    array['quota', 'limit', 'prompts', 'policy', 'monthly'],
    95,
    true
  ),
  (
    'Provider failover behavior',
    'The assistant uses OpenAI as primary provider and Gemini as fallback. If both providers fail, continuity guidance is returned so workflows do not break.',
    array['openai', 'gemini', 'fallback', 'continuity', 'error'],
    90,
    true
  ),
  (
    'Account and login troubleshooting',
    'Use magic-link login from the start screen. If link expires, request a new one. Ensure Supabase URL and anon key are configured in deployment environments.',
    array['auth', 'magic link', 'supabase', 'login', 'session'],
    85,
    true
  )
on conflict (title) do update
set
  content = excluded.content,
  tags = excluded.tags,
  priority = excluded.priority,
  is_active = excluded.is_active,
  updated_at = now();
