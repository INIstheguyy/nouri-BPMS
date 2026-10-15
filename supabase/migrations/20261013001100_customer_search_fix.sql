create or replace function public.list_customers(
  search_text text default null,
  page_number integer default 1,
  page_size integer default 25
)
returns table (
  customer_id uuid,
  customer_name text,
  primary_phone text,
  state text,
  city text,
  area text,
  total_orders bigint,
  delivered_orders bigint,
  last_order_date timestamptz,
  last_order_status public.order_status,
  total_paid_spend bigint,
  currency char(3),
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_search text := nullif(trim(search_text), '');
  numeric_search text := regexp_replace(coalesce(search_text, ''), '[^0-9+]', '', 'g');
  safe_page integer := greatest(coalesce(page_number, 1), 1);
  safe_size integer := least(greatest(coalesce(page_size, 25), 1), 100);
begin
  if auth.uid() is null or not public.has_permission('customer.read') then
    raise exception using errcode = '42501', message = 'Customer read permission required';
  end if;

  return query
  with metrics as (
    select
      customers.id,
      trim(customers.first_name || ' ' || coalesce(customers.last_name, '')) as name,
      customers.primary_phone_normalized,
      customers.state,
      customers.city,
      customers.area,
      count(orders.id) as order_count,
      count(orders.id) filter (where deliveries.status = 'DELIVERED') as delivered_count,
      max(orders.created_at) as latest_order_date,
      (array_agg(orders.order_status order by orders.created_at desc, orders.id desc)
        filter (where orders.id is not null))[1] as latest_order_status,
      coalesce(sum(payments.amount) filter (where payments.status = 'PAID'), 0)::bigint as paid_spend,
      coalesce(max(orders.currency::text), 'NGN')::char(3) as order_currency
    from public.customers
    left join public.orders on orders.customer_id = customers.id
    left join public.payments on payments.order_id = orders.id
    left join public.deliveries on deliveries.order_id = orders.id
    where normalized_search is null
      or trim(customers.first_name || ' ' || coalesce(customers.last_name, '')) ilike '%' || normalized_search || '%'
      or (
        length(numeric_search) >= 3
        and customers.primary_phone_normalized like '%' || numeric_search || '%'
      )
      or (
        length(regexp_replace(normalized_search, '[^0-9]', '', 'g')) >= 10
        and right(regexp_replace(customers.primary_phone_normalized, '[^0-9]', '', 'g'), 10)
          = right(regexp_replace(normalized_search, '[^0-9]', '', 'g'), 10)
      )
    group by customers.id
  )
  select
    metrics.id,
    metrics.name,
    metrics.primary_phone_normalized,
    metrics.state,
    metrics.city,
    metrics.area,
    metrics.order_count,
    metrics.delivered_count,
    metrics.latest_order_date,
    metrics.latest_order_status,
    metrics.paid_spend,
    metrics.order_currency,
    count(*) over ()
  from metrics
  order by metrics.latest_order_date desc nulls last, metrics.id desc
  limit safe_size
  offset (safe_page - 1) * safe_size;
end;
$$;

comment on function public.list_customers(text, integer, integer) is 'Permission-checked paginated operational customer list with independent name/phone search and order aggregates.';
