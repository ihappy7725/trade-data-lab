# ① Policyline — 정책 발표 → 무역 변화 추적기 (진행 중)

관세·제재·수출통제 같은 정책 발표일을 기준으로, 그 전후 12개월 동안 해당 품목 교역액이 어떻게 달라졌는지 그래프로 보여 주는 서비스.
원인은 단정하지 않고 "같은 시기에 일어난 변화"만 보여 준다. 빌드 과정 없는 정적 HTML 한 장이라 Vercel에 그대로 배포된다.

## 배포되는 것
- `index.html`: 첫 화면 + 정책 화면 (`#policy/<id>` 주소로 전환), 한/EN 전환
- `data/policies.js`, `data/policies.json`: 정책 5건의 발표일·시행일·원문 링크와 월별 교역액 (UN Comtrade 월별 자료)

## 데이터 자동 갱신 (매달)
- `.github/workflows/policyline-data.yml` 이 매달 5일 12:00(한국 시간)에 데이터를 다시 받고, 바뀌면 main 에 커밋한다 → Vercel 자동 재배포.
- GitHub 저장소 Settings → Secrets and variables → Actions → `COMTRADE_KEY` 에 UN Comtrade API 키를 넣어 둔다. 없으면 공개 미리보기로 느리게 받는다.
- Actions 탭 → "Policyline data refresh" → Run workflow 로 바로 돌릴 수도 있다.

## 데이터 다시 만들기 (내 컴퓨터)
```bash
cd policy-tracker
python3 scripts/fetch_comtrade.py
```
- API 키는 `policy-tracker/.env` 에 `COMTRADE_KEY=...` 한 줄로 둔다 (`.gitignore` 로 GitHub 에 올라가지 않음).
- 키가 있으면 한 번에 12개월씩(정책당 3번), 없으면 공개 미리보기로 한 달씩(정책당 25번) 받는다.
- 값은 고치거나 추정하지 않는다. 자료가 없는 달은 null.
- 받은 원자료 행은 `data/comtrade-raw.json` 에 남는다 (배포에서는 뺌).

## 배포되지 않는 것 (`.vercelignore`)
| 경로 | 내용 |
|---|---|
| `PLAN.md` | 한 장 기획서 |
| `DESIGN.md` | 디자인 규칙 (방향 · 글꼴 · 색 토큰 · 움직임 · 상태) |
| `검수_기록지.md` | 320 · 768 · 1440 눈 검수 기록 |
| `drafts/` | 디자인 시안 1 · 2 · 2b · 2c |
| `review/` | 검수 캡처, `width-check.html`(3폭 전·후), `compare.html`(before · after 비교), `before/`(비교용 before 화면) |
| `scripts/` | 데이터 받는 스크립트 |
