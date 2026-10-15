begin;

select plan(9);

select has_index(
  'public',
  'customers',
  'customers_primary_phone_normalized_key',
  'normalized customer phone is indexed uniquely'
);
select has_index('public', 'orders', 'orders_order_number_key', 'order number is indexed uniquely');
select has_index(
  'public',
  'orders',
  'orders_status_created_at_idx',
  'order status queue filtering is indexed'
);
select has_index(
  'public',
  'deliveries',
  'deliveries_status_scheduled_date_idx',
  'delivery status and date filtering is indexed'
);
select has_index(
  'public',
  'payments',
  'payments_provider_reference_uidx',
  'payment provider references are protected from duplicates'
);

select throws_ok(
  $$
    insert into public.customers (first_name, primary_phone_normalized)
    values ('Invalid Phone', '08031234567')
  $$,
  '23514',
  'new row for relation "customers" violates check constraint "customers_primary_phone_normalized_check"',
  'customers require a canonical Nigerian phone number'
);

select throws_ok(
  $$
    insert into public.offers (name, code, base_price)
    values ('Invalid Price', 'INVALID_PRICE', -1)
  $$,
  '23514',
  'new row for relation "offers" violates check constraint "offers_base_price_check"',
  'offers reject negative prices'
);

select throws_ok(
  $$
    insert into public.offer_items (
      offer_id,
      product_id,
      item_type,
      quantity,
      unit_price
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'BONUS',
      1,
      100
    )
  $$,
  '23514',
  'new row for relation "offer_items" violates check constraint "offer_items_check"',
  'bonus items must have a zero unit price'
);

insert into public.order_events (entity_type, entity_id, action)
values ('TEST', '93000000-0000-4000-8000-000000000001', 'TEST_EVENT');

select throws_ok(
  $$ delete from public.order_events where entity_id = '93000000-0000-4000-8000-000000000001' $$,
  'P0001',
  'order_events rows are immutable',
  'audit events cannot be deleted even by a privileged SQL caller'
);

select * from finish();

rollback;
