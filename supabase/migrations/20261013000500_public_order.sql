alter table public.idempotency_keys
add constraint idempotency_keys_request_fingerprint_check
check (request_fingerprint ~ '^[a-f0-9]{64}$');

create sequence public.order_number_sequence;
revoke all on sequence public.order_number_sequence from public, anon, authenticated;

create table public.public_request_limits (
  bucket_key text primary key check (bucket_key ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now()
);

alter table public.public_request_limits enable row level security;
revoke all on public.public_request_limits from public, anon, authenticated;

create or replace function public.normalize_nigerian_phone(raw_phone text)
returns text
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  digits text;
  normalized text;
begin
  digits := regexp_replace(raw_phone, '[^0-9]', '', 'g');

  normalized := case
    when digits ~ '^0[789][0-9]{9}$' then '+234' || substring(digits from 2)
    when digits ~ '^234[789][0-9]{9}$' then '+' || digits
    when digits ~ '^[789][0-9]{9}$' then '+234' || digits
    else null
  end;

  if normalized is null then
    raise exception using errcode = '22023', message = 'Invalid Nigerian mobile number';
  end if;

  return normalized;
end;
$$;

create or replace function public.next_order_number()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select
    'NOU-'
    || to_char(clock_timestamp() at time zone 'UTC', 'YYYYMMDD')
    || '-'
    || lpad(nextval('public.order_number_sequence')::text, 5, '0');
$$;

create or replace function public.check_public_order_rate_limit(
  hashed_client_key text,
  maximum_requests integer default 6,
  window_seconds integer default 60
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_count integer;
  current_window timestamptz;
  request_timestamp timestamptz := clock_timestamp();
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service-role authorization required';
  end if;

  if hashed_client_key !~ '^[a-f0-9]{64}$'
    or maximum_requests not between 1 and 100
    or window_seconds not between 10 and 3600 then
    raise exception using errcode = '22023', message = 'Invalid rate-limit configuration';
  end if;

  insert into public.public_request_limits as rate_limit (
    bucket_key,
    window_started_at,
    request_count,
    updated_at
  ) values (
    hashed_client_key,
    request_timestamp,
    1,
    request_timestamp
  )
  on conflict (bucket_key) do update
  set window_started_at = case
        when rate_limit.window_started_at
          <= request_timestamp - make_interval(secs => window_seconds)
          then request_timestamp
        else rate_limit.window_started_at
      end,
      request_count = case
        when rate_limit.window_started_at
          <= request_timestamp - make_interval(secs => window_seconds)
          then 1
        else rate_limit.request_count + 1
      end,
      updated_at = request_timestamp
  returning rate_limit.request_count, rate_limit.window_started_at
  into current_count, current_window;

  return query
  select
    current_count <= maximum_requests,
    case
      when current_count <= maximum_requests then 0
      else greatest(
        1,
        ceil(
          extract(epoch from (current_window + make_interval(secs => window_seconds) - request_timestamp))
        )::integer
      )
    end;
end;
$$;

create or replace function public.create_public_order(
  request_idempotency_key text,
  request_fingerprint text,
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
  acquisition_campaign_name text,
  acquisition_utm_source text,
  acquisition_utm_medium text,
  acquisition_utm_campaign text,
  acquisition_utm_content text,
  acquisition_utm_term text,
  acquisition_landing_page text,
  acquisition_referrer text,
  acquisition_click_id_type text,
  acquisition_click_id_value text,
  acquisition_metadata jsonb,
  submitted_customer_note text
)
returns table (
  order_number text,
  possible_duplicate boolean,
  replayed boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  inserted_idempotency_count integer;
  existing_key public.idempotency_keys%rowtype;
  normalized_phone text;
  normalized_alternative_phone text;
  customer_record_id uuid;
  order_record_id uuid := extensions.gen_random_uuid();
  generated_order_number text;
  duplicate_warning boolean;
  pricing record;
  safe_metadata jsonb := coalesce(acquisition_metadata, '{}'::jsonb);
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service-role authorization required';
  end if;

  if length(request_idempotency_key) not between 16 and 200
    or request_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid idempotency request';
  end if;

  if jsonb_typeof(safe_metadata) <> 'object' then
    raise exception using errcode = '22023', message = 'Attribution metadata must be an object';
  end if;

  insert into public.idempotency_keys (
    key,
    scope,
    request_fingerprint,
    expires_at
  ) values (
    request_idempotency_key,
    'public_order',
    request_fingerprint,
    clock_timestamp() + interval '7 days'
  )
  on conflict (key) do nothing;

  get diagnostics inserted_idempotency_count = row_count;

  if inserted_idempotency_count = 0 then
    select key_record.*
    into existing_key
    from public.idempotency_keys key_record
    where key_record.key = request_idempotency_key
    for update;

    if existing_key.scope <> 'public_order'
      or existing_key.request_fingerprint <> request_fingerprint then
      raise exception using
        errcode = '22023',
        message = 'Idempotency key was reused with a different request';
    end if;

    if existing_key.response_payload is null then
      raise exception using errcode = '40001', message = 'Idempotent request is still processing';
    end if;

    return query
    select
      existing_key.response_payload ->> 'orderNumber',
      (existing_key.response_payload ->> 'possibleDuplicate')::boolean,
      true;
    return;
  end if;

  normalized_phone := public.normalize_nigerian_phone(customer_phone);
  normalized_alternative_phone := case
    when customer_alternative_phone is null or trim(customer_alternative_phone) = '' then null
    else public.normalize_nigerian_phone(customer_alternative_phone)
  end;

  select *
  into pricing
  from public.resolve_offer_pricing(selected_offer_id, selected_payment_method);

  insert into public.customers (
    first_name,
    last_name,
    primary_phone_normalized,
    whatsapp_phone_normalized,
    alternative_phone_normalized,
    email,
    state,
    city,
    area,
    default_address
  ) values (
    trim(customer_first_name),
    nullif(trim(customer_last_name), ''),
    normalized_phone,
    normalized_phone,
    normalized_alternative_phone,
    nullif(lower(trim(customer_email)), ''),
    trim(delivery_state),
    nullif(trim(delivery_city), ''),
    trim(delivery_area),
    trim(delivery_address_line)
  )
  on conflict (primary_phone_normalized) do update
  set first_name = excluded.first_name,
      last_name = coalesce(excluded.last_name, public.customers.last_name),
      whatsapp_phone_normalized = excluded.whatsapp_phone_normalized,
      alternative_phone_normalized = coalesce(
        excluded.alternative_phone_normalized,
        public.customers.alternative_phone_normalized
      ),
      email = coalesce(excluded.email, public.customers.email),
      state = excluded.state,
      city = coalesce(excluded.city, public.customers.city),
      area = excluded.area,
      default_address = excluded.default_address
  returning id into customer_record_id;

  select exists (
    select 1
    from public.orders recent_order
    where recent_order.customer_id = customer_record_id
      and recent_order.offer_id = selected_offer_id
      and recent_order.order_status in ('NEW', 'CONTACTED', 'UNREACHABLE', 'CONFIRMED')
      and recent_order.created_at >= clock_timestamp() - interval '24 hours'
  ) into duplicate_warning;

  generated_order_number := public.next_order_number();

  insert into public.orders (
    id,
    order_number,
    customer_id,
    offer_id,
    currency,
    subtotal_amount,
    discount_amount,
    delivery_fee_amount,
    total_amount,
    payment_method,
    source,
    source_detail,
    campaign_name,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    landing_page,
    referrer,
    click_id_type,
    click_id_value,
    attribution_metadata,
    possible_duplicate,
    customer_note
  ) values (
    order_record_id,
    generated_order_number,
    customer_record_id,
    selected_offer_id,
    pricing.currency,
    pricing.subtotal_amount,
    pricing.discount_amount,
    0,
    pricing.total_amount,
    selected_payment_method,
    acquisition_source,
    nullif(trim(acquisition_source_detail), ''),
    nullif(trim(acquisition_campaign_name), ''),
    nullif(trim(acquisition_utm_source), ''),
    nullif(trim(acquisition_utm_medium), ''),
    nullif(trim(acquisition_utm_campaign), ''),
    nullif(trim(acquisition_utm_content), ''),
    nullif(trim(acquisition_utm_term), ''),
    nullif(trim(acquisition_landing_page), ''),
    nullif(trim(acquisition_referrer), ''),
    nullif(trim(acquisition_click_id_type), ''),
    nullif(trim(acquisition_click_id_value), ''),
    safe_metadata,
    duplicate_warning,
    nullif(trim(submitted_customer_note), '')
  );

  insert into public.order_items (
    order_id,
    product_id,
    item_name_snapshot,
    sku_snapshot,
    item_type,
    quantity,
    unit_price,
    total_price
  )
  select
    order_record_id,
    expanded.product_id,
    expanded.item_name_snapshot,
    expanded.sku_snapshot,
    expanded.item_type,
    expanded.quantity,
    expanded.unit_price,
    expanded.total_price
  from public.expand_active_offer_items(selected_offer_id) expanded;

  insert into public.payments (order_id, method, status, amount)
  values (
    order_record_id,
    selected_payment_method,
    (case when selected_payment_method = 'PREPAID' then 'PENDING' else 'UNPAID' end)::public.payment_status,
    pricing.total_amount
  );

  insert into public.deliveries (
    order_id,
    recipient_name,
    recipient_phone,
    state,
    city,
    area,
    address_line,
    landmark
  ) values (
    order_record_id,
    trim(customer_first_name || ' ' || coalesce(customer_last_name, '')),
    normalized_phone,
    trim(delivery_state),
    nullif(trim(delivery_city), ''),
    trim(delivery_area),
    trim(delivery_address_line),
    nullif(trim(delivery_landmark), '')
  );

  insert into public.order_events (
    order_id,
    entity_type,
    entity_id,
    action,
    to_state,
    metadata
  ) values (
    order_record_id,
    'ORDER',
    order_record_id,
    'ORDER_CREATED',
    'NEW',
    jsonb_build_object(
      'source', acquisition_source,
      'possible_duplicate', duplicate_warning,
      'channel', 'PUBLIC'
    )
  );

  update public.idempotency_keys
  set response_payload = jsonb_build_object(
    'orderNumber', generated_order_number,
    'possibleDuplicate', duplicate_warning
  )
  where key = request_idempotency_key;

  return query
  select generated_order_number, duplicate_warning, false;
end;
$$;

revoke all on function public.normalize_nigerian_phone(text) from public, anon, authenticated;
revoke all on function public.next_order_number() from public, anon, authenticated;
revoke all on function public.check_public_order_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.create_public_order(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  public.payment_method,
  text,
  text,
  text,
  text,
  text,
  public.order_source,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text
) from public, anon, authenticated;

grant execute on function public.check_public_order_rate_limit(text, integer, integer) to service_role;
grant execute on function public.create_public_order(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  public.payment_method,
  text,
  text,
  text,
  text,
  text,
  public.order_source,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text
) to service_role;

comment on function public.normalize_nigerian_phone(text) is 'Normalizes supported Nigerian mobile variants to canonical +234 format or rejects them.';
comment on function public.check_public_order_rate_limit(text, integer, integer) is 'Service-role-only atomic fixed-window limiter for the public order Edge Function.';
comment on function public.create_public_order(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  public.payment_method,
  text,
  text,
  text,
  text,
  text,
  public.order_source,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text
) is 'Service-role-only atomic public checkout transaction with authoritative pricing, idempotency, snapshots, and duplicate warning.';
