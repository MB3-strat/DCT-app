create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  roles text[] not null default '{}',
  subscription_status text not null default 'none',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_current_period_end timestamptz,
  certificate_payment_status text not null default 'none',
  certificate_paid_at timestamptz,
  stripe_certificate_session_id text unique,
  active_session_id text,
  active_session_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.modules (
  id text primary key,
  slug text not null unique,
  title text not null,
  category text not null,
  urgency text not null,
  tags text[] not null default '{}',
  quote text not null default '',
  sections jsonb not null default '[]'::jsonb,
  version text not null default '1.0',
  clinical_owner text not null default '',
  last_reviewed text not null default 'Needs clinical review',
  next_review text not null default 'Needs clinical review',
  status text not null default 'needs-review',
  source jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.toolkits (
  id text primary key,
  slug text not null unique,
  title text not null,
  category text not null,
  type text not null,
  urgency text not null,
  icon text not null default '',
  introduction text not null default '',
  steps text[],
  items text[],
  warnings text[],
  escalation text,
  related_modules text[],
  sources text not null default '',
  version text not null default '1.0',
  clinical_owner text not null default '',
  last_reviewed text not null default 'Needs clinical review',
  next_review text not null default 'Needs clinical review',
  status text not null default 'needs-review',
  placeholder boolean not null default false,
  source jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id text not null,
  kind text not null check (kind in ('module', 'toolkit')),
  created_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

create table if not exists public.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id text not null,
  kind text not null check (kind in ('module', 'toolkit')),
  read boolean not null default false,
  completed_item_indexes integer[],
  updated_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

create table if not exists public.trust_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.reported_issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  issue_type text not null check (issue_type in ('clinical', 'technical')),
  content_id text,
  title text,
  description text not null,
  url text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.modules enable row level security;
alter table public.toolkits enable row level security;
alter table public.bookmarks enable row level security;
alter table public.progress enable row level security;
alter table public.trust_settings enable row level security;
alter table public.reported_issues enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile name" on public.profiles;
drop policy if exists "Authenticated users can read modules" on public.modules;
drop policy if exists "Authenticated users can read toolkits" on public.toolkits;
drop policy if exists "Users manage own bookmarks" on public.bookmarks;
drop policy if exists "Users manage own progress" on public.progress;
drop policy if exists "Users manage own trust settings" on public.trust_settings;
drop policy if exists "Users create own reports" on public.reported_issues;
drop policy if exists "Users read own reports" on public.reported_issues;

create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile name" on public.profiles for update using (auth.uid() = id);
create policy "Authenticated users can read modules" on public.modules for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read toolkits" on public.toolkits for select using (auth.role() = 'authenticated');
create policy "Users manage own bookmarks" on public.bookmarks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own progress" on public.progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own trust settings" on public.trust_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users create own reports" on public.reported_issues for insert with check (auth.uid() = user_id);
create policy "Users read own reports" on public.reported_issues for select using (auth.uid() = user_id);
