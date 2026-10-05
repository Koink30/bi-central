-- Shared cave: membership is checked in the database on every request.
create schema if not exists cave_private;
revoke all on schema cave_private from public, anon;
grant usage on schema cave_private to authenticated;
create table public.cave_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','user')),
  email text not null,
  created_at timestamptz not null default now()
);
create index cave_members_owner_idx on public.cave_members(owner_id);
alter table public.cave_members enable row level security;
insert into public.cave_members(user_id,owner_id,role,email)
select s.user_id,s.user_id,'admin',u.email from public.cave_snapshots s join auth.users u on u.id=s.user_id;
create function cave_private.member_of(target uuid, admins_only boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from public.cave_members m where m.user_id=auth.uid() and m.owner_id=target and (not admins_only or m.role='admin'));
$$;
revoke all on function cave_private.member_of(uuid,boolean) from public,anon;
grant execute on function cave_private.member_of(uuid,boolean) to authenticated;
create policy "read own membership or administer cave" on public.cave_members for select to authenticated
using(user_id=(select auth.uid()) or cave_private.member_of(owner_id,true));
grant select on public.cave_members to authenticated;
revoke all on public.cave_members from anon;
-- The existing owner policies remain compatible with older installed apps.
create policy "team reads snapshot" on public.cave_snapshots for select to authenticated using(cave_private.member_of(user_id));
create policy "team updates snapshot" on public.cave_snapshots for update to authenticated using(cave_private.member_of(user_id)) with check(cave_private.member_of(user_id));
create policy "team creates snapshot" on public.cave_snapshots for insert to authenticated with check(cave_private.member_of(user_id));
create policy "team reads photos" on public.product_photos for select to authenticated using(cave_private.member_of(user_id));
create policy "team creates photos" on public.product_photos for insert to authenticated with check(cave_private.member_of(user_id));
create policy "team updates photos" on public.product_photos for update to authenticated using(cave_private.member_of(user_id)) with check(cave_private.member_of(user_id));
create policy "team deletes photos" on public.product_photos for delete to authenticated using(cave_private.member_of(user_id));
create policy "team reads objects" on storage.objects for select to authenticated using(bucket_id='cave-product-photos' and (storage.foldername(name))[1] in (select owner_id::text from public.cave_members where user_id=(select auth.uid())));
create policy "team creates objects" on storage.objects for insert to authenticated with check(bucket_id='cave-product-photos' and (storage.foldername(name))[1] in (select owner_id::text from public.cave_members where user_id=(select auth.uid())));
create policy "team updates objects" on storage.objects for update to authenticated using(bucket_id='cave-product-photos' and (storage.foldername(name))[1] in (select owner_id::text from public.cave_members where user_id=(select auth.uid()))) with check(bucket_id='cave-product-photos' and (storage.foldername(name))[1] in (select owner_id::text from public.cave_members where user_id=(select auth.uid())));
create policy "team deletes objects" on storage.objects for delete to authenticated using(bucket_id='cave-product-photos' and (storage.foldername(name))[1] in (select owner_id::text from public.cave_members where user_id=(select auth.uid())));
-- Lookup by exact email only, and only from an administrator of this cave.
create function cave_private.set_member(member_email text, member_role text)
returns void language plpgsql security definer set search_path='' as $$
declare actor public.cave_members; target uuid;
begin
 select * into actor from public.cave_members where user_id=auth.uid();
 if auth.uid() is null or actor.role is distinct from 'admin' then raise exception 'Accès administrateur requis'; end if;
 if member_role not in ('admin','user','remove') then raise exception 'Rôle invalide'; end if;
 select id into target from auth.users where lower(email)=lower(trim(member_email));
 if target is null then raise exception 'Ce compte doit d’abord être créé et son e-mail confirmé'; end if;
 if target=actor.owner_id then raise exception 'Le compte propriétaire conserve son accès administrateur'; end if;
 if exists(select 1 from public.cave_members where user_id=target and owner_id<>actor.owner_id) then raise exception 'Ce compte appartient déjà à une autre cave'; end if;
 if member_role='remove' then delete from public.cave_members where user_id=target and owner_id=actor.owner_id;
 else insert into public.cave_members(user_id,owner_id,role,email) values(target,actor.owner_id,member_role,lower(trim(member_email))) on conflict(user_id) do update set role=excluded.role,email=excluded.email; end if;
end; $$;
revoke all on function cave_private.set_member(text,text) from public,anon;
grant execute on function cave_private.set_member(text,text) to authenticated;
create function public.cave_set_member(member_email text,member_role text)
returns void language sql security invoker set search_path='' as $$ select cave_private.set_member(member_email,member_role); $$;
revoke all on function public.cave_set_member(text,text) from public,anon;
grant execute on function public.cave_set_member(text,text) to authenticated;
-- Operators cannot change business settings or restore/reset the entire cave.
create function cave_private.protect_settings() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is not null and not cave_private.member_of(new.user_id,true) and new.user_id<>auth.uid() then
  if new.state->'settings' is distinct from old.state->'settings' or new.state->'archive' is distinct from old.state->'archive'
   or new.state->'state'->'settings' is distinct from old.state->'state'->'settings'
   or new.state->'state'->'archive' is distinct from old.state->'state'->'archive' then raise exception 'Réglages et restauration réservés aux administrateurs'; end if;
 end if;
 return new;
end; $$;
revoke all on function cave_private.protect_settings() from public,anon;
create trigger cave_protect_settings before update on public.cave_snapshots for each row execute function cave_private.protect_settings();
