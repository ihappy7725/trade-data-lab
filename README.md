# Trade Data Lab

데이터, 무역, 국제정치경제, 국제정책, 글로벌 이슈를 다루는 서비스를 하나씩 만드는 장기 프로젝트입니다.
서비스마다 폴더 하나이고, 각 폴더가 독립된 웹서비스입니다. 전체 아이디어와 처리 방향은 [docs/trade-data-lab-ideas.md](docs/trade-data-lab-ideas.md)에 있습니다.

| # | 폴더 | 서비스 | 상태 |
|---|---|---|---|
| 1 | [policy-tracker/](policy-tracker/) | **Policyline** · 정책 발표 → 무역 변화 추적기 | 대기 |
| 2 | [trade-news-room/](trade-news-room/) | **Trade News Room** · 뉴스 속 무역 공부방 | 배포됨 · https://trade-news-room.vercel.app/ |
| 3 | [trade-weave/](trade-weave/) | **Tradeweave** · 국가별 무역 의존도 지도 | 진행 중 |
| 4 | [trade-digest/](trade-digest/) | **Trade Digest** · 국제기구·KITA·KOTRA 보고서 쉬운 말 요약 | 기획 중 |
| 5 | [alignment-lens/](alignment-lens/) | **Alignment Lens** (가칭) · 외교 거리 × 교역 비중 | 기획 중 |
| 6 | [mirror-gap/](mirror-gap/) | **Mirror Gap** (가칭) · 두 나라가 신고한 교역 통계의 차이 | 기획 중 |

## 배포

서비스마다 Vercel 프로젝트를 따로 만들고, Vercel 설정의 **Root Directory**를 그 서비스 폴더(예: `trade-weave`)로 지정합니다.

## 폴더 구조

```
trade-data-lab/
├── CLAUDE.md          프로젝트 공통 규칙 (Claude Code가 읽음)
├── README.md          이 파일
├── docs/              프로젝트 전체 문서 (아이디어 목록, 결정 기록)
├── policy-tracker/    ① Policyline (정책·무역 변화 추적기)
├── trade-news-room/   ② Trade News Room
├── trade-weave/       ③ Tradeweave
├── trade-digest/      ④ Trade Digest (보고서 쉬운 말 요약)
├── alignment-lens/    ⑤ Alignment Lens (외교 거리 × 교역)
└── mirror-gap/        ⑥ Mirror Gap (거울 통계 차이)
```
