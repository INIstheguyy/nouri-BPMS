create or replace function public.mark_order_contacted(target_order_id uuid)
returns public.order_status
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  previous_status public.order_status;
begin
  if actor_user_id is null or not public.has_permission('order.contact') then
    raise exception using errcode = '42501', message = 'Order contact permission required';
  end if;

  select order_status into previous_status
  from public.orders
  where id = target_order_id
  for update;

  if previous_status is null then
    raise exception using errcode = 'P0002', message = 'Order not found';
  end if;
  if previous_status not in ('NEW', 'UNREACHABLE') then
    raise exception using errcode = '22023', message = 'Order cannot be marked contacted from its current status';
  end if;

  update public.orders set order_status = 'CONTACTED' where id = target_order_id;
  insert into public.order_events (order_id, entity_type, entity_id, actor_user_id, action, from_state, to_state)
  values (target_order_id, 'ORDER', target_order_id, actor_user_id, 'CUSTOMER_CONTACTED', previous_status::text, 'CONTACTED');
  return 'CONTACTED'::public.order_status;
end;
$$;

create or replace function public.mark_order_unreachable(target_order_id uuid)
returns public.order_status
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  previous_status public.order_status;
begin
  if actor_user_id is null or not public.has_permission('order.contact') then
    raise exception using errcode = '42501', message = 'Order contact permission required';
  end if;

  select order_status into previous_status
  from public.orders
  where id = target_order_id
  for update;

  if previous_status is null then
    raise exception using errcode = 'P0002', message = 'Order not found';
  end if;
  if previous_status not in ('NEW', 'CONTACTED') then
    raise exception using errcode = '22023', message = 'Order cannot be marked unreachable from its current status';
  end if;

  update public.orders set order_status = 'UNREACHABLE' where id = target_order_id;
  insert into public.order_events (order_id, entity_type, entity_id, actor_user_id, action, from_state, to_state)
  values (target_order_id, 'ORDER', target_order_id, actor_user_id, 'CUSTOMER_UNREACHABLE', previous_status::text, 'UNREACHABLE');
  return 'UNREACHABLE'::public.order_status;
end;
$$;

create or replace function public.confirm_order(target_order_id uuid)
returns public.order_status
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  order_record public.orders%rowtype;
  customer_record public.customers%rowtype;
  delivery_record public.deliveries%rowtype;
begin
  if actor_user_id is null or not public.has_permission('order.confirm') then
    raise exception using errcode = '42501', message = 'Order confirm permission required';
  end if;

  select * into order_record from public.orders where id = target_order_id for update;
  if order_record.id is null then
    raise exception using errcode = 'P0002', message = 'Order not found';
  end if;
  if order_record.order_status not in ('NEW', 'CONTACTED', 'UNREACHABLE') then
    raise exception using errcode = '22023', message = 'Order cannot be confirmed from its current status';
  end if;

  select * into customer_record from public.customers where id = order_record.customer_id;
  select * into delivery_record from public.deliveries where order_id = target_order_id;

  if customer_record.id is null
    or customer_record.primary_phone_normalized !~ '^\+234[789][0-9]{9}$'
    or not exists (select 1 from public.order_items where order_id = target_order_id)
    or order_record.total_amount <= 0
    or delivery_record.id is null
    or length(trim(delivery_record.state)) < 2
    or length(trim(delivery_record.area)) < 2
    or length(trim(delivery_record.address_line)) < 5 then
    raise exception using errcode = '23514', message = 'Order is missing required confirmation information';
  end if;

  update public.orders set order_status = 'CONFIRMED' where id = target_order_id;
  insert into public.order_events (order_id, entity_type, entity_id, actor_user_id, action, from_state, to_state)
  values (target_order_id, 'ORDER', target_order_id, actor_user_id, 'ORDER_CONFIRMED', order_record.order_status::text, 'CONFIRMED');
  return 'CONFIRMED'::public.order_status;
end;
$$;

create or replace function public.cancel_order(
  target_order_id uuid,
  cancellation_code text,
  cancellation_note text default null
)
returns public.order_status
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  previous_status public.order_status;
  current_delivery_status public.delivery_status;
  allowed_codes constant text[] := array['CUSTOMER_REQUEST', 'DUPLICATE_ORDER', 'OUT_OF_COVERAGE', 'UNREACHABLE', 'INVALID_ORDER', 'OTHER'];
begin
  if actor_user_id is null or not public.has_permission('order.cancel') then
    raise exception using errcode = '42501', message = 'Order cancel permission required';
  end if;
  if cancellation_code is null or not (cancellation_code = any(allowed_codes)) then
    raise exception using errcode = '22023', message = 'Invalid cancellation reason';
  end if;
  if cancellation_code = 'OTHER' and length(trim(coalesce(cancellation_note, ''))) < 3 then
    raise exception using errcode = '22023', message = 'Cancellation note is required for OTHER';
  end if;

  select orders.order_status, deliveries.status
  into previous_status, current_delivery_status
  from public.orders
  join public.deliveries on deliveries.order_id = orders.id
  where orders.id = target_order_id
  for update of orders;

  if previous_status is null then
    raise exception using errcode = 'P0002', message = 'Order not found';
  end if;
  if previous_status not in ('NEW', 'CONTACTED', 'UNREACHABLE', 'CONFIRMED')
    or current_delivery_status in ('DELIVERED', 'RETURNED') then
    raise exception using errcode = '22023', message = 'Order cannot be cancelled from its current state';
  end if;

  update public.orders
  set order_status = 'CANCELLED',
      cancellation_reason_code = cancellation_code,
      cancellation_reason_note = nullif(trim(cancellation_note), ''),
      cancelled_at = statement_timestamp(),
      completed_at = null
  where id = target_order_id;

  insert into public.order_events (order_id, entity_type, entity_id, actor_user_id, action, from_state, to_state, metadata)
  values (target_order_id, 'ORDER', target_order_id, actor_user_id, 'ORDER_CANCELLED', previous_status::text, 'CANCELLED',
    jsonb_build_object('reason_code', cancellation_code, 'reason_note', nullif(trim(cancellation_note), '')));
  return 'CANCELLED'::public.order_status;
