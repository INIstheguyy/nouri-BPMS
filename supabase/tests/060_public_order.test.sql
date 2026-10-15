begin;

update public.offers
set
  active = true,
  base_price = case id
    when '20000000-0000-4000-8000-000000000001' then 1500000
    when '20000000-0000-4000-8000-000000000002' then 2550000
    when '20000000-0000-4000-8000-000000000003' then 3600000
  end,
  prepaid_price = null
where id in (
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000003'
);

update public.offer_items
set unit_price = case id
  when '30000000-0000-4000-8000-000000000001' then 1500000
  when '30000000-0000-4000-8000-000000000002' then 1275000
  when '30000000-0000-4000-8000-000000000003' then 1200000
end
where id in (
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000003'
);

select plan(35);

select is(public.normalize_nigerian_phone('0803 123 4567'), '+2348031234567', 'local phone is normalized');
select is(public.normalize_nigerian_phone('+2348031234567'), '+2348031234567', 'international phone is preserved');
select is(public.normalize_nigerian_phone('234-803-123-4567'), '+2348031234567', 'international digits are normalized');
select is(public.normalize_nigerian_phone('8031234567'), '+2348031234567', 'mobile number without trunk code is normalized');
select is(public.normalize_nigerian_phone('(0803) 123-4567'), '+2348031234567', 'phone punctuation is ignored');
select throws_ok(
  $$ select public.normalize_nigerian_phone('12345') $$,
  '22023',
  'Invalid Nigerian mobile number',
  'invalid Nigerian phone is rejected'
);

create function pg_temp.make_public_order(
  idempotency_key text,
  fingerprint text,
  phone text,
  offer_id uuid,
  payment_method public.payment_method default 'COD',
  state_name text default 'Lagos',
  source_name public.order_source default 'TIKTOK'
)
returns table (order_number text, possible_duplicate boolean, replayed boolean)
language sql
as $$
  select *
  from public.create_public_order(
    request_idempotency_key => idempotency_key,
    request_fingerprint => fingerprint,
    customer_first_name => 'Ada',
    customer_last_name => 'Okafor',
    customer_phone => phone,
    customer_alternative_phone => null,
    customer_email => 'ada@example.test',
    selected_offer_id => offer_id,
    selected_payment_method => payment_method,
    delivery_state => state_name,
    delivery_city => 'Lagos',
    delivery_area => 'Yaba',
    delivery_address_line => '12 Example Street',
    delivery_landmark => 'Near Example Junction',
    acquisition_source => source_name,
    acquisition_source_detail => 'paid_social',
    acquisition_campaign_name => 'october_campaign',
    acquisition_utm_source => 'tiktok',
    acquisition_utm_medium => 'paid_social',
    acquisition_utm_campaign => 'october_campaign',
    acquisition_utm_content => 'creative_03',
    acquisition_utm_term => null,
    acquisition_landing_page => '/order',
    acquisition_referrer => 'https://example.test',
    acquisition_click_id_type => 'TTCLID',
    acquisition_click_id_value => 'test-click-id',
    acquisition_metadata => '{"ttclid":"test-click-id"}'::jsonb,
    submitted_customer_note => 'Call before delivery'
  );
$$;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select throws_ok(
  $$
    select * from pg_temp.make_public_order(
      'public-order-anon-denied-0001',
      repeat('a', 64),
      '08031234567',
      '20000000-0000-4000-8000-000000000001'
    )
  $$,
  '42501',
  'permission denied for function create_public_order',
  'anonymous browser credentials cannot invoke the internal order transaction'
);

reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

select ok(
  (select allowed from public.check_public_order_rate_limit(repeat('f', 64), 2, 60)),
  'first request is within the rate limit'
);
select ok(
  (select allowed from public.check_public_order_rate_limit(repeat('f', 64), 2, 60)),
  'second request is within the rate limit'
);
select ok(
  not (select allowed from public.check_public_order_rate_limit(repeat('f', 64), 2, 60)),
  'request above the configured bucket limit is blocked'
);

create temporary table first_result as
select *
from pg_temp.make_public_order(
  'public-order-idempotency-0001',
  repeat('a', 64),
  '0803 123 4567',
  '20000000-0000-4000-8000-000000000001'
);

select matches(
  (select order_number from first_result),
  '^NOU-[0-9]{8}-[0-9]{5,}$',
  'new public order receives a safe order number'
);
select ok(not (select possible_duplicate from first_result), 'first order is not marked duplicate');
select ok(not (select replayed from first_result), 'first order is not an idempotent replay');
select is(
  (select count(*) from public.customers where primary_phone_normalized = '+2348031234567'),
  1::bigint,
  'new order creates one customer'
);
select ok(
  (select count(*) from public.orders where order_number = (select order_number from first_result)) = 1
    and (select count(*) from public.order_items where order_id = (select id from public.orders where order_number = (select order_number from first_result))) = 1
    and (select count(*) from public.payments where order_id = (select id from public.orders where order_number = (select order_number from first_result))) = 1
    and (select count(*) from public.deliveries where order_id = (select id from public.orders where order_number = (select order_number from first_result))) = 1
    and (select count(*) from public.order_events where order_id = (select id from public.orders where order_number = (select order_number from first_result)) and action = 'ORDER_CREATED') = 1,
  'order transaction creates all linked operational records'
);
select is(
  (select primary_phone_normalized from public.customers where primary_phone_normalized = '+2348031234567'),
  '+2348031234567',
  'customer persists the canonical phone'
);
select is(
  (select total_amount from public.orders where order_number = (select order_number from first_result)),
  1500000::bigint,
  'stored total comes from the authoritative offer configuration'
);
select ok(
  (
    select source = 'TIKTOK'
      and utm_source = 'tiktok'
      and utm_medium = 'paid_social'
      and click_id_type = 'TTCLID'
      and click_id_value = 'test-click-id'
    from public.orders
    where order_number = (select order_number from first_result)
  ),
  'public order captures attribution and click identifiers'
);

