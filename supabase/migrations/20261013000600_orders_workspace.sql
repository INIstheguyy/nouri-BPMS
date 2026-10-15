create or replace function public.list_orders(
  search_text text default null,
  status_filter text default null,
  source_filter text default null,
  payment_method_filter text default null,
  created_from date default null,
  created_to date default null,
  page_number integer default 1,
  page_size integer default 25
)
returns table (
  order_id uuid,
  order_number text,
  order_status public.order_status,
  customer_name text,
  customer_phone text,
  offer_name text,
  total_amount bigint,
  currency char(3),
  payment_method public.payment_method,
  payment_status public.payment_status,
  delivery_status public.delivery_status,
  source public.order_source,
  possible_duplicate boolean,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_search text := nullif(trim(search_text), '');
  safe_page integer := greatest(coalesce(page_number, 1), 1);
  safe_size integer := least(greatest(coalesce(page_size, 25), 1), 100);
begin
  if auth.uid() is null or not public.has_permission('order.read') then
    raise exception using errcode = '42501', message = 'Order read permission required';
  end if;

  if status_filter is not null
    and not exists (select 1 from unnest(enum_range(null::public.order_status)) value where value::text = status_filter) then
    raise exception using errcode = '22023', message = 'Invalid order status filter';
  end if;

  if source_filter is not null
    and not exists (select 1 from unnest(enum_range(null::public.order_source)) value where value::text = source_filter) then
    raise exception using errcode = '22023', message = 'Invalid order source filter';
  end if;

  if payment_method_filter is not null
    and not exists (select 1 from unnest(enum_range(null::public.payment_method)) value where value::text = payment_method_filter) then
    raise exception using errcode = '22023', message = 'Invalid payment method filter';
  end if;

  if created_from is not null and created_to is not null and created_from > created_to then
    raise exception using errcode = '22023', message = 'Invalid order date range';
  end if;

  return query
  with filtered as (
    select
      orders.id,
      orders.order_number,
      orders.order_status,
      trim(customers.first_name || ' ' || coalesce(customers.last_name, '')) as customer_name,
      customers.primary_phone_normalized,
      offers.name as offer_name,
      orders.total_amount,
      orders.currency,
      orders.payment_method,
      payments.status as payment_status,
      deliveries.status as delivery_status,
      orders.source,
      orders.possible_duplicate,
      orders.created_at
    from public.orders
    join public.customers on customers.id = orders.customer_id
    join public.offers on offers.id = orders.offer_id
    join public.payments on payments.order_id = orders.id
    join public.deliveries on deliveries.order_id = orders.id
    where (status_filter is null or orders.order_status::text = status_filter)
      and (source_filter is null or orders.source::text = source_filter)
      and (payment_method_filter is null or orders.payment_method::text = payment_method_filter)
      and (created_from is null or orders.created_at >= created_from::timestamptz)
      and (created_to is null or orders.created_at < (created_to + 1)::timestamptz)
      and (
        normalized_search is null
        or orders.order_number ilike '%' || normalized_search || '%'
        or customers.primary_phone_normalized like '%' || regexp_replace(normalized_search, '[^0-9+]', '', 'g') || '%'
        or (
          length(regexp_replace(normalized_search, '[^0-9]', '', 'g')) >= 10
          and right(regexp_replace(customers.primary_phone_normalized, '[^0-9]', '', 'g'), 10)
            = right(regexp_replace(normalized_search, '[^0-9]', '', 'g'), 10)
        )
        or trim(customers.first_name || ' ' || coalesce(customers.last_name, '')) ilike '%' || normalized_search || '%'
      )
  )
  select
    filtered.id,
    filtered.order_number,
    filtered.order_status,
    filtered.customer_name,
    filtered.primary_phone_normalized,
    filtered.offer_name,
    filtered.total_amount,
    filtered.currency,
    filtered.payment_method,
    filtered.payment_status,
    filtered.delivery_status,
    filtered.source,
    filtered.possible_duplicate,
    filtered.created_at,
    count(*) over ()
  from filtered
  order by filtered.created_at desc, filtered.id desc
  limit safe_size
  offset (safe_page - 1) * safe_size;
end;
$$;

create or replace function public.get_order_detail(target_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or not public.has_permission('order.read') then
    raise exception using errcode = '42501', message = 'Order read permission required';
  end if;

  select jsonb_build_object(
    'id', orders.id,
    'orderNumber', orders.order_number,
    'status', orders.order_status,
    'source', orders.source,
    'sourceDetail', orders.source_detail,
    'possibleDuplicate', orders.possible_duplicate,
    'createdAt', orders.created_at,
    'updatedAt', orders.updated_at,
    'currency', orders.currency,
    'subtotalAmount', orders.subtotal_amount,
    'discountAmount', orders.discount_amount,
    'deliveryFeeAmount', orders.delivery_fee_amount,
    'totalAmount', orders.total_amount,
    'paymentMethod', orders.payment_method,
    'customerNote', orders.customer_note,
    'internalNote', orders.internal_note,
    'attribution', jsonb_build_object(
      'campaignName', orders.campaign_name,
      'utmSource', orders.utm_source,
      'utmMedium', orders.utm_medium,
      'utmCampaign', orders.utm_campaign,
      'utmContent', orders.utm_content,
      'utmTerm', orders.utm_term,
      'landingPage', orders.landing_page,
      'referrer', orders.referrer,
      'clickIdType', orders.click_id_type,
      'clickIdValue', orders.click_id_value
    ),
    'customer', jsonb_build_object(
      'id', customers.id,
      'firstName', customers.first_name,
      'lastName', customers.last_name,
      'phone', customers.primary_phone_normalized,
      'whatsappPhone', customers.whatsapp_phone_normalized,
      'alternativePhone', customers.alternative_phone_normalized,
      'email', customers.email
    ),
    'offer', jsonb_build_object('id', offers.id, 'name', offers.name, 'code', offers.code),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id,
        'name', item.item_name_snapshot,
        'sku', item.sku_snapshot,
        'type', item.item_type,
        'quantity', item.quantity,
        'unitPrice', item.unit_price,
        'totalPrice', item.total_price
      ) order by item.created_at, item.id)
      from public.order_items item
      where item.order_id = orders.id
    ), '[]'::jsonb),
    'payment', jsonb_build_object(
      'status', payments.status,
      'method', payments.method,
      'amount', payments.amount,
      'provider', payments.provider,
      'providerReference', payments.provider_reference,
      'paidAt', payments.paid_at
    ),
    'delivery', jsonb_build_object(
      'status', deliveries.status,
      'recipientName', deliveries.recipient_name,
      'recipientPhone', deliveries.recipient_phone,
      'state', deliveries.state,
      'city', deliveries.city,
      'area', deliveries.area,
      'addressLine', deliveries.address_line,
      'landmark', deliveries.landmark,
      'scheduledDate', deliveries.scheduled_date,
      'deliveryWindow', deliveries.delivery_window,
      'courierName', deliveries.courier_name,
      'trackingReference', deliveries.tracking_reference
    ),
    'timeline', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', event.id,
        'action', event.action,
        'fromState', event.from_state,
        'toState', event.to_state,
        'actorUserId', event.actor_user_id,
        'metadata', event.metadata,
        'createdAt', event.created_at
      ) order by event.created_at, event.id)
      from public.order_events event
      where event.order_id = orders.id
    ), '[]'::jsonb)
  )
  into result
  from public.orders
  join public.customers on customers.id = orders.customer_id
  join public.offers on offers.id = orders.offer_id
  join public.payments on payments.order_id = orders.id
  join public.deliveries on deliveries.order_id = orders.id
  where orders.id = target_order_id;

  if result is null then
    raise exception using errcode = 'P0002', message = 'Order not found';
  end if;

  return result;
