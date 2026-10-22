alter table public.order_events
add column actor_name text,
add column note text;

create function public.set_order_event_actor_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.actor_name is null and new.actor_user_id is not null then
    select profile.full_name into new.actor_name
    from public.profiles profile
    where profile.id = new.actor_user_id;
  end if;
  return new;
end;
$$;

create trigger set_order_event_actor_name_before_insert
before insert on public.order_events
for each row execute function public.set_order_event_actor_name();

create function public.add_order_note(target_order_id uuid, note_text text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  event_id uuid;
begin
  if actor_user_id is null or not public.has_permission('order.update') then
    raise exception using errcode = '42501', message = 'Order update permission required';
  end if;

  if length(trim(coalesce(note_text, ''))) not between 1 and 2000 then
    raise exception using errcode = '22023', message = 'Note must be between 1 and 2000 characters';
  end if;

  if not exists (select 1 from public.orders where id = target_order_id) then
    raise exception using errcode = 'P0002', message = 'Order not found';
  end if;

  insert into public.order_events (
    order_id, entity_type, entity_id, actor_user_id, action, note
  ) values (
    target_order_id, 'ORDER', target_order_id, actor_user_id, 'ORDER_NOTE_ADDED', trim(note_text)
  )
  returning id into event_id;

  return event_id;
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
        'actorName', coalesce(event.actor_name, actor.full_name),
        'note', event.note,
        'metadata', event.metadata,
        'createdAt', event.created_at
      ) order by event.created_at, event.id)
      from public.order_events event
      left join public.profiles actor on actor.id = event.actor_user_id
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

revoke all on function public.set_order_event_actor_name() from public, anon, authenticated;
revoke all on function public.add_order_note(uuid, text) from public, anon;
grant execute on function public.add_order_note(uuid, text) to authenticated;

comment on column public.order_events.actor_name is 'Denormalized actor display name retained for human-readable history.';
comment on column public.order_events.note is 'Internal timeline note text.';
comment on function public.add_order_note(uuid, text) is 'Adds an attributed internal note to an order timeline.';
