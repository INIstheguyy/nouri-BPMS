create index deliveries_dispatched_at_idx on public.deliveries (dispatched_at)
where dispatched_at is not null;

create or replace function public.get_operations_dashboard(
  dashboard_date date default (now() at time zone 'Africa/Lagos')::date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or not public.has_permission('dashboard.operations.read') then
    raise exception using errcode = '42501', message = 'Operations dashboard permission required';
  end if;
  if dashboard_date is null then
    raise exception using errcode = '22023', message = 'Dashboard date is required';
  end if;

  select jsonb_build_object(
    'date', dashboard_date,
    'metrics', jsonb_build_object(
      'newOrders', (select count(*) from public.orders where order_status = 'NEW'),
      'awaitingConfirmation', (select count(*) from public.orders where order_status = 'CONTACTED'),
      'unreachableOrders', (select count(*) from public.orders where order_status = 'UNREACHABLE'),
      'scheduledToday', (
        select count(*) from public.deliveries
        where scheduled_date = dashboard_date and status = 'SCHEDULED'
      ),
      'dispatchedToday', (
        select count(*) from public.deliveries
        where (dispatched_at at time zone 'Africa/Lagos')::date = dashboard_date
      ),
      'failedDeliveries', (select count(*) from public.deliveries where status = 'FAILED')
    ),
    'newestUnhandled', coalesce((
      select jsonb_agg(item order by created_at desc)
      from (
        select orders.created_at, jsonb_build_object(
          'orderId', orders.id,
          'orderNumber', orders.order_number,
          'customerName', trim(customers.first_name || ' ' || coalesce(customers.last_name, '')),
          'customerPhone', customers.primary_phone_normalized,
          'status', orders.order_status,
          'createdAt', orders.created_at
        ) as item
        from public.orders
        join public.customers on customers.id = orders.customer_id
        where orders.order_status = 'NEW'
        order by orders.created_at desc, orders.id desc
        limit 10
      ) rows_for_queue
    ), '[]'::jsonb),
    'overdueConfirmation', coalesce((
      select jsonb_agg(item order by created_at)
      from (
        select orders.created_at, jsonb_build_object(
          'orderId', orders.id,
          'orderNumber', orders.order_number,
          'customerName', trim(customers.first_name || ' ' || coalesce(customers.last_name, '')),
          'customerPhone', customers.primary_phone_normalized,
          'status', orders.order_status,
          'createdAt', orders.created_at
        ) as item
        from public.orders
        join public.customers on customers.id = orders.customer_id
        where orders.order_status in ('NEW', 'CONTACTED', 'UNREACHABLE')
          and orders.created_at < statement_timestamp() - interval '24 hours'
        order by orders.created_at, orders.id
        limit 10
      ) overdue_rows
    ), '[]'::jsonb),
    'todayDeliveries', coalesce((
      select jsonb_agg(item order by scheduled_date, created_at)
      from (
        select deliveries.scheduled_date, orders.created_at, jsonb_build_object(
          'orderId', orders.id,
          'orderNumber', orders.order_number,
          'customerName', trim(customers.first_name || ' ' || coalesce(customers.last_name, '')),
          'customerPhone', customers.primary_phone_normalized,
          'deliveryStatus', deliveries.status,
          'scheduledDate', deliveries.scheduled_date,
          'deliveryWindow', deliveries.delivery_window,
          'area', deliveries.area,
          'state', deliveries.state
        ) as item
        from public.deliveries
        join public.orders on orders.id = deliveries.order_id
        join public.customers on customers.id = orders.customer_id
        where deliveries.scheduled_date = dashboard_date
          and deliveries.status in ('SCHEDULED', 'DISPATCHED')
        order by deliveries.scheduled_date, orders.created_at, orders.id
        limit 20
      ) delivery_rows
    ), '[]'::jsonb),
    'failedDeliveryQueue', coalesce((
      select jsonb_agg(item order by updated_at)
      from (
        select deliveries.updated_at, jsonb_build_object(
          'orderId', orders.id,
          'orderNumber', orders.order_number,
          'customerName', trim(customers.first_name || ' ' || coalesce(customers.last_name, '')),
          'customerPhone', customers.primary_phone_normalized,
          'failureReasonCode', deliveries.failure_reason_code,
          'area', deliveries.area,
          'state', deliveries.state,
          'updatedAt', deliveries.updated_at
        ) as item
        from public.deliveries
        join public.orders on orders.id = deliveries.order_id
        join public.customers on customers.id = orders.customer_id
        where deliveries.status = 'FAILED'
        order by deliveries.updated_at, deliveries.id
        limit 20
      ) failed_rows
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

create or replace function public.get_executive_dashboard(
  date_from date default (now() at time zone 'Africa/Lagos')::date,
  date_to date default (now() at time zone 'Africa/Lagos')::date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
  period_start timestamptz;
  period_end timestamptz;
begin
  if auth.uid() is null or not public.has_permission('dashboard.executive.read') then
    raise exception using errcode = '42501', message = 'Executive dashboard permission required';
  end if;
  if date_from is null or date_to is null or date_from > date_to or date_to - date_from > 366 then
    raise exception using errcode = '22023', message = 'Invalid dashboard date range';
  end if;

  period_start := date_from::timestamp at time zone 'Africa/Lagos';
  period_end := (date_to + 1)::timestamp at time zone 'Africa/Lagos';

  with period_orders as (
    select
      orders.*,
      payments.status as payment_status,
      payments.amount as payment_amount,
      deliveries.status as delivery_status
    from public.orders
    join public.payments on payments.order_id = orders.id
    join public.deliveries on deliveries.order_id = orders.id
    where orders.created_at >= period_start and orders.created_at < period_end
  ), totals as (
    select
      count(*)::bigint as submitted_orders,
      count(*) filter (where order_status in ('CONFIRMED', 'COMPLETED'))::bigint as confirmed_orders,
      count(*) filter (where delivery_status = 'DELIVERED')::bigint as delivered_orders,
      count(*) filter (where order_status = 'COMPLETED')::bigint as completed_orders,
      count(*) filter (where payment_status = 'PAID')::bigint as paid_orders,
      count(*) filter (where order_status = 'CANCELLED')::bigint as cancelled_orders,
      count(*) filter (where delivery_status = 'FAILED')::bigint as failed_deliveries,
      count(*) filter (where payment_method = 'COD' and delivery_status in ('DELIVERED', 'FAILED'))::bigint as cod_outcomes,
      count(*) filter (where payment_method = 'COD' and delivery_status = 'DELIVERED')::bigint as cod_delivered,
      coalesce(sum(total_amount), 0)::bigint as submitted_value,
      coalesce(sum(total_amount) filter (where delivery_status = 'DELIVERED'), 0)::bigint as delivered_revenue,
      coalesce(sum(payment_amount) filter (where payment_status = 'PAID'), 0)::bigint as paid_revenue,
      coalesce(max(currency::text), 'NGN')::char(3) as currency
    from period_orders
  ), sources as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'source', source,
      'submittedOrders', submitted_orders,
      'deliveredOrders', delivered_orders,
      'paidOrders', paid_orders,
      'submittedValue', submitted_value,
      'paidRevenue', paid_revenue
    ) order by submitted_orders desc, source), '[]'::jsonb) as breakdown
    from (
      select
        source,
        count(*)::bigint as submitted_orders,
        count(*) filter (where delivery_status = 'DELIVERED')::bigint as delivered_orders,
        count(*) filter (where payment_status = 'PAID')::bigint as paid_orders,
        coalesce(sum(total_amount), 0)::bigint as submitted_value,
        coalesce(sum(payment_amount) filter (where payment_status = 'PAID'), 0)::bigint as paid_revenue
      from period_orders
      group by source
    ) source_rows
  )
  select jsonb_build_object(
    'dateFrom', date_from,
    'dateTo', date_to,
    'currency', totals.currency,
    'metrics', jsonb_build_object(
      'submittedOrders', totals.submitted_orders,
      'confirmedOrders', totals.confirmed_orders,
      'deliveredOrders', totals.delivered_orders,
      'completedOrders', totals.completed_orders,
      'paidOrders', totals.paid_orders,
      'cancelledOrders', totals.cancelled_orders,
      'failedDeliveries', totals.failed_deliveries,
      'submittedValue', totals.submitted_value,
      'deliveredRevenue', totals.delivered_revenue,
      'paidRevenue', totals.paid_revenue,
      'codSuccessRate', case when totals.cod_outcomes = 0 then 0 else round(totals.cod_delivered * 100.0 / totals.cod_outcomes, 1) end,
      'cancellationRate', case when totals.submitted_orders = 0 then 0 else round(totals.cancelled_orders * 100.0 / totals.submitted_orders, 1) end,
      'failedDeliveryRate', case when totals.submitted_orders = 0 then 0 else round(totals.failed_deliveries * 100.0 / totals.submitted_orders, 1) end,
      'confirmationConversion', case when totals.submitted_orders = 0 then 0 else round(totals.confirmed_orders * 100.0 / totals.submitted_orders, 1) end,
      'deliveryConversion', case when totals.submitted_orders = 0 then 0 else round(totals.delivered_orders * 100.0 / totals.submitted_orders, 1) end,
      'paidConversion', case when totals.submitted_orders = 0 then 0 else round(totals.paid_orders * 100.0 / totals.submitted_orders, 1) end
    ),
    'sourceBreakdown', sources.breakdown
  ) into result
  from totals cross join sources;

  return result;
end;
$$;

revoke all on function public.get_operations_dashboard(date) from public, anon, authenticated;
revoke all on function public.get_executive_dashboard(date, date) from public, anon, authenticated;
grant execute on function public.get_operations_dashboard(date) to authenticated;
grant execute on function public.get_executive_dashboard(date, date) to authenticated;

comment on function public.get_operations_dashboard(date) is 'Permission-checked operational workload metrics and bounded action queues for a Lagos business date.';
comment on function public.get_executive_dashboard(date, date) is 'Executive-only server-derived period metrics, funnel rates, revenue, and source distribution.';