select throws_ok(
  $$
    select * from pg_temp.make_public_order(
      'public-order-prepaid-disabled-0001',
      repeat('9', 64),
      '+2348031234567',
      '20000000-0000-4000-8000-000000000002',
      'PREPAID'
    )
  $$,
  '22023',
  'Prepaid ordering is not enabled',
  'prepaid ordering is rejected by the server-side launch gate'
);

create temporary table second_result as
select *
from pg_temp.make_public_order(
  'public-order-idempotency-0002',
  repeat('b', 64),
  '+2348031234567',
  '20000000-0000-4000-8000-000000000002',
  'COD'
);

select is((select count(*) from public.customers where primary_phone_normalized = '+2348031234567'), 1::bigint, 'existing normalized phone reuses the customer');
select is((select count(*) from public.orders where customer_id = (select id from public.customers where primary_phone_normalized = '+2348031234567')), 2::bigint, 'reused customer receives a second order');
select is(
  (
    select total_amount
    from public.orders
    where order_number = (select order_number from second_result)
  ),
  2550000::bigint,
  'second COD order still derives its current authoritative total'
);

create temporary table duplicate_result as
select *
from pg_temp.make_public_order(
  'public-order-idempotency-0003',
  repeat('c', 64),
  '2348031234567',
  '20000000-0000-4000-8000-000000000001'
);

select ok((select possible_duplicate from duplicate_result), 'same customer and offer within 24 hours raises a duplicate warning');

create temporary table replay_result as
select *
from pg_temp.make_public_order(
  'public-order-idempotency-0001',
  repeat('a', 64),
  '08031234567',
  '20000000-0000-4000-8000-000000000001'
);

select is(
  (select order_number from replay_result),
  (select order_number from first_result),
  'identical idempotent retry returns the original order number'
);
select ok((select replayed from replay_result), 'identical idempotent retry is marked as replayed');
select is((select count(*) from public.orders where customer_id = (select id from public.customers where primary_phone_normalized = '+2348031234567')), 3::bigint, 'idempotent retry creates no extra order');

select throws_ok(
  $$
    select * from pg_temp.make_public_order(
      'public-order-idempotency-0001',
      repeat('d', 64),
      '08031234567',
      '20000000-0000-4000-8000-000000000001'
    )
  $$,
  '22023',
  'Idempotency key was reused with a different request',
  'reusing an idempotency key for another payload is rejected'
);

insert into public.offers (id, name, code, active, base_price)
values ('20000000-0000-4000-8000-000000000099', 'Inactive', 'INACTIVE_PUBLIC', false, 1500000);

select throws_ok(
  $$
    select * from pg_temp.make_public_order(
      'public-order-inactive-0001',
      repeat('e', 64),
      '08039999999',
      '20000000-0000-4000-8000-000000000099'
    )
  $$,
  'P0002',
  'Offer is unavailable',
  'inactive offer is rejected'
);
select is((select count(*) from public.orders where customer_id = (select id from public.customers where primary_phone_normalized = '+2348031234567')), 3::bigint, 'inactive offer failure creates no order');

select throws_ok(
  $$
    select * from pg_temp.make_public_order(
      'public-order-rollback-0001',
      repeat('1', 64),
      '08038888888',
      '20000000-0000-4000-8000-000000000003',
      'COD',
      null
    )
  $$,
  '23502',
  'null value in column "state" of relation "deliveries" violates not-null constraint',
  'late linked-record failure rolls back the transaction'
);
select is(
  (select count(*) from public.customers where primary_phone_normalized = '+2348038888888'),
  0::bigint,
  'rollback removes the customer created earlier in the failed transaction'
);
select is(
  (select count(*) from public.idempotency_keys where key = 'public-order-rollback-0001'),
  0::bigint,
  'rollback removes the claimed idempotency key'
);

select is(
  (
    select count(*)
    from information_schema.parameters
    where specific_schema = 'public'
      and specific_name like 'create_public_order_%'
      and parameter_mode = 'IN'
      and parameter_name ilike '%price%'
  ),
  0::bigint,
  'public order transaction accepts no client-supplied price parameter'
);

reset role;
insert into auth.users (id, email, raw_user_meta_data)
values (
  '96000000-0000-4000-8000-000000000001',
  'public-order-manager@example.test',
  '{"full_name":"Public Order Manager"}'::jsonb
);
update public.profiles
set active = true
where id = '96000000-0000-4000-8000-000000000001';
insert into public.profile_roles (profile_id, role_id)
select '96000000-0000-4000-8000-000000000001', id
from public.roles
where code = 'ORDER_MANAGER';

select set_config(
  'request.jwt.claims',
  '{"sub":"96000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.orders where customer_id = (select id from public.customers where primary_phone_normalized = '+2348031234567')),
  3::bigint,
  'fully linked public orders are visible to authorized operational staff'
);

reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select throws_ok(
  $$
    insert into public.orders (
      order_number,
      customer_id,
      offer_id,
      subtotal_amount,
      total_amount,
      payment_method,
      source
    ) values (
      'NOU-20261013-99999',
      '91000000-0000-4000-8000-000000000099',
      '20000000-0000-4000-8000-000000000001',
      1,
      1,
      'COD',
      'LANDING_PAGE'
    )
  $$,
  '42501',
  'permission denied for table orders',
  'anonymous users cannot bypass the Edge Function with a direct order insert'
);

reset role;

select * from finish();

rollback;
