begin;

select plan(25);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'roles', 'roles table exists');
select has_table('public', 'permissions', 'permissions table exists');
select has_table('public', 'role_permissions', 'role_permissions table exists');
select has_table('public', 'profile_roles', 'profile_roles table exists');
select has_table('public', 'customers', 'customers table exists');
select has_table('public', 'products', 'products table exists');
select has_table('public', 'offers', 'offers table exists');
select has_table('public', 'offer_items', 'offer_items table exists');
select has_table('public', 'orders', 'orders table exists');
select has_table('public', 'order_items', 'order_items table exists');
select has_table('public', 'payments', 'payments table exists');
select has_table('public', 'deliveries', 'deliveries table exists');
select has_table('public', 'order_events', 'order_events table exists');
select has_table('public', 'idempotency_keys', 'idempotency table exists');

select has_type('public', 'order_status', 'order status enum exists');
select has_type('public', 'payment_method', 'payment method enum exists');
select has_type('public', 'payment_status', 'payment status enum exists');
select has_type('public', 'delivery_status', 'delivery status enum exists');
select has_type('public', 'order_source', 'order source enum exists');

select is(
  (
    select count(*)
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any (array[
        'profiles', 'roles', 'permissions', 'role_permissions', 'profile_roles',
        'customers', 'products', 'offers', 'offer_items', 'orders', 'order_items',
        'payments', 'deliveries', 'order_events', 'idempotency_keys'
      ])
      and c.relrowsecurity
  ),
  15::bigint,
  'RLS is enabled on every exposed operational table'
);

select is((select count(*) from public.permissions), 24::bigint, 'all V1 permissions are seeded');
select is((select count(*) from public.roles), 2::bigint, 'both V1 roles are seeded');
select is((select count(*) from public.offers), 3::bigint, 'the three initial offers are seeded');
select is((select count(*) from public.products), 1::bigint, 'the initial Nouri product is seeded');

select * from finish();

rollback;
