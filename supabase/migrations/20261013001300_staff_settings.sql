create table public.operational_settings (
  id uuid primary key,
  duplicate_warning_hours integer not null default 24
    check (duplicate_warning_hours between 1 and 168),
  default_currency char(3) not null default 'NGN'
    check (default_currency ~ '^[A-Z]{3}$'),
  business_phone text,
  business_email text,
  updated_by_user_id uuid references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (business_email is null or business_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);

insert into public.operational_settings (
  id,
  duplicate_warning_hours,
  default_currency
) values (
  '40000000-0000-4000-8000-000000000001',
  24,
  'NGN'
)
on conflict (id) do nothing;

create trigger operational_settings_set_updated_at
before update on public.operational_settings
for each row execute function public.set_updated_at();

alter table public.operational_settings enable row level security;
revoke all on public.operational_settings from public, anon, authenticated;

create or replace function public.get_duplicate_warning_hours()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select settings.duplicate_warning_hours
  from public.operational_settings settings
  where settings.id = '40000000-0000-4000-8000-000000000001';
$$;

revoke all on function public.get_duplicate_warning_hours() from public, anon, authenticated;

do $$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.create_public_order(text,text,text,text,text,text,text,uuid,public.payment_method,text,text,text,text,text,public.order_source,text,text,text,text,text,text,text,text,text,text,text,jsonb,text)'::regprocedure
  ) into function_definition;

  function_definition := replace(
    function_definition,
    'clock_timestamp() - interval ''24 hours''',
    'clock_timestamp() - make_interval(hours => public.get_duplicate_warning_hours())'
  );
  execute function_definition;

  select pg_get_functiondef(
    'public.create_manual_order(text,text,text,text,text,uuid,public.payment_method,text,text,text,text,text,public.order_source,text,text,text)'::regprocedure
  ) into function_definition;

  function_definition := replace(
    function_definition,
    'clock_timestamp() - interval ''24 hours''',
    'clock_timestamp() - make_interval(hours => public.get_duplicate_warning_hours())'
  );
  execute function_definition;
end;
$$;

