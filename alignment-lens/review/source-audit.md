# Alignment Lens — 자료 확인

확인 시각: 2026-11-17T14:03:38+09:00

## 확정된 원자료

- UN: Dataverse 39.0 (2026-07-30T15:57:56Z); 사용자 선택: `IdealpointestimatesAll_Jun2024.csv`.
- UN 원파일 11238행, 회기 1–78. `year` 열 없음.
- BACI: HS92 V202601, 공식 ZIP의 연도별 파일명 기준 1995–2024.
- BACI 전체 연도 파일은 아직 받지 않음. 나라 코드표는 ZIP CRC32 검증 완료; UN CSV는 Dataverse MD5 검증 완료.
- 교역 열: `t,i,j,k,v,q`; 나라 코드표 열: `country_code,country_name,country_iso2,country_iso3`.
- UN 열: `(행 번호)`, `ccode`, `session`, `NVotesAll`, `IdealPointAll`, `QO%All`, `Q5%All`, `Q10%All`, `Q50%All`, `Q90%All`, `Q95%All`, `Q100%All`, `iso3c`, `Countryname`, `USAgree`, `RUSSAgree`, `BrazilAgree`, `ChinaAgree`, `IndiaAgree`, `IsraelAgree`.

- 동의 비율 파일 1800294행을 검사해 `session.x`–`year` 대응 확인.
- 동의 비율 열: `(행 번호)`, `session.x`, `ccode1`, `ccode2`, `agree`, `year`, `IdealPointAll.x`, `NVotesAll.x`, `IdealPointAll.y`, `NVotesAll.y`, `IdealPointDistance`.

## 나라 코드 대조

UN 코드 197개, BACI 코드표 238행; 문자 코드 일치 192개.
전체 코드표 대조이며, 각 연도의 실제 교역 기록 유무를 뜻하지 않음.

UN에만 있는 코드: LIE, MCO, TWN, YAR, YUG.

| BACI 숫자 코드 | 원래 문자 코드 | 원래 이름 |
|---|---|---|
| 16 | ASM | American Samoa |
| 60 | BMU | Bermuda |
| 86 | IOT | Br. Indian Ocean Terr. |
| 92 | VGB | Br. Virgin Isds |
| 136 | CYM | Cayman Isds |
| 162 | CXR | Christmas Isds |
| 166 | CCK | Cocos Isds |
| 175 | MYT | Mayotte (Overseas France) |
| 184 | COK | Cook Isds |
| 238 | FLK | Falkland Isds (Malvinas) |
| 258 | PYF | French Polynesia |
| 260 | ATF | Fr. South Antarctic Terr. |
| 275 | PSE | State of Palestine |
| 292 | GIB | Gibraltar |
| 304 | GRL | Greenland |
| 316 | GUM | Guam |
| 344 | HKG | China, Hong Kong SAR |
| 446 | MAC | China, Macao SAR |
| 490 | S19 | Other Asia, nes |
| 500 | MSR | Montserrat |
| 530 | ANT | Netherlands Antilles (...2010) |
| 531 | CUW | CuraÃ§ao |
| 533 | ABW | Aruba |
| 534 | SXM | Saint Maarten |
| 535 | BES | Bonaire |
| 540 | NCL | New Caledonia |
| 570 | NIU | Niue |
| 574 | NFK | Norfolk Isds |
| 580 | MNP | N. Mariana Isds |
| 612 | PCN | Pitcairn |
| 652 | BLM | Saint BarthÃ©lemy |
| 654 | SHN | Saint Helena |
| 660 | AIA | Anguilla |
| 666 | SPM | Saint Pierre and Miquelon |
| 688 | SRB | Serbia |
| 697 | R20 | Europe EFTA, nes |
| 711 | ZA1 | Southern African Customs Union (...1999) |
| 772 | TKL | Tokelau |
| 796 | TCA | Turks and Caicos Isds |
| 810 | SUN | USSR (...1990) |
| 849 | PUS | US Misc. Pacific Isds |
| 876 | WLF | Wallis and Futuna Isds |
| 891 | SCG | Serbia and Montenegro (...2005) |

