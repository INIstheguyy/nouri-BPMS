begin;

select plan(9);

select is(
  (
    select count(*)
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
      and not relation.relrowsecurity
  ),
  0::bigint,
  'every public table has row-level security enabled'
);

select is(
  (
    select count(*)
    from pg_proc function
    join pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'public'
      and function.prosecdef
      and coalesce(array_to_string(function.proconfig, ','), '') !~ '(^|,)search_path=""(,|$)'
  ),
  0::bigint,
  'every public SECURITY DEFINER function fixes search_path to empty'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.complete_staff_invite(uuid,text,text,text,uuid)',
    'EXECUTE'
  ),
  'browser users cannot execute invitation finalization'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.set_staff_active(uuid,boolean,uuid)',
    'EXECUTE'
  ),
  'browser users cannot execute service-role staff activation directly'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.set_staff_role(uuid,text,uuid)',
    'EXECUTE'
  ),
  'browser users cannot execute service-role role assignment directly'
);

select ok(
  not has_table_privilege('anon', 'public.operational_settings', 'SELECT'),
  'anonymous users cannot read operational settings directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.operational_settings', 'UPDATE'),
  'authenticated users cannot bypass the audited settings command'
);

select ok(
  not has_table_privilege('anon', 'public.payment_provider_events', 'SELECT'),
  'anonymous users cannot read payment provider events'
);

select ok(
  not has_table_privilege('anon', 'public.public_request_limits', 'SELECT'),
  'anonymous users cannot inspect rate-limit buckets'
);

select * from finish();
rollback;
