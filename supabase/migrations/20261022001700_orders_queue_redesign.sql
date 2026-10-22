drop function if exists public.list_orders(text, text, text, text, date, date, integer, integer);

create function public.list_orders(
  search_text text default null,
  status_filter text default null,
  source_filter text default null,
  payment_method_filter text default null,
  created_from date default null,
  created_to date default null,
  page_number integer default 1,
  page_size integer default 25,
  queue_filter text default null
)
returns table (
  order_id uuid,
  order_number text,
  order_status public.order_status,
  customer_name text,
  customer_phone text,
  offer_name text,
  delivery_area text,
  total_amount bigint,
  currency char(3),
  payment_method public.payment_method,
  payment_status public.payment_status,
  delivery_status public.delivery_status,
  source public.order_source,
  possible_duplicate boolean,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_search text := nullif(trim(search_text), '');
  normalized_queue text := nullif(trim(queue_filter), '');
  safe_page integer := greatest(coalesce(page_number, 1), 1);
  safe_size integer := least(greatest(coalesce(page_size, 25), 1), 100);
begin
  if auth.uid() is null or not public.has_permission('order.read') then
    raise exception using errcode = '42501', message = 'Order read permission required';
  end if;

  if status_filter is not null
    and not exists (
      select 1 from unnest(enum_range(null::public.order_status)) value
      where value::text = status_filter
    ) then
    raise exception using errcode = '22023', message = 'Invalid order status filter';
  end if;

  if source_filter is not null
    and not exists (
      select 1 from unnest(enum_range(null::public.order_source)) value
      where value::text = source_filter
    ) then
    raise exception using errcode = '22023', message = 'Invalid order source filter';
  end if;

  if payment_method_filter is not null
    and not exists (
      select 1 from unnest(enum_range(null::public.payment_method)) value
      where value::text = payment_method_filter
    ) then
    raise exception using errcode = '22023', message = 'Invalid payment method filter';
  end if;

  if normalized_queue is not null
    and normalized_queue not in ('new', 'follow-up', 'delivery', 'failed', 'done') then
    raise exception using errcode = '22023', message = 'Invalid order queue filter';
  end if;

  if created_from is not null and created_to is not null and created_from > created_to then
    raise exception using errcode = '22023', message = 'Invalid order date range';
  end if;

  return query
  with filtered as (
    select
      orders.id,
      orders.order_number,
      orders.order_status,
      trim(customers.first_name || ' ' || coalesce(customers.last_name, '')) as customer_name,
      customers.primary_phone_normalized,
      offers.name as offer_name,
      deliveries.area as delivery_area,
      orders.total_amount,
      orders.currency,
      orders.payment_method,
      payments.status as payment_status,
      deliveries.status as delivery_status,
      orders.source,
      orders.possible_duplicate,
      orders.created_at
    from public.orders
    join public.customers on customers.id = orders.customer_id
    join public.offers on offers.id = orders.offer_id
    join public.payments on payments.order_id = orders.id
    join public.deliveries on deliveries.order_id = orders.id
    where (status_filter is null or orders.order_status = status_filter::public.order_status)
      and (source_filter is null or orders.source = source_filter::public.order_source)
      and (payment_method_filter is null or orders.payment_method = payment_method_filter::public.payment_method)
      and (created_from is null or orders.created_at >= created_from::timestamptz)
      and (created_to is null or orders.created_at < (created_to + 1)::timestamptz)
      and (
        normalized_queue is null
        or (normalized_queue = 'new' and orders.order_status = 'NEW')
        or (normalized_queue = 'follow-up' and orders.order_status in ('CONTACTED', 'UNREACHABLE'))
        or (
          normalized_queue = 'delivery'
          and orders.order_status = 'CONFIRMED'
          and deliveries.status <> 'FAILED'
        )
        or (normalized_queue = 'failed' and deliveries.status = 'FAILED')
        or (normalized_queue = 'done' and orders.order_status = 'COMPLETED')
      )
      and (
        normalized_search is null
        or orders.order_number ilike '%' || normalized_search || '%'
        or customers.primary_phone_normalized like '%' || regexp_replace(normalized_search, '[^0-9+]', '', 'g') || '%'
        or (
          length(regexp_replace(normalized_search, '[^0-9]', '', 'g')) >= 10
          and right(regexp_replace(customers.primary_phone_normalized, '[^0-9]', '', 'g'), 10)
            = right(regexp_replace(normalized_search, '[^0-9]', '', 'g'), 10)
        )
        or trim(customers.first_name || ' ' || coalesce(customers.last_name, '')) ilike '%' || normalized_search || '%'
      )
  )
  select
    filtered.id,
    filtered.order_number,
    filtered.order_status,
    filtered.customer_name,
    filtered.primary_phone_normalized,
    filtered.offer_name,
    filtered.delivery_area,
    filtered.total_amount,
    filtered.currency,
    filtered.payment_method,
    filtered.payment_status,
    filtered.delivery_status,
    filtered.source,
    filtered.possible_duplicate,
    filtered.created_at,
    count(*) over ()
  from filtered
  order by filtered.created_at desc, filtered.id desc
  limit safe_size
  offset (safe_page - 1) * safe_size;
end;
$$;

revoke all on function public.list_orders(text, text, text, text, date, date, integer, integer, text)
from public, anon;
grant execute on function public.list_orders(text, text, text, text, date, date, integer, integer, text)
to authenticated;

comment on function public.list_orders(text, text, text, text, date, date, integer, integer, text)
is 'Permission-checked, queue-filtered and paginated operational order list.';
