begin;

select plan(23);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '97000000-0000-4000-8000-000000000001',
    'orders-manager@example.test',
    '{"full_name":"Orders Manager"}'::jsonb
  ),
  (
    '97000000-0000-4000-8000-000000000002',
    'orders-no-access@example.test',
    '{"full_name":"No Access User"}'::jsonb
  );

update public.profiles
set active = true
where id in (
  '97000000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000002'
);

insert into public.profile_roles (profile_id, role_id)
select '97000000-0000-4000-8000-000000000001', id
from public.roles
where code = 'ORDER_MANAGER';

select set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

create temporary table manual_result as
select *
from public.create_manual_order(
  customer_first_name => 'WorkspaceSpecChidi',
  customer_last_name => 'Okoro',
  customer_phone => '0803 444 5566',
  customer_alternative_phone => null,
  customer_email => 'chidi@example.test',
  selected_offer_id => '20000000-0000-4000-8000-000000000002',
  selected_payment_method => 'COD',
  delivery_state => 'Lagos',
  delivery_city => 'Lagos',
  delivery_area => 'Ikeja',
  delivery_address_line => '44 Operations Avenue',
  delivery_landmark => 'Beside the test centre',
  acquisition_source => 'WHATSAPP',
  acquisition_source_detail => 'Inbound chat',
  submitted_customer_note => 'Call in the morning',
  submitted_internal_note => 'High intent lead'
);

select matches(
  (select order_number from manual_result),
  '^NOU-[0-9]{8}-[0-9]{5,}$',
  'manual order receives a generated order number'
);
select ok(not (select possible_duplicate from manual_result), 'first manual order is not a duplicate');
select is((select count(*) from public.customers where primary_phone_normalized = '+2348034445566'), 1::bigint, 'manual order creates a customer');
select ok(
  (select count(*) from public.orders where id = (select order_id from manual_result)) = 1
    and (select count(*) from public.order_items where order_id = (select order_id from manual_result)) = 1
    and (select count(*) from public.payments where order_id = (select order_id from manual_result)) = 1
    and (select count(*) from public.deliveries where order_id = (select order_id from manual_result)) = 1,
  'manual order atomically creates every linked record'
);
select is(
  (select total_amount from public.orders where id = (select order_id from manual_result)),
  2550000::bigint,
  'manual order uses authoritative offer pricing'
);
select is(
  (select assigned_to_user_id from public.orders where id = (select order_id from manual_result)),
  '97000000-0000-4000-8000-000000000001'::uuid,
  'manual order is assigned to its creating staff member'
);
select ok(
  (
    select actor_user_id = '97000000-0000-4000-8000-000000000001'::uuid
      and metadata ->> 'channel' = 'MANUAL'
    from public.order_events
    where entity_id = (select order_id from manual_result) and action = 'ORDER_CREATED'
  ),
  'manual creation audit records the authenticated actor and channel'
);
select is(
  (
    select count(*)
    from public.list_orders(search_text => 'WorkspaceSpecChidi')
    where order_id = (select order_id from manual_result)
  ),
  1::bigint,
  'order queue searches customer names'
);
select is(
  (select count(*) from public.list_orders(search_text => '0803 444 5566')),
  1::bigint,
  'order queue searches normalized phones'
);
select is(
  (select count(*) from public.list_orders(search_text => '0803 444 5566', source_filter => 'WHATSAPP', payment_method_filter => 'COD')),
  1::bigint,
  'order queue applies source and payment filters'
);
select is(
  (select total_count from public.list_orders(search_text => '0803 444 5566', page_size => 1) limit 1),
  1::bigint,
  'order queue reports the total count independently of page size'
);
select is(
  (select delivery_area from public.list_orders(search_text => '0803 444 5566') limit 1),
  'Ikeja',
  'order queue returns the delivery area used by operational rows'
);
select is(
  (select count(*) from public.list_orders(search_text => '0803 444 5566', queue_filter => 'new')),
  1::bigint,
  'order queue applies the redesign queue filter'
);
select is(
  public.get_order_detail((select order_id from manual_result)) ->> 'orderNumber',
  (select order_number from manual_result),
  'order detail returns the requested order'
);
select is(
  jsonb_array_length(public.get_order_detail((select order_id from manual_result)) -> 'items'),
  1,
  'order detail includes item snapshots'
);
select is(
  public.get_order_detail((select order_id from manual_result)) -> 'delivery' ->> 'area',
  'Ikeja',
  'order detail includes delivery information'
);

select public.update_order_notes(
  (select order_id from manual_result),
  'Customer requested a morning call',
  'Verified by operations'
);

select is(
  (select internal_note from public.orders where id = (select order_id from manual_result)),
  'Verified by operations',
  'safe notes command updates only allowed notes'
);
select is(
  (select count(*) from public.order_events where entity_id = (select order_id from manual_result) and action = 'ORDER_NOTES_UPDATED'),
  1::bigint,
  'notes update creates an audit event'
);

select public.add_order_note(
  (select order_id from manual_result),
  'Customer prefers an afternoon call'
);
select is(
  (
    select note
    from public.order_events
    where order_id = (select order_id from manual_result) and action = 'ORDER_NOTE_ADDED'
    order by created_at desc
    limit 1
  ),
  'Customer prefers an afternoon call',
  'thread note command records note text'
);
select is(
  (
    select actor_name
    from public.order_events
    where order_id = (select order_id from manual_result) and action = 'ORDER_NOTE_ADDED'
    order by created_at desc
    limit 1
  ),
  'Orders Manager',
  'thread events retain the actor display name'
);
select is(
  (
    select note
    from public.list_recent_order_events(20)
    where action = 'ORDER_NOTE_ADDED'
    limit 1
  ),
  'Customer prefers an afternoon call',
  'operations activity feed returns recent attributed order events'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$ select * from public.list_orders() $$,
  '42501',
  'Order read permission required',
  'active staff without order permission cannot list orders'
);
select throws_ok(
  $$
    select * from public.create_manual_order(
      'Blocked', null, '08035550000', null, null,
      '20000000-0000-4000-8000-000000000001', 'COD',
      'Lagos', 'Lagos', 'Yaba', '1 Blocked Street', null,
      'PHONE', null, null, null
    )
  $$,
  '42501',
  'Order create permission required',
  'staff without order create permission cannot create manual orders'
);

reset role;

select * from finish();

rollback;
