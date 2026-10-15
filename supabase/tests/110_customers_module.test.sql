begin;

select plan(24);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('9b000000-0000-4000-8000-000000000001', 'customer-manager@example.test', '{"full_name":"Customer Manager"}'::jsonb),
  ('9b000000-0000-4000-8000-000000000002', 'customer-no-access@example.test', '{"full_name":"Customer No Access"}'::jsonb);

update public.profiles set active = true
where id in ('9b000000-0000-4000-8000-000000000001', '9b000000-0000-4000-8000-000000000002');

insert into public.profile_roles (profile_id, role_id)
select '9b000000-0000-4000-8000-000000000001'::uuid, id
from public.roles where code = 'ORDER_MANAGER';

select set_config('request.jwt.claims', '{"sub":"9b000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

create function pg_temp.make_customer_order(
  first_name text,
  last_name text,
  phone text,
  acquisition_source public.order_source
)
returns uuid
language sql
as $$
  select order_id from public.create_manual_order(
    first_name, last_name, phone, null, null,
    '20000000-0000-4000-8000-000000000001', 'COD',
    'Lagos', 'Lagos', 'Ikeja', '10 Customer Street', 'Blue gate',
    acquisition_source, 'Customer module test', null, null
  );
$$;

create temporary table customer_orders (name text primary key, id uuid not null);
insert into customer_orders values
  ('first', pg_temp.make_customer_order('Repeat', 'CustomerModuleFixture', '08033333001', 'PHONE')),
  ('second', pg_temp.make_customer_order('Repeat', 'CustomerModuleFixture', '08033333001', 'WHATSAPP')),
  ('third', pg_temp.make_customer_order('Repeat', 'CustomerModuleFixture', '08033333001', 'OTHER')),
  ('other', pg_temp.make_customer_order('Single', 'CustomerModuleFixture', '08033333002', 'PHONE'));

reset role;

update public.orders
set created_at = case
  when id = (select id from customer_orders where name = 'first') then '2026-10-10 10:00:00+00'::timestamptz
  when id = (select id from customer_orders where name = 'second') then '2026-10-11 10:00:00+00'::timestamptz
  when id = (select id from customer_orders where name = 'third') then '2026-10-12 10:00:00+00'::timestamptz
  else '2026-10-09 10:00:00+00'::timestamptz
end;

update public.orders
set order_status = 'COMPLETED', completed_at = statement_timestamp()
where id = (select id from customer_orders where name = 'first');
update public.payments
set status = 'PAID', paid_at = statement_timestamp()
where order_id = (select id from customer_orders where name = 'first');
update public.deliveries
set status = 'DELIVERED', dispatched_at = statement_timestamp(), delivered_at = statement_timestamp()
where order_id = (select id from customer_orders where name = 'first');

update public.orders
set order_status = 'CANCELLED', cancelled_at = statement_timestamp(), cancellation_reason_code = 'CUSTOMER_REQUEST'
where id = (select id from customer_orders where name = 'second');

update public.orders
set order_status = 'CONFIRMED'
where id = (select id from customer_orders where name = 'third');
update public.deliveries
set status = 'FAILED', failure_reason_code = 'NO_ANSWER'
where order_id = (select id from customer_orders where name = 'third');

select set_config('request.jwt.claims', '{"sub":"9b000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select is(
  (select total_orders from public.list_customers('Repeat CustomerModuleFixture') limit 1),
  3::bigint,
  'repeat customer list row aggregates all orders'
);
select is(
  (select delivered_orders from public.list_customers('Repeat CustomerModuleFixture') limit 1),
  1::bigint,
  'customer list counts delivered orders'
);
select is(
  (select total_paid_spend from public.list_customers('Repeat CustomerModuleFixture') limit 1),
  (select amount from public.payments where order_id = (select id from customer_orders where name = 'first')),
  'customer list spend includes paid payments only'
);
select is(
  (select last_order_status from public.list_customers('Repeat CustomerModuleFixture') limit 1),
  'CONFIRMED'::public.order_status,
  'customer list reports the latest order status'
);
select is(
  (select count(*) from public.list_customers('Repeat CustomerModuleFixture')),
  1::bigint,
  'customer list searches by name'
);
select is(
  (select count(*) from public.list_customers('08033333001')),
  1::bigint,
  'customer list searches by local-format phone'
);
select is(
  (select count(*) from public.list_customers('CustomerModuleFixture', 1, 1)),
  1::bigint,
  'customer pagination limits rows'
);
select is(
  (select total_count from public.list_customers('CustomerModuleFixture', 1, 1)),
  2::bigint,
  'paginated list reports total matching customers'
);
select is(
  (select customer_name from public.list_customers('CustomerModuleFixture', 1, 1)),
  'Repeat CustomerModuleFixture',
  'customers sort by most recent order'
);
select is(
  (select currency from public.list_customers('Repeat CustomerModuleFixture') limit 1),
  'NGN'::char(3),
  'customer spend reports its currency'
);

create temporary table repeat_customer as
select customer_id from public.list_customers('Repeat CustomerModuleFixture') limit 1;

select is(
  ((public.get_customer_detail((select customer_id from repeat_customer))->'summary'->>'totalOrders')::bigint),
  3::bigint,
  'customer detail reports total orders'
);
select is(
  ((public.get_customer_detail((select customer_id from repeat_customer))->'summary'->>'deliveredOrders')::bigint),
  1::bigint,
  'customer detail reports delivered orders'
);
select is(
  ((public.get_customer_detail((select customer_id from repeat_customer))->'summary'->>'cancelledOrders')::bigint),
  1::bigint,
  'customer detail reports cancelled orders'
);
select is(
  ((public.get_customer_detail((select customer_id from repeat_customer))->'summary'->>'failedDeliveries')::bigint),
  1::bigint,
  'customer detail reports failed deliveries'
);
select is(
  ((public.get_customer_detail((select customer_id from repeat_customer))->'summary'->>'totalPaidSpend')::bigint),
  (select amount from public.payments where order_id = (select id from customer_orders where name = 'first')),
  'customer detail spend excludes unpaid and cancelled orders'
);
select is(
  public.get_customer_detail((select customer_id from repeat_customer))->'summary'->>'firstAcquisitionSource',
  'PHONE',
  'customer detail preserves first acquisition source'
);
select is(
  public.get_customer_detail((select customer_id from repeat_customer))->'summary'->>'mostRecentAcquisitionSource',
  'OTHER',
  'customer detail reports most recent acquisition source'
);
select is(
  jsonb_array_length(public.get_customer_detail((select customer_id from repeat_customer))->'orderHistory'),
  3,
  'customer detail includes complete order history'
);
select is(
  public.get_customer_detail((select customer_id from repeat_customer))->'orderHistory'->0->>'status',
  'CONFIRMED',
  'customer order history is newest first'
);
select is(
  public.get_customer_detail((select customer_id from repeat_customer))->>'primaryPhone',
  '+2348033333001',
  'customer detail returns normalized contact information'
);
select throws_ok(
  $$ select public.get_customer_detail('9b999999-9999-4999-8999-999999999999') $$,
  'P0002', 'Customer not found',
  'unknown customer detail is rejected'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"9b000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$ select * from public.list_customers() $$,
  '42501', 'Customer read permission required',
  'staff without customer.read cannot list customers'
);
select throws_ok(
  $$ select public.get_customer_detail((select customer_id from repeat_customer)) $$,
  '42501', 'Customer read permission required',
  'staff without customer.read cannot load customer detail'
);
select is(
  (select count(*) from public.customers),
  0::bigint,
  'customer RLS hides rows from staff without customer.read'
);

select * from finish();
rollback;
