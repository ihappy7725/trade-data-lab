# Tradeweave 랜딩 페이지

나라 하나를 고르면 교역 상대국과 쏠림 정도를 지도 한 장으로 보여 주는 서비스 **Tradeweave**의 랜딩 페이지입니다. 빌드 과정이 없는 정적 HTML 한 장(`index.html`)이라 Vercel에 그대로 배포됩니다.

## 배포되는 것

- `index.html`: 랜딩 페이지 (첫 화면 → 기능 소개 → 나라 고르기 → 감사 화면, `#해시`로 화면 전환)
- `vercel.json`: 깔끔한 주소 설정

`.vercelignore`로 `materials/`, `README.md`, `CLAUDE.md`는 배포에서 뺍니다.

## 배포되지 않는 것 (`materials/`)

기획 단계 결과물 보관용입니다. 사이트에는 올라가지 않고 저장소에만 있습니다. 로컬에서 `materials/hub.html`로 열어 볼 수 있습니다.

| 경로 | 내용 |
|---|---|
| `materials/concentration/` | 쏠림 계산기 (CR1·CR3·CR5·HHI). claude.ai 밖에서는 localStorage에만 저장, Claude 버튼 숨김 |
| `materials/deck/` | 투자자 소개 5장 정적 뷰어 |
| `materials/launch-copy/` | 런칭 문구 |
| `materials/design-system/` | 디자인 시스템 (README·토큰·컴포넌트) |
| `materials/docs/` | 한 장 기획서, 아이디어 메모 |
| `materials/data/` | 월별 예상 방문자 **가상 데이터** (xlsx) |

## 로컬에서 보기

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## 지금 상태

지도 화면은 아직 없습니다. 랜딩은 "공개 준비 중"으로 표시하고, 나라를 고르면 감사 화면까지만 보여 줍니다. 고른 내용은 어디에도 보내거나 저장하지 않습니다. 화면 견본의 나라와 숫자는 모두 가상입니다.

데이터 출처(계획): CEPII BACI 202601 (Gaulier & Zignago, 2010), UN Comtrade 기반 · 기준연도 2024 · Etalab Open Licence 2.0.
