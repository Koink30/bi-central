-- Synchronisation privée Les Caves de Saint Jean.
-- Version 1 : un même compte Supabase est utilisé sur le PC et l'iPhone.

create table if not exists public.cave_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.product_photos (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text,
  title text not null default '',
  notes text not null default '',
  vintage text not null default '',
  appellation text not null default '',
  ean text not null default '',
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_photos_user_product_idx
on public.product_photos (user_id, product_id);

alter table public.cave_snapshots enable row level security;
alter table public.product_photos enable row level security;

drop policy if exists "owner reads snapshot" on public.cave_snapshots;
create policy "owner reads snapshot" on public.cave_snapshots for select
to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "owner creates snapshot" on public.cave_snapshots;
create policy "owner creates snapshot" on public.cave_snapshots for insert
to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "owner updates snapshot" on public.cave_snapshots;
create policy "owner updates snapshot" on public.cave_snapshots for update
to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "owner reads photos" on public.product_photos;
create policy "owner reads photos" on public.product_photos for select
to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "owner creates photos" on public.product_photos;
create policy "owner creates photos" on public.product_photos for insert
to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "owner updates photos" on public.product_photos;
create policy "owner updates photos" on public.product_photos for update
to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists "owner deletes photos" on public.product_photos;
create policy "owner deletes photos" on public.product_photos for delete
to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update on public.cave_snapshots to authenticated;
grant select, insert, update, delete on public.product_photos to authenticated;
revoke all on public.cave_snapshots from anon;
revoke all on public.product_photos from anon;

insert into storage.buckets (id, name, public)
values ('cave-product-photos', 'cave-product-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "owner reads photo objects" on storage.objects;
create policy "owner reads photo objects" on storage.objects for select
to authenticated using (
  bucket_id = 'cave-product-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists "owner uploads photo objects" on storage.objects;
create policy "owner uploads photo objects" on storage.objects for insert
to authenticated with check (
  bucket_id = 'cave-product-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists "owner updates photo objects" on storage.objects;
create policy "owner updates photo objects" on storage.objects for update
to authenticated using (
  bucket_id = 'cave-product-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
) with check (
  bucket_id = 'cave-product-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists "owner deletes photo objects" on storage.objects;
create policy "owner deletes photo objects" on storage.objects for delete
to authenticated using (
  bucket_id = 'cave-product-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
