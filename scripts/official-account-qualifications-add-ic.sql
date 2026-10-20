-- 公式自動コメントアカウントの一級・二級のうち約4割を
-- インテリアコーディネーターに差し替える。
-- （資格保有者の総数は変えず、IC を増やす）
-- Supabase SQL Editor で実行してください。

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
candidates as (
  select q.id
  from public.user_qualifications q
  join official o
    on (o.user_id is not null and q.user_id = o.user_id)
    or (o.user_email is not null and lower(trim(q.user_email)) = o.user_email)
    or (o.nickname is not null and q.nickname = o.nickname)
  where (
    lower(trim(q.status)) in ('approved', 'approve')
    or q.status like '%承認%'
  )
  and q.qualification_name in ('一級建築士', '１級建築士', '二級建築士', '2級建築士')
),
picked as (
  select id
  from candidates
  order by random()
  limit greatest(1, ceil((select count(*) from candidates) * 0.40))
)
update public.user_qualifications q
set qualification_name = 'インテリアコーディネーター'
from picked p
where q.id = p.id;
