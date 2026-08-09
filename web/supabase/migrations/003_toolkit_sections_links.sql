alter table public.toolkits
  add column if not exists sections jsonb,
  add column if not exists links jsonb;
