begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null, nickname text not null check (char_length(nickname) between 1 and 30),
 role text not null default 'participant' check(role in ('participant','admin')), created_at timestamptz not null default now()
);
create table public.challenges (
 id uuid primary key default gen_random_uuid(), title text not null, description text not null default '',
 start_date date not null, end_date date not null, duration_days integer not null default 14 check(duration_days=14),
 status text not null default 'upcoming' check(status in ('upcoming','active','completed')), created_at timestamptz not null default now(),
 check(end_date=start_date+duration_days-1)
);
create table public.challenge_participants (
 id uuid primary key default gen_random_uuid(), challenge_id uuid not null references public.challenges(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade, joined_at timestamptz not null default now(),
 status text not null default 'active' check(status in ('active','completed','dropped')), unique(challenge_id,user_id)
);
create table public.budgets (
 id uuid primary key default gen_random_uuid(), challenge_id uuid not null, user_id uuid not null,
 monthly_income bigint not null check(monthly_income>=0), fixed_expenses bigint not null check(fixed_expenses>=0),
 savings_investment bigint not null check(savings_investment>=0), monthly_living_budget bigint not null check(monthly_living_budget>=0),
 challenge_budget bigint not null check(challenge_budget>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(challenge_id,user_id), foreign key(challenge_id,user_id) references public.challenge_participants(challenge_id,user_id) on delete cascade
);
create table public.daily_records (
 id uuid primary key default gen_random_uuid(), challenge_id uuid not null, user_id uuid not null, record_date date not null,
 total_spending bigint not null check(total_spending>=0 and total_spending<=1000000000000),
 note text not null check(char_length(trim(note)) between 1 and 300), image_path text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(challenge_id,user_id,record_date), foreign key(challenge_id,user_id) references public.challenge_participants(challenge_id,user_id) on delete cascade,
 check(image_path is null or image_path like user_id::text || '/' || challenge_id::text || '/%')
);
create index records_challenge_date on public.daily_records(challenge_id,record_date);
create table public.spending_categories(id text primary key, label text not null);
insert into public.spending_categories values ('food','식비'),('cafe','카페/간식'),('transport','교통'),('shopping','쇼핑'),('hobby','취미'),('living','생활'),('other','기타');
create table public.record_categories(record_id uuid references public.daily_records(id) on delete cascade, category_id text references public.spending_categories(id), primary key(record_id,category_id));

create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
create function public.new_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,email,nickname) values(new.id,coalesce(new.email,''),left(coalesce(nullif(trim(new.raw_user_meta_data->>'nickname'),''),'새싹'),30));
 return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.new_profile();
create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
create trigger budget_updated before update on public.budgets for each row execute function public.touch_updated_at();
create trigger record_updated before update on public.daily_records for each row execute function public.touch_updated_at();
create function public.validate_record_date() returns trigger language plpgsql set search_path='' as $$
declare c public.challenges; today date := (now() at time zone 'Asia/Seoul')::date;
begin
 select * into c from public.challenges where id=new.challenge_id;
 if new.record_date<c.start_date or new.record_date>c.end_date or new.record_date>today then raise exception '인증 날짜가 챌린지 기간을 벗어났어요.'; end if;
 if TG_OP='INSERT' and (c.status<>'active' or today<c.start_date or today>c.end_date) then raise exception '현재는 새로운 인증을 등록할 수 없어요.'; end if;
 if TG_OP='UPDATE' and (new.user_id<>old.user_id or new.challenge_id<>old.challenge_id or new.record_date<>old.record_date) then raise exception '기록의 소유자와 날짜는 변경할 수 없어요.'; end if;
 return new;
end $$;
create trigger record_date_guard before insert or update on public.daily_records for each row execute function public.validate_record_date();

alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.budgets enable row level security;
alter table public.daily_records enable row level security;
alter table public.spending_categories enable row level security;
alter table public.record_categories enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy profile_edit on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy challenge_read on public.challenges for select to authenticated using(true);
create policy challenge_admin on public.challenges for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy member_read on public.challenge_participants for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy member_join on public.challenge_participants for insert to authenticated with check(user_id=auth.uid() and status='active' and exists(select 1 from public.challenges c where c.id=challenge_id and c.status in ('active','upcoming') and c.end_date>=(now() at time zone 'Asia/Seoul')::date));
create policy budget_read on public.budgets for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy budget_insert on public.budgets for insert to authenticated with check(user_id=auth.uid());
create policy budget_edit on public.budgets for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy record_read on public.daily_records for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy record_insert on public.daily_records for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.challenge_participants cp where cp.challenge_id=daily_records.challenge_id and cp.user_id=auth.uid() and cp.status='active'));
create policy record_edit on public.daily_records for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy record_delete on public.daily_records for delete to authenticated using(user_id=auth.uid());
create policy category_read on public.spending_categories for select to authenticated using(true);
create policy record_category_read on public.record_categories for select to authenticated using(exists(select 1 from public.daily_records r where r.id=record_id));
create policy record_category_write on public.record_categories for all to authenticated using(exists(select 1 from public.daily_records r where r.id=record_id and r.user_id=auth.uid())) with check(exists(select 1 from public.daily_records r where r.id=record_id and r.user_id=auth.uid()));

