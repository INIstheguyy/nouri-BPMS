begin;

select plan(29);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('99000000-0000-4000-8000-000000000001', 'delivery-manager@example.test', '{"full_name":"Delivery Manager"}'::jsonb),
  ('99000000-0000-4000-8000-000000000002', 'delivery-no-access@example.test', '{"full_name":"Delivery No Access"}'::jsonb);

update public.profiles set active = true
where id in ('99000000-0000-4000-8000-000000000001', '99000000-0000-4000-8000-000000000002');

insert into public.profile_roles (profile_id, role_id)
select '99000000-0000-4000-8000-000000000001'::uuid, id
from public.roles where code = 'ORDER_MANAGER';

select set_config('request.jwt.claims', '{"sub":"99000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

create function pg_temp.make_delivery_order(phone text, should_confirm boolean default true)
returns uuid
language plpgsql
as $$
declare created_id uuid;
begin
  select order_id into created_id
  from public.create_manual_order(
    'Delivery', 'Customer', phone, null, null,
    '20000000-0000-4000-8000-000000000001', 'COD',
    'Lagos', 'Lagos', 'Ikeja', '10 Delivery Street', 'Near the depot',
    'PHONE', 'Delivery workflow test', null, null
  );
  if should_confirm then
    perform public.confirm_order(created_id);
  end if;
  return created_id;
end;
$$;

create temporary table delivery_orders (name text primary key, id uuid not null);
insert into delivery_orders values
  ('unconfirmed', pg_temp.make_delivery_order('08031111000', false)),
  ('success', pg_temp.make_delivery_order('08031111001')),
  ('retry', pg_temp.make_delivery_order('08031111002')),
  ('failed_queue', pg_temp.make_delivery_order('08031111003'));

select throws_ok(
  $$
    select public.schedule_delivery(
      (select id from delivery_orders where name = 'unconfirmed'), current_date,
      'Morning', 'Delivery Customer', '08031111000', 'Lagos', 'Lagos', 'Ikeja',
      '10 Delivery Street', null, null
    )
  $$,
  '22023', 'Only confirmed orders can be scheduled',
  'unconfirmed order cannot be scheduled'
);

select is(
  public.schedule_delivery(
    (select id from delivery_orders where name = 'success'), current_date,
    'Morning', 'Updated Recipient', '0803 111 1001', 'Lagos', 'Lagos', 'Yaba',
    '20 Updated Delivery Street', 'Blue gate', 'First schedule'
  ),
  'SCHEDULED'::public.delivery_status,
  'confirmed order can be scheduled'
);
select ok(
  (
    select scheduled_date = current_date
      and recipient_phone = '+2348031111001'
      and area = 'Yaba'
      and address_line = '20 Updated Delivery Street'
    from public.deliveries
    where order_id = (select id from delivery_orders where name = 'success')
  ),
  'scheduling confirms and updates the delivery snapshot'
);
select is(
  (select count(*) from public.order_events where order_id = (select id from delivery_orders where name = 'success') and action = 'DELIVERY_SCHEDULED'),
  1::bigint,
  'scheduling emits exactly one event'
);

select is(
  public.schedule_delivery(
    (select id from delivery_orders where name = 'success'), current_date + 1,
    'Afternoon', 'Updated Recipient', '08031111001', 'Lagos', 'Lagos', 'Yaba',
    '20 Updated Delivery Street', 'Blue gate', 'Customer requested another day'
  ),
  'SCHEDULED'::public.delivery_status,
  'scheduled delivery can be rescheduled'
);
select is(
  (select count(*) from public.order_events where order_id = (select id from delivery_orders where name = 'success') and action = 'DELIVERY_RESCHEDULED'),
  1::bigint,
  'rescheduling emits its distinct event'
);

select is(
  public.dispatch_order(
    (select id from delivery_orders where name = 'success'),
    'Swift Courier', '08032223333', 'TRACK-001', 'Loaded at depot'
  ),
  'DISPATCHED'::public.delivery_status,
  'scheduled delivery can be dispatched'
);
select ok(
  (
    select courier_name = 'Swift Courier'
      and courier_phone = '+2348032223333'
      and tracking_reference = 'TRACK-001'
      and dispatched_at is not null
    from public.deliveries
    where order_id = (select id from delivery_orders where name = 'success')
  ),
  'dispatch stores normalized courier context and timestamp'
);
select is(
  (select count(*) from public.order_events where order_id = (select id from delivery_orders where name = 'success') and action = 'ORDER_DISPATCHED'),
  1::bigint,
  'dispatch emits exactly one event'
);

select is(
  public.mark_order_delivered((select id from delivery_orders where name = 'success'), 'Received by customer'),
  'DELIVERED'::public.delivery_status,
  'dispatched delivery can be marked delivered'
);
select is(
  (select status from public.payments where order_id = (select id from delivery_orders where name = 'success')),
  'UNPAID'::public.payment_status,
  'delivery success does not trust or change COD payment state'
);
select is(
  (select count(*) from public.order_events where order_id = (select id from delivery_orders where name = 'success') and action = 'ORDER_DELIVERED'),
  1::bigint,
  'delivery success emits exactly one event'
);

select throws_ok(
  $$ select public.dispatch_order((select id from delivery_orders where name = 'retry')) $$,
  '22023', 'Only a scheduled confirmed order can be dispatched',
  'unscheduled delivery cannot be dispatched'
);
select throws_ok(
  $$ select public.mark_order_delivered((select id from delivery_orders where name = 'retry')) $$,
  '22023', 'Only a dispatched confirmed order can be delivered',
  'undispatched delivery cannot be marked delivered'
);

select is(
  public.schedule_delivery(
    (select id from delivery_orders where name = 'retry'), current_date + 1,
    null, 'Delivery Customer', '08031111002', 'Lagos', 'Lagos', 'Ikeja',
    '10 Delivery Street', null, null
  ),
  'SCHEDULED'::public.delivery_status,
  'retry fixture can be scheduled'
);
select is(
  public.dispatch_order((select id from delivery_orders where name = 'retry')),
  'DISPATCHED'::public.delivery_status,
  'retry fixture can be dispatched'
);
select throws_ok(
  $$ select public.fail_delivery((select id from delivery_orders where name = 'retry'), 'NOT_A_REASON') $$,
  '22023', 'Invalid delivery failure reason',
  'failure rejects an unknown reason'
);
select throws_ok(
  $$ select public.fail_delivery((select id from delivery_orders where name = 'retry'), 'OTHER') $$,
  '22023', 'Failure note is required for OTHER',
  'OTHER failure requires a note'
);
select is(
  public.fail_delivery(
    (select id from delivery_orders where name = 'retry'),
    'CUSTOMER_UNAVAILABLE', 'Customer requested another attempt'
  ),
  'FAILED'::public.delivery_status,
  'dispatched delivery can be marked failed with a reason'
);
select is(
  (select failure_reason_code from public.deliveries where order_id = (select id from delivery_orders where name = 'retry')),
  'CUSTOMER_UNAVAILABLE',
  'failure reason is stored'
);
select is(
  (select count(*) from public.order_events where order_id = (select id from delivery_orders where name = 'retry') and action = 'DELIVERY_FAILED'),
  1::bigint,
  'failure emits exactly one event'
);

select is(
  public.schedule_delivery(
    (select id from delivery_orders where name = 'retry'), current_date + 2,
    'Evening', 'Delivery Customer', '08031111002', 'Lagos', 'Lagos', 'Ikeja',
    '10 Delivery Street', null, 'Retry attempt'
  ),
  'SCHEDULED'::public.delivery_status,
  'failed delivery can re-enter scheduling'
);
select ok(
  (
    select failure_reason_code is null and failure_reason_note is null
    from public.deliveries
    where order_id = (select id from delivery_orders where name = 'retry')
  ),
  'retry scheduling clears the prior failure state'
);
select is(
  (select count(*) from public.order_events where order_id = (select id from delivery_orders where name = 'retry') and action = 'DELIVERY_RETRY_SCHEDULED'),
  1::bigint,
  'retry scheduling emits its distinct event'
);

select public.schedule_delivery(
  (select id from delivery_orders where name = 'failed_queue'), current_date + 5,
  null, 'Delivery Customer', '08031111003', 'Lagos', 'Lagos', 'Ikeja',
  '10 Delivery Street', null, null
);
select public.dispatch_order((select id from delivery_orders where name = 'failed_queue'));
select public.fail_delivery((select id from delivery_orders where name = 'failed_queue'), 'COURIER_ISSUE', 'Vehicle issue');

select is(
  (select count(*) from public.list_delivery_attention(current_date + 2) where delivery_status = 'SCHEDULED'),
  1::bigint,
  'delivery attention queue includes work scheduled for the requested date'
);
select is(
  (select count(*) from public.list_delivery_attention(current_date + 2) where delivery_status = 'FAILED'),
  1::bigint,
  'delivery attention queue includes failed work regardless of scheduled date'
);

select throws_ok(
  $$ update public.deliveries set status = 'DELIVERED' where order_id = (select id from delivery_orders where name = 'retry') $$,
  '42501', 'permission denied for table deliveries',
  'authenticated clients cannot mutate delivery state directly'
);
select ok(
  (
    select bool_and(actor_user_id = '99000000-0000-4000-8000-000000000001')
    from public.order_events
    where entity_type = 'DELIVERY'
      and order_id in (select id from delivery_orders)
  ),
  'all delivery events record the authenticated actor'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"99000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$ select * from public.list_delivery_attention(current_date) $$,
  '42501', 'Order read permission required',
  'active user without order permission cannot read the delivery queue'
);

reset role;

select * from finish();

rollback;
