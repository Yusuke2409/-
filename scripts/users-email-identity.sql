-- プロフィール・投稿・資格をメールアドレスに紐づける
-- Supabase の SQL Editor で実行してください。

alter table public.users add column if not exists email text;
alter table public.users add column if not exists user_id uuid;

alter table public.posts add column if not exists user_email text;
alter table public.posts add column if not exists user_id uuid;

alter table public.user_qualifications add column if not exists user_email text;
alter table public.user_qualifications add column if not exists user_id uuid;

alter table public.comments add column if not exists user_email text;
alter table public.comments add column if not exists user_id uuid;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'id'
  ) then
    alter table public.users add column id bigserial;
  end if;
end $$;

do $$
declare
  pkname text;
  pkcols text;
begin
  select c.conname,
         pg_get_constraintdef(c.oid)
    into pkname, pkcols
  from pg_constraint c
  join pg_class t on c.conrelid = t.oid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'users'
    and c.contype = 'p';

  if pkname is not null and pkcols ilike '%nickname%' then
    execute format('alter table public.users drop constraint %I', pkname);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'users'
      and c.contype = 'p'
  ) then
    alter table public.users add primary key (id);
  end if;
end $$;

create unique index if not exists users_email_unique
  on public.users (lower(email))
  where email is not null;
