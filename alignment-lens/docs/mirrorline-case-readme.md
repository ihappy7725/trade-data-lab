# Mirrorline — 통상 주장을 인용하기 전의 근거 대조

양국 공식 문서와 같은 방향의 교역 신고자료를 연결해, 숫자를 인용할 수 있는 범위와 비교 조건을 확인하는 정적 웹서비스다. 첫 사례는 **2017년 미·중 상품무역 적자**다. 새 Trade Data Lab 기획서에 따른 PARALLEL 개편이며, 현재 실제 작업 폴더는 `alignment-lens`다.

서비스의 존재 이유, 기존 도구와의 중복, 확장·중단 기준은 `docs/product-rationale.md`와 화면의 `#about`에 있다. 이용 수요가 검증됐다고 주장하지 않는다.

## 제공하는 것

- 미국 USTR 2018 NTE와 중국 SCIO 2018년 9월 백서의 짧은 원문 발췌·문서 위치
- UN Comtrade의 2017년 상품 전체 집계 네 값: 양국 수출 X·수입 M
- 중국→미국 / 미국→중국 방향 전환과 같은 눈금의 금액 비교
- 미조정 차액(수입 기록−수출 기록), 정확한 USD 원값, 범위·가격 기준·조회 시점 점검
- 별도로 보존한 US Census 2017년 표와 customs value/FAS 정의
- 출처·조회본을 포함한 CSV, Markdown 근거 노트, 선택 방향의 인용문 복사
- 한국어/영어, 시스템 테마 및 수동 전환, 모바일 대응

공식 문서의 인용값을 현재 API 값으로 교체하지 않는다. UNGA 외교 거리·순위 상관·BACI 조정값은 새 사례 계산에 사용하지 않는다. 검수된 별도 해석은 없으며 원자료로 계산한 차액을 원인 판정으로 표시하지 않는다.

## 로컬 실행

```sh
cd "/Users/j/Desktop/vscode 작업/trade-data-lab/alignment-lens"
python3 -m http.server 8768 --bind 127.0.0.1
```

`http://127.0.0.1:8768/`를 연다. 빌드나 패키지 설치가 필요 없다. 웹 브라우저는 서비스 내부의 고정 JSON만 읽는다. 외부 통계 API, AI, 추적, 외부 폰트, localStorage를 호출하지 않는다. 언어와 테마는 페이지 메모리에만 보관한다.

주소: `#case/usa-chn-2017`, `#case/usa-chn-2017/trade/chn-usa`, `#case/usa-chn-2017/trade/usa-chn`, `#about`, `#method`, `#sources`.

## 실제 자료와 재현

Python 3 표준 라이브러리와 시스템 curl을 사용한다. API 키와 유료 구독 없이 접근 가능한 UN Comtrade public preview를 사용한다. 제공기관의 공개 API 정책·한도는 변경될 수 있으며 실패 시 데이터를 지어내지 않고 중단한다.

```sh
cd "/Users/j/Desktop/vscode 작업/trade-data-lab/alignment-lens"
python3 -B scripts/build_mirrorline_case.py --fetch
node review/verify_mirrorline.cjs
```

원본을 다시 받지 않고 확인된 조회본으로 재생성:

```sh
python3 -B scripts/build_mirrorline_case.py
```

`raw/mirrorline/manifest.json`의 해시와 일치하는 원본만 재사용한다. 최초 수집을 별도로 수행한 경우에만 **실제 수집일**로 `--retrieved-on YYYY-MM-DD`를 지정한다. 이 옵션은 조회일을 꾸미기 위한 것이 아니다.

필수 원본:

- `chn-2017.json`, `usa-2017.json`: UN Comtrade `public/v1/preview/C/A/HS`; period=2017, reporterCode=156/842, partnerCode=842/156, flowCode=X,M, cmdCode=TOTAL, partner2Code=0, customsCode=C00, motCode=0
- `ustr-2018.pdf`: USTR 2018 National Trade Estimate, China / Trade Summary, 본문 91쪽·PDF 99쪽
- `china-whitepaper-2018.html`: SCIO September 2018 white paper, II절 통계 차이 문단, 중국 대사관 공식 재게시본
- `census-china.html`: Census Trade in Goods with China, TOTAL 2017 행
- `comtrade-asymmetries.html`, `census-method.html`, `comtrade-api.html`: 공식 방법 문서
- `joint-reconciliation-2012.pdf`: 공동 대조 참고 보고서. 2008–2010년을 다루며 이번 사례의 기여 금액 계산에는 사용하지 않음

정확한 URL과 SHA-256은 `data/cases/usa-chn-2017.json`의 sources에 포함한다. 원문 전체와 원본 응답은 `raw/`에만 둔다. 배포에는 짧은 인용·메타데이터·계산 JSON만 포함한다.

API 판 번호가 제공되지 않아 **2026-11-19 고정 조회본**으로 식별한다. 최신 판이나 2018년 당시 자료의 완전한 재현이라고 부르지 않는다. 원자료의 TOTAL은 isAggregate=true / isReported=false다. 실제 세관 신고 건별 데이터라고 부르지 않는다.

## 검증

- `build_mirrorline_case.py`: 응답 건수·양국 코드·방향·기간·HS 판·TOTAL·CIF/FOB 필드와 primaryValue 일치 확인, Decimal 차액 계산, Census 원표 금액 재계산
- `review/verify_mirrorline.cjs`: 실제 화면 코드의 내보내기 함수를 실행해 CSV 12행, 금액·양방향 차액·공식 문서 인용값·Census 참고값 대조, 한/영 네 화면, 저장소 차단 상태 확인
- 검증 결과·모바일 확인은 `review/mirrorline-validation.md`에 기록한다. 자동 검증을 사람이 수행한 검수나 수요 검증이라고 부르지 않는다.

원자료가 바뀌면 통과시키려고 숫자를 고치지 않는다. 문서에 적힌 원래 인용값은 별도 자료 판으로 유지하고 변화 여부를 검토한다.

## 배포와 보관

기존 서비스 전용 Vercel 프로젝트의 Root Directory=`alignment-lens`에서 정적으로 배포할 수 있다. 이번 작업에서 공개 배포·commit·push·프로젝트 변경은 하지 않았다. 다른 서비스 및 저장소 루트 파일을 수정하지 않는다.

기존 PARALLEL은 `parallel-archive.html`, 기존 데이터·스크립트, `docs/parallel-readme-archived.md`, `docs/parallel-design-archived.md`로 보존했다. `.vercelignore`는 원자료·문서·검증 파일·이전 대용량 데이터와 사진·보관 HTML을 배포에서 제외한다. 새 화면은 이전 자료를 가져오지 않는다. 독립 폴더 이름 변경과 기존 Mirror Gap의 실제 통합은 아직 하지 않았다.
