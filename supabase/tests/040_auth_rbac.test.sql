begin;

select plan(11);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '94000000-0000-4000-8000-000000000001',
    'auth-admin@example.test',
    '{"full_name":"Auth Admin"}'::jsonb
  ),
  (
    '94000000-0000-4000-8000-000000000002',
    'invited-manager@example.test',
    '{"full_name":"Invited Manager"}'::jsonb
  );

select is(
  (
    select full_name
    from public.profiles
    where id = '94000000-0000-4000-8000-000000000002'
  ),
  'Invited Manager',
  'new email Auth users receive a linked profile'
);

select is(
  (
    select active
    from public.profiles
    where id = '94000000-0000-4000-8000-000000000002'
  ),
  false,
  'new Auth profiles are inactive until the trusted invite finalizer succeeds'
);

update public.profiles
set active = true
where id = '94000000-0000-4000-8000-000000000001';

insert into public.profile_roles (profile_id, role_id)
select '94000000-0000-4000-8000-000000000001', id
from public.roles
where code = 'EXECUTIVE_ADMIN';

select set_config(
  'request.jwt.claims',
  '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.complete_staff_invite(
      '94000000-0000-4000-8000-000000000002',
      'invited-manager@example.test',
      'Invited Manager',
      'ORDER_MANAGER',
      '94000000-0000-4000-8000-000000000001'
    )
  $$,
  '42501',
  'permission denied for function complete_staff_invite',
  'authenticated browser users cannot call the invite finalizer'
);

reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

select lives_ok(
  $$
    select public.complete_staff_invite(
      '94000000-0000-4000-8000-000000000002',
      'invited-manager@example.test',
      'Invited Manager',
      'ORDER_MANAGER',
      '94000000-0000-4000-8000-000000000001'
    )
  $$,
  'service role can finalize an authorized staff invitation'
);

select ok(
  (select active from public.profiles where id = '94000000-0000-4000-8000-000000000002'),
  'invite finalization activates the profile'
);
select is(
  (
    select role.code
    from public.profile_roles profile_role
    join public.roles role on role.id = profile_role.role_id
    where profile_role.profile_id = '94000000-0000-4000-8000-000000000002'
  ),
  'ORDER_MANAGER',
  'invite finalization assigns the requested role'
);
select is(
  (
    select count(*)
    from public.order_events
    where entity_id = '94000000-0000-4000-8000-000000000002'
      and action = 'STAFF_CREATED'
  ),
  1::bigint,
  'invite finalization creates one immutable audit event'
);

select lives_ok(
  $$
    select public.set_staff_active(
      '94000000-0000-4000-8000-000000000002',
      false,
      '94000000-0000-4000-8000-000000000001'
    )
  $$,
  'service role can deactivate staff for an authorized admin actor'
);
select is(
  (
    select active
    from public.profiles
    where id = '94000000-0000-4000-8000-000000000002'
  ),
  false,
  'deactivation immediately marks the profile inactive'
);

select throws_ok(
  $$
    select public.set_staff_active(
      '94000000-0000-4000-8000-000000000001',
      false,
      '94000000-0000-4000-8000-000000000001'
    )
  $$,
  '22023',
  'Administrators cannot deactivate themselves',
  'an administrator cannot deactivate their own account'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"94000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.get_my_access()),
  0::bigint,
  'deactivated staff receive no application access record'
);

reset role;

select * from finish();

rollback;
