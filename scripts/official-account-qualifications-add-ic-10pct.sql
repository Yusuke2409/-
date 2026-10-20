-- 既存の資格はそのまま。
-- 公式自動コメントアカウント全体の追加10%に
-- インテリアコーディネーター（承認済み）を付ける。
-- すでに IC を持っている人は除外する。
-- Supabase SQL Editor で実行してください。

insert into public.user_qualifications (
  nickname,
  qualification_name,
  cert_image_url,
  status,
  user_id,
  user_email
)
with official as (
  select distinct on (coalesce(u.user_id::text, lower(coalesce(u.email, au.email, '')), u.nickname))
    trim(u.nickname) as nickname,
    u.user_id,
    lower(trim(coalesce(u.email, au.email))) as user_email
  from public.users u
  left join auth.users au on au.id = u.user_id
  where trim(coalesce(u.nickname, '')) <> ''
    and (
      (
        (regexp_match(lower(trim(coalesce(u.email, ''))), '^kane76123@gmail\.com([0-9]+)$'))[1]::int
        between 21 and 250
      )
      or (
        (regexp_match(lower(trim(coalesce(au.email, ''))), '^kane76123@gmail\.com([0-9]+)$'))[1]::int
        between 21 and 250
      )
    )
  order by coalesce(u.user_id::text, lower(coalesce(u.email, au.email, '')), u.nickname), u.nickname
),
already_ic as (
  select o.user_email
  from official o
  where exists (
    select 1
    from public.user_qualifications q
    where q.qualification_name = 'インテリアコーディネーター'
    and (
      lower(trim(q.status)) in ('approved', 'approve')
      or q.status like '%承認%'
    )
    and (
      (o.user_id is not null and q.user_id = o.user_id)
      or (o.user_email is not null and lower(trim(q.user_email)) = o.user_email)
      or (o.nickname is not null and q.nickname = o.nickname)
    )
  )
),
target as (
  select greatest(
    0,
    round((select count(*)::numeric from official) * 0.10) - (select count(*) from already_ic)
  )::int as need
),
picked as (
  select o.*
  from official o
  where not exists (
    select 1 from already_ic a
    where a.user_email is not distinct from o.user_email
  )
  order by random()
  limit (select need from target)
)
select
  nickname,
  'インテリアコーディネーター',
  '',
  'approved',
  user_id,
  user_email
from picked
where (select need from target) > 0;
