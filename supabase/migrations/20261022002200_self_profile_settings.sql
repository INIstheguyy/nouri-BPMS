create or replace function public.update_my_profile_name(new_full_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  normalized_name text := trim(new_full_name);
  previous_name text;
begin
  if actor_user_id is null or not public.is_active_staff() then
    raise exception using errcode = '42501', message = 'Active staff access required';
  end if;

  if length(normalized_name) not between 2 and 160 then
    raise exception using errcode = '22023', message = 'Name must be between 2 and 160 characters';
  end if;

  select full_name into previous_name from public.profiles where id = actor_user_id;
  update public.profiles set full_name = normalized_name where id = actor_user_id;

  insert into public.order_events (entity_type, entity_id, actor_user_id, action, metadata)
  values ('PROFILE', actor_user_id, actor_user_id, 'PROFILE_NAME_CHANGED', jsonb_build_object('from', previous_name, 'to', normalized_name));

  return normalized_name;
end;
$$;

revoke all on function public.update_my_profile_name(text) from public, anon, authenticated;
grant execute on function public.update_my_profile_name(text) to authenticated;

comment on function public.update_my_profile_name(text) is 'Allows active staff to update only their own display name and records an audit event.';
