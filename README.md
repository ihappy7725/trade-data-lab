# Tradeweave 랜딩 페이지

나라 하나를 고르면 교역 상대국과 쏠림 정도를 지도 한 장으로 보여 주는 서비스 **Tradeweave**의 랜딩 페이지입니다. 빌드 과정이 없는 정적 HTML 한 장(`index.html`)이라 Vercel에 그대로 배포됩니다.

## 배포되는 것

- `index.html`: 랜딩 페이지 (첫 화면 → 기능 소개 → 나라 고르기 → **실제 지도 결과**, `#해시`로 화면 전환. 결과 주소 예: `/#see/KOR/export`)
- `data/trade-2024.json`: 나라별 수출·수입 상대국 전체 (CEPII BACI HS22 V202601, 2024년, 상품 전체 합계, 천 미국 달러)
- `data/world-map.json`: 미리 계산한 세계 지도 SVG 경로 (Natural Earth 110m, Equal Earth 도법. 110m에 없는 작은 나라는 50m 중심점에 점으로 표시)
- `vercel.json`: 깔끔한 주소 설정

`.vercelignore`로 `materials/`, `scripts/`, `README.md`, `CLAUDE.md`는 배포에서 뺍니다.

## 데이터 다시 만들기

```bash
# 1) https://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37 에서 BACI_HS22_V202601.zip 내려받아 풀기
pip install pandas pycountry
python3 scripts/build_trade_data.py BACI_HS22_Y2024_V202601.csv country_codes_V202601.csv data/trade-2024.json
# 2) 지도 경로 (빈 폴더에서 npm i d3-geo@3.1.1 topojson-client@3.1.0 world-atlas@2.0.2 후 그 폴더에서 실행)
node scripts/build_map.mjs data/trade-2024.json data/world-map.json
```

- 새 BACI 버전(매년 1월)이 나오면 같은 순서로 다시 만들고, 화면의 기준연도·버전 문구를 함께 고칩니다.
- 대만은 BACI의 `Other Asia, nes`(코드 490, ISO3 자리 `S19`) 값을 대만으로 표시합니다.
- 수치는 BACI 원자료를 더하기만 했고 고치거나 추정하지 않았습니다.

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

나라를 고르면 2024년 실제 BACI 값으로 지도, 상위 5개 상대국, 1위·상위 3개·상위 5개 비중, CSV 내려받기를 보여 줍니다. 고른 나라는 어디에도 보내거나 저장하지 않습니다. 기능 설명 화면(`#map`, `#share`, `#source`)의 "가상" 표시 견본은 지어낸 숫자 그대로입니다.

데이터 출처(계획): CEPII BACI 202601 (Gaulier & Zignago, 2010), UN Comtrade 기반 · 기준연도 2024 · Etalab Open Licence 2.0.
