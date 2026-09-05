-- HSC Maths Hub cloud-sync schema. Run in a Supabase project before enabling auth.
-- Every table is private to the signed-in user through Row Level Security.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  school_name text,
  school_slug text,
  subjects jsonb not null default '{"ext1":true,"ext2":false}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  state_key text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, state_key)
);

alter table public.profiles enable row level security;
alter table public.user_state enable row level security;

revoke all on public.profiles from anon;
revoke all on public.user_state from anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.user_state to authenticated;

create policy "users read own profile" on public.profiles
for select to authenticated using (auth.uid() = user_id);
create policy "users insert own profile" on public.profiles
for insert to authenticated with check (auth.uid() = user_id);
create policy "users update own profile" on public.profiles
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own profile" on public.profiles
for delete to authenticated using (auth.uid() = user_id);

create policy "users read own state" on public.user_state
for select to authenticated using (auth.uid() = user_id);
create policy "users insert own state" on public.user_state
for insert to authenticated with check (auth.uid() = user_id);
create policy "users update own state" on public.user_state
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own state" on public.user_state
for delete to authenticated using (auth.uid() = user_id);

-- Intended state_key values:
-- profile is stored in public.profiles
-- mastery -> traffic-light mastery localStorage payload
-- performance -> Preliminary/HSC assessment and rank-model payload
