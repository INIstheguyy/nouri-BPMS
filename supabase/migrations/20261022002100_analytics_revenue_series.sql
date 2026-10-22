create or replace function public.get_revenue_series(date_from date, date_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or not public.has_permission('analytics.read') then
    raise exception using errcode = '42501', message = 'Analytics permission required';
  end if;
  if date_from is null or date_to is null or date_from > date_to or date_to - date_from > 366 then
    raise exception using errcode = '22023', message = 'Invalid analytics date range';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'date', days.day::date,
    'revenue', coalesce(revenue.amount, 0)
  ) order by days.day), '[]'::jsonb)
  into result
  from generate_series(date_from, date_to, interval '1 day') as days(day)
  left join (
    select
      (orders.created_at at time zone 'Africa/Lagos')::date as day,
      sum(payments.amount)::bigint as amount
    from public.orders
    join public.payments on payments.order_id = orders.id
    where orders.created_at >= date_from::timestamp at time zone 'Africa/Lagos'
      and orders.created_at < (date_to + 1)::timestamp at time zone 'Africa/Lagos'
      and payments.status = 'PAID'
    group by (orders.created_at at time zone 'Africa/Lagos')::date
  ) revenue on revenue.day = days.day;

  return result;
end;
$$;

revoke all on function public.get_revenue_series(date, date) from public, anon, authenticated;
grant execute on function public.get_revenue_series(date, date) to authenticated;

comment on function public.get_revenue_series(date, date) is 'Permission-checked daily paid revenue for executive analytics.';
