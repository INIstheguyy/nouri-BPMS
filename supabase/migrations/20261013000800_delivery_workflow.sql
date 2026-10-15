create or replace function public.schedule_delivery(
  target_order_id uuid,
  target_scheduled_date date,
  target_delivery_window text,
  target_recipient_name text,
  target_recipient_phone text,
  target_state text,
  target_city text,
  target_area text,
  target_address_line text,
  target_landmark text,
  schedule_note text default null
)
returns public.delivery_status
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  order_state public.order_status;
  delivery_record public.deliveries%rowtype;
  normalized_phone text;
  event_action text;
begin
  if actor_user_id is null or not public.has_permission('order.schedule') then
    raise exception using errcode = '42501', message = 'Order schedule permission required';
  end if;
  if target_scheduled_date is null or target_scheduled_date < current_date then
    raise exception using errcode = '22023', message = 'Delivery date cannot be in the past';
  end if;
  if length(trim(coalesce(target_recipient_name, ''))) < 2
    or length(trim(coalesce(target_state, ''))) < 2
    or length(trim(coalesce(target_area, ''))) < 2
    or length(trim(coalesce(target_address_line, ''))) < 5 then
    raise exception using errcode = '22023', message = 'Delivery snapshot is incomplete';
  end if;
  normalized_phone := public.normalize_nigerian_phone(target_recipient_phone);

  select deliveries.* into delivery_record
  from public.deliveries
  where deliveries.order_id = target_order_id
  for update;
  select orders.order_status into order_state
  from public.orders where orders.id = target_order_id;

  if delivery_record.id is null then
    raise exception using errcode = 'P0002', message = 'Delivery not found';
  end if;
  if order_state <> 'CONFIRMED' then
    raise exception using errcode = '22023', message = 'Only confirmed orders can be scheduled';
  end if;
  if delivery_record.status not in ('NOT_SCHEDULED', 'SCHEDULED', 'FAILED') then
    raise exception using errcode = '22023', message = 'Delivery cannot be scheduled from its current status';
  end if;

  event_action := case
    when delivery_record.status = 'SCHEDULED' then 'DELIVERY_RESCHEDULED'
    when delivery_record.status = 'FAILED' then 'DELIVERY_RETRY_SCHEDULED'
    else 'DELIVERY_SCHEDULED'
  end;

  update public.deliveries
  set status = 'SCHEDULED',
      recipient_name = trim(target_recipient_name),
      recipient_phone = normalized_phone,
      state = trim(target_state),
      city = nullif(trim(target_city), ''),
      area = trim(target_area),
      address_line = trim(target_address_line),
      landmark = nullif(trim(target_landmark), ''),
      scheduled_date = target_scheduled_date,
      delivery_window = nullif(trim(target_delivery_window), ''),
      courier_name = null,
      courier_phone = null,
      tracking_reference = null,
      failure_reason_code = null,
      failure_reason_note = null,
      dispatched_at = null,
      delivered_at = null
  where id = delivery_record.id;

  insert into public.order_events (
    order_id, entity_type, entity_id, actor_user_id, action, from_state, to_state, metadata
  ) values (
    target_order_id, 'DELIVERY', delivery_record.id, actor_user_id, event_action,
    delivery_record.status::text, 'SCHEDULED',
    jsonb_build_object(
      'scheduled_date', target_scheduled_date,
      'delivery_window', nullif(trim(target_delivery_window), ''),
      'note', nullif(trim(schedule_note), '')
    )
  );

  return 'SCHEDULED'::public.delivery_status;
end;
$$;

create or replace function public.dispatch_order(
  target_order_id uuid,
  target_courier_name text default null,
  target_courier_phone text default null,
  target_tracking_reference text default null,
  dispatch_note text default null
)
returns public.delivery_status
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  order_state public.order_status;
  delivery_record public.deliveries%rowtype;
  normalized_courier_phone text;
