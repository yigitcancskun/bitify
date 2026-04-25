create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  username text not null unique,
  xp integer not null default 0,
  level integer not null default 1,
  credits integer not null default 3,
  streak_count integer not null default 0,
  last_checkin_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists auth_user_id uuid unique;

create table if not exists public.avatar_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_number integer not null default 1,
  image_url text,
  source_front_url text,
  source_back_url text,
  stats jsonb not null default '{"muscle":24,"fat":42,"posture":50,"tone":28}'::jsonb,
  wiro_task_id text,
  wiro_status text not null default 'running',
  wiro_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null default current_date,
  workout boolean not null default false,
  diet boolean not null default false,
  water_cups integer not null default 0,
  xp_earned integer not null default 0,
  credits_earned integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, log_date)
);

create index if not exists avatar_versions_user_created_idx
  on public.avatar_versions(user_id, created_at desc);

create index if not exists daily_logs_user_date_idx
  on public.daily_logs(user_id, log_date desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists daily_logs_touch_updated_at on public.daily_logs;
create trigger daily_logs_touch_updated_at
before update on public.daily_logs
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.avatar_versions enable row level security;
alter table public.daily_logs enable row level security;

-- MVP note:
-- This hackathon backend uses SUPABASE_SERVICE_ROLE_KEY from FastAPI only.
-- Do not expose the service role key in Next.js. Client-side Supabase auth is out of scope.
-- Storage buckets to create in Supabase:
--   body-uploads: private
--   avatar-generations: public for demo simplicity
