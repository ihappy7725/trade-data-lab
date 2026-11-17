# Alignment Lens — 외교 거리 × 교역 비중

두 나라를 고르면 유엔총회 투표로 잰 외교 거리와 교역 비중이 1995년부터 어떻게 함께 움직였는지 나란히 보여 주는 정적 서비스. 원인은 단정하지 않는다. 쌍 비교, 한 나라 탐색, 방법·출처, 한국어·영어, 밝은·어두운 화면을 제공한다. 로컬 구현과 검증을 마쳤으며 공개 배포는 아직 하지 않았다.

## 독립 실행

이 폴더만으로 실행한다. 다른 서비스의 파일·패키지·데이터를 연결하지 않는다.

```sh
cd "/Users/j/Desktop/vscode 작업/trade-data-lab/alignment-lens"
python3 -m http.server 8768 --bind 127.0.0.1
```

브라우저에서 `http://127.0.0.1:8768/` 또는 `http://127.0.0.1:8768/#pair/KOR/CHN`을 연다. 프런트엔드 빌드 과정은 없다. 실제 데이터 파일이 아직 없으면 먼저 아래 절차를 실행한다.

## 원자료와 데이터 다시 만들기

검수 환경은 Python 3.13이다. 의존성은 서비스 내부 가상환경에만 설치한다.

```sh
cd "/Users/j/Desktop/vscode 작업/trade-data-lab/alignment-lens"
python3 -m venv .venv
.venv/bin/python -m pip install --no-cache-dir -r scripts/requirements.txt
.venv/bin/python -B scripts/inspect_sources.py --fetch --with-agreement
.venv/bin/python -u -B scripts/download_baci.py
.venv/bin/python -u -B scripts/build_data.py
.venv/bin/python -B scripts/add_rank_metrics.py
.venv/bin/python -u -B scripts/validate_data.py
.venv/bin/python -B scripts/check_data_rules.py
```

받는 파일:

- Harvard Dataverse DOI `10.7910/DVN/LEJUQZ`, 39.0판의 `IdealpointestimatesAll_Jun2024.csv`, `AgreementScoresAll_Jun2024.csv`. 이전 점수 파일을 유지하도록 사용자가 선택했다. 최신 최종 표결 전용 점수로 자동 교체하지 않는다.
- CEPII `BACI_HS92_V202601.zip`. ZIP 안의 `BACI_HS92_Y1995_V202601.csv`부터 `BACI_HS92_Y2024_V202601.csv`, `country_codes_V202601.csv`를 사용한다. 원 CSV를 직접 읽되 디스크에 모두 풀 필요는 없다.
- 같은 Dataverse의 `IdealpointestimatesFP_2026FP.csv`는 inspect_sources가 검수용으로 함께 받는다. 코드 식별 열 대조 전용이며 새 점수를 계산에 섞지 않는다. `raw/comtrade-reporters-2026-11-17.json`은 최초 방법 검토 때 보존한 참고 응답이며 재빌드 필수 입력이 아니다. 날짜 근거와 URL은 방법 기록·코드 예외에 보존했다.

`download_baci.py`는 공식 ZIP을 HTTP byte range로 이어받는다. `raw/baci-download-parts/`를 보존하면 중단 후 같은 명령으로 재개할 수 있다. 모든 조각 길이를 확인한 뒤 ZIP을 조립한다. 빌드에서 ZIP 파일별 CRC32와 기존 공식 메타데이터를 대조한다.

`build_data.py`는 원자료 금액의 소수 표기를 Decimal 50자리 연산으로 그대로 합산한다. 일부 행의 긴 소수 표현도 자르거나 세 자리로 반올림하지 않는다. 음수·비유한 값 등 자료 정의와 충돌하는 값은 중단한다. 재실행 시 CRC·파일 길이·계산 버전이 일치하는 `raw/aggregates/`의 중간 결과를 사용한다. 원 CSV를 모두 다시 읽으려면 `--force`를 붙인다.

`validate_data.py`는 빌드의 캐시나 금액 파서를 사용하지 않고 원 CSV를 다시 스캔해 Decimal로 계산한다. 예시 3쌍과 고정 시드로 뽑은 7쌍을 양방향으로 대조한다. 보고서는 `review/independent-validation.json`과 `.md`에 기록한다. 이를 사람이 수행한 손 계산이라고 표시하지 않는다. 분자·분모와 두 원점수를 보고서에 공개해 수동 대조가 가능하게 한다.

