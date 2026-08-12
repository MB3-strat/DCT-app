alter table public.profiles
  add column if not exists certificate_payment_status text not null default 'none',
  add column if not exists certificate_paid_at timestamptz,
  add column if not exists stripe_certificate_session_id text unique;
