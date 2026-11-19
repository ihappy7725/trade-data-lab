# Trade Data Lab 연결 맥락

Tradeweave가 받는 안정적인 연결 규칙. 다른 서비스의 코드는 이번 개편에서 수정하지 않았다.

- 결과: `#see/{ISO3}/{export|import}`
- 상대국: `partner=ISO3` (TWN은 S19로 호환)
- 기준연도: `year=2022|2023|2024` (기본 2024)
- 품목: `product=all|HS2|지원하는HS4` — 실제 목록은 data/catalog.json
- 비교연도: `compare=연도`, 선택연도와 같으면 다른 유효 연도로 조정
- 국가 비교: `peers=ISO3,ISO3`, `tab=countries`
- 분석 탭: `tab=trends|changes|partners|countries`
- 단위: 천 경상 미국 달러, 분류 HS22, 배포판 V202601

예: `#see/KOR/export?partner=CHN&year=2023&product=8542&compare=2022`

다른 서비스에서 연결할 때는 확인된 국가·방향·지원 품목을 이 규칙에 매핑한다. 지원하지 않는 연도·품목을 임의로 다른 기준으로 치환하지 않는다. Tradeweave는 해당 범위가 지원되지 않는다는 안내와 기본 범위 복구를 제공한다. 현재 Policyline·Trade Digest·Trade News Room 공개 연결과 방향별 정책 사례는 유지한다. PARALLEL은 사용자가 구현 전이라고 알려 공개 연결하지 않는다. 서비스 간 완전한 상호 전달을 적용할 때는 각 서비스가 받는 주소 규칙도 별도로 합의해야 한다.
