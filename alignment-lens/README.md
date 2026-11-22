# CrossCite (크로스사이트) — 무역 숫자 대조·근거 기록

서로 다른 출처를 교차 대조(Cross-check)한 뒤 근거를 갖춰 인용(Cite)한다는 이름이다.

사용자가 직접 자료를 고르고 비교 조건을 점검한 뒤, 출처가 붙은 근거 노트를 저장·다시 여는 정적 웹서비스다. 새 대조가 첫 화면이며 기존 미·중 사례는 예제로 보존했다. 현재 실제 폴더 이름은 alignment-lens다.

## 현재 제공

- 한국·중국·미국, 2017·2018·2023년의 국가 간 연간 상품 전체. 연속 시계열·최신 전 세계 자료를 뜻하지 않는다.
- UN Comtrade 양측 수출입 집계 36개와 별도로 보존한 2017년 미·중 Census 참고 2개.
- 지원 목록에서 국가·방향·연도·기록 A/B 선택, 같은 교역의 신고국 간 또는 같은 흐름의 기관 간 대조.
- 방향·기간·품목·통화·단위·품목분류·가격·조회일·자료 발표/개정일·상대국 기준·집계 체계·원분류 상태 검사.
- 각 항목은 일치/차이 있음/확인 불가다. 조회일이 같아도 원자료 발표 판이 같다는 뜻은 아니다. 신뢰도 점수·정상/비정상 등급은 없다.
- 가격 미조정 B−A 차액. 정확한 소수 연산, 결측과 0 구분, 필수 조건 불일치 시 계산 보류.
- JSON 근거 노트 저장·재열기·메모 보존·원래 조회본 대응 확인. 현재 내장자료와 다시 대조해도 과거 값을 덮어쓰지 않음.
- CSV 및 인용용 Markdown, 한/영·다크/라이트·모바일. 개인정보·분석·외부 폰트·AI·서버 업로드·localStorage 없음.

## 실행

```sh
cd "/Users/j/Desktop/vscode 작업/trade-data-lab/alignment-lens"
python3 -m http.server 8768 --bind 127.0.0.1
```

http://127.0.0.1:8768/ 에서 시작한다. JSON을 읽으므로 HTML 파일을 file://로 직접 열지 않는다. 빌드·패키지 설치·API 키가 필요 없다. 브라우저는 내장 JSON만 읽고 외부 통계 API에 요청하지 않는다.

- `#/`: 새 대조
- `#compare?from=KOR&to=USA&year=2023&a=un-KOR-USA-2023-X&b=un-USA-KOR-2023-M`: 선택 조건을 담은 주소. 메모나 노트 파일 내용은 주소에 넣지 않음.
- `#note`: 불러온 노트. 새로고침하면 파일을 다시 열어야 함.
- `#method`, `#sources`, `#about`
- `mirrorline-case.html#case/usa-chn-2017`: 기존 미·중 사례 예제. 사용법 참고이며 자유 대조 자료와 문서 인용값을 혼합하지 않음.

## 자료 다시 만들기

Python 3 표준 라이브러리와 시스템 curl을 사용한다. 무료 공개 preview API의 제한 안에서 국가·연도별로 순서대로 수집한다. 기간 복수 지정은 preview에서 거절되므로 한 요청에 한 연도만 사용한다. 실패·잘린 응답·중복·범위 변화는 오류로 중단한다.

```sh
cd "/Users/j/Desktop/vscode 작업/trade-data-lab/alignment-lens"
python3 -B scripts/build_catalog.py --fetch
node review/verify_workbench.cjs
```

- 원본: raw/workbench/YYYY-MM-DD/{156,410,842}-{2017,2018,2023}.json 및 manifest.json. raw/는 Git·배포에서 제외한다.
- API: https://comtradeapi.un.org/public/v1/preview/C/A/HS
- 조건: period 1개, reporterCode 1개, partnerCode 나머지 두 나라, flowCode X,M, cmdCode TOTAL, partner2Code 0, customsCode C00, motCode 0, maxRecords 500. 국가·연도마다 기대되는 4개 기록과 primaryValue/가격 필드 일치 여부를 검사한다.
- API 판 번호는 제공되지 않아 조회일과 원본 SHA-256으로 조회본을 식별한다. 사용한 HS 판과 원분류 여부는 응답 그대로 남긴다.
- 출력: data/workbench/catalog.json, data/workbench/snapshots/{내용 해시}.json. 이전 보존 조회본은 삭제하지 않는다.
- Census 참고값은 기존 data/cases/usa-chn-2017.json의 당시 조회본을 가져온다. 새 Comtrade 수집일로 Census 조회일을 바꿔 쓰지 않는다. Census 자체를 새로 받으려면 기존 사례 수집 절차를 실행하고 변화 내용을 검토한다(docs/mirrorline-case-readme.md).

