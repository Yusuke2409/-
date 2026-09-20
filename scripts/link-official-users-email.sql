-- 公式アカウント（kane76123@gmail.com21〜250）の email / user_id を public.users に載せる
-- これを入れないと、名前を変えても予約はどの行か分からない
-- SQL Editor にこの中身を貼って Run（ファイル名は貼らない）

update public.users as u
set
  email = au.email,
  user_id = au.id
from auth.users as au
where au.email like 'kane76123@gmail.com%'
  and substring(au.email from 'gmail\.com(\d+)$')::int between 21 and 250
  and (
    u.user_id = au.id
    or lower(coalesce(u.email, '')) = lower(au.email)
    or u.nickname = au.raw_user_meta_data->>'nickname'
  );