begin
  if actor_user_id is null or not public.has_permission('order.dispatch') then
    raise exception using errcode = '42501', message = 'Order dispatch permission required';
  end if;
  normalized_courier_phone := case
    when target_courier_phone is null or trim(target_courier_phone) = '' then null
    else public.normalize_nigerian_phone(target_courier_phone)
  end;

  select deliveries.* into delivery_record
  from public.deliveries
  where deliveries.order_id = target_order_id
  for update;
  select orders.order_status into order_state
  from public.orders where orders.id = target_order_id;

  if delivery_record.id is null then
    raise exception using errcode = 'P0002', message = 'Delivery not found';
  end if;
  if order_state <> 'CONFIRMED' or delivery_record.status <> 'SCHEDULED' then
    raise exception using errcode = '22023', message = 'Only a scheduled confirmed order can be dispatched';
  end if;

  update public.deliveries
  set status = 'DISPATCHED',
      courier_name = nullif(trim(target_courier_name), ''),
      courier_phone = normalized_courier_phone,
      tracking_reference = nullif(trim(target_tracking_reference), ''),
      dispatched_at = statement_timestamp(),
      delivered_at = null
  where id = delivery_record.id;

  insert into public.order_events (
    order_id, entity_type, entity_id, actor_user_id, action, from_state, to_state, metadata
  ) values (
    target_order_id, 'DELIVERY', delivery_record.id, actor_user_id, 'ORDER_DISPATCHED',
    delivery_record.status::text, 'DISPATCHED',
    jsonb_build_object(
      'courier_name', nullif(trim(target_courier_name), ''),
      'tracking_reference', nullif(trim(target_tracking_reference), ''),
      'note', nullif(trim(dispatch_note), '')
    )
  );

  return 'DISPATCHED'::public.delivery_status;
end;
$$;

create or replace function public.mark_order_delivered(
  target_order_id uuid,
  delivery_note text default null
)
returns public.delivery_status
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  order_state public.order_status;
  delivery_record public.deliveries%rowtype;
begin
  if actor_user_id is null or not public.has_permission('order.deliver') then
    raise exception using errcode = '42501', message = 'Order delivery permission required';
  end if;

  select deliveries.* into delivery_record
  from public.deliveries
  where deliveries.order_id = target_order_id
  for update;
  select orders.order_status into order_state
  from public.orders where orders.id = target_order_id;

  if delivery_record.id is null then
    raise exception using errcode = 'P0002', message = 'Delivery not found';
  end if;
  if order_state <> 'CONFIRMED' or delivery_record.status <> 'DISPATCHED' then
    raise exception using errcode = '22023', message = 'Only a dispatched confirmed order can be delivered';
  end if;

  update public.deliveries
  set status = 'DELIVERED', delivered_at = statement_timestamp(),
      failure_reason_code = null, failure_reason_note = null
  where id = delivery_record.id;

  insert into public.order_events (
    order_id, entity_type, entity_id, actor_user_id, action, from_state, to_state, metadata
  ) values (
    target_order_id, 'DELIVERY', delivery_record.id, actor_user_id, 'ORDER_DELIVERED',
    delivery_record.status::text, 'DELIVERED',
    jsonb_build_object('note', nullif(trim(delivery_note), ''))
  );

  return 'DELIVERED'::public.delivery_status;
end;
$$;

create or replace function public.fail_delivery(
  target_order_id uuid,
  failure_code text,
  failure_note text default null
)
returns public.delivery_status
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  order_state public.order_status;
  delivery_record public.deliveries%rowtype;
  allowed_codes constant text[] := array[
    'CUSTOMER_UNAVAILABLE', 'WRONG_ADDRESS', 'NO_ANSWER', 'CUSTOMER_CANCELLED',
    'PAYMENT_UNAVAILABLE', 'COURIER_ISSUE', 'OTHER'
  ];