## 동일 ISO3를 쓰는 BACI 행

| ISO3 | 숫자 코드 및 원래 이름 |
|---|---|
| BEL | 56: Belgium; 58: Belgium-Luxembourg (...1998) |
| DEU | 276: Germany; 280: Fed. Rep. of Germany (...1990) |
| SDN | 729: Sudan; 736: Sudan (...2011) |

## 최초 확인한 처리 쟁점 (확정 규칙은 아래 기록 참조)

- `490/S19 → TWN`: 사용자 명세에 따라 확정. 서비스 기간의 투표값은 null; 교역 분모에 포함.
- 기존 UN `YUG`(COW 345)는 마지막 회기까지 이어짐. BACI `SCG`(891)·`SRB`(688)와 기간별 대응을 확인해야 함. 일괄 치환 금지.
- `BEL`의 58은 벨기에·룩셈부르크 합산 실체. 56의 벨기에 값과 자동 연결하지 않음.
- `SDN`의 736과 729는 범위가 다른 실체. 자동 합치지 않음.
- `DEU`의 280은 1990년 이전 항목. 실제 1995년 이후 데이터 출현 여부를 전체 원자료에서 확인 예정.
- `R20`, `ZA1`, `PUS` 등은 현재 ISO3 국가와 단순 연결할 수 없음. 분모에서 임의로 빼지 않음.
- `LIE`, `MCO` 및 투표가 없는 지역은 다른 나라 값으로 채우지 않음.
- 원래 코드표의 일부 영문 이름은 문자 깨짐이 있음. 원파일은 보존하고 화면용 이름은 별도로 검수할 것.

## 근거 검토 후 확정한 규칙

2026-11-17 사용자 위임에 따라 기준과 역사적 실체 처리를 확정했다. 상세 근거·참고문헌·적용 범위는 서비스 내부 `docs/method-decisions.md`에 있다.

- 근거 없는 상대 5% 동등성 분류는 사용하지 않는다. 반올림 전 변화량과 방향을 표시한다.
- 0.01%는 화면 필터이며 분모·사실 카드·CSV·순위 상관에 적용하지 않는다.
- YUG는 실제 존재하는 행만 기간별 SCG/SRB로 연결한다. 1995–1999년 점수를 만들지 않는다.
- 수단의 분리 전·후 집계 범위를 구분하고 전환기 합산과 개별 국가를 섞지 않는다.
- 벨기에–룩셈부르크 등 합산 실체는 보존하되 개별 국가에 배분하지 않는다.
- 전체 연도 BACI 실제 행의 검증은 데이터 빌드 단계에서 수행한다.
- 다음 화면 작업 전 숫자가 없는 디자인 시안 두 개를 제시하고 선택받는다.

## 재확인

```sh
python3 scripts/inspect_sources.py
# 공식 경로에서 작은 원자료와 메타데이터 다시 받기
python3 scripts/inspect_sources.py --fetch
# 동의 비율 파일도 받기 (약 143 MB)
python3 scripts/inspect_sources.py --fetch --with-agreement
```

`--fetch`는 BACI 전체 ZIP을 받지 않고 byte range로 코드표와 CSV 헤더만 읽음. 판이 바뀌면 중단함.
데이터 빌드 스크립트와 쌍 화면은 다음 단계. 수치 대조 검수는 아직 수행하지 않음.

## 공식 출처

- [Harvard Dataverse](https://doi.org/10.7910/DVN/LEJUQZ)
- [CEPII BACI](https://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37)
- [BACI 문서](https://www.cepii.fr/DATA_DOWNLOAD/baci/doc/baci_webpage.html)
- [제78차 회기 일정](https://public.e-delegate.un.org/reports/ga78_schedule.html)

## 작업 범위

변경은 alignment-lens/ 내부로 한정. 커밋·브랜치 생성·push·배포 없음.
작업 전 기존 변경: trade-digest/api/shelf.js, trade-digest/db/schema.sql. 수정하지 않음.
