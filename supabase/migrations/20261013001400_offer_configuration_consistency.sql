create or replace function public.update_offer_configuration(
  target_offer_id uuid,
  updated_active boolean,
  updated_base_price bigint,
  updated_prepaid_price bigint,
  updated_sort_order integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  previous_offer public.offers%rowtype;
  priced_item_count integer;
  priced_item_id uuid;
  priced_item_quantity integer;
begin
  if actor_user_id is null or not public.has_permission('settings.manage') then
    raise exception using errcode = '42501', message = 'Settings manage permission required';
  end if;

  if updated_base_price <= 0
    or (updated_prepaid_price is not null
      and (updated_prepaid_price <= 0 or updated_prepaid_price > updated_base_price))
    or updated_sort_order not between -10000 and 10000 then
    raise exception using errcode = '22023', message = 'Invalid offer configuration';
  end if;

  select * into previous_offer
  from public.offers
  where id = target_offer_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Offer not found';
  end if;

  if not updated_active
    and previous_offer.active
    and not exists (select 1 from public.offers where id <> target_offer_id and active) then
    raise exception using errcode = '22023', message = 'At least one offer must remain active';
  end if;

  select count(*) into priced_item_count
  from public.offer_items
  where offer_id = target_offer_id
    and item_type = 'PRODUCT';

  if priced_item_count <> 1 then
    raise exception using
      errcode = '22023',
      message = 'V1 offer editing requires exactly one priced product line';
  end if;

  select id, quantity into priced_item_id, priced_item_quantity
  from public.offer_items
  where offer_id = target_offer_id
    and item_type = 'PRODUCT';

  if mod(updated_base_price, priced_item_quantity) <> 0 then
    raise exception using
      errcode = '22023',
      message = 'Offer total must divide evenly across its product quantity';
  end if;

  update public.offer_items
  set unit_price = updated_base_price / priced_item_quantity
  where id = priced_item_id;

  update public.offers
  set active = updated_active,
      base_price = updated_base_price,
      prepaid_price = updated_prepaid_price,
      sort_order = updated_sort_order
  where id = target_offer_id;

  insert into public.order_events (entity_type, entity_id, actor_user_id, action, metadata)
  values (
    'OFFER',
    target_offer_id,
    actor_user_id,
    'OFFER_CONFIGURATION_UPDATED',
    jsonb_build_object(
      'before', jsonb_build_object(
        'active', previous_offer.active,
        'base_price', previous_offer.base_price,
        'prepaid_price', previous_offer.prepaid_price,
        'sort_order', previous_offer.sort_order
      ),
      'after', jsonb_build_object(
        'active', updated_active,
        'base_price', updated_base_price,
        'prepaid_price', updated_prepaid_price,
        'sort_order', updated_sort_order
      )
    )
  );
end;
$$;

revoke all on function public.update_offer_configuration(uuid, boolean, bigint, bigint, integer)
from public, anon, authenticated;
grant execute on function public.update_offer_configuration(uuid, boolean, bigint, bigint, integer)
to authenticated;

comment on function public.update_offer_configuration(uuid, boolean, bigint, bigint, integer) is
  'Updates offer activation/pricing/order, keeps the V1 product line total consistent, and records an immutable audit event.';
