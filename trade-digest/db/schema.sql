-- Trade Digest · 전망치 제보 (Neon / PostgreSQL)
-- 쌓지 않는 것: 이름 · 이메일 · IP · 올린 파일. 누가 제보했는지는 저장하지 않는다.

-- 1) 추적하는 지표 목록
create table if not exists indicators (
  id      text primary key,                 -- 예: world-trade-2026
  name_ko text not null,
  name_en text not null,
  unit    text not null default '%'
);
insert into indicators (id, name_ko, name_en) values
  ('world-trade-2026', '2026년 세계 교역량 증가율', 'World trade volume growth, 2026')
on conflict (id) do nothing;

-- 2) 방문자가 제보한 전망치 (원문 대조 전에는 '확인 전')
create table if not exists forecast_submissions (
  id           bigint generated always as identity primary key,
  indicator_id text not null references indicators(id),
  org          text not null check (org in ('WTO','IMF','OECD','World Bank','UNCTAD','KIEP','KITA','기타')),
  released_on  date not null check (released_on between '2024-01-01' and current_date + 1),
  value        numeric(5,2) not null check (value between -50 and 50),
  basis        text not null check (basis in ('goods','goods+services')),   -- 상품만 / 상품+서비스
  source_url   text not null check (source_url ~ '^https://' and char_length(source_url) <= 500),
  page         text check (page is null or char_length(page) <= 10),
  note         text check (note is null or char_length(note) <= 200),
  status       text not null default '확인 전' check (status in ('확인 전','원문 확인','반려')),
  created_at   timestamptz not null default now()
);
create index if not exists fs_indicator_idx on forecast_submissions(indicator_id, released_on);

-- 화면 서버 함수용 계정은 "읽기 + 새 줄 쓰기"만 (고치기 · 지우기 · 상태 바꾸기 불가)
-- grant select on indicators to app_writer;
-- grant select, insert on forecast_submissions to app_writer;
-- grant usage on all sequences in schema public to app_writer;