-- Explicit grants prevent profile role escalation even with a crafted HTTP request.
revoke all on public.profiles,public.challenges,public.challenge_participants,public.budgets,public.daily_records,public.spending_categories,public.record_categories from anon,authenticated;
grant select on public.profiles,public.challenges,public.challenge_participants,public.budgets,public.daily_records,public.spending_categories,public.record_categories to authenticated;
grant update(nickname) on public.profiles to authenticated;
grant insert,update,delete on public.challenges to authenticated;
grant insert on public.challenge_participants to authenticated;
grant insert,update on public.budgets to authenticated;
grant insert,update,delete on public.daily_records,public.record_categories to authenticated;

-- Atomic record/category save; inserts never silently overwrite a duplicate day.
create function public.save_daily_record(p_challenge uuid,p_date date,p_spending bigint,p_note text,p_categories text[],p_record uuid default null,p_image_path text default null) returns uuid
language plpgsql security invoker set search_path='' as $$
declare rid uuid;
begin
 if coalesce(cardinality(p_categories),0)=0 then raise exception '카테고리를 하나 이상 선택해주세요.'; end if;
 if p_record is null then
  insert into public.daily_records(challenge_id,user_id,record_date,total_spending,note,image_path) values(p_challenge,auth.uid(),p_date,p_spending,trim(p_note),p_image_path) returning id into rid;
 else
  update public.daily_records set total_spending=p_spending,note=trim(p_note),image_path=p_image_path where id=p_record and user_id=auth.uid() and challenge_id=p_challenge and record_date=p_date returning id into rid;
  if rid is null then raise exception '수정할 기록을 찾을 수 없어요.'; end if;
  delete from public.record_categories where record_id=rid;
 end if;
 insert into public.record_categories(record_id,category_id) select rid,unnest(p_categories);
 return rid;
end $$;

-- Whitelisted community data only. Financial values and email never leave this function.
create function public.community_progress(p_challenge uuid) returns table(user_id uuid,nickname text,record_dates date[])
language sql stable security definer set search_path='' as $$
 select p.id,p.nickname,coalesce(array_agg(r.record_date order by r.record_date) filter(where r.record_date is not null),'{}'::date[])
 from public.challenge_participants cp join public.profiles p on p.id=cp.user_id
 left join public.daily_records r on r.user_id=cp.user_id and r.challenge_id=cp.challenge_id
 where cp.challenge_id=p_challenge and (public.is_admin() or exists(select 1 from public.challenge_participants me where me.challenge_id=p_challenge and me.user_id=auth.uid()))
 group by p.id,p.nickname;
$$;
revoke execute on function public.new_profile(),public.touch_updated_at(),public.validate_record_date(),public.is_admin(),public.save_daily_record(uuid,date,bigint,text,text[],uuid,text),public.community_progress(uuid) from public,anon;
grant execute on function public.is_admin(),public.save_daily_record(uuid,date,bigint,text,text[],uuid,text),public.community_progress(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('proofs','proofs',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy proof_read on storage.objects for select to authenticated using(bucket_id='proofs' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
create policy proof_insert on storage.objects for insert to authenticated with check(bucket_id='proofs' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.challenge_participants cp where cp.user_id=auth.uid() and cp.challenge_id::text=(storage.foldername(name))[2]));
create policy proof_delete on storage.objects for delete to authenticated using(bucket_id='proofs' and (storage.foldername(name))[1]=auth.uid()::text);
commit;
