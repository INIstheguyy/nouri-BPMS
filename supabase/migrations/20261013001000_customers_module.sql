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
      or customers.primary_phone_normalized like '%' || regexp_replace(normalized_search, '[^0-9+]', '', 'g') || '%'
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

create or replace function public.get_customer_detail(target_customer_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or not public.has_permission('customer.read') then
    raise exception using errcode = '42501', message = 'Customer read permission required';
  end if;

  select jsonb_build_object(
    'id', customers.id,
    'firstName', customers.first_name,
    'lastName', customers.last_name,
    'primaryPhone', customers.primary_phone_normalized,
    'whatsappPhone', customers.whatsapp_phone_normalized,
    'alternativePhone', customers.alternative_phone_normalized,
    'email', customers.email,
    'state', customers.state,
    'city', customers.city,
    'area', customers.area,
    'defaultAddress', customers.default_address,
    'createdAt', customers.created_at,
    'summary', jsonb_build_object(
      'totalOrders', (select count(*) from public.orders where orders.customer_id = customers.id),
      'deliveredOrders', (
        select count(*)
        from public.orders
        join public.deliveries on deliveries.order_id = orders.id
        where orders.customer_id = customers.id and deliveries.status = 'DELIVERED'
      ),
      'cancelledOrders', (
        select count(*) from public.orders
        where orders.customer_id = customers.id and orders.order_status = 'CANCELLED'
      ),
      'failedDeliveries', (
        select count(*)
        from public.orders
        join public.deliveries on deliveries.order_id = orders.id
        where orders.customer_id = customers.id and deliveries.status = 'FAILED'
      ),
      'totalPaidSpend', (
        select coalesce(sum(payments.amount), 0)
        from public.orders
        join public.payments on payments.order_id = orders.id
        where orders.customer_id = customers.id and payments.status = 'PAID'
      ),
      'currency', coalesce((
        select max(orders.currency::text)::char(3)
        from public.orders where orders.customer_id = customers.id
      ), 'NGN'::char(3)),
      'firstAcquisitionSource', (
        select orders.source
        from public.orders
        where orders.customer_id = customers.id
        order by orders.created_at, orders.id
        limit 1
      ),
      'mostRecentAcquisitionSource', (
        select orders.source
        from public.orders
        where orders.customer_id = customers.id
        order by orders.created_at desc, orders.id desc
        limit 1
      )
    ),
    'orderHistory', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', orders.id,
        'orderNumber', orders.order_number,
        'status', orders.order_status,
        'source', orders.source,
        'offerName', offers.name,
        'totalAmount', orders.total_amount,
        'currency', orders.currency,
        'paymentMethod', payments.method,
        'paymentStatus', payments.status,
        'deliveryStatus', deliveries.status,
        'createdAt', orders.created_at
      ) order by orders.created_at desc, orders.id desc)
      from public.orders
      join public.offers on offers.id = orders.offer_id
      join public.payments on payments.order_id = orders.id
      join public.deliveries on deliveries.order_id = orders.id
      where orders.customer_id = customers.id
    ), '[]'::jsonb)
  ) into result
  from public.customers
  where customers.id = target_customer_id;

  if result is null then
    raise exception using errcode = 'P0002', message = 'Customer not found';
  end if;

  return result;
end;
$$;

revoke all on function public.list_customers(text, integer, integer) from public, anon, authenticated;
revoke all on function public.get_customer_detail(uuid) from public, anon, authenticated;
grant execute on function public.list_customers(text, integer, integer) to authenticated;
grant execute on function public.get_customer_detail(uuid) to authenticated;

comment on function public.list_customers(text, integer, integer) is 'Permission-checked paginated operational customer list with order and paid-spend aggregates.';
comment on function public.get_customer_detail(uuid) is 'Permission-checked customer profile, operational summary, and complete order history.';
