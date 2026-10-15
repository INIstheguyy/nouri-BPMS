insert into public.roles (code, name, description)
values
  ('ORDER_MANAGER', 'Order Manager', 'Runs day-to-day order, delivery, and payment operations.'),
  ('EXECUTIVE_ADMIN', 'Executive Admin', 'Has full operational, financial, staff, and settings oversight.')
on conflict (code) do update
set name = excluded.name,
    description = excluded.description;

insert into public.permissions (code, description)
values
  ('dashboard.operations.read', 'View the operational work dashboard.'),
  ('dashboard.executive.read', 'View executive and financial dashboard metrics.'),
  ('order.read', 'View operational orders and related detail.'),
  ('order.create', 'Create a manual order.'),
  ('order.update', 'Update allowed non-state order fields.'),
  ('order.contact', 'Record customer contact outcomes.'),
  ('order.confirm', 'Confirm an order.'),
  ('order.cancel', 'Cancel an order with a reason.'),
  ('order.schedule', 'Schedule an order delivery.'),
  ('order.dispatch', 'Dispatch a scheduled delivery.'),
  ('order.deliver', 'Record a successful delivery.'),
  ('order.fail_delivery', 'Record a failed delivery.'),
  ('order.override', 'Override an allowed workflow rule with a reason.'),
  ('customer.read', 'View customers and customer order history.'),
  ('customer.update', 'Update allowed customer fields.'),
  ('payment.read', 'View order payment status and amount.'),
  ('payment.update', 'Record an allowed payment transition.'),
  ('finance.read', 'View business-level financial totals.'),
  ('analytics.read', 'View acquisition and conversion analytics.'),
  ('staff.read', 'View staff profiles and access assignments.'),
  ('staff.manage', 'Invite, activate, deactivate, and assign staff access.'),
  ('settings.read', 'View operational settings and offer configuration.'),
  ('settings.manage', 'Change operational settings and offer configuration.'),
  ('audit.read', 'View authorized audit activity.')
on conflict (code) do update
set description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'EXECUTIVE_ADMIN'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code = any (array[
  'dashboard.operations.read',
  'order.read',
  'order.create',
  'order.update',
  'order.contact',
  'order.confirm',
  'order.cancel',
  'order.schedule',
  'order.dispatch',
  'order.deliver',
  'order.fail_delivery',
  'customer.read',
  'customer.update',
  'payment.read',
  'payment.update',
  'audit.read'
]::text[])
where r.code = 'ORDER_MANAGER'
on conflict do nothing;

insert into public.products (id, name, slug, sku, active)
values (
  '10000000-0000-4000-8000-000000000001',
  'Nouri Daily Fibre',
  'nouri-daily-fibre',
  'NOURI-FIBRE-001',
  true
)
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    sku = excluded.sku,
    active = excluded.active;

insert into public.offers (id, name, code, active, base_price, currency, sort_order, metadata)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '1 Pack',
    'ONE_PACK',
    true,
    1500000,
    'NGN',
    10,
    '{"pack_quantity": 1, "free_delivery": false}'::jsonb
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '2 Packs',
    'TWO_PACKS',
    true,
    2550000,
    'NGN',
    20,
    '{"pack_quantity": 2, "free_delivery": false}'::jsonb
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '3 Packs',
    'THREE_PACKS',
    true,
    3600000,
    'NGN',
    30,
    '{"pack_quantity": 3, "free_delivery": false}'::jsonb
  )
on conflict (id) do update
set name = excluded.name,
    code = excluded.code,
    active = excluded.active,
    base_price = excluded.base_price,
    currency = excluded.currency,
    sort_order = excluded.sort_order,
    metadata = excluded.metadata;

insert into public.offer_items (id, offer_id, product_id, item_type, quantity, unit_price)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'PRODUCT',
    1,
    1500000
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'PRODUCT',
    2,
    1275000
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'PRODUCT',
    3,
    1200000
  )
on conflict (id) do update
set offer_id = excluded.offer_id,
    product_id = excluded.product_id,
    item_type = excluded.item_type,
    quantity = excluded.quantity,
    unit_price = excluded.unit_price;

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.active
  );
$$;

create or replace function public.has_permission(requested_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.profile_roles pr on pr.profile_id = p.id
    join public.role_permissions rp on rp.role_id = pr.role_id
    join public.permissions permission on permission.id = rp.permission_id
    where p.id = (select auth.uid())
      and p.active
      and permission.code = requested_permission
  );
$$;

revoke all on function public.is_active_staff() from public, anon, authenticated;
revoke all on function public.has_permission(text) from public, anon, authenticated;
grant execute on function public.is_active_staff() to authenticated;
grant execute on function public.has_permission(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profile_roles enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.offers enable row level security;
alter table public.offer_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.deliveries enable row level security;
alter table public.order_events enable row level security;
alter table public.idempotency_keys enable row level security;

revoke all on all tables in schema public from anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.roles to authenticated;
grant select on public.permissions to authenticated;
grant select on public.role_permissions to authenticated;
grant select on public.profile_roles to authenticated;
grant select on public.customers to authenticated;
grant select on public.products to authenticated;
grant select on public.offers to authenticated;
grant select on public.offer_items to authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.payments to authenticated;
grant select on public.deliveries to authenticated;
grant select on public.order_events to authenticated;

create policy profiles_read_self_or_staff
on public.profiles
for select
to authenticated
using (
  (id = (select auth.uid()) and active)
  or (select public.has_permission('staff.read'))
);

create policy active_staff_read_roles
on public.roles
for select
to authenticated
using ((select public.is_active_staff()));

create policy active_staff_read_permissions
on public.permissions
for select
to authenticated
using ((select public.is_active_staff()));

create policy active_staff_read_role_permissions
on public.role_permissions
for select
to authenticated
using ((select public.is_active_staff()));

create policy read_own_roles_or_staff
on public.profile_roles
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or (select public.has_permission('staff.read'))
);

create policy permitted_staff_read_customers
on public.customers
for select
to authenticated
using ((select public.has_permission('customer.read')));

create policy active_staff_read_products
on public.products
for select
to authenticated
using ((select public.is_active_staff()));

create policy active_staff_read_offers
on public.offers
for select
to authenticated
using ((select public.is_active_staff()));

create policy active_staff_read_offer_items
on public.offer_items
for select
to authenticated
using ((select public.is_active_staff()));

create policy permitted_staff_read_orders
on public.orders
for select
to authenticated
using ((select public.has_permission('order.read')));

create policy permitted_staff_read_order_items
on public.order_items
for select
to authenticated
using ((select public.has_permission('order.read')));

create policy permitted_staff_read_payments
on public.payments
for select
to authenticated
using ((select public.has_permission('payment.read')));

create policy permitted_staff_read_deliveries
on public.deliveries
for select
to authenticated
using ((select public.has_permission('order.read')));

create policy permitted_staff_read_order_events
on public.order_events
for select
to authenticated
using (
  (select public.has_permission('order.read'))
  or (select public.has_permission('audit.read'))
);

comment on function public.is_active_staff() is 'Returns true only for an authenticated user with an active application profile.';
comment on function public.has_permission(text) is 'Checks server-owned role assignments for the authenticated active user.';
