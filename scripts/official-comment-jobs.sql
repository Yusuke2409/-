-- 公式アカウント自動コメント用の予約テーブル
-- Supabase SQL Editor で1回実行してください

create table if not exists public.official_comment_jobs (
  id bigserial primary key,
  post_id bigint not null,
  account_email text not null,
  nickname text not null,
  content text not null,
  run_at timestamptz not null,
  posted_at timestamptz,
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now(),
  unique (post_id, account_email)
);

create index if not exists official_comment_jobs_due_idx
  on public.official_comment_jobs (status, run_at);

alter table public.official_comment_jobs enable row level security;
