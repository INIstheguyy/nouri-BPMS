begin;

update public.operational_settings
set prepaid_enabled = true
where id = '40000000-0000-4000-8000-000000000001';

select plan(31);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('9a000000-0000-4000-8000-000000000001', 'payment-manager@example.test', '{"full_name":"Payment Manager"}'::jsonb),
  ('9a000000-0000-4000-8000-000000000002', 'payment-no-access@example.test', '{"full_name":"Payment No Access"}'::jsonb);

update public.profiles set active = true
where id in ('9a000000-0000-4000-8000-000000000001', '9a000000-0000-4000-8000-000000000002');

insert into public.profile_roles (profile_id, role_id)
select '9a000000-0000-4000-8000-000000000001'::uuid, id
from public.roles where code = 'ORDER_MANAGER';

select set_config('request.jwt.claims', '{"sub":"9a000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

create function pg_temp.make_payment_order(phone text, method public.payment_method, deliver boolean default true)
returns uuid
language plpgsql
as $$
declare created_id uuid;
begin
  select order_id into created_id
  from public.create_manual_order(
    'Payment', 'Customer', phone, null, null,
    '20000000-0000-4000-8000-000000000001', method,
    'Lagos', 'Lagos', 'Ikeja', '10 Payment Street', null,
    'PHONE', 'Payment workflow test', null, null
  );
  perform public.confirm_order(created_id);
  if deliver then
    perform public.schedule_delivery(
      created_id, current_date, 'Morning', 'Payment Customer', phone,
      'Lagos', 'Lagos', 'Ikeja', '10 Payment Street', null, null
    );
    perform public.dispatch_order(created_id);
    perform public.mark_order_delivered(created_id);
  end if;
  return created_id;
end;
$$;

create temporary table payment_orders (name text primary key, id uuid not null);
insert into payment_orders values
  ('cod', pg_temp.make_payment_order('08032222001', 'COD')),
  ('cod_early', pg_temp.make_payment_order('08032222002', 'COD', false)),
  ('prepaid', pg_temp.make_payment_order('08032222003', 'PREPAID'));
grant select on payment_orders to service_role;

select throws_ok(
  $$ select public.complete_order((select id from payment_orders where name = 'cod')) $$,
  '22023', 'Order completion requirements are not met',
  'a delivered but unpaid COD order cannot complete'
);
select is(
  public.mark_cod_paid((select id from payment_orders where name = 'cod'), 'Cash handed to courier'),
  'PAID'::public.payment_status,
  'authorized staff can reconcile delivered COD'
);
select is(
  (select status from public.payments where order_id = (select id from payment_orders where name = 'cod')),
  'PAID'::public.payment_status,
  'COD reconciliation stores paid status'
);
select ok(
  (select paid_at is not null from public.payments where order_id = (select id from payment_orders where name = 'cod')),
  'COD reconciliation stores paid timestamp'
);
select ok(
  (select bool_and(actor_user_id = '9a000000-0000-4000-8000-000000000001')
   from public.order_events
   where order_id = (select id from payment_orders where name = 'cod') and action = 'PAYMENT_MARKED_PAID'),
  'COD audit event records the staff actor'
);
select is(
  (select count(*) from public.order_events
   where order_id = (select id from payment_orders where name = 'cod') and action = 'PAYMENT_MARKED_PAID'),
  1::bigint,
  'COD reconciliation emits one event'
);
select is(
  public.mark_cod_paid((select id from payment_orders where name = 'cod'), 'Duplicate retry'),
  'PAID'::public.payment_status,
  'duplicate COD reconciliation safely returns paid'
);
select is(
  (select count(*) from public.order_events
   where order_id = (select id from payment_orders where name = 'cod') and action = 'PAYMENT_MARKED_PAID'),
  1::bigint,
  'duplicate COD reconciliation does not duplicate audit events'
);
select is(
  public.complete_order((select id from payment_orders where name = 'cod')),
  'COMPLETED'::public.order_status,
  'delivered and reconciled COD order can complete'
);
select throws_ok(
  $$ select public.mark_cod_paid((select id from payment_orders where name = 'cod_early')) $$,
  '22023', 'COD payment can only be recorded after delivery',
  'COD cannot be recorded before delivery'
);
select throws_ok(
  $$ select public.mark_cod_paid((select id from payment_orders where name = 'prepaid')) $$,
  '22023', 'Only COD payments can be reconciled manually',
  'manual COD command cannot mark prepaid as paid'
);

reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

select is(
  (select provider from public.initialize_prepaid_payment(
    (select id from payment_orders where name = 'prepaid'), 'mock', 'mock_reference_001',
    '9a000000-0000-4000-8000-000000000001'
  )),
  'mock',
  'service initializes prepaid through an authorized staff actor'
);
select is(
  (select provider_reference from public.payments where order_id = (select id from payment_orders where name = 'prepaid')),
  'mock_reference_001',
  'initialization stores the provider reference'
);
select is(
  (select status from public.payments where order_id = (select id from payment_orders where name = 'prepaid')),
  'PENDING'::public.payment_status,
  'initialization does not fake payment success'
);
select ok(
  (select already_initialized from public.initialize_prepaid_payment(
    (select id from payment_orders where name = 'prepaid'), 'mock', 'ignored_retry_reference',
    '9a000000-0000-4000-8000-000000000001'
  )),
  'repeat prepaid initialization is idempotent'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"9a000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$ select * from public.initialize_prepaid_payment(
    (select id from payment_orders where name = 'prepaid'), 'mock', 'blocked_reference',
    '9a000000-0000-4000-8000-000000000001'
  ) $$,
  '42501', 'permission denied for function initialize_prepaid_payment',
  'browser clients cannot invoke service initialization RPC directly'
);
select throws_ok(
  $$ select public.complete_order((select id from payment_orders where name = 'prepaid')) $$,
  '22023', 'Order completion requirements are not met',
  'prepaid order cannot complete before a verified provider event'
);

reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select throws_ok(
  $$ select * from public.record_provider_payment_event(
    'mock', 'event_wrong_amount', 'mock_reference_001', 'payment.succeeded', 1, 'NGN',
    repeat('a', 64)
  ) $$,
  '22023', 'Provider payment amount or currency does not match',
  'provider event with the wrong amount is rejected'
);
select is(
  (select status from public.payments where order_id = (select id from payment_orders where name = 'prepaid')),
  'PENDING'::public.payment_status,
  'rejected provider event leaves payment pending'
);
select is(
  (select payment_status from public.record_provider_payment_event(
    'mock', 'event_success_001', 'mock_reference_001', 'payment.succeeded',
    (select amount from public.payments where order_id = (select id from payment_orders where name = 'prepaid')),
    'NGN', repeat('b', 64)
  )),
  'PAID'::public.payment_status,
  'valid verified provider event marks prepaid paid'
);
select is(
  (select status from public.payments where order_id = (select id from payment_orders where name = 'prepaid')),
  'PAID'::public.payment_status,
  'verified provider result is persisted'
);
select is(
  (select count(*) from public.payment_provider_events where event_id = 'event_success_001'),
  1::bigint,
  'provider event is stored once'
);
select is(
  (select count(*) from public.order_events
   where order_id = (select id from payment_orders where name = 'prepaid') and action = 'PAYMENT_CONFIRMED'),
  1::bigint,
  'successful provider transition emits one audit event'
);
select ok(
  (select replayed from public.record_provider_payment_event(
    'mock', 'event_success_001', 'mock_reference_001', 'payment.succeeded',
    (select amount from public.payments where order_id = (select id from payment_orders where name = 'prepaid')),
    'NGN', repeat('b', 64)
  )),
  'duplicate provider event is recognized as a replay'
);
select is(
  (select count(*) from public.order_events
   where order_id = (select id from payment_orders where name = 'prepaid') and action = 'PAYMENT_CONFIRMED'),
  1::bigint,
  'provider replay does not duplicate audit events'
);
select throws_ok(
  $$ select * from public.record_provider_payment_event(
    'mock', 'event_success_001', 'mock_reference_001', 'payment.succeeded',
    (select amount from public.payments where order_id = (select id from payment_orders where name = 'prepaid')),
    'NGN', repeat('c', 64)
  ) $$,
  '22023', 'Provider event id was reused with different data',
  'event id cannot be replayed with a different payload'
);
select is(
  (select payment_status from public.record_provider_payment_event(
    'mock', 'event_late_failure', 'mock_reference_001', 'payment.failed',
    (select amount from public.payments where order_id = (select id from payment_orders where name = 'prepaid')),
    'NGN', repeat('d', 64)
  )),
  'PAID'::public.payment_status,
  'a late failure event cannot downgrade an already paid payment'
);
select is(
  (select count(*) from public.order_events
   where order_id = (select id from payment_orders where name = 'prepaid') and action = 'PAYMENT_FAILED'),
  0::bigint,
  'a non-transitioning late failure does not emit a misleading audit transition'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"9a000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(
  public.complete_order((select id from payment_orders where name = 'prepaid')),
  'COMPLETED'::public.order_status,
  'verified prepaid payment enables order completion'
);
select ok(
  not has_table_privilege('authenticated', 'public.payment_provider_events', 'SELECT'),
  'browser clients cannot read the private provider-event ledger'
);
select throws_ok(
  $$ select public.mark_cod_paid((select id from payment_orders where name = 'cod_early')) $$,
  '22023', 'COD payment can only be recorded after delivery',
  'payment command continues enforcing delivery state'
);

select * from finish();
rollback;