end;
$$;

create or replace function public.complete_order(target_order_id uuid)
returns public.order_status
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  previous_status public.order_status;
  current_delivery_status public.delivery_status;
  current_payment_status public.payment_status;
begin
  if actor_user_id is null or not public.has_permission('order.confirm') then
    raise exception using errcode = '42501', message = 'Order confirm permission required';
  end if;

  select orders.order_status, deliveries.status, payments.status
  into previous_status, current_delivery_status, current_payment_status
  from public.orders
  join public.deliveries on deliveries.order_id = orders.id
  join public.payments on payments.order_id = orders.id
  where orders.id = target_order_id
  for update of orders;

  if previous_status is null then
    raise exception using errcode = 'P0002', message = 'Order not found';
  end if;
  if previous_status <> 'CONFIRMED'
    or current_delivery_status <> 'DELIVERED'
    or current_payment_status <> 'PAID' then
    raise exception using errcode = '22023', message = 'Order completion requirements are not met';
  end if;

  update public.orders
  set order_status = 'COMPLETED', completed_at = statement_timestamp()
  where id = target_order_id;
  insert into public.order_events (order_id, entity_type, entity_id, actor_user_id, action, from_state, to_state)
  values (target_order_id, 'ORDER', target_order_id, actor_user_id, 'ORDER_COMPLETED', previous_status::text, 'COMPLETED');
  return 'COMPLETED'::public.order_status;
end;
$$;

create or replace function public.override_order_status(
  target_order_id uuid,
  target_status public.order_status,
  override_reason text
)
returns public.order_status
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  previous_status public.order_status;
begin
  if actor_user_id is null or not public.has_permission('order.override') then
    raise exception using errcode = '42501', message = 'Order override permission required';
  end if;
  if length(trim(coalesce(override_reason, ''))) < 5 then
    raise exception using errcode = '22023', message = 'Override reason is required';
  end if;

  select order_status into previous_status
  from public.orders where id = target_order_id for update;
  if previous_status is null then
    raise exception using errcode = 'P0002', message = 'Order not found';
  end if;
  if previous_status = target_status then
    raise exception using errcode = '22023', message = 'Override target must differ from current status';
  end if;

  update public.orders
  set order_status = target_status,
      cancelled_at = case when target_status = 'CANCELLED' then statement_timestamp() else null end,
      cancellation_reason_code = case when target_status = 'CANCELLED' then 'OTHER' else null end,
      cancellation_reason_note = case when target_status = 'CANCELLED' then trim(override_reason) else null end,
      completed_at = case when target_status = 'COMPLETED' then statement_timestamp() else null end
  where id = target_order_id;

  insert into public.order_events (order_id, entity_type, entity_id, actor_user_id, action, from_state, to_state, metadata)
  values (target_order_id, 'ORDER', target_order_id, actor_user_id, 'ORDER_STATUS_OVERRIDDEN', previous_status::text, target_status::text,
    jsonb_build_object('reason', trim(override_reason)));
  return target_status;
end;
$$;

revoke all on function public.mark_order_contacted(uuid) from public, anon;
revoke all on function public.mark_order_unreachable(uuid) from public, anon;
revoke all on function public.confirm_order(uuid) from public, anon;
revoke all on function public.cancel_order(uuid, text, text) from public, anon;
revoke all on function public.complete_order(uuid) from public, anon;
revoke all on function public.override_order_status(uuid, public.order_status, text) from public, anon;

grant execute on function public.mark_order_contacted(uuid) to authenticated;
grant execute on function public.mark_order_unreachable(uuid) to authenticated;
grant execute on function public.confirm_order(uuid) to authenticated;
grant execute on function public.cancel_order(uuid, text, text) to authenticated;
grant execute on function public.complete_order(uuid) to authenticated;
grant execute on function public.override_order_status(uuid, public.order_status, text) to authenticated;

comment on function public.mark_order_contacted(uuid) is 'Authorized NEW/UNREACHABLE to CONTACTED transition with an atomic audit event.';
comment on function public.mark_order_unreachable(uuid) is 'Authorized NEW/CONTACTED to UNREACHABLE transition with an atomic audit event.';
comment on function public.confirm_order(uuid) is 'Validates operational completeness before an authorized confirmation transition.';
comment on function public.cancel_order(uuid, text, text) is 'Cancels an eligible undelivered order with a controlled reason and audit event.';
comment on function public.complete_order(uuid) is 'Completes only a confirmed, delivered, and paid order.';
comment on function public.override_order_status(uuid, public.order_status, text) is 'Executive-only status exception with a mandatory reason and explicit override audit event.';
