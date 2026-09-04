-- ============================================================
-- TRADING DASHBOARD ACCOUNT LINKING + READ-ONLY SECURITY
-- Run this once in Supabase SQL Editor.
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  telegram_username text,
  telegram_user_id bigint unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.telegram_link_requests (
  id bigserial primary key,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  requested_username text not null,
  code text not null unique,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.telegram_link_requests enable row level security;
alter table public.trades enable row level security;

drop policy if exists "profile own select" on public.profiles;
create policy "profile own select"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profile own insert" on public.profiles;
create policy "profile own insert"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profile own update" on public.profiles;
create policy "profile own update"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "link requests own select" on public.telegram_link_requests;
create policy "link requests own select"
on public.telegram_link_requests
for select
to authenticated
using (auth_user_id = auth.uid());

-- READ ONLY from the website.
drop policy if exists "website users read linked trades" on public.trades;
create policy "website users read linked trades"
on public.trades
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.telegram_user_id = trades.user_id
  )
);

-- There are deliberately NO INSERT / UPDATE / DELETE policies on trades for authenticated users.

create or replace function public.start_telegram_link(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  v_username := lower(trim(both '@' from trim(p_username)));

  if length(v_username) < 3 then
    raise exception 'Enter a valid Telegram username';
  end if;

  v_code := upper(substr(md5(random()::text || clock_timestamp()::text || auth.uid()::text), 1, 8));

  insert into public.profiles (id, telegram_username)
  values (auth.uid(), v_username)
  on conflict (id) do update
  set telegram_username = excluded.telegram_username,
      updated_at = now();

  delete from public.telegram_link_requests
  where auth_user_id = auth.uid()
    and verified_at is null;

  insert into public.telegram_link_requests (
    auth_user_id,
    requested_username,
    code,
    expires_at
  )
  values (
    auth.uid(),
    v_username,
    v_code,
    now() + interval '15 minutes'
  );

  return v_code;
end;
$$;

grant execute on function public.start_telegram_link(text) to authenticated;
