begin;

select plan(27);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('98000000-0000-4000-8000-000000000001', 'workflow-manager@example.test', '{"full_name":"Workflow Manager"}'::jsonb),
  ('98000000-0000-4000-8000-000000000002', 'workflow-admin@example.test', '{"full_name":"Workflow Admin"}'::jsonb);

update public.profiles set active = true
where id in ('98000000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000002');

insert into public.profile_roles (profile_id, role_id)
select '98000000-0000-4000-8000-000000000001'::uuid, id from public.roles where code = 'ORDER_MANAGER'
union all
select '98000000-0000-4000-8000-000000000002'::uuid, id from public.roles where code = 'EXECUTIVE_ADMIN';

select set_config('request.jwt.claims', '{"sub":"98000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

create function pg_temp.make_manual(phone text, offer_id uuid default '20000000-0000-4000-8000-000000000001')
returns uuid
language sql
as $$
  select order_id from public.create_manual_order(
    'Workflow', 'Customer', phone, null, null, offer_id, 'COD',
    'Lagos', 'Lagos', 'Ikeja', '10 Workflow Street', null,
    'PHONE', 'Test call', null, null
  );
$$;

create temporary table workflow_orders (name text primary key, id uuid not null);
insert into workflow_orders values
  ('a', pg_temp.make_manual('08030000001')),
  ('b', pg_temp.make_manual('08030000002')),
  ('c', pg_temp.make_manual('08030000003')),
  ('d', pg_temp.make_manual('08030000004')),
  ('e', pg_temp.make_manual('08030000005')),
  ('f', pg_temp.make_manual('08030000006'));

select is(public.mark_order_contacted((select id from workflow_orders where name = 'a')), 'CONTACTED'::public.order_status, 'NEW transitions to CONTACTED');
select is(public.mark_order_unreachable((select id from workflow_orders where name = 'a')), 'UNREACHABLE'::public.order_status, 'CONTACTED transitions to UNREACHABLE');
select is(public.mark_order_contacted((select id from workflow_orders where name = 'a')), 'CONTACTED'::public.order_status, 'UNREACHABLE transitions back to CONTACTED');
select is(public.confirm_order((select id from workflow_orders where name = 'a')), 'CONFIRMED'::public.order_status, 'CONTACTED transitions to CONFIRMED');

select is(public.mark_order_unreachable((select id from workflow_orders where name = 'b')), 'UNREACHABLE'::public.order_status, 'NEW transitions to UNREACHABLE');
select is(public.confirm_order((select id from workflow_orders where name = 'b')), 'CONFIRMED'::public.order_status, 'UNREACHABLE transitions to CONFIRMED');
select is(public.cancel_order((select id from workflow_orders where name = 'b'), 'CUSTOMER_REQUEST', 'Changed mind'), 'CANCELLED'::public.order_status, 'CONFIRMED undelivered order transitions to CANCELLED');

select is(public.confirm_order((select id from workflow_orders where name = 'c')), 'CONFIRMED'::public.order_status, 'NEW transitions directly to CONFIRMED');
select is(public.cancel_order((select id from workflow_orders where name = 'd'), 'DUPLICATE_ORDER'), 'CANCELLED'::public.order_status, 'NEW transitions directly to CANCELLED');

select is(public.mark_order_contacted((select id from workflow_orders where name = 'e')), 'CONTACTED'::public.order_status, 'second NEW order transitions to CONTACTED');
select is(public.cancel_order((select id from workflow_orders where name = 'e'), 'INVALID_ORDER'), 'CANCELLED'::public.order_status, 'CONTACTED transitions to CANCELLED');

select is(public.mark_order_unreachable((select id from workflow_orders where name = 'f')), 'UNREACHABLE'::public.order_status, 'second NEW order transitions to UNREACHABLE');
select is(public.cancel_order((select id from workflow_orders where name = 'f'), 'UNREACHABLE'), 'CANCELLED'::public.order_status, 'UNREACHABLE transitions to CANCELLED');

select throws_ok(
  $$ select public.mark_order_contacted((select id from workflow_orders where name = 'a')) $$,
  '22023', 'Order cannot be marked contacted from its current status',
  'invalid normal transition is rejected'
);
select throws_ok(
  $$ select public.cancel_order((select id from workflow_orders where name = 'c'), 'OTHER') $$,
  '22023', 'Cancellation note is required for OTHER',
  'OTHER cancellation requires a note'
);

select is(
  (select cancellation_reason_code from public.orders where id = (select id from workflow_orders where name = 'b')),
  'CUSTOMER_REQUEST',
  'cancellation reason is stored on the order'
);
select is(
  (select count(*) from public.order_events where order_id = (select id from workflow_orders where name = 'a') and action in ('CUSTOMER_CONTACTED', 'CUSTOMER_UNREACHABLE', 'ORDER_CONFIRMED')),
  4::bigint,
  'each successful normal transition creates exactly one matching event'
);
select ok(
  (select bool_and(actor_user_id = '98000000-0000-4000-8000-000000000001') from public.order_events where order_id = (select id from workflow_orders where name = 'a') and action <> 'ORDER_CREATED'),
  'transition events record the authenticated actor'
);

select throws_ok(
  $$ select public.complete_order((select id from workflow_orders where name = 'c')) $$,
  '22023', 'Order completion requirements are not met',
  'confirmed but undelivered and unpaid order cannot complete'
);

select throws_ok(
  $$ update public.orders set order_status = 'COMPLETED' where id = (select id from workflow_orders where name = 'c') $$,
  '42501', 'permission denied for table orders',
  'authenticated clients cannot mutate status directly'
);

select throws_ok(
  $$ select public.override_order_status((select id from workflow_orders where name = 'd'), 'NEW', 'Manager exception attempt') $$,
  '42501', 'Order override permission required',
  'Order Manager cannot invoke an override'
);

reset role;
update public.deliveries
set status = 'DELIVERED', dispatched_at = statement_timestamp(), delivered_at = statement_timestamp()
where order_id = (select id from workflow_orders where name = 'c');
update public.payments
set status = 'PAID', paid_at = statement_timestamp()
where order_id = (select id from workflow_orders where name = 'c');

select set_config('request.jwt.claims', '{"sub":"98000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is(public.complete_order((select id from workflow_orders where name = 'c')), 'COMPLETED'::public.order_status, 'delivered and paid confirmed order completes');
select ok(
  (select completed_at is not null from public.orders where id = (select id from workflow_orders where name = 'c')),
  'completion records its timestamp'
);
select is(
  (select count(*) from public.order_events where order_id = (select id from workflow_orders where name = 'c') and action = 'ORDER_COMPLETED'),
  1::bigint,
  'completion creates exactly one audit event'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"98000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select throws_ok(
  $$ select public.override_order_status((select id from workflow_orders where name = 'd'), 'NEW', 'bad') $$,
  '22023', 'Override reason is required',
  'Executive override requires a meaningful reason'
);
select is(
  public.override_order_status((select id from workflow_orders where name = 'd'), 'NEW', 'Duplicate determination was incorrect'),
  'NEW'::public.order_status,
  'Executive Admin can perform a reasoned override'
);
select ok(
  (
    select action = 'ORDER_STATUS_OVERRIDDEN'
      and from_state = 'CANCELLED'
      and to_state = 'NEW'
      and metadata ->> 'reason' = 'Duplicate determination was incorrect'
    from public.order_events
    where order_id = (select id from workflow_orders where name = 'd')
      and action = 'ORDER_STATUS_OVERRIDDEN'
  ),
  'override writes the explicit exception event and reason'
);

reset role;

select * from finish();

rollback;
