create extension if not exists pgcrypto with schema extensions;

create type public.order_status as enum (
  'NEW',
  'CONTACTED',
  'UNREACHABLE',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED'
);

create type public.payment_method as enum ('COD', 'PREPAID');
create type public.payment_status as enum ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED');
create type public.delivery_status as enum (
  'NOT_SCHEDULED',
  'SCHEDULED',
  'DISPATCHED',
  'DELIVERED',
  'FAILED',
  'RETURNED'
);
create type public.order_item_type as enum ('PRODUCT', 'BONUS');
create type public.order_source as enum (
  'LANDING_PAGE',
  'WEBSITE',
  'WHATSAPP',
  'PHONE',
  'INSTAGRAM',
  'FACEBOOK',
  'TIKTOK',
  'AFFILIATE',
  'OTHER'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 2 and 160),
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email)
);

create table public.roles (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z][A-Z0-9_]*$'),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  description text not null,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table public.profile_roles (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict,
  assigned_by_user_id uuid references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (profile_id, role_id)
);

create table public.customers (
  id uuid primary key default extensions.gen_random_uuid(),
  first_name text not null check (length(trim(first_name)) between 1 and 100),
  last_name text check (last_name is null or length(trim(last_name)) between 1 and 100),
  primary_phone_normalized text not null unique
    check (primary_phone_normalized ~ '^\+234[789][0-9]{9}$'),
  whatsapp_phone_normalized text
    check (whatsapp_phone_normalized is null or whatsapp_phone_normalized ~ '^\+234[789][0-9]{9}$'),
  alternative_phone_normalized text
    check (alternative_phone_normalized is null or alternative_phone_normalized ~ '^\+234[789][0-9]{9}$'),
  email text,
  state text,
  city text,
  area text,
  default_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sku text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  code text not null unique check (code ~ '^[A-Z][A-Z0-9_]*$'),
  active boolean not null default true,
  base_price bigint not null check (base_price > 0),
  prepaid_price bigint check (prepaid_price is null or (prepaid_price > 0 and prepaid_price <= base_price)),
  currency char(3) not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.offers.base_price is 'Integer minor currency units; NGN values are stored in kobo.';
comment on column public.offers.prepaid_price is 'Optional prepaid price in integer minor currency units.';

create table public.offer_items (
  id uuid primary key default extensions.gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  item_type public.order_item_type not null default 'PRODUCT',
  quantity integer not null check (quantity > 0),
  unit_price bigint not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  unique (offer_id, product_id, item_type),
  check ((item_type = 'BONUS' and unit_price = 0) or item_type = 'PRODUCT')
);

create table public.orders (
  id uuid primary key default extensions.gen_random_uuid(),
  order_number text not null unique check (order_number ~ '^NOU-[0-9]{8}-[0-9]{5,}$'),
  customer_id uuid not null references public.customers (id) on delete restrict,
  offer_id uuid not null references public.offers (id) on delete restrict,
  order_status public.order_status not null default 'NEW',
  currency char(3) not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  subtotal_amount bigint not null check (subtotal_amount >= 0),
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  delivery_fee_amount bigint not null default 0 check (delivery_fee_amount >= 0),
  total_amount bigint not null check (total_amount >= 0),
  payment_method public.payment_method not null,
  source public.order_source not null,
  source_detail text,
  campaign_name text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  landing_page text,
  referrer text,
  click_id_type text,
  click_id_value text,
  attribution_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(attribution_metadata) = 'object'),
  possible_duplicate boolean not null default false,
  assigned_to_user_id uuid references public.profiles (id) on delete restrict,
  customer_note text,
  internal_note text,
  cancellation_reason_code text,
  cancellation_reason_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  check (subtotal_amount - discount_amount + delivery_fee_amount = total_amount),
  check (discount_amount <= subtotal_amount),
  check (order_status <> 'CANCELLED' or (cancelled_at is not null and cancellation_reason_code is not null)),
  check (order_status <> 'COMPLETED' or completed_at is not null)
);

comment on column public.orders.total_amount is 'Integer minor currency units; NGN values are stored in kobo.';

