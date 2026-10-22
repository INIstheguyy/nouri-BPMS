begin;

select plan(4);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('99000000-0000-4000-8000-000000000001', 'analytics-exec@example.test', '{"full_name":"Analytics Exec"}'::jsonb),
  ('99000000-0000-4000-8000-000000000002', 'analytics-manager@example.test', '{"full_name":"Analytics Manager"}'::jsonb);

update public.profiles
set active = true
where id in ('99000000-0000-4000-8000-000000000001', '99000000-0000-4000-8000-000000000002');

insert into public.profile_roles (profile_id, role_id)
select '99000000-0000-4000-8000-000000000001', id from public.roles where code = 'EXECUTIVE_ADMIN';

insert into public.profile_roles (profile_id, role_id)
select '99000000-0000-4000-8000-000000000002', id from public.roles where code = 'ORDER_MANAGER';

select has_function('public', 'get_revenue_series', array['date', 'date'], 'daily revenue function exists');

select set_config('request.jwt.claims', '{"sub":"99000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select is(
  jsonb_array_length(public.get_revenue_series('2026-10-20', '2026-10-22')),
  3,
  'revenue series includes every day in the selected period'
);

select is(
  public.get_revenue_series('2026-10-20', '2026-10-22')->0->>'date',
  '2026-10-20',
  'revenue series is ordered from the first selected day'
);

select set_config('request.jwt.claims', '{"sub":"99000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

select throws_ok(
  $$ select public.get_revenue_series('2026-10-20', '2026-10-22') $$,
  '42501',
  'Analytics permission required',
  'order managers cannot read executive revenue'
);

select * from finish();
rollback;