원본을 다시 받지 않고 동일한 원본으로 생성:

```sh
python3 -B scripts/build_catalog.py
```

raw 최신 포인터·manifest 해시가 일치해야 한다. 예전 조회본이 없으면 과거의 값을 복원할 수 있다고 표시하지 않는다.

## 노트 파일

JSON은 금액·조건·출처·메모를 포함하며 브라우저 안에서만 처리한다. 재열기 시 파일의 계산 결과를 가져오지 않고 두 기록에서 다시 계산한다. 내장/보존 조회본과 관측값 전체가 일치하는지 확인한다. 확인 불가인 파일은 외부 원자료의 진위가 확인된 것처럼 표시하지 않는다.

JSON은 재열기용, CSV·Markdown은 읽기·인용용이다. 노트 형식·크기·금액·출처를 검사하고 잘못된 파일을 열어도 현재 작업을 유지한다. 노트의 메모는 사람의 검수 해석으로 취급하지 않는다.

## 검증과 경계

`node review/verify_workbench.cjs`: 현재 38개 공통 기록 검증, 44개 순서 있는 지원 대조/노트 왕복, 소수 정밀도, 결측·조건 불일치·0, 잘못된 파일·출처·위조된 계산 결과 검증.

기존 사례 검증: `node review/verify_mirrorline.cjs`.

데이터 계약은 docs/comparison-contract.md, 목적과 중단 기준은 docs/product-rationale.md, 실제 검증 결과는 review/workbench-validation.md에 기록한다. 실제 사용자 수요가 검증됐다고 주장하지 않는다.

월별·품목별 탐색, 임의 CSV 가져오기, 정치적 해석, 원인 기여액, 자동 가격 보정, 실시간 갱신은 아직 제공하지 않는다.

## 배포·보관

서비스 전용 Vercel Root Directory=alignment-lens에서 정적으로 실행한다. 원자료·스크립트·검증·이전 UNGA/BACI 대용량 파일은 .vercelignore로 배포에서 제외한다. 별도 Site 호스팅이나 다른 서비스의 프로젝트를 사용하지 않는다. 배포 프로젝트는 crosscite이며 Root Directory는 alignment-lens다. 폴더 이름은 유지한다. Git 자동 배포는 끄고 아래의 공개 파일 목록으로 수동 배포한다.

PARALLEL 원형은 parallel-archive.html 및 기존 자료, 문서에 보관한다. 이전 Mirrorline 사례의 README는 docs/mirrorline-case-readme.md에 있다. 다른 서비스와 저장소 루트 파일은 수정하지 않는다.

## CrossCite 아이콘

사용자 제공 원본: assets/brand/crosscite.svg (gemini-svg.svg와 동일). favicon.svg, favicon-32x32.png, favicon.ico를 제공하며 Apple touch 아이콘은 apple-touch-icon.png다. site.webmanifest의 앱 이름은 CrossCite, 앱 아이콘은 assets/brand/icon-192.png 및 icon-512.png다. 기존의 다른 이름으로 만든 노트도 계속 열 수 있다. 웹앱 manifest는 오프라인 기능을 보장한다는 뜻이 아니다.


## 운영 배포

검증 후 `python3 -B scripts/prepare_deploy.py`로 실행 파일·계산 JSON·아이콘만 `raw/deploy-stage/alignment-lens/`에 복사한다. 준비 단계는 소스의 빌드·번들링이 아니며 사이트 자체는 빌드 없는 정적 파일이다. 다른 서비스·원자료·문서·검증 결과는 업로드하지 않는다. `raw/deploy-manifest.json`에 업로드 파일의 SHA-256을 남긴다.

```sh
python3 -B scripts/prepare_deploy.py
vercel --cwd raw/deploy-stage --prod --yes
```

Vercel CLI 로그인이 필요하며 새 프로젝트로 다시 연결하지 않는다. 준비 스크립트가 CrossCite 전용 프로젝트와 Root Directory를 지정한다. Git 푸시만으로는 공개 배포되지 않는다. 배포 후 홈·아이콘·자료 JSON의 응답과 원자료·문서·검증 경로의 404를 확인한다.