create or replace function public.list_staff(
  search_text text default null,
  page_number integer default 1,
  page_size integer default 20
)
returns table (
  user_id uuid,
  email text,
  full_name text,
  active boolean,
  role_code text,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_search text := nullif(lower(trim(search_text)), '');
begin
  if auth.uid() is null or not public.has_permission('staff.read') then
    raise exception using errcode = '42501', message = 'Staff read permission required';
  end if;

  if page_number < 1 or page_size not between 1 and 100 then
    raise exception using errcode = '22023', message = 'Invalid staff page';
  end if;

  return query
  with staff as (
    select
      profile.id as user_id,
      profile.email,
      profile.full_name,
      profile.active,
      role.code as role_code,
      profile.created_at
    from public.profiles profile
    left join public.profile_roles profile_role on profile_role.profile_id = profile.id
    left join public.roles role on role.id = profile_role.role_id
    where normalized_search is null
      or lower(profile.full_name) like '%' || normalized_search || '%'
      or lower(profile.email) like '%' || normalized_search || '%'
  )
  select
    staff.user_id,
    staff.email,
    staff.full_name,
    staff.active,
    staff.role_code,
    staff.created_at,
    count(*) over ()
  from staff
  order by staff.active desc, lower(staff.full_name), staff.user_id
  offset (page_number - 1) * page_size
  limit page_size;
end;
$$;

create or replace function public.set_staff_role(
  target_user_id uuid,
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
  previous_roles text[];
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

  if target_user_id = actor_user_id then
    raise exception using errcode = '22023', message = 'Administrators cannot change their own role';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception using errcode = 'P0002', message = 'Staff profile not found';
  end if;

  select role.id into selected_role_id
  from public.roles role
  where role.code = target_role_code
    and role.code in ('ORDER_MANAGER', 'EXECUTIVE_ADMIN');

  if selected_role_id is null then
    raise exception using errcode = '22023', message = 'Invalid staff role';
  end if;

  select coalesce(array_agg(role.code order by role.code), array[]::text[])
  into previous_roles
  from public.profile_roles profile_role
  join public.roles role on role.id = profile_role.role_id
  where profile_role.profile_id = target_user_id;

  delete from public.profile_roles where profile_id = target_user_id;
  insert into public.profile_roles (profile_id, role_id, assigned_by_user_id)
  values (target_user_id, selected_role_id, actor_user_id);

  insert into public.order_events (entity_type, entity_id, actor_user_id, action, metadata)
  values (
    'PROFILE',
    target_user_id,
    actor_user_id,
    'STAFF_ROLE_CHANGED',
    jsonb_build_object('from_roles', previous_roles, 'to_role', target_role_code)
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

  update public.profiles set active = target_active where id = target_user_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Staff profile not found';
  end if;

  if not target_active then
    delete from auth.sessions where user_id = target_user_id;
  end if;

  insert into public.order_events (entity_type, entity_id, actor_user_id, action, metadata)
  values (
    'PROFILE',
    target_user_id,
    actor_user_id,
    case when target_active then 'STAFF_ACTIVATED' else 'STAFF_DEACTIVATED' end,
    jsonb_build_object('active', target_active)
  );
end;
$$;

create or replace function public.get_operational_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or not public.has_permission('settings.read') then
    raise exception using errcode = '42501', message = 'Settings read permission required';
  end if;

  select jsonb_build_object(
    'duplicateWarningHours', settings.duplicate_warning_hours,
    'defaultCurrency', settings.default_currency,
    'businessPhone', settings.business_phone,
    'businessEmail', settings.business_email,
    'updatedAt', settings.updated_at
  ) into result
  from public.operational_settings settings
  where settings.id = '40000000-0000-4000-8000-000000000001';

  return result;
end;
$$;

create or replace function public.update_operational_settings(
  updated_duplicate_warning_hours integer,
  updated_business_phone text,
  updated_business_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  old_settings public.operational_settings%rowtype;
  new_settings public.operational_settings%rowtype;
  normalized_phone text;
  normalized_email text := nullif(lower(trim(updated_business_email)), '');
begin
  if actor_user_id is null or not public.has_permission('settings.manage') then
    raise exception using errcode = '42501', message = 'Settings manage permission required';
  end if;

  if updated_duplicate_warning_hours not between 1 and 168 then
    raise exception using errcode = '22023', message = 'Duplicate warning hours must be between 1 and 168';
  end if;

  normalized_phone := case
    when updated_business_phone is null or trim(updated_business_phone) = '' then null
    else public.normalize_nigerian_phone(updated_business_phone)
  end;

  if normalized_email is not null
    and normalized_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'Invalid business email';
  end if;

  select * into old_settings
  from public.operational_settings
  where id = '40000000-0000-4000-8000-000000000001'
  for update;

  update public.operational_settings
  set duplicate_warning_hours = updated_duplicate_warning_hours,
      business_phone = normalized_phone,
      business_email = normalized_email,
      updated_by_user_id = actor_user_id
  where id = '40000000-0000-4000-8000-000000000001'
  returning * into new_settings;

  insert into public.order_events (entity_type, entity_id, actor_user_id, action, metadata)
  values (
    'SETTINGS',
    new_settings.id,
    actor_user_id,
    'SETTINGS_UPDATED',
    jsonb_build_object(
      'before', jsonb_build_object(
        'duplicate_warning_hours', old_settings.duplicate_warning_hours,
        'business_phone', old_settings.business_phone,
        'business_email', old_settings.business_email
      ),
      'after', jsonb_build_object(
        'duplicate_warning_hours', new_settings.duplicate_warning_hours,
        'business_phone', new_settings.business_phone,
        'business_email', new_settings.business_email
      )
    )
  );

  return jsonb_build_object(
    'duplicateWarningHours', new_settings.duplicate_warning_hours,
    'defaultCurrency', new_settings.default_currency,
    'businessPhone', new_settings.business_phone,
    'businessEmail', new_settings.business_email,
    'updatedAt', new_settings.updated_at
  );
end;
$$;

create or replace function public.list_offer_configuration()
returns table (
  offer_id uuid,
  name text,
  code text,
  active boolean,
  base_price bigint,
  prepaid_price bigint,
  currency character,
  sort_order integer,
  item_summary text,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.has_permission('settings.read') then
    raise exception using errcode = '42501', message = 'Settings read permission required';
  end if;

  return query
  select
    offer.id,
    offer.name,
    offer.code,
    offer.active,
    offer.base_price,
    offer.prepaid_price,
    offer.currency,
    offer.sort_order,
    string_agg(
      item.quantity::text || ' x ' || product.name ||
        case when item.item_type = 'BONUS' then ' (bonus)' else '' end,
      ', ' order by item.item_type, product.name
    ),
    offer.updated_at
  from public.offers offer
  left join public.offer_items item on item.offer_id = offer.id
  left join public.products product on product.id = item.product_id
  group by offer.id
  order by offer.sort_order, offer.name;
end;
$$;

create or replace function public.update_offer_configuration(
  target_offer_id uuid,
  updated_active boolean,
  updated_base_price bigint,
  updated_prepaid_price bigint,
  updated_sort_order integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  previous_offer public.offers%rowtype;
begin
  if actor_user_id is null or not public.has_permission('settings.manage') then
    raise exception using errcode = '42501', message = 'Settings manage permission required';
  end if;

  if updated_base_price <= 0
    or (updated_prepaid_price is not null
      and (updated_prepaid_price <= 0 or updated_prepaid_price > updated_base_price))
    or updated_sort_order not between -10000 and 10000 then
    raise exception using errcode = '22023', message = 'Invalid offer configuration';
  end if;

  select * into previous_offer
  from public.offers
  where id = target_offer_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Offer not found';
  end if;

  if not updated_active
    and previous_offer.active
    and not exists (select 1 from public.offers where id <> target_offer_id and active) then
    raise exception using errcode = '22023', message = 'At least one offer must remain active';
  end if;

  update public.offers
  set active = updated_active,
      base_price = updated_base_price,
      prepaid_price = updated_prepaid_price,
      sort_order = updated_sort_order
  where id = target_offer_id;

  insert into public.order_events (entity_type, entity_id, actor_user_id, action, metadata)
  values (
    'OFFER',
    target_offer_id,
    actor_user_id,
    'OFFER_CONFIGURATION_UPDATED',
    jsonb_build_object(
      'before', jsonb_build_object(
        'active', previous_offer.active,
        'base_price', previous_offer.base_price,
        'prepaid_price', previous_offer.prepaid_price,
        'sort_order', previous_offer.sort_order
      ),
      'after', jsonb_build_object(
        'active', updated_active,
        'base_price', updated_base_price,
        'prepaid_price', updated_prepaid_price,
        'sort_order', updated_sort_order
      )
    )
  );
end;
$$;

revoke all on function public.list_staff(text, integer, integer) from public, anon, authenticated;
revoke all on function public.set_staff_role(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.set_staff_active(uuid, boolean, uuid) from public, anon, authenticated;
revoke all on function public.get_operational_settings() from public, anon, authenticated;
revoke all on function public.update_operational_settings(integer, text, text) from public, anon, authenticated;
revoke all on function public.list_offer_configuration() from public, anon, authenticated;
revoke all on function public.update_offer_configuration(uuid, boolean, bigint, bigint, integer) from public, anon, authenticated;

grant execute on function public.list_staff(text, integer, integer) to authenticated;
grant execute on function public.set_staff_role(uuid, text, uuid) to service_role;
grant execute on function public.set_staff_active(uuid, boolean, uuid) to service_role;
grant execute on function public.get_operational_settings() to authenticated;
grant execute on function public.update_operational_settings(integer, text, text) to authenticated;
grant execute on function public.list_offer_configuration() to authenticated;
grant execute on function public.update_offer_configuration(uuid, boolean, bigint, bigint, integer) to authenticated;

comment on table public.operational_settings is 'Single-row V1 operational configuration, updated only through audited RPCs.';
comment on function public.list_staff(text, integer, integer) is 'Permission-protected staff directory without exposing Auth internals.';
comment on function public.set_staff_role(uuid, text, uuid) is 'Service-role-only staff role replacement with actor validation and audit.';
comment on function public.get_operational_settings() is 'Returns the small V1 operational settings document to authorized staff.';
comment on function public.update_operational_settings(integer, text, text) is 'Updates operational settings and records before/after audit metadata.';
comment on function public.list_offer_configuration() is 'Returns editable offer configuration to authorized settings readers.';
comment on function public.update_offer_configuration(uuid, boolean, bigint, bigint, integer) is 'Updates offer activation/pricing/order and records an immutable audit event.';
