-- Trade Digest · 모두의 서가 + 내 서재 (Neon / PostgreSQL)
-- 쌓지 않는 것: 이름 · 이메일 · IP · 올린 파일. 내 서재는 브라우저마다 만든 익명 번호로만 구분한다.

-- 1) 카테고리 (서가 필터와 같은 목록)
create table if not exists categories (
  id      text primary key,
  name_ko text not null,
  name_en text not null
);
insert into categories (id, name_ko, name_en) values
  ('outlook','세계 교역 · 경제 전망','Trade & economic outlook'),
  ('policy','관세 · 통상정책','Tariffs & trade policy'),
  ('supply','공급망 · 경제안보','Supply chains & economic security'),
  ('digital','디지털 · AI 무역','Digital & AI trade'),
  ('energy','에너지 · 원자재','Energy & commodities'),
  ('korea','한국 수출입','Korea''s trade')
on conflict (id) do nothing;

-- 2) 방문자가 모두의 서가에 추가한 보고서 → 메인 표지 벽에 보임
create table if not exists shelf_reports (
  id          bigint generated always as identity primary key,
  title       text not null check (char_length(title) between 2 and 200),
  org         text not null check (org in ('WTO','IMF','OECD','World Bank','UNCTAD','KIEP','KITA','KOTRA','기타')),
  published   text not null check (published ~ '^\d{4}(-\d{2}){0,2}$'),           -- 2026 · 2026-10 · 2026-10-08
  category_id text not null references categories(id),
  url         text not null unique check (url ~ '^https://' and char_length(url) <= 500),
  status      text not null default '확인 전' check (status in ('확인 전','확인됨','숨김')),
  added_by    text check (added_by is null or added_by ~ '^[0-9a-f-]{36}$'),   -- 브라우저 익명 번호 (하루 횟수 제한용)
  created_at  timestamptz not null default now()
);

-- 2-1) 공용 서가 신고: 서로 다른 브라우저 3곳이 신고하면 status = '숨김'
create table if not exists shelf_flags (
  report_id  bigint not null references shelf_reports(id) on delete cascade,
  flagged_by text not null check (flagged_by ~ '^[0-9a-f-]{36}$'),
  created_at timestamptz not null default now(),
  primary key (report_id, flagged_by)
);
-- 손으로 숨기기: update shelf_reports set status = '숨김' where id = <번호>;

-- 3) 내 서재 (서가 보고서든 외부 보고서든 담기)
create table if not exists library_items (
  id         bigint generated always as identity primary key,
  owner_key  text not null check (owner_key ~ '^[0-9a-f-]{36}$'),             -- 브라우저 익명 번호
  ref_id     text check (ref_id is null or char_length(ref_id) <= 80),          -- 서가 보고서 id (외부면 비움)
  title      text not null check (char_length(title) between 2 and 200),
  org        text check (org is null or char_length(org) <= 40),
  url        text check (url ~ '^https://' and char_length(url) <= 500),     -- 내 PDF 요약은 링크 없이 담을 수 있음
  summary    jsonb check (summary is null or pg_column_size(summary) <= 20000), -- 내 PDF 자동 요약 (요지 · 항목)
  created_at timestamptz not null default now(),
  unique (owner_key, url)
);
create index if not exists library_owner_idx on library_items(owner_key);

-- 화면 서버 함수용 계정 권한 (선택): 서가는 읽기 · 쓰기만, 내 서재는 지우기까지
-- grant select on categories to app_writer;
-- grant select, insert on shelf_reports to app_writer;
-- grant select, insert, delete on library_items to app_writer;
-- grant usage on all sequences in schema public to app_writer;
