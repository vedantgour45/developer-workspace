-- Developer Workspace — Supabase schema
-- Run this file once in Supabase Studio → SQL Editor → New query → Run.
-- Re-running is safe: every statement is idempotent.
--
-- Model: single shared workspace. Every authenticated user can read and
-- write every row. The `owner_*` / `actor_*` columns just stamp who did
-- what; they don't gate access. Switch RLS to owner-scoped if you later
-- want strict per-user isolation.

-- ---------- Extensions ----------
create extension if not exists pgcrypto;

-- ---------- profiles ----------
-- Lightweight directory of users who have signed in. The host upserts
-- the current user's row on every auth-state change. This is what
-- powers the "active users" dropdown when assigning a task.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default 'Member',
  email       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- tasks ----------
create table if not exists public.tasks (
  id            text primary key,
  key           text not null,
  title         text not null,
  description   text not null default '',
  status        text not null default 'backlog'
                check (status in ('backlog','in_progress','in_review','done')),
  priority      text not null default 'medium'
                check (priority in ('low','medium','high','urgent')),
  tags          text[] not null default '{}',
  -- Legacy single-assignee text (kept for backward compat with older rows).
  assignee      text not null default 'You',
  -- New multi-assignee model: array of {id, name} objects.
  assignees     jsonb not null default '[]'::jsonb,
  story_points  int,
  due_date      date,
  subtasks      jsonb not null default '[]'::jsonb,
  comments      jsonb not null default '[]'::jsonb,
  "order"       int not null default 0,
  owner_id      uuid references auth.users(id) on delete set null,
  owner_name    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  completed_at  timestamptz
);

-- Add new columns if upgrading from the pre-multi-assignee schema.
alter table public.tasks add column if not exists assignees  jsonb not null default '[]'::jsonb;
alter table public.tasks add column if not exists owner_name text;

create index if not exists tasks_status_order_idx on public.tasks (status, "order");
create index if not exists tasks_updated_at_idx   on public.tasks (updated_at desc);

-- ---------- docs ----------
create table if not exists public.docs (
  id          text primary key,
  title       text not null default 'Untitled',
  content     text not null default '',
  emoji       text not null default '📝',
  cover       jsonb not null default '{"kind":"none"}'::jsonb,
  tags        text[] not null default '{}',
  pinned      boolean not null default false,
  owner_id    uuid references auth.users(id) on delete set null,
  owner_name  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.docs add column if not exists owner_name text;

create index if not exists docs_updated_at_idx on public.docs (updated_at desc);

-- ---------- activity ----------
create table if not exists public.activity (
  id          text primary key,
  task_id     text not null,
  task_title  text not null,
  type        text not null
              check (type in ('created','moved','edited','completed','deleted','commented')),
  from_status text,
  to_status   text,
  actor_id    uuid references auth.users(id) on delete set null,
  actor_name  text,
  at          timestamptz not null default now()
);

create index if not exists activity_at_idx on public.activity (at desc);

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.tasks    enable row level security;
alter table public.docs     enable row level security;
alter table public.activity enable row level security;

-- One policy per table — every signed-in user can do everything.
-- Drop-and-recreate so re-running this file picks up policy edits.
drop policy if exists "profiles_all_authenticated" on public.profiles;
drop policy if exists "tasks_all_authenticated"    on public.tasks;
drop policy if exists "docs_all_authenticated"     on public.docs;
drop policy if exists "activity_all_authenticated" on public.activity;

create policy "profiles_all_authenticated"
  on public.profiles for all
  to authenticated
  using (true) with check (true);

create policy "tasks_all_authenticated"
  on public.tasks for all
  to authenticated
  using (true) with check (true);

create policy "docs_all_authenticated"
  on public.docs for all
  to authenticated
  using (true) with check (true);

create policy "activity_all_authenticated"
  on public.activity for all
  to authenticated
  using (true) with check (true);

-- ---------- Realtime ----------
-- Make sure each table is part of the realtime publication so the
-- Supabase client receives INSERT / UPDATE / DELETE events.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'profiles'
  ) then
    execute 'alter publication supabase_realtime add table public.profiles';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'tasks'
  ) then
    execute 'alter publication supabase_realtime add table public.tasks';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'docs'
  ) then
    execute 'alter publication supabase_realtime add table public.docs';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'activity'
  ) then
    execute 'alter publication supabase_realtime add table public.activity';
  end if;
end $$;
