-- Synchronisation privée Les Caves de Saint Jean.
-- À appliquer dans le projet Supabase une seule fois.

create extension if not exists pgcrypto;

create table if not exists public.caves (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cave_members (
  cave_id uuid not null references public.caves(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  primary key (cave_id, user_id)
);

-- Le BI actuel reste un document cohérent : produits, stocks, ventes et factures
-- sont synchronisés ensemble avec un numéro de révision.
create table if not exists public.cave_snapshots (
  cave_id uuid primary key references public.caves(id) on delete cascade,
  revision bigint not null default 0,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.product_photos (
  id uuid primary key,
  cave_id uuid not null references public.caves(id) on delete cascade,
  product_id text,
  title text not null default '',
  notes text not null default '',
  vintage text not null default '',
  appellation text not null default '',
  ean text not null default '',
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.caves enable row level security;
alter table public.cave_members enable row level security;
alter table public.cave_snapshots enable row level security;
alter table public.product_photos enable row level security;

create or replace function public.is_cave_member(target_cave uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from public.cave_members
  where cave_id = target_cave and user_id = auth.uid()
) $$;

drop policy if exists "members read caves" on public.caves;
create policy "members read caves" on public.caves for select
using (public.is_cave_member(id));

drop policy if exists "members read memberships" on public.cave_members;
create policy "members read memberships" on public.cave_members for select
using (user_id = auth.uid() or public.is_cave_member(cave_id));

drop policy if exists "members read snapshots" on public.cave_snapshots;
create policy "members read snapshots" on public.cave_snapshots for select
using (public.is_cave_member(cave_id));
drop policy if exists "members insert snapshots" on public.cave_snapshots;
create policy "members insert snapshots" on public.cave_snapshots for insert
with check (public.is_cave_member(cave_id) and updated_by = auth.uid());
drop policy if exists "members update snapshots" on public.cave_snapshots;
create policy "members update snapshots" on public.cave_snapshots for update
using (public.is_cave_member(cave_id))
with check (public.is_cave_member(cave_id) and updated_by = auth.uid());

drop policy if exists "members read photos" on public.product_photos;
create policy "members read photos" on public.product_photos for select
using (public.is_cave_member(cave_id));
drop policy if exists "members insert photos" on public.product_photos;
create policy "members insert photos" on public.product_photos for insert
with check (public.is_cave_member(cave_id) and updated_by = auth.uid());
drop policy if exists "members update photos" on public.product_photos;
create policy "members update photos" on public.product_photos for update
using (public.is_cave_member(cave_id))
with check (public.is_cave_member(cave_id) and updated_by = auth.uid());
drop policy if exists "members delete photos" on public.product_photos;
create policy "members delete photos" on public.product_photos for delete
using (public.is_cave_member(cave_id));

insert into storage.buckets (id, name, public)
values ('cave-product-photos', 'cave-product-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "members read photo objects" on storage.objects;
create policy "members read photo objects" on storage.objects for select
using (
  bucket_id = 'cave-product-photos'
  and public.is_cave_member((storage.foldername(name))[1]::uuid)
);
drop policy if exists "members upload photo objects" on storage.objects;
create policy "members upload photo objects" on storage.objects for insert
with check (
  bucket_id = 'cave-product-photos'
  and public.is_cave_member((storage.foldername(name))[1]::uuid)
);
drop policy if exists "members update photo objects" on storage.objects;
create policy "members update photo objects" on storage.objects for update
using (
  bucket_id = 'cave-product-photos'
  and public.is_cave_member((storage.foldername(name))[1]::uuid)
);
drop policy if exists "members delete photo objects" on storage.objects;
create policy "members delete photo objects" on storage.objects for delete
using (
  bucket_id = 'cave-product-photos'
  and public.is_cave_member((storage.foldername(name))[1]::uuid)
);