create table public.order_items (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  product_id uuid references public.products (id) on delete restrict,
  item_name_snapshot text not null,
  sku_snapshot text,
  item_type public.order_item_type not null,
  quantity integer not null check (quantity > 0),
  unit_price bigint not null check (unit_price >= 0),
  total_price bigint not null check (total_price >= 0),
  created_at timestamptz not null default now(),
  check (total_price = unit_price * quantity),
  check ((item_type = 'BONUS' and unit_price = 0) or item_type = 'PRODUCT')
);

create table public.payments (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete restrict,
  method public.payment_method not null,
  status public.payment_status not null,
  amount bigint not null check (amount >= 0),
  provider text,
  provider_reference text,
  provider_payload jsonb,
  paid_at timestamptz,
  failed_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'PAID' or paid_at is not null),
  check (status <> 'FAILED' or failed_at is not null),
  check (status <> 'REFUNDED' or refunded_at is not null)
);

create table public.deliveries (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete restrict,
  status public.delivery_status not null default 'NOT_SCHEDULED',
  recipient_name text not null,
  recipient_phone text not null check (recipient_phone ~ '^\+234[789][0-9]{9}$'),
  state text not null,
  city text,
  area text not null,
  address_line text not null,
  landmark text,
  scheduled_date date,
  delivery_window text,
  courier_name text,
  courier_phone text
    check (courier_phone is null or courier_phone ~ '^\+234[789][0-9]{9}$'),
  tracking_reference text,
  failure_reason_code text,
  failure_reason_note text,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'SCHEDULED' or scheduled_date is not null),
  check (status <> 'DISPATCHED' or dispatched_at is not null),
  check (status <> 'DELIVERED' or delivered_at is not null),
  check (status <> 'FAILED' or failure_reason_code is not null)
);

create table public.order_events (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid references public.orders (id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  actor_user_id uuid references public.profiles (id) on delete restrict,
  action text not null check (action ~ '^[A-Z][A-Z0-9_]*$'),
  from_state text,
  to_state text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table public.idempotency_keys (
  key text primary key check (length(key) between 16 and 200),
  scope text not null,
  request_fingerprint text not null,
  response_payload jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > created_at),
  unique (scope, request_fingerprint, key)
);

create index profile_roles_role_id_idx on public.profile_roles (role_id);
create index customers_name_search_idx on public.customers (lower(first_name), lower(last_name));
create index offers_active_sort_idx on public.offers (active, sort_order);
create index offer_items_offer_id_idx on public.offer_items (offer_id);
create index orders_customer_id_idx on public.orders (customer_id);
create index orders_offer_id_idx on public.orders (offer_id);
create index orders_status_created_at_idx on public.orders (order_status, created_at desc);
create index orders_source_created_at_idx on public.orders (source, created_at desc);
create index orders_assigned_to_user_id_idx on public.orders (assigned_to_user_id);
create index orders_created_at_idx on public.orders (created_at desc);
create index order_items_order_id_idx on public.order_items (order_id);
create index payments_status_idx on public.payments (status);
create unique index payments_provider_reference_uidx
on public.payments (provider, provider_reference)
where provider is not null and provider_reference is not null;
create index deliveries_status_scheduled_date_idx on public.deliveries (status, scheduled_date);
create index order_events_order_id_created_at_idx on public.order_events (order_id, created_at);
create index order_events_entity_idx on public.order_events (entity_type, entity_id, created_at);
create index idempotency_keys_expires_at_idx on public.idempotency_keys (expires_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create or replace function public.prevent_immutable_row_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = 'P0001',
    message = format('%s rows are immutable', tg_table_name);
end;
$$;

revoke all on function public.prevent_immutable_row_mutation() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger offers_set_updated_at
before update on public.offers
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create trigger deliveries_set_updated_at
before update on public.deliveries
for each row execute function public.set_updated_at();

create trigger order_items_prevent_mutation
before update or delete on public.order_items
for each row execute function public.prevent_immutable_row_mutation();

create trigger order_events_prevent_mutation
before update or delete on public.order_events
for each row execute function public.prevent_immutable_row_mutation();
