create function public.list_recent_order_events(event_limit integer default 20)
returns table (
  event_id uuid,
  order_id uuid,
  order_number text,
  action text,
  actor_name text,
  note text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.has_permission('dashboard.operations.read') then
    raise exception using errcode = '42501', message = 'Operations dashboard permission required';
  end if;

  return query
  select
    event.id,
    orders.id,
    orders.order_number,
    event.action,
    coalesce(event.actor_name, actor.full_name),
    event.note,
    event.created_at
  from public.order_events event
  join public.orders on orders.id = event.order_id
  left join public.profiles actor on actor.id = event.actor_user_id
  order by event.created_at desc, event.id desc
  limit least(greatest(coalesce(event_limit, 20), 1), 50);
end;
$$;

revoke all on function public.list_recent_order_events(integer) from public, anon;
grant execute on function public.list_recent_order_events(integer) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_events'
    ) then
      alter publication supabase_realtime add table public.order_events;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
    ) then
      alter publication supabase_realtime add table public.orders;
    end if;
  end if;
end;
$$;

comment on function public.list_recent_order_events(integer)
is 'Returns a bounded, attributed activity feed for the operations home screen.';
