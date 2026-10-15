begin;

update public.operational_settings
set prepaid_enabled = true
where id = '40000000-0000-4000-8000-000000000001';

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

select plan(22);

select is((select count(*) from public.products), 1::bigint, 'one sellable product is seeded');
select is((select count(*) from public.offers where active), 3::bigint, 'three active offers are seeded');
select is((select count(*) from public.offer_items), 3::bigint, 'each seeded offer has an item configuration');

select is(
  (select total_amount from public.resolve_offer_pricing('20000000-0000-4000-8000-000000000001', 'COD')),
  1500000::bigint,
  'one-pack COD total is authoritative'
);
select is(
  (select total_amount from public.resolve_offer_pricing('20000000-0000-4000-8000-000000000002', 'COD')),
  2550000::bigint,
  'two-pack COD total is authoritative'
);
select is(
  (select total_amount from public.resolve_offer_pricing('20000000-0000-4000-8000-000000000003', 'COD')),
  3600000::bigint,
  'three-pack COD total is authoritative'
);
select is(
  (select total_amount from public.resolve_offer_pricing('20000000-0000-4000-8000-000000000002', 'PREPAID')),
  2550000::bigint,
  'prepaid falls back to base price when no incentive is configured'
);

update public.offers
set prepaid_price = 2400000
where id = '20000000-0000-4000-8000-000000000002';

select is(
  (select discount_amount from public.resolve_offer_pricing('20000000-0000-4000-8000-000000000002', 'PREPAID')),
  150000::bigint,
  'prepaid incentive is calculated from server configuration'
);
select is(
  (select total_amount from public.resolve_offer_pricing('20000000-0000-4000-8000-000000000002', 'PREPAID')),
  2400000::bigint,
  'prepaid effective total uses the configured prepaid price'
);
select is(
  (select total_amount from public.resolve_offer_pricing('20000000-0000-4000-8000-000000000002', 'COD')),
  2550000::bigint,
  'prepaid configuration does not discount COD orders'
);

select is(
  (
    select count(*)
    from information_schema.parameters
    where specific_schema = 'public'
      and specific_name like 'resolve_offer_pricing_%'
      and parameter_mode = 'IN'
  ),
  2::bigint,
  'the authoritative pricing API accepts no client price argument'
);

insert into public.products (id, name, slug, sku)
values ('10000000-0000-4000-8000-000000000002', 'Promotional Balm', 'promotional-balm', 'NOURI-BALM');

insert into public.offer_items (id, offer_id, product_id, item_type, quantity, unit_price)
values (
  '30000000-0000-4000-8000-000000000004',
  '20000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000002',
  'BONUS',
  1,
  0
);

select is(
  (select count(*) from public.expand_active_offer_items('20000000-0000-4000-8000-000000000003')),
  2::bigint,
  'offer expansion includes configured bonus items'
);
select is(
  (
    select total_price
    from public.expand_active_offer_items('20000000-0000-4000-8000-000000000003')
    where item_type = 'BONUS'
  ),
  0::bigint,
  'expanded bonus item has zero price'
);
select is(
  (
    select item_name_snapshot
    from public.expand_active_offer_items('20000000-0000-4000-8000-000000000003')
    where item_type = 'BONUS'
  ),
  'Promotional Balm',
  'offer expansion supplies the immutable bonus name snapshot'
);

insert into public.customers (id, first_name, primary_phone_normalized)
values ('91000000-0000-4000-8000-000000000001', 'Snapshot', '+2348031234567');

insert into public.orders (
  id,
  order_number,
  customer_id,
  offer_id,
  source,
  payment_method,
  subtotal_amount,
  discount_amount,
  total_amount
) values (
  '92000000-0000-4000-8000-000000000001',
  'NOU-20261013-00001',
  '91000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  'WEBSITE',
  'PREPAID',
  2550000,
  150000,
  2400000
);

insert into public.order_items (
  order_id,
  product_id,
  item_type,
  item_name_snapshot,
  sku_snapshot,
  quantity,
  unit_price,
  total_price
)
select
  '92000000-0000-4000-8000-000000000001',
  product_id,
  item_type,
  item_name_snapshot,
  sku_snapshot,
  quantity,
  unit_price,
  total_price
from public.expand_active_offer_items('20000000-0000-4000-8000-000000000002');

update public.offers
set base_price = 2650000,
    prepaid_price = 2500000
where id = '20000000-0000-4000-8000-000000000002';

update public.offer_items
set unit_price = 1325000
where id = '30000000-0000-4000-8000-000000000002';

select is(
  (select unit_price from public.order_items where order_id = '92000000-0000-4000-8000-000000000001'),
  1275000::bigint,
  'historical item unit price is unchanged after an offer edit'
);
select is(
  (select total_price from public.order_items where order_id = '92000000-0000-4000-8000-000000000001'),
  2550000::bigint,
  'historical item total is unchanged after an offer edit'
);
select is(
  (select total_amount from public.orders where id = '92000000-0000-4000-8000-000000000001'),
  2400000::bigint,
  'historical order total is unchanged after an offer edit'
);

insert into public.offers (id, name, code, active, base_price)
values ('20000000-0000-4000-8000-000000000004', 'Inactive Test', 'INACTIVE_TEST', false, 100000);

select throws_ok(
  $$ select * from public.resolve_offer_pricing('20000000-0000-4000-8000-000000000004', 'COD') $$,
  'P0002',
  'Offer is unavailable',
  'inactive offers cannot be priced'
);

set local role anon;

select is(
  (select count(distinct offer_id) from public.active_offer_catalog),
  3::bigint,
  'anonymous checkout sees only the three active offers'
);
select is(
  (select count(*) from public.active_offer_catalog where item_type = 'BONUS'),
  1::bigint,
  'the safe catalog exposes configured active bonus items'
);
select throws_ok(
  $$ update public.offers set base_price = 1 where code = 'ONE_PACK' $$,
  '42501',
  'permission denied for table offers',
  'anonymous clients cannot alter authoritative offer prices'
);

reset role;

update public.offer_items
set unit_price = 1400000
where id = '30000000-0000-4000-8000-000000000001';

select throws_ok(
  $$ select * from public.resolve_offer_pricing('20000000-0000-4000-8000-000000000001', 'COD') $$,
  '22023',
  'Offer item pricing is inconsistent with the configured base price',
  'pricing rejects inconsistent item totals instead of trusting a caller'
);

select * from finish();

rollback;
