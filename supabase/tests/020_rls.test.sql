begin;

select plan(12);

insert into auth.users (id, email)
values
  ('90000000-0000-4000-8000-000000000001', 'manager@example.test'),
  ('90000000-0000-4000-8000-000000000002', 'admin@example.test'),
  ('90000000-0000-4000-8000-000000000003', 'inactive@example.test');

insert into public.profiles (id, full_name, email, active)
values
  ('90000000-0000-4000-8000-000000000001', 'Test Manager', 'manager@example.test', true),
  ('90000000-0000-4000-8000-000000000002', 'Test Admin', 'admin@example.test', true),
  ('90000000-0000-4000-8000-000000000003', 'Inactive Staff', 'inactive@example.test', false)
on conflict (id) do update
set full_name = excluded.full_name,
    email = excluded.email,
    active = excluded.active;

insert into public.profile_roles (profile_id, role_id)
select '90000000-0000-4000-8000-000000000001', id
from public.roles
where code = 'ORDER_MANAGER';

insert into public.profile_roles (profile_id, role_id)
select '90000000-0000-4000-8000-000000000002', id
from public.roles
where code = 'EXECUTIVE_ADMIN';

insert into public.profile_roles (profile_id, role_id)
select '90000000-0000-4000-8000-000000000003', id
from public.roles
where code = 'EXECUTIVE_ADMIN';

insert into public.customers (
  id,
  first_name,
  primary_phone_normalized,
  state,
  area,
  default_address
)
values (
  '91000000-0000-4000-8000-000000000001',
  'RLS Customer',
  '+2348031234567',
  'Lagos',
  'Yaba',
  '12 Test Street'
);

insert into public.orders (
  id,
  order_number,
  customer_id,
  offer_id,
  subtotal_amount,
  total_amount,
  payment_method,
  source
)
values (
  '92000000-0000-4000-8000-000000000001',
  'NOU-20261013-00001',
  '91000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  1500000,
  1500000,
  'COD',
  'PHONE'
);

insert into public.payments (order_id, method, status, amount)
values ('92000000-0000-4000-8000-000000000001', 'COD', 'UNPAID', 1500000);

insert into public.deliveries (
  order_id,
  recipient_name,
  recipient_phone,
  state,
  area,
  address_line
)
values (
  '92000000-0000-4000-8000-000000000001',
  'RLS Customer',
  '+2348031234567',
  'Lagos',
  'Yaba',
  '12 Test Street'
);

set local role anon;

select throws_ok(
  $$ select * from public.orders $$,
  '42501',
  'permission denied for table orders',
  'anonymous callers cannot query internal orders'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select ok(public.has_permission('order.read'), 'Order Manager has order.read');
select ok(not public.has_permission('staff.manage'), 'Order Manager lacks staff.manage');
select is(
  (select count(*) from public.orders where id = '92000000-0000-4000-8000-000000000001'),
  1::bigint,
  'Order Manager can read the fixture order'
);
select is((select count(*) from public.profiles), 1::bigint, 'Order Manager can read only their profile');
select throws_ok(
  $$
    insert into public.customers (first_name, primary_phone_normalized)
    values ('Blocked', '+2348031234568')
  $$,
  '42501',
  'permission denied for table customers',
  'authenticated staff cannot bypass command boundaries with a direct insert'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select ok(public.has_permission('staff.manage'), 'Executive Admin has staff.manage');
select ok((select count(*) from public.profiles) >= 3, 'Executive Admin can read all staff profiles');

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);
set local role authenticated;

select ok(not public.is_active_staff(), 'inactive staff fails the active-staff check');
select is((select count(*) from public.orders), 0::bigint, 'inactive staff cannot read orders');

reset role;

select is(
  (
    select count(*)
    from unnest(array[
      'profiles', 'roles', 'permissions', 'role_permissions', 'profile_roles',
      'customers', 'products', 'offers', 'offer_items', 'orders', 'order_items',
      'payments', 'deliveries', 'order_events', 'idempotency_keys'
    ]) as exposed_tables(table_name)
    where has_table_privilege('anon', format('public.%I', table_name), 'SELECT')
  ),
  0::bigint,
  'anonymous callers have no direct SELECT grant on operational tables'
);

select is(
  (
    select count(*)
    from unnest(array[
      'profiles', 'roles', 'permissions', 'role_permissions', 'profile_roles',
      'customers', 'products', 'offers', 'offer_items', 'orders', 'order_items',
      'payments', 'deliveries', 'order_events', 'idempotency_keys'
    ]) as exposed_tables(table_name)
    where has_table_privilege(
      'authenticated',
      format('public.%I', table_name),
      'INSERT, UPDATE, DELETE'
    )
  ),
  0::bigint,
  'authenticated browser roles have no direct mutation grants'
);

select * from finish();

rollback;
