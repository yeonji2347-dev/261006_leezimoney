-- Run as postgres against a disposable database with 001_initial.sql applied.
-- No production changes: all fixtures and assertions are rolled back.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111','alice@test.invalid','{"nickname":"Alice","role":"admin"}'),
 ('22222222-2222-2222-2222-222222222222','bob@test.invalid','{"nickname":"Bob"}'),
 ('33333333-3333-3333-3333-333333333333','admin@test.invalid','{"nickname":"Admin"}');
update public.profiles set role='admin' where id='33333333-3333-3333-3333-333333333333';
insert into public.challenges(id,title,start_date,end_date,status) values('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','test',(now() at time zone 'Asia/Seoul')::date-1,(now() at time zone 'Asia/Seoul')::date+12,'active');
insert into public.challenge_participants(challenge_id,user_id) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111'),('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222');
insert into public.budgets(challenge_id,user_id,monthly_income,fixed_expenses,savings_investment,monthly_living_budget,challenge_budget) select challenge_id,user_id,1000000,100000,100000,800000,300000 from public.challenge_participants where challenge_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
insert into public.daily_records(id,challenge_id,user_id,record_date,total_spending,note,image_path) values
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222',(now() at time zone 'Asia/Seoul')::date,12345,'private Bob note','22222222-2222-2222-2222-222222222222/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/test.png');
insert into public.record_categories values('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','food');
insert into storage.objects(bucket_id,name) values ('proofs','22222222-2222-2222-2222-222222222222/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/test.png');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
do $$
declare rid uuid; n integer;
begin
 if public.is_admin() then raise exception 'FAIL: metadata escalated role'; end if;
 select count(*) into n from public.daily_records where user_id='22222222-2222-2222-2222-222222222222';
 if n<>0 then raise exception 'FAIL: private records leaked'; end if;
 select count(*) into n from public.budgets where user_id='22222222-2222-2222-2222-222222222222';
 if n<>0 then raise exception 'FAIL: private budgets leaked'; end if;
 select count(*) into n from public.record_categories where record_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
 if n<>0 then raise exception 'FAIL: categories leaked'; end if;
 select count(*) into n from storage.objects where bucket_id='proofs';
 if n<>0 then raise exception 'FAIL: image access leaked'; end if;
 select count(*) into n from public.community_progress('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
 if n<>2 then raise exception 'FAIL: community unavailable'; end if;
 begin update public.profiles set role='admin' where id=auth.uid(); raise exception 'FAIL: role escalation allowed'; exception when insufficient_privilege then null; end;
 update public.profiles set nickname='New Alice' where id=auth.uid();
 rid:=public.save_daily_record('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',(now() at time zone 'Asia/Seoul')::date,0,'무지출',array['food','other']);
 select count(*) into n from public.record_categories where record_id=rid;
 if n<>2 then raise exception 'FAIL: multi-category atomic save'; end if;
 begin perform public.save_daily_record('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',(now() at time zone 'Asia/Seoul')::date,1,'duplicate',array['food']); raise exception 'FAIL: duplicate allowed'; exception when unique_violation then null; end;
 perform public.save_daily_record('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',(now() at time zone 'Asia/Seoul')::date,1000,'edited',array['cafe'],rid);
 select count(*) into n from public.record_categories where record_id=rid;
 if n<>1 then raise exception 'FAIL: category replacement'; end if;
 begin
  insert into public.daily_records(challenge_id,user_id,record_date,total_spending,note) values('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222',(now() at time zone 'Asia/Seoul')::date-1,1,'spoof');
  raise exception 'FAIL: owner spoofing allowed';
 exception when insufficient_privilege then null; end;
 update public.daily_records set note='attacked' where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
 get diagnostics n=row_count; if n<>0 then raise exception 'FAIL: private update allowed'; end if;
 delete from public.daily_records where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
 get diagnostics n=row_count; if n<>0 then raise exception 'FAIL: private delete allowed'; end if;
 begin
  perform public.save_daily_record('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',(now() at time zone 'Asia/Seoul')::date+1,1,'future',array['food']);
  raise exception 'FAIL: future record allowed';
 exception when raise_exception then if SQLERRM like 'FAIL:%' then raise; end if; end;
 delete from public.daily_records where id=rid;
end $$;
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',true);
do $$ declare n integer; begin
 if not public.is_admin() then raise exception 'FAIL: admin role not recognized'; end if;
 select count(*) into n from public.daily_records where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and note='private Bob note';
 if n<>1 then raise exception 'FAIL: admin private read'; end if;
 select count(*) into n from storage.objects where bucket_id='proofs';
 if n<>1 then raise exception 'FAIL: admin image read'; end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);
do $$ declare n integer; begin
 select count(*) into n from storage.objects where bucket_id='proofs';
 if n<>1 then raise exception 'FAIL: owner image read'; end if;
end $$;
reset role;
update public.challenges set status='completed',start_date=(now() at time zone 'Asia/Seoul')::date-14,end_date=(now() at time zone 'Asia/Seoul')::date-1 where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
do $$ begin
 begin
  perform public.save_daily_record('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',(now() at time zone 'Asia/Seoul')::date-1,1,'late',array['food']);
  raise exception 'FAIL: ended challenge accepted new record';
 exception when raise_exception then if SQLERRM like 'FAIL:%' then raise; end if; end;
end $$;
rollback;
