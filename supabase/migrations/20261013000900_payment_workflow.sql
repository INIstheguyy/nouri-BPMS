create table public.payment_provider_events (
  id uuid primary key default extensions.gen_random_uuid(),
  provider text not null check (length(trim(provider)) between 2 and 80),
  event_id text not null check (length(trim(event_id)) between 3 and 200),
  provider_reference text not null check (length(trim(provider_reference)) between 3 and 200),
  event_type text not null check (event_type in ('payment.succeeded', 'payment.failed')),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  payment_id uuid references public.payments (id) on delete restrict,
  processed_status text not null default 'RECEIVED'
    check (processed_status in ('RECEIVED', 'PROCESSED')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);

create unique index payments_provider_reference_unique
on public.payments (provider, provider_reference)
where provider is not null and provider_reference is not null;

alter table public.payment_provider_events enable row level security;
revoke all on public.payment_provider_events from anon, authenticated;

create or replace function public.mark_cod_paid(
  target_order_id uuid,
  collection_note text default null
)
returns public.payment_status
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  payment_record public.payments%rowtype;
  order_state public.order_status;
  delivery_state public.delivery_status;
begin
  if actor_user_id is null or not public.has_permission('payment.update') then
    raise exception using errcode = '42501', message = 'Payment update permission required';
  end if;
  if length(coalesce(collection_note, '')) > 500 then
    raise exception using errcode = '22023', message = 'Collection note is too long';
  end if;

  select payments.* into payment_record
  from public.payments
  where payments.order_id = target_order_id
  for update;

  select orders.order_status, deliveries.status
  into order_state, delivery_state
  from public.orders
  join public.deliveries on deliveries.order_id = orders.id
  where orders.id = target_order_id;

  if payment_record.id is null then
    raise exception using errcode = 'P0002', message = 'Payment not found';
  end if;
  if payment_record.method <> 'COD' then
    raise exception using errcode = '22023', message = 'Only COD payments can be reconciled manually';
  end if;
  if payment_record.status = 'PAID' then
    return 'PAID'::public.payment_status;
  end if;
  if order_state <> 'CONFIRMED' or delivery_state <> 'DELIVERED' then
    raise exception using errcode = '22023', message = 'COD payment can only be recorded after delivery';
  end if;
  if payment_record.status <> 'UNPAID' then
    raise exception using errcode = '22023', message = 'COD payment is not awaiting reconciliation';
  end if;

  update public.payments
  set status = 'PAID', paid_at = statement_timestamp(), failed_at = null
  where id = payment_record.id;

  insert into public.order_events (
    order_id, entity_type, entity_id, actor_user_id, action, from_state, to_state, metadata
  ) values (
    target_order_id, 'PAYMENT', payment_record.id, actor_user_id, 'PAYMENT_MARKED_PAID',
    payment_record.status::text, 'PAID',
    jsonb_build_object(
      'method', 'COD',
      'amount', payment_record.amount,
      'collection_note', nullif(trim(collection_note), '')
    )
  );

  return 'PAID'::public.payment_status;
end;
$$;

create or replace function public.initialize_prepaid_payment(
  target_order_id uuid,
  target_provider text,
  target_reference text,
  actor_user_id uuid
)
returns table (
  provider text,
  provider_reference text,
  amount bigint,
  currency character(3),
  already_initialized boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  payment_record public.payments%rowtype;
  order_currency character(3);
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role required';
  end if;
  if not exists (
    select 1
    from public.profiles
    join public.profile_roles on profile_roles.profile_id = profiles.id
    join public.role_permissions on role_permissions.role_id = profile_roles.role_id
    join public.permissions on permissions.id = role_permissions.permission_id
    where profiles.id = actor_user_id and profiles.active and permissions.code = 'payment.update'
  ) then
    raise exception using errcode = '42501', message = 'Payment update permission required';
  end if;
  if length(trim(coalesce(target_provider, ''))) not between 2 and 80
    or length(trim(coalesce(target_reference, ''))) not between 3 and 200 then
    raise exception using errcode = '22023', message = 'Invalid payment provider details';
  end if;

  select payments.* into payment_record
  from public.payments
  where payments.order_id = target_order_id
  for update;

  select orders.currency into order_currency
  from public.orders where orders.id = target_order_id;

  if payment_record.id is null then
    raise exception using errcode = 'P0002', message = 'Payment not found';
  end if;
  if payment_record.method <> 'PREPAID' then
    raise exception using errcode = '22023', message = 'Only prepaid payments can be initialized';
  end if;
  if payment_record.status <> 'PENDING' then
    raise exception using errcode = '22023', message = 'Prepaid payment is not pending';
  end if;

  if payment_record.provider_reference is not null then
    return query select payment_record.provider, payment_record.provider_reference,
      payment_record.amount, order_currency, true;
    return;
  end if;

  update public.payments
  set provider = lower(trim(target_provider)),
      provider_reference = trim(target_reference),
      provider_payload = jsonb_build_object('initialized_by', actor_user_id, 'mode', 'test')
  where id = payment_record.id;

  return query select lower(trim(target_provider)), trim(target_reference),
    payment_record.amount, order_currency, false;
end;
$$;

create or replace function public.record_provider_payment_event(
  provider_name text,
  provider_event_id text,
  target_provider_reference text,
  provider_event_type text,
  reported_amount bigint,
  reported_currency character(3),
  request_payload_hash text
)
returns table (
  order_id uuid,
  payment_status public.payment_status,
  replayed boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  provider_event_record public.payment_provider_events%rowtype;
  payment_record public.payments%rowtype;
  order_currency character(3);
  inserted_event_id uuid;
  changed boolean := false;
  previous_payment_status public.payment_status;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role required';
  end if;
  if provider_event_type not in ('payment.succeeded', 'payment.failed') then
    raise exception using errcode = '22023', message = 'Unsupported provider event type';
  end if;
  if reported_amount < 0 or request_payload_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid provider event details';
  end if;

  insert into public.payment_provider_events (
    provider, event_id, provider_reference, event_type, payload_hash
  ) values (
    lower(trim(provider_name)), trim(provider_event_id), trim(target_provider_reference),
    provider_event_type, request_payload_hash
  )
  on conflict (provider, event_id) do nothing
  returning id into inserted_event_id;

  if inserted_event_id is null then
    select * into provider_event_record
    from public.payment_provider_events
    where provider = lower(trim(provider_name)) and event_id = trim(provider_event_id);

    if provider_event_record.provider_reference <> trim(target_provider_reference)
      or provider_event_record.event_type <> provider_event_type
      or provider_event_record.payload_hash <> request_payload_hash then
      raise exception using errcode = '22023', message = 'Provider event id was reused with different data';
    end if;

    select payments.* into payment_record
    from public.payments where payments.id = provider_event_record.payment_id;
    if payment_record.id is null then
      raise exception using errcode = 'P0002', message = 'Payment event has no matching payment';
    end if;
    return query select payment_record.order_id, payment_record.status, true;
    return;
  end if;

  select payments.* into payment_record
  from public.payments
  where payments.provider = lower(trim(provider_name))
    and payments.provider_reference = trim(target_provider_reference)
  for update;

  select orders.currency into order_currency
  from public.orders where orders.id = payment_record.order_id;

  if payment_record.id is null then
    raise exception using errcode = 'P0002', message = 'Payment not found for provider reference';
  end if;
  if payment_record.method <> 'PREPAID' then
    raise exception using errcode = '22023', message = 'Provider events require a prepaid payment';
  end if;
  if reported_amount <> payment_record.amount or upper(reported_currency) <> order_currency then
    raise exception using errcode = '22023', message = 'Provider payment amount or currency does not match';
  end if;

  previous_payment_status := payment_record.status;

  if provider_event_type = 'payment.succeeded' and payment_record.status <> 'PAID' then
    if payment_record.status not in ('PENDING', 'FAILED') then
      raise exception using errcode = '22023', message = 'Payment cannot transition to paid';
    end if;
    update public.payments
    set status = 'PAID', paid_at = statement_timestamp(), failed_at = null
    where id = payment_record.id
    returning * into payment_record;
    changed := true;
  elsif provider_event_type = 'payment.failed' and payment_record.status = 'PENDING' then
    update public.payments
    set status = 'FAILED', failed_at = statement_timestamp()
    where id = payment_record.id
    returning * into payment_record;
    changed := true;
  end if;

  update public.payment_provider_events
  set payment_id = payment_record.id, processed_status = 'PROCESSED', processed_at = statement_timestamp()
  where id = inserted_event_id;

  if changed then
    insert into public.order_events (
      order_id, entity_type, entity_id, actor_user_id, action, from_state, to_state, metadata
    ) values (
      payment_record.order_id, 'PAYMENT', payment_record.id, null,
      case when provider_event_type = 'payment.succeeded' then 'PAYMENT_CONFIRMED' else 'PAYMENT_FAILED' end,
      previous_payment_status::text, payment_record.status::text,
      jsonb_build_object('provider', lower(trim(provider_name)), 'provider_event_id', trim(provider_event_id))
    );
  end if;

  return query select payment_record.order_id, payment_record.status, false;
end;
$$;

revoke all on function public.mark_cod_paid(uuid, text) from public, anon, authenticated;
revoke all on function public.initialize_prepaid_payment(uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.record_provider_payment_event(text, text, text, text, bigint, character, text) from public, anon, authenticated;

grant execute on function public.mark_cod_paid(uuid, text) to authenticated;
grant execute on function public.initialize_prepaid_payment(uuid, text, text, uuid) to service_role;
grant execute on function public.record_provider_payment_event(text, text, text, text, bigint, character, text) to service_role;

comment on table public.payment_provider_events is 'Private idempotency ledger for signed provider webhook events; raw webhook bodies are not retained.';
comment on function public.mark_cod_paid(uuid, text) is 'Idempotently reconciles a delivered COD order as paid with an actor audit event.';
comment on function public.initialize_prepaid_payment(uuid, text, text, uuid) is 'Service-only prepaid initialization after the Edge Function authorizes the staff actor.';
comment on function public.record_provider_payment_event(text, text, text, text, bigint, character, text) is 'Service-only, idempotent application of a verified payment provider event.';
