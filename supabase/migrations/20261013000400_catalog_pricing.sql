create or replace function public.resolve_offer_pricing(
  selected_offer_id uuid,
  selected_payment_method public.payment_method
)
returns table (
  offer_id uuid,
  offer_code text,
  offer_name text,
  currency character(3),
  subtotal_amount bigint,
  discount_amount bigint,
  total_amount bigint,
  free_delivery boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  selected_offer public.offers%rowtype;
  configured_items_total bigint;
begin
  select offer.*
  into selected_offer
  from public.offers offer
  where offer.id = selected_offer_id
    and offer.active
    and exists (
      select 1
      from public.offer_items offer_item
      where offer_item.offer_id = offer.id
    )
    and not exists (
      select 1
      from public.offer_items offer_item
      join public.products product on product.id = offer_item.product_id
      where offer_item.offer_id = offer.id
        and not product.active
    );

  if not found then
    raise exception using errcode = 'P0002', message = 'Offer is unavailable';
  end if;

  select sum(offer_item.unit_price * offer_item.quantity)
  into configured_items_total
  from public.offer_items offer_item
  where offer_item.offer_id = selected_offer.id;

  if configured_items_total is distinct from selected_offer.base_price then
    raise exception using
      errcode = '22023',
      message = 'Offer item pricing is inconsistent with the configured base price';
  end if;

  return query
  select
    selected_offer.id,
    selected_offer.code,
    selected_offer.name,
    selected_offer.currency,
    selected_offer.base_price,
    case
      when selected_payment_method = 'PREPAID' and selected_offer.prepaid_price is not null
        then selected_offer.base_price - selected_offer.prepaid_price
      else 0
    end,
    case
      when selected_payment_method = 'PREPAID' and selected_offer.prepaid_price is not null
        then selected_offer.prepaid_price
      else selected_offer.base_price
    end,
    case
      when jsonb_typeof(selected_offer.metadata -> 'free_delivery') = 'boolean'
        then (selected_offer.metadata ->> 'free_delivery')::boolean
      else false
    end;
end;
$$;

create or replace function public.expand_active_offer_items(selected_offer_id uuid)
returns table (
  offer_item_id uuid,
  product_id uuid,
  item_type public.order_item_type,
  quantity integer,
  unit_price bigint,
  total_price bigint,
  item_name_snapshot text,
  sku_snapshot text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.offers offer
    where offer.id = selected_offer_id
      and offer.active
      and exists (
        select 1
        from public.offer_items offer_item
        where offer_item.offer_id = offer.id
      )
      and not exists (
        select 1
        from public.offer_items offer_item
        join public.products product on product.id = offer_item.product_id
        where offer_item.offer_id = offer.id
          and not product.active
      )
  ) then
    raise exception using errcode = 'P0002', message = 'Offer is unavailable';
  end if;

  return query
  select
    offer_item.id,
    product.id,
    offer_item.item_type,
    offer_item.quantity,
    offer_item.unit_price,
    offer_item.unit_price * offer_item.quantity,
    product.name,
    product.sku
  from public.offer_items offer_item
  join public.products product on product.id = offer_item.product_id
  where offer_item.offer_id = selected_offer_id
  order by offer_item.item_type, product.name, offer_item.id;
end;
$$;

create or replace view public.active_offer_catalog
with (security_invoker = true, security_barrier = true)
as
select
  offer.id as offer_id,
  offer.code as offer_code,
  offer.name as offer_name,
  offer.base_price,
  offer.prepaid_price,
  offer.currency,
  offer.sort_order,
  offer_item.id as offer_item_id,
  offer_item.item_type,
  offer_item.quantity,
  offer_item.unit_price,
  product.id as product_id,
  product.name as product_name,
  product.slug as product_slug,
  product.sku as product_sku
from public.offers offer
join public.offer_items offer_item on offer_item.offer_id = offer.id
join public.products product on product.id = offer_item.product_id
where offer.active
  and product.active
  and not exists (
    select 1
    from public.offer_items sibling_item
    join public.products sibling_product on sibling_product.id = sibling_item.product_id
    where sibling_item.offer_id = offer.id
      and not sibling_product.active
  );

revoke all on function public.resolve_offer_pricing(uuid, public.payment_method) from public, anon, authenticated;
revoke all on function public.expand_active_offer_items(uuid) from public, anon, authenticated;
grant execute on function public.resolve_offer_pricing(uuid, public.payment_method) to anon, authenticated, service_role;
grant execute on function public.expand_active_offer_items(uuid) to anon, authenticated, service_role;

revoke all on public.active_offer_catalog from public, anon, authenticated;
grant select on public.active_offer_catalog to anon, authenticated;

grant select (id, name, slug, sku, active) on public.products to anon;
grant select (id, name, code, active, base_price, prepaid_price, currency, sort_order) on public.offers to anon;
grant select (id, offer_id, product_id, item_type, quantity, unit_price) on public.offer_items to anon;

create policy public_read_active_products
on public.products
for select
to anon
using (active);

create policy public_read_active_offers
on public.offers
for select
to anon
using (active);

create policy public_read_active_offer_items
on public.offer_items
for select
to anon
using (
  exists (
    select 1
    from public.offers offer
    join public.products product on product.id = offer_items.product_id
    where offer.id = offer_items.offer_id
      and offer.active
      and product.active
  )
);

comment on function public.resolve_offer_pricing(uuid, public.payment_method) is 'Resolves server-authoritative base, prepaid incentive, and effective totals for one active offer.';
comment on function public.expand_active_offer_items(uuid) is 'Expands an active offer into immutable order-item snapshot values, including zero-priced bonus items.';
comment on view public.active_offer_catalog is 'RLS-protected, active-only catalog projection safe for public checkout and internal forms.';
