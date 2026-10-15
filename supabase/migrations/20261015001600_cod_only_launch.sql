alter table public.operational_settings
add column prepaid_enabled boolean not null default false;

create or replace function public.enforce_enabled_payment_method()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.payment_method = 'PREPAID'
    and not coalesce((
      select settings.prepaid_enabled
      from public.operational_settings settings
      where settings.id = '40000000-0000-4000-8000-000000000001'
    ), false)
  then
    raise exception using
      errcode = '22023',
      message = 'Prepaid ordering is not enabled';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_enabled_payment_method() from public, anon, authenticated;

create trigger orders_enforce_enabled_payment_method
before insert or update of payment_method on public.orders
for each row execute function public.enforce_enabled_payment_method();

comment on column public.operational_settings.prepaid_enabled is
  'Server-side launch gate. False keeps all new orders COD-only until a production prepaid provider is approved.';
comment on function public.enforce_enabled_payment_method() is
  'Rejects new prepaid orders while the server-side prepaid launch gate is disabled.';
