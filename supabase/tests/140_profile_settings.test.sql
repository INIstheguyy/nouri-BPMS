begin;

select plan(5);

insert into auth.users (id, email, raw_user_meta_data)
values ('99100000-0000-4000-8000-000000000001', 'profile-settings@example.test', '{"full_name":"Original Name"}'::jsonb);

update public.profiles set active = true where id = '99100000-0000-4000-8000-000000000001';
insert into public.profile_roles (profile_id, role_id)
select '99100000-0000-4000-8000-000000000001', id from public.roles where code = 'ORDER_MANAGER';

select has_function('public', 'update_my_profile_name', array['text'], 'self profile name function exists');

select set_config('request.jwt.claims', '{"sub":"99100000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select is(public.update_my_profile_name('  Updated Name  '), 'Updated Name', 'profile update returns the normalized name');
select is((select full_name from public.profiles where id = auth.uid()), 'Updated Name', 'profile update changes only the current profile');
select is((select count(*) from public.order_events where entity_id = auth.uid() and action = 'PROFILE_NAME_CHANGED'), 1::bigint, 'profile update records an audit event');
select throws_ok($$ select public.update_my_profile_name('x') $$, '22023', 'Name must be between 2 and 160 characters', 'short names are rejected');

select * from finish();
rollback;
