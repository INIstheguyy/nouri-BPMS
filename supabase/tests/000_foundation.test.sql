begin;

select plan(1);

select pass('local Supabase database accepts pgTAP tests');

select * from finish();

rollback;
