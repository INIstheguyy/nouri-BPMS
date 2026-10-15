create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  derived_name text;
begin
  if new.email is null then
    return new;
  end if;

  derived_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));

  if length(derived_name) < 2 then
    derived_name := 'Staff User';
  end if;

  insert into public.profiles (id, full_name, email, active)
  values (new.id, left(derived_name, 160), lower(new.email), false)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.get_my_access()
returns table (
  user_id uuid,
  full_name text,
  email text,
  roles text[],
  permissions text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.id,
    profile.full_name,
    profile.email,
    coalesce(
      array(
        select distinct role.code
        from public.profile_roles profile_role
        join public.roles role on role.id = profile_role.role_id
        where profile_role.profile_id = profile.id
        order by role.code
      ),
      array[]::text[]
    ),
    coalesce(
      array(
        select distinct permission.code
        from public.profile_roles profile_role
        join public.role_permissions role_permission on role_permission.role_id = profile_role.role_id
        join public.permissions permission on permission.id = role_permission.permission_id
        where profile_role.profile_id = profile.id
        order by permission.code
      ),
      array[]::text[]
    )
  from public.profiles profile
  where profile.id = (select auth.uid())
    and profile.active;
$$;

revoke all on function public.get_my_access() from public, anon, authenticated;
grant execute on function public.get_my_access() to authenticated;

create or replace function public.complete_staff_invite(
  target_user_id uuid,
  target_email text,
  target_full_name text,
  target_role_code text,
  actor_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_role_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service-role authorization required';
  end if;

  if not exists (
    select 1
    from public.profiles actor
    join public.profile_roles actor_role on actor_role.profile_id = actor.id
    join public.role_permissions role_permission on role_permission.role_id = actor_role.role_id
    join public.permissions permission on permission.id = role_permission.permission_id
    where actor.id = actor_user_id
      and actor.active
      and permission.code = 'staff.manage'
  ) then
    raise exception using errcode = '42501', message = 'Actor lacks staff.manage';
  end if;

  select role.id
  into selected_role_id
  from public.roles role
  where role.code = target_role_code
    and role.code in ('ORDER_MANAGER', 'EXECUTIVE_ADMIN');

  if selected_role_id is null then
    raise exception using errcode = '22023', message = 'Invalid staff role';
  end if;

  if length(trim(target_full_name)) < 2 or length(trim(target_full_name)) > 160 then
    raise exception using errcode = '22023', message = 'Invalid staff name';
  end if;

  insert into public.profiles (id, full_name, email, active)
  values (target_user_id, trim(target_full_name), lower(target_email), true)
  on conflict (id) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      active = true;

  delete from public.profile_roles
  where profile_id = target_user_id;

  insert into public.profile_roles (profile_id, role_id, assigned_by_user_id)
  values (target_user_id, selected_role_id, actor_user_id);

  insert into public.order_events (
    entity_type,
    entity_id,
    actor_user_id,
    action,
    metadata
  ) values (
    'PROFILE',
    target_user_id,
    actor_user_id,
    'STAFF_CREATED',
    jsonb_build_object('email', lower(target_email), 'role', target_role_code)
  );
end;
$$;

create or replace function public.set_staff_active(
  target_user_id uuid,
  target_active boolean,
  actor_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service-role authorization required';
  end if;

  if not exists (
    select 1
    from public.profiles actor
    join public.profile_roles actor_role on actor_role.profile_id = actor.id
    join public.role_permissions role_permission on role_permission.role_id = actor_role.role_id
    join public.permissions permission on permission.id = role_permission.permission_id
    where actor.id = actor_user_id
      and actor.active
      and permission.code = 'staff.manage'
  ) then
    raise exception using errcode = '42501', message = 'Actor lacks staff.manage';
  end if;

  if target_user_id = actor_user_id and not target_active then
    raise exception using errcode = '22023', message = 'Administrators cannot deactivate themselves';
  end if;

  update public.profiles
  set active = target_active
  where id = target_user_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Staff profile not found';
  end if;

  insert into public.order_events (
    entity_type,
    entity_id,
    actor_user_id,
    action,
    metadata
  ) values (
    'PROFILE',
    target_user_id,
    actor_user_id,
    case when target_active then 'STAFF_ACTIVATED' else 'STAFF_DEACTIVATED' end,
    jsonb_build_object('active', target_active)
  );
end;
$$;

revoke all on function public.complete_staff_invite(uuid, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.set_staff_active(uuid, boolean, uuid) from public, anon, authenticated;
grant execute on function public.complete_staff_invite(uuid, text, text, text, uuid) to service_role;
grant execute on function public.set_staff_active(uuid, boolean, uuid) to service_role;

comment on function public.get_my_access() is 'Returns the active authenticated staff profile and server-owned access claims.';
comment on function public.complete_staff_invite(uuid, text, text, text, uuid) is 'Service-role-only transactional profile, role, and audit finalization for an Auth invitation.';
comment on function public.set_staff_active(uuid, boolean, uuid) is 'Service-role-only staff activation state change with permission verification and audit.';