end;
$$;

create or replace function public.create_manual_order(
  customer_first_name text,
  customer_last_name text,
  customer_phone text,
  customer_alternative_phone text,
  customer_email text,
  selected_offer_id uuid,
  selected_payment_method public.payment_method,
  delivery_state text,
  delivery_city text,
  delivery_area text,
  delivery_address_line text,
  delivery_landmark text,
  acquisition_source public.order_source,
  acquisition_source_detail text,
  submitted_customer_note text,
  submitted_internal_note text
)
returns table (order_id uuid, order_number text, possible_duplicate boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  normalized_phone text;
  normalized_alternative_phone text;
  customer_record_id uuid;
  order_record_id uuid := extensions.gen_random_uuid();
  generated_order_number text;
  duplicate_warning boolean;
  pricing record;
begin
  if actor_user_id is null or not public.has_permission('order.create') then
    raise exception using errcode = '42501', message = 'Order create permission required';
  end if;

  if acquisition_source not in ('WHATSAPP', 'PHONE', 'OTHER') then
    raise exception using errcode = '22023', message = 'Manual orders require a manual acquisition source';
  end if;

  if length(trim(customer_first_name)) not between 1 and 100
    or length(trim(coalesce(delivery_state, ''))) not between 2 and 100
    or length(trim(coalesce(delivery_area, ''))) not between 2 and 120
    or length(trim(coalesce(delivery_address_line, ''))) not between 5 and 300 then
    raise exception using errcode = '22023', message = 'Invalid manual order fields';
  end if;

  normalized_phone := public.normalize_nigerian_phone(customer_phone);
  normalized_alternative_phone := case
    when customer_alternative_phone is null or trim(customer_alternative_phone) = '' then null
    else public.normalize_nigerian_phone(customer_alternative_phone)
  end;

  select * into pricing
  from public.resolve_offer_pricing(selected_offer_id, selected_payment_method);

  insert into public.customers (
    first_name, last_name, primary_phone_normalized, whatsapp_phone_normalized,
    alternative_phone_normalized, email, state, city, area, default_address
  ) values (
    trim(customer_first_name), nullif(trim(customer_last_name), ''), normalized_phone,
    case when acquisition_source = 'WHATSAPP' then normalized_phone else null end,
    normalized_alternative_phone, nullif(lower(trim(customer_email)), ''), trim(delivery_state),
    nullif(trim(delivery_city), ''), trim(delivery_area), trim(delivery_address_line)
  )
  on conflict (primary_phone_normalized) do update
  set first_name = excluded.first_name,
      last_name = coalesce(excluded.last_name, public.customers.last_name),
      whatsapp_phone_normalized = coalesce(excluded.whatsapp_phone_normalized, public.customers.whatsapp_phone_normalized),
      alternative_phone_normalized = coalesce(excluded.alternative_phone_normalized, public.customers.alternative_phone_normalized),
      email = coalesce(excluded.email, public.customers.email),
      state = excluded.state,
      city = coalesce(excluded.city, public.customers.city),
      area = excluded.area,
      default_address = excluded.default_address
  returning id into customer_record_id;

  select exists (
    select 1 from public.orders recent_order
    where recent_order.customer_id = customer_record_id
      and recent_order.offer_id = selected_offer_id
      and recent_order.order_status in ('NEW', 'CONTACTED', 'UNREACHABLE', 'CONFIRMED')
      and recent_order.created_at >= clock_timestamp() - interval '24 hours'
  ) into duplicate_warning;

  generated_order_number := public.next_order_number();

  insert into public.orders (
    id, order_number, customer_id, offer_id, currency, subtotal_amount, discount_amount,
    delivery_fee_amount, total_amount, payment_method, source, source_detail,
    possible_duplicate, assigned_to_user_id, customer_note, internal_note
  ) values (
    order_record_id, generated_order_number, customer_record_id, selected_offer_id,
    pricing.currency, pricing.subtotal_amount, pricing.discount_amount, 0, pricing.total_amount,
    selected_payment_method, acquisition_source, nullif(trim(acquisition_source_detail), ''),
    duplicate_warning, actor_user_id, nullif(trim(submitted_customer_note), ''),
    nullif(trim(submitted_internal_note), '')
  );

  insert into public.order_items (
    order_id, product_id, item_name_snapshot, sku_snapshot, item_type, quantity, unit_price, total_price
  )
  select order_record_id, item.product_id, item.item_name_snapshot, item.sku_snapshot,
    item.item_type, item.quantity, item.unit_price, item.total_price
  from public.expand_active_offer_items(selected_offer_id) item;

  insert into public.payments (order_id, method, status, amount)
  values (order_record_id, selected_payment_method,
    (case when selected_payment_method = 'PREPAID' then 'PENDING' else 'UNPAID' end)::public.payment_status,
    pricing.total_amount);

  insert into public.deliveries (
    order_id, recipient_name, recipient_phone, state, city, area, address_line, landmark
  ) values (
    order_record_id, trim(customer_first_name || ' ' || coalesce(customer_last_name, '')),
    normalized_phone, trim(delivery_state), nullif(trim(delivery_city), ''), trim(delivery_area),
    trim(delivery_address_line), nullif(trim(delivery_landmark), '')
  );

  insert into public.order_events (
    order_id, entity_type, entity_id, actor_user_id, action, to_state, metadata
  ) values (
    order_record_id, 'ORDER', order_record_id, actor_user_id, 'ORDER_CREATED', 'NEW',
    jsonb_build_object('source', acquisition_source, 'possible_duplicate', duplicate_warning, 'channel', 'MANUAL')
  );

  return query select order_record_id, generated_order_number, duplicate_warning;
end;
$$;

create or replace function public.update_order_notes(
  target_order_id uuid,
  updated_customer_note text,
  updated_internal_note text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
begin
  if actor_user_id is null or not public.has_permission('order.update') then
    raise exception using errcode = '42501', message = 'Order update permission required';
  end if;

  if length(coalesce(updated_customer_note, '')) > 500 or length(coalesce(updated_internal_note, '')) > 2000 then
    raise exception using errcode = '22023', message = 'Order note is too long';
  end if;

  update public.orders
  set customer_note = nullif(trim(updated_customer_note), ''),
      internal_note = nullif(trim(updated_internal_note), '')
  where id = target_order_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Order not found';
  end if;

  insert into public.order_events (
    order_id, entity_type, entity_id, actor_user_id, action, metadata
  ) values (
    target_order_id, 'ORDER', target_order_id, actor_user_id, 'ORDER_NOTES_UPDATED',
    jsonb_build_object('customer_note_present', nullif(trim(updated_customer_note), '') is not null,
      'internal_note_present', nullif(trim(updated_internal_note), '') is not null)
  );
end;
$$;

revoke all on function public.list_orders(text, text, text, text, date, date, integer, integer) from public, anon;
revoke all on function public.get_order_detail(uuid) from public, anon;
revoke all on function public.create_manual_order(text, text, text, text, text, uuid, public.payment_method, text, text, text, text, text, public.order_source, text, text, text) from public, anon;
revoke all on function public.update_order_notes(uuid, text, text) from public, anon;

grant execute on function public.list_orders(text, text, text, text, date, date, integer, integer) to authenticated;
grant execute on function public.get_order_detail(uuid) to authenticated;
grant execute on function public.create_manual_order(text, text, text, text, text, uuid, public.payment_method, text, text, text, text, text, public.order_source, text, text, text) to authenticated;
grant execute on function public.update_order_notes(uuid, text, text) to authenticated;

comment on function public.list_orders(text, text, text, text, date, date, integer, integer) is 'Permission-checked, filtered and paginated operational order queue.';
comment on function public.get_order_detail(uuid) is 'Permission-checked aggregate order detail including customer, items, payment, delivery, attribution, and timeline.';
comment on function public.create_manual_order(text, text, text, text, text, uuid, public.payment_method, text, text, text, text, text, public.order_source, text, text, text) is 'Creates a server-priced manual order and all linked records atomically for authorized staff.';
comment on function public.update_order_notes(uuid, text, text) is 'Updates only allowed order note fields and writes an audit event.';
