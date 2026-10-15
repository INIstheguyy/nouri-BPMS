create extension if not exists pg_trgm with schema extensions;

create index customers_name_trgm_idx
on public.customers
using gin ((trim(first_name || ' ' || coalesce(last_name, ''))) extensions.gin_trgm_ops);

create index customers_phone_trgm_idx
on public.customers
using gin (primary_phone_normalized extensions.gin_trgm_ops);

create index orders_number_trgm_idx
on public.orders
using gin (order_number extensions.gin_trgm_ops);

create index profiles_name_trgm_idx
on public.profiles
using gin ((lower(full_name)) extensions.gin_trgm_ops);

create index profiles_email_trgm_idx
on public.profiles
using gin ((lower(email)) extensions.gin_trgm_ops);

do $$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.list_orders(text,text,text,text,date,date,integer,integer)'::regprocedure
  ) into function_definition;

  function_definition := replace(
    function_definition,
    'orders.order_status::text = status_filter',
    'orders.order_status = status_filter::public.order_status'
  );
  function_definition := replace(
    function_definition,
    'orders.source::text = source_filter',
    'orders.source = source_filter::public.order_source'
  );
  function_definition := replace(
    function_definition,
    'orders.payment_method::text = payment_method_filter',
    'orders.payment_method = payment_method_filter::public.payment_method'
  );

  execute function_definition;
end;
$$;

comment on index public.customers_name_trgm_idx is
  'Supports contains-style customer name search in operational lists.';
comment on index public.customers_phone_trgm_idx is
  'Supports contains-style normalized phone search in order and customer lists.';
comment on index public.orders_number_trgm_idx is
  'Supports contains-style order-number lookup in the operational queue.';
comment on index public.profiles_name_trgm_idx is
  'Supports case-insensitive staff-name search.';
comment on index public.profiles_email_trgm_idx is
  'Supports case-insensitive staff-email search.';
