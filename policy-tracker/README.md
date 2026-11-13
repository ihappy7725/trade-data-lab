# ① Policyline — 정책 발표 → 무역 변화 추적기 (진행 중)

관세·제재·수출통제 같은 정책 발표일을 기준으로, 그 전후 12개월 동안 해당 품목 교역액이 어떻게 달라졌는지 그래프로 보여 주는 서비스.
원인은 단정하지 않고 "같은 시기에 일어난 변화"만 보여 준다. 빌드 과정 없는 정적 HTML 한 장이라 Vercel에 그대로 배포된다.

## 배포되는 것
- `index.html`: 첫 화면 + 정책 화면 (`#policy/<id>` 주소로 전환), 한/EN · 다크/라이트 전환
- `data/policies.js`, `data/policies.json`: 정책별 발표일·시행일·원문 링크와 월별 교역액 (스크립트가 만드는 파일, 직접 고치지 않음)
- `data/policies-list.json`: **정책 목록 원본** — 정책을 넣고 빼는 곳

## 정책 추가하기
1. `data/policies-list.json` 에 한 덩어리를 추가한다. 날짜 · HS 코드 · 원문 링크는 정부 원문으로 확인한 값만.
2. `python3 scripts/fetch_trade.py <새 정책 id>` 로 그 정책 자료만 받는다.
3. 발표 후 12개월이 다 지나지 않은 정책도 넣을 수 있다. 화면에 "발표 후 N개월 자료"로 표시되고, 매달 자동으로 채워진다.

## 자동으로 돌아가는 것 (GitHub Actions)
| 작업 | 언제 | 하는 일 |
|---|---|---|
| `policyline-data.yml` | 매달 5일 · 20일 12:00 (한국) | 모든 정책 자료를 다시 받아, 바뀌면 main 에 커밋 → Vercel 자동 재배포 |
| `policyline-candidates.yml` | 매주 월요일 09:00 (한국) | 미국 Federal Register · EU 관보에서 지난 8일의 관세 · 수출통제 · 반덤핑 발표를 모아 `policy-candidate` 이슈로 올림 (최대 20개) |

- 후보 이슈는 **검토 대기**일 뿐이다. 원문을 확인하고 `policies-list.json` 에 넣어야 화면에 나온다. 넣지 않을 후보는 이슈를 닫는다.
- 두 작업 모두 Actions 탭에서 "Run workflow" 로 바로 돌릴 수 있다.

## 교역 자료 출처
| 출처 | 쓰는 곳 | 늦게 나오는 정도 | 키 |
|---|---|---|---|
| UN Comtrade 월별 | 기본 | 나라마다 2~6개월 | `COMTRADE_KEY` 있으면 빠름 (없으면 공개 미리보기) |
| Eurostat Comext 월별 (유로) | EU 정책 | 약 6주 | 필요 없음 |
| 미국 Census 국제무역 API | 미국 관련 정책 | 약 5주 | `CENSUS_KEY` 필요. 없으면 Comtrade 로 대신 받음 |

- 키는 GitHub 저장소 Settings → Secrets and variables → Actions 에, 내 컴퓨터에서는 `policy-tracker/.env` 에 `이름=값` 한 줄로 둔다 (`.gitignore` 로 올라가지 않음).
- 한국 관세청 수출입무역통계(공공데이터포털)는 키를 받은 뒤 붙일 예정.

## 내 컴퓨터에서 다시 받기
```bash
cd policy-tracker
python3 scripts/fetch_trade.py                 # 전체
python3 scripts/collect_candidates.py --days 14  # 후보만 화면에 출력
```
- 값은 고치거나 추정하지 않는다. 기록이 없는 달은 null, 아직 오지 않은 달은 null + future.
- Comtrade 원자료 행은 `data/comtrade-raw.json` 에 남는다 (저장소 · 배포에서 뺌).

## 배포되지 않는 것 (`.vercelignore`)
| 경로 | 내용 |
|---|---|
| `PLAN.md` | 한 장 기획서 |
| `DESIGN.md` | 디자인 규칙 (방향 · 글꼴 · 색 토큰 · 테마 · 움직임 · 상태) |
| `검수_기록지.md` | 320 · 768 · 1440 눈 검수 기록 |
| `drafts/` | 디자인 시안 1 · 2 · 2b · 2c |
| `review/` | 검수 캡처, `width-check.html`(3폭 전·후), `compare.html`(before · after 비교), `before/`(비교용 before 화면) |
| `scripts/` | 자료 받기 · 후보 수집 스크립트 |
