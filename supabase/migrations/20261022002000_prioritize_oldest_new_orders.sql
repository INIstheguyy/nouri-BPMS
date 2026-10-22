do $$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.list_orders(text,text,text,text,date,date,integer,integer,text)'::regprocedure
  ) into function_definition;

  function_definition := replace(
    function_definition,
    'order by filtered.created_at desc, filtered.id desc',
    $ordering$order by
      case when normalized_queue = 'new' then filtered.created_at end asc,
      case when normalized_queue = 'new' then filtered.id end asc,
      case when normalized_queue is distinct from 'new' then filtered.created_at end desc,
      case when normalized_queue is distinct from 'new' then filtered.id end desc$ordering$
  );

  execute function_definition;
end;
$$;

comment on function public.list_orders(text, text, text, text, date, date, integer, integer, text)
is 'Permission-checked operational queue; new orders are oldest-first to prioritize SLA risk.';