자료 판이나 코드가 달라지면 `review/source-conflict.json`을 확인한다. 과거 국가를 현대 국가로 자동 합치거나 기록이 없는 값을 0으로 만들어 통과시키지 않는다. 선택한 판·확인일·다운로드일·생성일·집계 정밀도·판정 상수는 `data/meta.json`에 둔다.

## 계산과 한계

- 외교 거리: 원자료의 전체 투표 점수 차이 절댓값. 회기–연도는 같은 판의 동의 비율 파일로 연결한다. 회기는 다음 달력 연도까지 이어질 수 있다.
- 교역 비중: 상대국과의 양방향 BACI 기록 합 ÷ 기준국의 전체 수출·수입 기록 합 × 100. 합산 지역도 분모에서 제거하지 않는다.
- 쌍 기록이 없으면 null, 실제 계산값 0과 구분한다. 선을 보간하지 않는다.
- 처음·마지막 3년 평균은 같은 집계 범위의 최신 연속 구간에서 비교하며 최소 6년을 요구한다. 전환기와 빠진 연도를 건너지 않는다.
- 상대 5%라는 동등성 경계는 사용하지 않는다. 아주 작은 비영 변화도 방향과 표시 단위 미만임을 보존한다.
- 0.01%는 화면 표시 필터일 뿐, 분모·사실·CSV·상관의 계산 제외 기준이 아니다.
- 자세한 근거는 `docs/method-decisions.md`, 코드 예외는 `data/code-fixes.json`에 있다.

## 디자인·사진·개인정보

사용자가 선택한 C안과 추가 요청한 물류 사진·모션을 `DESIGN.md`에 기록했다. 사진은 `assets/photos/credits.json`에 저자·출처·라이선스·표시 변경 내용을 기록하고 화면에도 인용한다. 사진은 선택한 국가 쌍의 실제 교역 현장을 뜻하지 않는다.

로그인·방문자 추적·분석 스크립트·API 키가 없다. 마지막으로 본 쌍만 localStorage에 기록하며 실패해도 계속 동작한다. 모션 정지 버튼과 `prefers-reduced-motion`을 지원한다.

## 배포 범위

이 서비스 전용 Vercel 프로젝트의 Root Directory는 `alignment-lens`로 둔다. 원자료·스크립트·검수·문서는 `.vercelignore`로 제외한다. 나라별 JSON 합계는 약 141 MB이며, 숫자를 반올림해 용량을 줄이지 않았다. [Vercel 공식 한도](https://vercel.com/docs/limits#static-file-uploads)는 CLI 업로드를 Hobby 100 MB, Pro 1 GB로 제한하므로 현재 파일을 Hobby CLI로 곧바로 배포하면 한도를 넘는다. Git 연결 배포를 사용할 때는 이 서비스 전용 프로젝트에서 확인한다. 이 문서 작성 시점에는 배포하지 않았다. 커밋·push·다른 서비스 설정 변경은 수행하지 않는다.

## 기존 기획 문서

| 파일 | 내용 |
|---|---|
| `docs/Alignment-Lens-기획서.pdf` | 상세 기획서 (A to Z) |
| `docs/plan.html`, `docs/plan.css` | 기획서 원본. 고친 뒤 Chrome으로 PDF를 다시 만든다 |
| `PROMPT.md` | AI 도구에 넣는 구현 프롬프트 |

기획서 PDF 다시 만들기:

```bash
cd alignment-lens/docs && "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer --print-to-pdf="Alignment-Lens-기획서.pdf" "file://$PWD/plan.html"
```

## 검수 해석 입력

`data/interpretations.json`은 현재 빈 객체다. 정렬한 ISO3 두 코드를 하이픈으로 연결한 키(예: `CHN-KOR`)를 사용한다. 항목에는 `reviewed: true`, `summary: {ko, en}`, `source_title: {ko, en}`, HTTPS `url`, 실제 확인일 `checked_on: YYYY-MM-DD`를 넣는다. 선택 항목 `uncertainties: {ko: [문장], en: [문장]}`로 쌍별 불확실을 추가할 수 있다. 영어 검수문이 없으면 영어 해석을 자동 생성하지 않는다. 여기의 필드 설명은 입력 형식이며 실제 해석이나 확인일을 만들어 넣지 않는다.

## 연결 서비스

사용자가 2026-11-17 확인한 Tradeweave 주소는 `https://trade-data-lab.vercel.app/`다. 상세 화면에서 `#see/{ISO3}/export`로 연결하며 해당 서비스의 2024년 기준을 명시한다. 국가 탐색 연도를 외부 서비스에 지원되지 않는 연도로 전달하지 않는다.