begin
  if actor_user_id is null or not public.has_permission('order.fail_delivery') then
    raise exception using errcode = '42501', message = 'Delivery failure permission required';
  end if;
  if failure_code is null or not (failure_code = any(allowed_codes)) then
    raise exception using errcode = '22023', message = 'Invalid delivery failure reason';
  end if;
  if failure_code = 'OTHER' and length(trim(coalesce(failure_note, ''))) < 3 then
    raise exception using errcode = '22023', message = 'Failure note is required for OTHER';
  end if;

  select deliveries.* into delivery_record
  from public.deliveries
  where deliveries.order_id = target_order_id
  for update;
  select orders.order_status into order_state
  from public.orders where orders.id = target_order_id;

  if delivery_record.id is null then
    raise exception using errcode = 'P0002', message = 'Delivery not found';
  end if;
  if order_state <> 'CONFIRMED' or delivery_record.status <> 'DISPATCHED' then
    raise exception using errcode = '22023', message = 'Only a dispatched confirmed order can fail delivery';
  end if;

  update public.deliveries
  set status = 'FAILED',
      failure_reason_code = failure_code,
      failure_reason_note = nullif(trim(failure_note), ''),
      delivered_at = null
  where id = delivery_record.id;

  insert into public.order_events (
    order_id, entity_type, entity_id, actor_user_id, action, from_state, to_state, metadata
  ) values (
    target_order_id, 'DELIVERY', delivery_record.id, actor_user_id, 'DELIVERY_FAILED',
    delivery_record.status::text, 'FAILED',
    jsonb_build_object('reason_code', failure_code, 'reason_note', nullif(trim(failure_note), ''))
  );

  return 'FAILED'::public.delivery_status;
end;
$$;

create or replace function public.list_delivery_attention(queue_date date default current_date)
returns table (
  order_id uuid,
  order_number text,
  customer_name text,
  customer_phone text,
  delivery_status public.delivery_status,
  scheduled_date date,
  delivery_window text,
  area text,
  state text,
  failure_reason_code text,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.has_permission('order.read') then
    raise exception using errcode = '42501', message = 'Order read permission required';
  end if;

  return query
  select
    orders.id,
    orders.order_number,
    trim(customers.first_name || ' ' || coalesce(customers.last_name, '')),
    customers.primary_phone_normalized,
    deliveries.status,
    deliveries.scheduled_date,
    deliveries.delivery_window,
    deliveries.area,
    deliveries.state,
    deliveries.failure_reason_code,
    deliveries.updated_at
  from public.deliveries
  join public.orders on orders.id = deliveries.order_id
  join public.customers on customers.id = orders.customer_id
  where orders.order_status = 'CONFIRMED'
    and (
      (deliveries.scheduled_date = queue_date and deliveries.status in ('SCHEDULED', 'DISPATCHED'))
      or deliveries.status = 'FAILED'
    )
  order by
    case when deliveries.status = 'FAILED' then 0 else 1 end,
    deliveries.scheduled_date nulls first,
    deliveries.updated_at;
end;
$$;

revoke all on function public.schedule_delivery(uuid, date, text, text, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.dispatch_order(uuid, text, text, text, text) from public, anon;
revoke all on function public.mark_order_delivered(uuid, text) from public, anon;
revoke all on function public.fail_delivery(uuid, text, text) from public, anon;
revoke all on function public.list_delivery_attention(date) from public, anon;

grant execute on function public.schedule_delivery(uuid, date, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.dispatch_order(uuid, text, text, text, text) to authenticated;
grant execute on function public.mark_order_delivered(uuid, text) to authenticated;
grant execute on function public.fail_delivery(uuid, text, text) to authenticated;
grant execute on function public.list_delivery_attention(date) to authenticated;

comment on function public.schedule_delivery(uuid, date, text, text, text, text, text, text, text, text, text) is 'Schedules, reschedules, or retries a confirmed delivery with an updated immutable-order delivery snapshot.';
comment on function public.dispatch_order(uuid, text, text, text, text) is 'Dispatches only a scheduled confirmed delivery and records courier context.';
comment on function public.mark_order_delivered(uuid, text) is 'Marks only a dispatched confirmed delivery successful without trusting or changing payment state.';
comment on function public.fail_delivery(uuid, text, text) is 'Marks only a dispatched confirmed delivery failed with a controlled reason.';
comment on function public.list_delivery_attention(date) is 'Permission-checked queue of scheduled work for a date plus failed deliveries requiring action.';
