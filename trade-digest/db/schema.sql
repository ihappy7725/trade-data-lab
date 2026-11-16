-- Trade Digest · 보고서 요청함 (Neon / PostgreSQL)
-- 쌓지 않는 것: 이름 · 이메일 · IP · 올린 PDF 파일. 누가 요청했는지는 저장하지 않는다.

create table if not exists requests (
  id          bigint generated always as identity primary key,
  title       text not null check (char_length(title) between 2 and 200),       -- 보고서 이름
  org         text not null check (org in ('WTO','IMF','OECD','World Bank','KITA','KOTRA','기타')),
  url         text check (url is null or (url ~ '^https://' and char_length(url) <= 500)), -- 원문 링크 (선택)
  reason      text check (reason is null or char_length(reason) <= 200),      -- 왜 필요한지 한 줄 (선택)
  purpose     text not null check (purpose in ('과제','스터디','업무','기타')), -- 어디에 쓰는지
  status      text not null default '접수' check (status in ('접수','요약 중','서가에 올림')),
  created_at  timestamptz not null default now()
);

create table if not exists votes (
  id          bigint generated always as identity primary key,
  request_id  bigint not null references requests(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists votes_request_idx on votes(request_id);

-- 화면 서버 함수가 쓰는 계정은 "읽기 + 새 줄 쓰기"만 (고치기 · 지우기 불가)
-- Neon 콘솔에서 역할 app_writer를 만든 뒤 아래를 실행하고, 그 역할의 연결 주소를 Vercel DATABASE_URL에 넣는다.
-- grant select, insert on requests, votes to app_writer;
-- grant usage on all sequences in schema public to app_writer;
