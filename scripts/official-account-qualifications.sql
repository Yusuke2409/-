-- 自動コメント公式アカウント（kane76123@gmail.com21〜250）の約15%に
-- 承認済み資格をランダム付与する。
-- Supabase SQL Editor で実行してください。
-- 何件入るか先に確認するなら、末尾の insert の直前まで実行し、
-- select * from picked; を一時的に使っても大丈夫です。

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
already_approved as (
  select o.user_email
  from official o
  where exists (
    select 1
    from public.user_qualifications q
    where (
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
    round((select count(*)::numeric from official) * 0.15) - (select count(*) from already_approved)
  )::int as need
),
picked as (
  select
    o.*,
    (array[
      '一級建築士',
      '二級建築士',
      '木造建築士',
      'インテリアコーディネーター',
      '宅地建物取引士',
      '第一種電気工事士',
      '第二種電気工事士',
      '照明コンサルタント',
      'インテリアプランナー',
      '福祉住環境コーディネーター'
    ])[1 + floor(random() * 10)::int] as qualification_name
  from official o
  where not exists (
    select 1 from already_approved a
    where a.user_email is not distinct from o.user_email
  )
  order by random()
  limit (select need from target)
)
select
  nickname,
  qualification_name,
  '',
  'approved',
  user_id,
  user_email
from picked
where (select need from target) > 0;
