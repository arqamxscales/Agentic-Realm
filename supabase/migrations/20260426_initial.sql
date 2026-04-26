create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  agent_slug text not null default 'technology',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  token_count integer,
  created_at timestamptz not null default now()
);

create index if not exists conversations_user_id_idx on public.conversations (user_id);
create index if not exists messages_conversation_id_idx on public.messages (conversation_id);

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Profiles are readable by owner" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles are updatable by owner" on public.profiles
  for update using (auth.uid() = id);

create policy "Conversations are readable by owner" on public.conversations
  for select using (auth.uid() = user_id);

create policy "Conversations are insertable by owner" on public.conversations
  for insert with check (auth.uid() = user_id);

create policy "Conversations are updatable by owner" on public.conversations
  for update using (auth.uid() = user_id);

create policy "Messages are readable through owned conversations" on public.messages
  for select using (
    exists (
      select 1 from public.conversations
      where public.conversations.id = public.messages.conversation_id
      and public.conversations.user_id = auth.uid()
    )
  );

create policy "Messages are insertable through owned conversations" on public.messages
  for insert with check (
    exists (
      select 1 from public.conversations
      where public.conversations.id = public.messages.conversation_id
      and public.conversations.user_id = auth.uid()
    )
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
