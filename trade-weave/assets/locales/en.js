/* English interface messages and short HS22 navigation labels. */
(function (root) {
  const data = {
    messages: {
      " · 교역 기록 또는 자료 없음": " · No trade record or data",
      " · 교역 기록 없음": " · No trade record",
      " 교역 기록 없음": " No trade record",
      " 금액 큰 순": " by trade value",
      " 비중 큰 순": " by share",
      " 순위 순": " by rank",
      " 이 축척에서 위치가 표시되지 않는 상대국이며, 표·합계·CSV에는 포함됩니다.":
        " This partner is not shown at this map scale; it remains included in tables, totals and CSV files.",
      " 합계 {0} · 상대국 {1}곳": " total {0} · {1} partners",
      "0.001% 미만": "Below 0.001%",
      "0.1% 미만": "Below 0.1%",
      "1% 미만": "Below 1%",
      "15개만 보기": "Show 15 only",
      "1위 비중": "Largest partner share",
      "1위 상대국 {0}의 비중은 {1}, 상위 5개국 합계는 {2}입니다.":
        "The largest partner, {0}, accounts for {1}; the top five together account for {2}.",
      "20% 이상": "20% or more",
      "2019년 일본의 대한국 수출규제 · 불화수소":
        "Japan's 2019 export restrictions on South Korea · hydrogen fluoride",
      "2022년 반도체 제조장비 수출통제":
        "2022 controls on semiconductor manufacturing equipment",
      "2024년 갈륨·게르마늄 대미 수출 금지":
        "2024 ban on gallium and germanium exports to the US",
      "2024년 중국산 전기차 관세":
        "2024 US tariffs on Chinese electric vehicles",
      "2025년 희토류 통제 · 영구자석 수입":
        "2025 rare earth controls · permanent magnet imports",
      "BACI가 만드는 값": "About BACI values",
      "BACI는 UN Comtrade에 신고된 수출국과 수입국의 값을 조정한 상품 교역 자료입니다. 정부 발표 통계와 수치가 다를 수 있습니다. 화면의 금액은 읽기 쉽게 달러·만 달러·억 달러로 표시하며, CSV는 원자료의 천 달러 단위로 제공합니다. 나라 쌍별 합계는 천 달러 단위 정수로 반올림되어 있습니다.":
        "BACI reconciles merchandise trade values reported by exporters and importers to UN Comtrade. Its figures may differ from national statistics. On-screen amounts use compact dollar units; CSV values are in thousands of US dollars. Bilateral totals are rounded to whole thousands of dollars.",
      "CEPII BACI 원자료": "CEPII BACI source data",
      "CEPII BACI 원자료·문서 ↗": "CEPII BACI data and documentation ↗",
      "Etalab Open Licence 2.0 · Natural Earth / world-atlas 2.0.2 · 정거원통 도법":
        "Etalab Open Licence 2.0 · Natural Earth / world-atlas 2.0.2 · Equirectangular projection",
      "HHI는 모든 상대국 비중(%)의 제곱을 더한 값으로 0~10,000 범위입니다. 값이 클수록 일부 상대국에 집중된 구조입니다.":
        "HHI sums the squares of all partner shares expressed as percentages, ranging from 0 to 10,000. A higher value indicates a more concentrated partner distribution.",
      "Policyline 정책 목록 ↗": "Policyline policy list ↗",
      "Policyline에서 정책 발표 전후의 품목별 월별 교역을 확인합니다.":
        "Use Policyline to examine monthly product-level trade before and after policy announcements.",
      "Trade Data Lab · Tradeweave — 국가별 교역 상대국과 집중도":
        "Trade Data Lab · Tradeweave — Trade partners and concentration",
      "Trade Digest 보고서 서가 ↗": "Trade Digest report library ↗",
      "Trade Digest에서 기관 보고서의 주장·근거·한계를 읽고, 여기서 본 국가의 교역 구조와 대조해 보세요.":
        "Read the claims, evidence and limitations of institutional reports in Trade Digest and compare them with this country's trade structure.",
      "Trade News Room 공부방 ↗": "Trade News Room learning space ↗",
      "Trade News Room에서 뉴스와 시뮬레이션으로 관세·공급망 등 무역 개념을 공부합니다.":
        "Explore tariffs, supply chains and other trade concepts through news and simulations in Trade News Room.",
      "Tradeweave · 분석 보고서": "Tradeweave · Analysis report",
      "Tradeweave 홈": "Tradeweave home",
      "{0} / {1}개 상대국 · 비중의 분모는 전체 {2}액":
        "{0} / {1} partners · Shares use total {2} as the denominator",
      "{0} / {1}곳 · 선택한 두 연도 전체 상대국 기준":
        "{0} / {1} partners · All partners in either selected year",
      "{0} {1} {2}에서 {3}의 비중": "{3}'s share of {0}'s {1} {2}",
      "{0} {1}에서 {2}의 비중 · {3}": "{2}'s share of {0}'s {1} · {3}",
      "{0} · {1} · {2} · 경상 미국 달러":
        "{0} · {1} · {2} · Current US dollars",
      "{0} · {1} · {2}년 / {3}년 비교": "{0} · {1} · {2} / {3} comparison",
      "{0} · {1} · {2}위": "{0} · {1} · Rank {2}",
      "{0} · {1}. 두 연도 모두 기록된 상대국 기준입니다.":
        "{0} · {1}. Partners recorded in both years only.",
      "{0} · {1}곳": "{0} · {1} partners",
      "{0} · {1}년": "{0} · {1}",
      "{0} · {1}년 · {2}": "{0} · {1} · {2}",
      "{0} · {1}의 교역 관계. 연결선은 실제 운송 경로가 아닙니다.":
        "Trade relationship: {0} · {1}. The line is not a transport route.",
      "{0} · 기준국": "{0} · Reporting country",
      "{0} · 기준국 비중 {1} · 상대국 비중 {2}":
        "{0} · Reporting-country share {1} · Partner-country share {2}",
      "{0} · 연간 {1}": "{0} · Annual {1}",
      "{0} → {1} · {2} · {3}년 (비교 {4}년) · {5}\n{6} · {7}\n원자료 SHA-256: {8}\n{9}":
        "{0} → {1} · {2} · {3} (reference {4}) · {5}\n{6} · {7}\nSource SHA-256: {8}\n{9}",
      "{0} → {1} · {2} · 각 연도의 상위 5개를 각각 합산합니다.":
        "{0} → {1} · {2} · Each year's top five are summed separately.",
      "{0} → {1} · {2}년 · {3} 교역에서 출발합니다.":
        "{0} → {1} · {2} · {3} trade context.",
      "{0} 교역액": "Trade with {0}",
      "{0} 교역액 {1}, 전체 교역액 {2} · 비중 {3}. 비중은 상대국 금액을 전체 금액으로 나눈 값입니다.":
        "Trade with {0}: {1}; total trade: {2}; share change: {3}. Share is partner trade divided by total trade.",
      "{0} 금액(천 달러)": "{0} value (thousand USD)",
      "{0} 비중 {1}, {2}위에서 {3}위, 교역액 {4}":
        "{0}: share {1}, rank {2} → {3}, trade value {4}",
      "{0} 비중(%)": "{0} share (%)",
      "{0} 상대국 {1}위": "Partner rank {1} · {0}",
      "{0} 상대국 상세를 표시했습니다.": "Showing details for partner {0}.",
      "{0} 이름": "{0} name",
      "{0} 천 달러": "{0} thousand USD",
      "{0}0.1{1} 미만": "{0}<0.1{1}",
      "{0}개 범위 · HS 2단위 산업군과 주요 4단위 품목":
        "{0} scopes · HS chapters and selected 4-digit headings",
      "{0}개 분석을 가져왔습니다. 중복 주소는 합치고 최근 30개까지 보관합니다.":
        "Imported {0} analyses. Duplicate URLs are merged; up to 30 recent analyses are retained.",
      "{0}곳": "{0} partners",
      "{0}곳 / {1}곳": "{0} / {1} partners",
      "{0}곳 / 비교 가능한 상대국 {1}곳": "{0} / {1} comparable partners",
      "{0}년": "{0}",
      "{0}년 {1}": "{0}: {1}",
      "{0}년 {1}{2}": "{0}: {1}{2}",
      "{0}년 · {1}": "{0} · {1}",
      "{0}년 · {1} {2}{3}": "{0} · {1} {2}{3}",
      "{0}년 · {1} · {2}": "{0} · {1} · {2}",
      "{0}년 · 비중 · 교역액 · 순위. 분모는 각 보고국의 해당 품목·방향 합계입니다.":
        "{0} · Share · Value · Rank. Each reporting country's total for this product scope and direction is the denominator.",
      "{0}년 금액": "{0} value",
      "{0}년 금액(천 달러)": "{0} value (thousand USD)",
      "{0}년 대비": "vs {0}",
      "{0}년 비교 자료를 불러오지 못했습니다. 선택연도 지도와 표는 계속 사용할 수 있습니다.":
        "Could not load {0} comparison data. The selected-year map and table remain available.",
      "{0}년 비교 자료를 준비하고 있습니다. 선택연도 지도와 표를 먼저 탐색하세요.":
        "Loading {0} comparison data. You can already explore the selected-year map and table.",
      "{0}년 비중": "{0} share",
      "{0}년 선택 · {1}": "Select {0} · {1}",
      "{0}달러": "US${0}",
      "{0}만 달러": "{0} × USD 10,000",
      "{0}억 달러": "{0} × USD 100 million",
      "{0}위": "Rank {0}",
      "{0}위 → {1}위 · {2}": "Rank {0} → {1} · {2}",
      "{0}의 {1} 상대국": "{0} · {1} by partner",
      "{0}의 {1} 상대국 · Tradeweave": "{0} · {1} by partner · Tradeweave",
      "{0}의 {1} 지도를 표시했습니다.": "Showing {0}'s {1} map.",
      "{0}의 {1}년 {2} {3} 상대국 지도. 상위 5개: {4}":
        "Partner map for {0}: {1} · {2} · {3}. Top five: {4}",
      "{0}의 {1}년 {2}에서 1위 상대국 {3}의 비중은 {4}, 상위 5개 상대국의 합계는 {5}입니다.":
        "In {0}'s {1} {2}, the largest partner {3} accounts for {4}; the top five account for {5}.",
      "← 지도로 돌아가기": "← Back to map",
      "← 홈 지도": "← Home map",
      "각 국가의 선택 범위 합계 = 각각 100% · 공통 색 구간 · 황토색 = 기준국":
        "Each country's scoped total = 100% · Shared color bands · Ochre = reporting country",
      "각 국가의 선택 품목·방향 합계가 각각 100%입니다. 지도는 모두 같은 색 구간을 사용합니다.":
        "Each country's total for the selected product scope and direction is 100%. All maps use the same color bands.",
      "각 열은 보고국의 해당 연도·품목·방향 합계를 분모로 씁니다. 색은 모든 열에 같은 비중 구간을 적용합니다.":
        "Each column uses the reporting country's total for the selected year, product scope and direction. Color bands are shared across columns.",
      감소: "Decrease",
      "같은 거래를 양쪽에서 보기": "View the same trade from both sides",
      "같은 거래액을 선택한 품목 범위의 두 나라 수출입액에 각각 나눈 비중입니다.":
        "The same trade value is divided by each country's respective export or import total for this product scope.",
      "같은 기준연도와 자료로 국가별 교역 상대국의 비중을 계산합니다.":
        "Partner shares are calculated using the same reference year and source data.",
      "같은 기준으로, 나란히": "Country comparison",
      "같은 비중 구간 · 이 지도의 분모는 {0}년 합계":
        "Shared share bands · This map uses the {0} total as its denominator",
      "같은 상대국의 두 시점 비교 · 미기록은 0으로 계산하지 않습니다.":
        "Two periods, the same partners · Missing records are not treated as zero",
      "같은 품목·방향의 관측값을 비교합니다. 변화의 원인을 뜻하지 않습니다.":
        "Compares observations for the same product scope and direction. Changes do not establish causes.",
      "거래액 변화(%)": "Trade value change (%)",
      "거래액 차이(천 달러)": "Trade value difference (thousand USD)",
      "검색 결과가 없습니다. 다른 이름이나 코드를 입력해 주세요.":
        "No results. Try a different name or code.",
      "검색 조건에 맞는 상대국이 없습니다.": "No partners match the search.",
      "검색 지우고 선택 상대국 보기": "Clear search and show selected partner",
      "결과 링크를 복사했습니다.": "Result link copied.",
      "결과 수출·수입 선택": "Select export or import results",
      "결과 주소를 선택해 복사하세요.": "Select and copy the result URL.",
      "결과 주소의 국가 코드나 경로를 확인해 주세요. 위 검색창에서 국가를 다시 선택할 수 있습니다.":
        "Check the country code or path in the URL. You can select a country using the search above.",
      "계산 안 함": "Not calculated",
      "공통 비중 구간: 1% 미만 · 1~5% · 5~10% · 10~20% · 20% 이상. 황토색은 기준국, 회색은 기록 없음입니다.":
        "Shared share bands: below 1% · 1–5% · 5–10% · 10–20% · 20% or more. Ochre marks the reporting country; gray marks missing records.",
      "관련 분석": "Related analysis",
      "관측값의 산술 비교이며 변화 원인을 뜻하지 않습니다.":
        "An arithmetic comparison of observations; it does not identify the causes of changes.",
      "관측된 변화 요약": "Observed changes",
      "관측한 사실과 다음에 확인할 질문을 적으세요.":
        "Record observed facts and questions to investigate next.",
      "교역 관계 표시": "Show trade relationship",
      "교역 관계를 선택해 보세요": "Select a trade relationship",
      "교역 구조가 궁금한 국가·지역을 찾아보세요.":
        "Find a country or territory to examine its trade structure.",
      "교역 기록 또는 자료 없음": "No trade record or data",
      "교역 기록 없음": "No trade record",
      "교역 방향": "Trade direction",
      "교역 분석": "Trade analysis",
      "교역 상대국": "Trade partners",
      "교역 상대국 비중과 집중도는 선택한 연도·품목의 상대국 분포를 나타냅니다. GDP 대비 무역 비중이나 공급 중단 시 손실을 판단하려면 각각에 맞는 자료와 분석이 필요합니다. 원인이나 정책 효과는 이 수치만으로 판정할 수 없습니다.":
        "Partner shares and concentration describe the distribution of partners for the selected year and product scope. Trade relative to GDP and potential supply-disruption losses require different data and analysis. These figures alone do not identify causes or policy effects.",
      "교역 상대국 지도": "Trade partner map",
      "교역 자료를 불러오지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.":
        "Could not load trade data. Check your connection and try again.",
      "교역 지도": "Trade map",
      "교역 지도 · 두 시점": "Trade maps · Two periods",
      "교역 지도를 불러오는 중입니다.": "Loading trade map.",
      "교역 집중도": "Trade concentration",
      교역액: "Trade value",
      "교역액 {0}": "Trade value {0}",
      "교역액 · 경상 달러": "Trade value · Current USD",
      "교역액 변화 큰 순": "Largest absolute value change",
      "교역액(천 달러)": "Trade value (thousand USD)",
      "교역액·비중 변화": "Trade value and share changes",
      "교역액과 전체 교역액의 변화": "Changes in partner and total trade",
      "구조 변화": "Structural change",
      "구조 변화 전체": "All structural changes",
      "국가 검색": "Country search",
      "국가 검색 · Tradeweave": "Country search · Tradeweave",
      "국가 비교": "Country comparison",
      "국가 비교 CSV": "Country comparison CSV",
      "국가 이름 또는 코드": "Country name or code",
      "국가 이름 또는 코드를 입력해 주세요.": "Enter a country name or code.",
      "국가 이름순": "Country name",
      "국가·지역": "Country or territory",
      "국가·지역 바꾸기": "Change country or territory",
      "국가·지역 코드": "Country and territory codes",
      "국가를 골라 데이터 보기 →": "Select a country to view data →",
      "국가를 확인해 주세요 · Tradeweave": "Check the country · Tradeweave",
      "국가별 교역 비교하기 →": "Compare countries →",
      "국가별 상대국 비교": "Partners across countries",
      "국가별 상품 교역 상대국과 교역 집중도를 지도에서 살펴봅니다. 기준연도 {0} · {1} · {2} · CEPII BACI.":
        "Explore merchandise trade partners and concentration by country. Year {0} · {1} · {2} · CEPII BACI.",
      "국가별 상품 교역 상대국과 교역 집중도를 지도와 데이터로 살펴봅니다. 출처: CEPII BACI.":
        "Explore country-level trade partners and concentration using maps and data. Source: CEPII BACI.",
      "국가의 크기는 지도상의 면적입니다. 파랑이 진할수록 선택한 연도·품목의 기준국 전체 수출 또는 수입에서 그 상대국의 비중이 큽니다. 수출과 수입에는 같은 색 구간을 사용합니다. 작은 지역 일부는 점으로 표시하며, 지도에 표시되지 않는 상대국도 전체 합계와 CSV에 포함합니다.":
        "Country size represents geographic area. Darker blue means a larger share of the reporting country's total exports or imports for the selected year and scope. Both directions share the same color bands. Some small territories appear as dots; unmapped partners remain included in totals and CSV files.",
      "근거 확인 →": "View evidence →",
      "금액 작은 순": "Lowest trade value",
      "금액 큰 순": "Highest trade value",
      "금액(천 달러)": "Value (thousand USD)",
      "금액(천 달러) · {0} · {1}년": "Value (thousand USD) · {0} · {1}",
      "금액·비중 변화 해석": "Value and share interpretation",
      "기관 보고서": "Institutional reports",
      "기록 상태": "Record status",
      "기록 없음": "No record",
      "기록 있음": "Recorded",
      "기록이 없는 거래의 바탕색에는 신고 누락 등 자료의 공백도 포함될 수 있습니다. 지도에 표시되지 않는 국가·지역의 거래도 분모와 CSV에 포함합니다. 기준연도와 다른 시기의 보고서를 읽을 때는 대상 기간도 확인해 주세요.":
        "The missing-record color can also reflect reporting gaps. Unmapped countries and territories are included in denominators and CSV files. Check coverage dates when consulting reports from other periods.",
      "기본 자료로 돌아가기": "Return to default data",
      기준국: "Reporting country",
      "기준국 · {0}": "Reporting country · {0}",
      "기준국 내 비중": "Share in reporting country",
      "기준국 분모(천 달러)": "Reporting-country denominator (thousand USD)",
      "기준국 비중(%)": "Reporting-country share (%)",
      "기준국 전체 교역액": "Reporting-country total trade",
      "기준국 코드": "Reporting-country code",
      "기준국·상대국 바꾸기": "Swap reporting country and partner",
      "기준국의 전체 수출 또는 수입에서 차지하는 비중":
        "Share of the reporting country's total exports or imports",
      기준연도: "Selected year",
      "기준연도 {0} · CEPII BACI": "Year {0} · CEPII BACI",
      "기준연도 {0} · {1} · {2}": "Year {0} · {1} · {2}",
      "낮아 비중이 내려갔습니다.": "lower, so the partner's share fell.",
      내보내기: "Export",
      "높아 비중이 올랐습니다.": "higher, so the partner's share rose.",
      "다시 불러오기": "Reload",
      다음: "Next",
      단위: "Unit",
      "대만은 BACI의 “Other Asia, nes”(코드 490, S19)를 대만으로 표시합니다. 다른 Trade Data Lab 서비스에서 사용하는 TWN 링크도 같은 결과로 연결합니다.":
        "Taiwan is displayed using BACI's “Other Asia, nes” (code 490, S19). TWN links used elsewhere in Trade Data Lab open the same result.",
      "대한민국 수출": "South Korea exports",
      "도착한 서가에서 보고서를 고른 뒤 대상 국가·연도·품목 범위를 확인하세요.":
        "Choose a report, then check its countries, years and product coverage.",
      "동일 상대국 비교": "Same-partner comparison",
      "동일 상대국 비교표": "Same-partner comparison table",
      "동일 상대국 전체 · 필터와 무관하게 모든 기록을 포함합니다.":
        "All partner rows · Includes every record regardless of filters.",
      "동일 품목·교역 방향의 연도별 자료":
        "Annual data for the same product scope and trade direction",
      "두 시점 비교": "Compare two periods",
      "두 시점 상대국 비교": "Two-period partner comparison",
      "두 시점 전체 CSV": "All two-period rows as CSV",
      "두 시점, 같은 상대국": "Two periods, the same partners",
      "두 연도 기록": "Recorded in both years",
      "두 연도 모두 교역 기록이 있는 상대국만 차이를 계산합니다. 신규·미기록은 별도로 표시합니다.":
        "Differences are calculated only for partners recorded in both years. Partners recorded in only one year are shown separately.",
      "두 연도 자료가 준비되고 선택 상대국과의 기록이 모두 있을 때 계산할 수 있습니다.":
        "Calculation requires both years' data and records for the selected partner in both years.",
      "두 연도의 전체 교역 기록이 있어야 비교할 수 있습니다.":
        "Both years need total trade records for this comparison.",
      라이선스: "Licence",
      "링크 복사 ↗": "Copy link ↗",
      "맥락 파일 저장": "Save context file",
      메모: "Note",
      "메모 닫기": "Close note",
      "메모 있음": "Note added",
      "메모 적용": "Apply note",
      "메모는 ‘분석 저장’을 눌렀을 때만 이 브라우저에 보관합니다. 보고서에도 함께 포함됩니다.":
        "Notes are stored in this browser only when you select Save analysis. They are also included in the report.",
      "모든 연도의 자료가 준비됐습니다.": "All years are ready.",
      "무역 학습": "Trade learning",
      "미리보기 · ": "Preview · ",
      미주: "Americas",
      "반대 방향 교역 보기": "View reverse trade direction",
      "반대 방향 교역을 선택하면 A와 B 사이의 수출·수입 방향이 바뀝니다. 기준국·상대국 바꾸기는 같은 거래를 상대국의 화면에서 살펴보는 기능입니다. 자료에 교역 기록이 없는 방향은 ‘기록 없음’으로 표시합니다.":
        "Reversing the direction switches exports and imports between A and B. Swapping countries views the same trade from the other side. Directions absent from the data are marked No record.",
      "반도체, 자동차, 85…": "Semiconductors, cars, 85…",
      "방금 삭제 취소": "Undo last deletion",
      "방법·출처": "Methods and sources",
      "방법·출처 · Tradeweave": "Methods and sources · Tradeweave",
      "백업 가져오기": "Import backup",
      "백업을 가져오지 못했습니다. Tradeweave 백업 JSON 형식·지원 국가/품목·파일 크기(1MB 이하)를 확인하세요. 기존 저장은 유지됩니다.":
        "Could not import the backup. Check the Tradeweave JSON format, supported countries and products, and the 1 MB limit. Existing saved analyses are unchanged.",
      범위: "Scope",
      "베트남 수입 집중도": "Vietnam import concentration",
      "베트남 수입 집중도 보기 →": "View Vietnam import concentration →",
      변화: "Change",
      "변화 방향": "Change direction",
      "변화 분석 CSV": "Structural change CSV",
      "변화 없음": "Unchanged",
      "변화 요약": "Change summary",
      보고국: "Reporting country",
      "보고국 코드": "Reporting-country code",
      "보고서 HTML 저장": "Save report HTML",
      "보고서 닫기": "Close report",
      "보고서에 남길 해석이나 질문을 적으세요.":
        "Add interpretations or questions to the report.",
      "복사할 분석 맥락": "Analysis context to copy",
      "본문으로 이동": "Skip to content",
      "분모 {0} · 황토색 = 기준국 · 바탕색 = 교역 기록 또는 자료 없음":
        "Denominator {0} · Ochre = reporting country · Background = no record or data",
      "분모 · {0} = 100%": "Denominator · {0} = 100%",
      "분모 · {0} {1}액 · {2}": "Denominator · {0} {1} · {2}",
      "분모(천 달러)": "Denominator (thousand USD)",
      "분모·정확한 금액·출처 보기": "Denominators, exact values and sources",
      "분석 맥락 복사": "Copy analysis context",
      "분석 메모": "Analysis note",
      "분석 백업 JSON": "Back up analyses as JSON",
      "분석 보고서": "Analysis report",
      "분석 보고서를 저장했습니다.": "Analysis report saved.",
      "분석 선택": "Choose an analysis",
      "분석 저장": "Save analysis",
      "분석 조건": "Analysis conditions",
      "분석 조건·메모·표시 설정을 복원했습니다.":
        "Analysis conditions, notes and view settings restored.",
      "분석 조건·출처·돌아올 주소를 복사했습니다.":
        "Analysis conditions, sources and return URL copied.",
      "분석 조건과 출처를 함께 가져가세요. 다른 서비스의 필터가 자동으로 적용되는 것은 아닙니다.":
        "Take the conditions and sources with you. Filters are not automatically applied in the destination service.",
      "분석을 저장하지 못했습니다. 링크 복사를 이용해 주세요.":
        "Could not save the analysis. Use Copy link instead.",
      "브라우저 저장 공간을 사용할 수 없습니다. 링크 복사를 이용해 주세요.":
        "Browser storage is unavailable. Use Copy link instead.",
      "비교 국가 1": "Comparison country 1",
      "비교 국가 2": "Comparison country 2",
      "비교 기록 없음": "No comparable record",
      "비교 자료 다시 불러오기": "Retry comparison data",
      "비교 자료 미준비": "Comparison data unavailable",
      "비교 자료를 기다리고 있습니다.": "Waiting for comparison data.",
      "비교 자료를 준비하고 있습니다.": "Preparing comparison data.",
      비교연도: "Reference year",
      "비교연도 금액(천 달러)": "Reference-year value (thousand USD)",
      "비교연도 기록 → 선택연도 미기록":
        "Reference year recorded → Selected year missing",
      "비교연도 미기록": "Reference year missing",
      "비교연도 미기록 → 선택연도 기록":
        "Reference year missing → Selected year recorded",
      "비교연도 비중(%)": "Reference-year share (%)",
      "비교연도 순위": "Reference-year rank",
      "비교연도 자료가 준비되면 구조 변화를 계산합니다.":
        "Structural changes will be calculated when reference-year data is ready.",
      "비교연도 자료가 준비되면 변화를 계산합니다.":
        "Changes will be calculated when reference-year data is ready.",
      비중: "Share",
      "비중 = 상대국 교역액 ÷ 기준국 전체 교역액 × 100. 변화율은 반올림 전 금액으로 계산합니다.":
        "Share = partner trade ÷ reporting-country total trade × 100. Growth rates use unrounded values.",
      "비중 · 각 보고국 합계 = 100%":
        "Share · Each reporting-country total = 100%",
      "비중 감소 상대국 없음": "No partners with decreasing shares",
      "비중 감소 순": "Largest share decrease",
      "비중 변화 해석": "Share change interpretation",
      "비중 변화(%p)": "Share change (pp)",
      "비중 변화가 큰 상대국": "Largest partner share changes",
      "비중 분모(천 달러)": "Share denominator (thousand USD)",
      "비중 증가 상대국 없음": "No partners with increasing shares",
      "비중 증가 순": "Largest share increase",
      "비중 차이": "Share difference",
      "비중 차이(%p)": "Share difference (pp)",
      "비중(%)": "Share (%)",
      "비중의 분모": "Share denominator",
      "비중의 분모 · {0}의 {1} {2}{3}": "Share denominator · {0}: {1} {2}{3}",
      "사용자 메모": "User note",
      삭제: "Delete",
      산업군: "Industry",
      "산업군 · HS 2단위": "Industry · HS chapter",
      "산업군 이름은 요약명입니다. 원자료의 같은 HS22 분류를 사용합니다.":
        "Industry names are short labels. All data use the same HS22 classification.",
      상대국: "Partner",
      "상대국 {0} 분모(천 달러)": "Partner {0} denominator (thousand USD)",
      "상대국 {0}곳의 CSV를 내려받았습니다.":
        "Downloaded CSV for {0} partners.",
      "상대국 {0}에서의 비중(%)": "Share of partner {0} (%)",
      "상대국 검색": "Search partners",
      "상대국 교역 기록 없음": "No trade record for this partner",
      "상대국 교역액": "Partner trade value",
      "상대국 교역액·비중은 비교할 기록이 없습니다.":
        "There are no comparable records for partner value and share.",
      "상대국 교역액과 기준국 전체 교역액의 변화율이 같아 비중이 유지됐습니다.":
        "Partner and total trade changed at the same rate, leaving the share unchanged.",
      "상대국 교역액의 변화율이 기준국 전체 교역액의 변화율보다 {0}":
        "Compared with overall trade, partner trade growth was {0}",
      "상대국 분모(천 달러)": "Partner-country denominator (thousand USD)",
      "상대국 비교 CSV": "Partner comparison CSV",
      "상대국 비중": "Partner share",
      "상대국 비중 {0}": "Partner share {0}",
      "상대국 비중 변화": "Partner share changes",
      "상대국 비중(%)": "Partner share (%)",
      "상대국 비중은 그 상대국과의 교역액을 기준국의 전체 수출액 또는 수입액으로 나눈 값입니다. 상대국별 금액 순서대로 상위 1개·3개·5개 비중을 더합니다. 화면의 숫자는 소수 첫째 자리로 반올림하며, 계산에는 반올림 전 비중을 사용합니다.":
        "Partner share divides trade with that partner by the reporting country's total exports or imports. CR1, CR3 and CR5 sum the largest one, three and five shares by value. Displayed figures are rounded to one decimal place; calculations use unrounded shares.",
      "상대국 상세": "Partner details",
      "상대국 상세 닫기": "Close partner details",
      "상대국 수": "Number of partners",
      "상대국 전체 CSV 내려받기": "Download all partners as CSV",
      "상대국 코드": "Partner code",
      "상대국별 {0}": "By partner: {0}",
      "상위 3개 합계": "Top-three total",
      "상위 5개 {0} · HHI {1}": "Top-five share {0} · HHI {1}",
      "상위 5개 {0} 상대국": "Top five partners · {0}",
      "상위 5개 비중": "Top-five share",
      "상위 5개 상대국": "Top five partners",
      "상위 5개 상대국의 쏠림": "Top-five concentration",
      "상위 5개 상대국의 합계": "Top-five total",
      "상위 5개 합계": "Top-five total",
      "상위 상대국에 집중된 정도를 실제 수입 데이터로 살펴봅니다.":
        "Examine concentration among the largest partners using actual import data.",
      "상품 전체, HS 2단위 산업군 {0}개와 주요 HS 4단위 품목 {1}개를 제공합니다. 4단위 목록은 주요 품목을 선별한 범위입니다.":
        "Includes all products, {0} HS chapters and {1} selected 4-digit headings. The 4-digit list is a selection, not complete coverage.",
      "색의 진하기 = 상대국 비중": "Darker color = larger partner share",
      "서비스마다 쓰는 품목 분류와 집계 범위가 다를 수 있습니다. 다른 서비스의 수치와 비교할 때 기준연도, HS 분류, 자료 버전, 분모를 함께 확인해 주세요.":
        "Services may use different classifications and aggregation scopes. Check years, HS versions, releases and denominators before comparing their figures.",
      "선택 상대국": "Selected partner",
      "선택 상대국 {0} · {1}": "Selected partner {0} · {1}",
      "선택 상대국 비중의 흐름": "Selected partner share over time",
      "선택 상대국 상세 ↑": "Selected partner details ↑",
      "선택 상대국 없음": "No partner selected",
      "선택 상대국 추이 · {0}": "Selected partner trend · {0}",
      "선택 상대국은 두 연도 중 하나에 기록이 없어 증감률을 계산하지 않습니다.":
        "The partner is missing in one of the two years, so its growth rate is not calculated.",
      "선택 상대국의 금액과 비중": "Selected partner value and share",
      "선택 상대국의 비교 가능한 교역 기록이 없습니다.":
        "No comparable records for the selected partner.",
      선택연도: "Selected year",
      "선택연도 금액(천 달러)": "Selected-year value (thousand USD)",
      "선택연도 미기록": "Selected year missing",
      "선택연도 비중 순": "Selected-year share",
      "선택연도 비중(%)": "Selected-year share (%)",
      "선택연도 상위 상대국": "Top partners in selected year",
      "선택연도 순위": "Selected-year rank",
      "선택연도 지도는 준비됐습니다. 비교 자료가 준비되면 변화 요약을 보여줍니다.":
        "The selected-year map is ready. Change summaries will appear when comparison data is ready.",
      "선택한 {0}은 이 방향의 교역 기록이 없습니다.":
        "There is no record for {0} in this direction.",
      "선택한 {0}이 검색 결과에 없습니다.":
        "Selected partner {0} is outside the search results.",
      "선택한 연도·품목 범위에서 A가 B로 수출한 거래액은 A의 전체 수출액으로 나누어 A 기준 비중을, B의 전체 수입액으로 나누어 B 기준 비중을 계산합니다. A의 수입 화면에서는 같은 방식으로 A의 전체 수입액과 B의 전체 수출액을 각각 분모로 씁니다. 상세 화면에 두 분모를 함께 표시하며, CSV에도 상대국 기준 분모와 비중을 제공합니다.":
        "For the selected year and product scope, A's exports to B are divided by A's total exports for A's share and B's total imports for B's share. On A's import view, the corresponding denominators are A's total imports and B's total exports. Details and CSV files include both denominators and shares.",
      "선택한 연도·품목 범위에서 기준국의 전체 수출액 또는 수입액을 100%로 놓습니다. 이 합계에는 CSV에 있는 모든 상대국을 포함합니다. 상위 1개·3개·5개 상대국 집중도는 금액이 큰 순서대로 비중을 더한 값입니다. HHI는 전체 상대국 비중(%)의 제곱을 더한 값으로, 값이 클수록 일부 상대국에 집중된 구조입니다.":
        "The reporting country's total exports or imports for the selected year and scope equal 100%, including all partners in the CSV. CR1, CR3 and CR5 sum the largest partner shares by value. HHI sums all squared percentage shares; higher values indicate greater concentration.",
      "선택한 연도·품목·방향 기준":
        "Selected year, product scope and direction",
      "선택한 연도·품목과 정책별 품목·기간을 함께 확인해 주세요.":
        "Check the selected year and scope against each policy's products and period.",
      "선택한 연도·품목의 교역 자료를 불러오는 중입니다.":
        "Loading trade data for the selected year and scope.",
      "선택한 연도·품목의 카타르 수출 구조를 확인하고, 출처가 포함된 상대국 전체 CSV를 내려받습니다.":
        "Examine Qatar's export structure for the selected year and scope, then download all partners with sources in CSV format.",
      "선택한 자료를 불러오지 못했습니다. 표시 중인 숫자는 이전 조건의 자료입니다. 다시 불러오기를 눌러 재시도해 주세요.":
        "Could not load the selected data. Displayed figures still use the previous conditions. Select Reload to retry.",
      "세 나라의 동일 상대국 비중·금액·순위를 나란히 살펴봅니다.":
        "Compare the same partners' shares, values and ranks across three countries.",
      세계: "World",
      "세계 전체 지도": "Whole world map",
      수입: "Imports",
      "수입 · 해외에서 구매": "Imports · Purchases from abroad",
      수출: "Exports",
      "수출 · 해외로 판매": "Exports · Sales abroad",
      순위: "Rank",
      "순위 · 각 보고국 내 순위": "Rank · Within each reporting country",
      "순위 변화 순": "Largest rank change",
      "순위·비중·집중도는 검색·정렬과 관계없이 전체 상대국 자료로 계산합니다. 지도에 표시되지 않는 상대국도 표와 CSV에 포함합니다.":
        "Ranks, shares and concentration always use all partner data, independently of search or sorting. Unmapped partners remain in tables and CSV files.",
      "신규·미기록 상대국": "Partners with one-year-only records",
      아시아: "Asia",
      아프리카: "Africa",
      "액 {0} = 100%": " value {0} = 100%",
      언어: "Language",
      "여러 국가가 검색됩니다. 목록에서 이름을 고르거나 국가 코드를 입력해 주세요.":
        "Several countries match. Select a name from the list or enter a country code.",
      "연결선은 선택한 교역 관계이며 실제 운송 경로가 아닙니다.":
        "The line shows a selected trade relationship, not a transport route.",
      연도: "Year",
      "연도 비교": "Year comparison",
      "연도 비교 CSV": "Year comparison CSV",
      "연도 비교 CSV를 내려받았습니다.": "Year comparison CSV downloaded.",
      "연도 비교는 같은 HS22 분류와 BACI 배포판에서 집계한 자료를 사용합니다. 금액은 경상 미국 달러 기준이며, 연도간 금액 변화에는 거래량·가격·환율 변화가 함께 반영될 수 있습니다. 두 비중의 차이는 %p로, 거래액의 증감률은 %로 표시합니다. 기록이 없는 상대국은 비교 계산에서 결측으로 처리합니다.":
        "Year comparisons use the same HS22 classification and BACI release. Values are in current US dollars; changes may reflect quantities, prices and exchange rates. Share differences are percentage points (pp), while value growth rates are percentages. Missing partner records are excluded from comparison calculations.",
      "연도 추이": "Annual trends",
      "연도·품목을 다시 선택해 주세요.":
        "Select the year and product scope again.",
      "연도와 품목 범위": "Year and product scope",
      오세아니아: "Oceania",
      "원자료 SHA-256: {0}": "Source SHA-256: {0}",
      "원자료 단위": "Source unit",
      "원자료 단위 · {0} · {1}": "Source unit · {0} · {1}",
      "원자료 링크": "Source data link",
      유럽: "Europe",
      "이 국가 자세히 보기 →": "View country details →",
      "이 방향의 교역 기록이 없습니다.": "No trade records for this direction.",
      "이 방향의 교역 기록이 자료에 없습니다. 반대 방향 교역이나 다른 상대국을 선택해 보세요.":
        "No trade record in this direction. Try the reverse direction or another partner.",
      "이 분석에 남길 메모": "Note for this analysis",
      "이 브라우저에 분석을 저장했습니다.": "Analysis saved in this browser.",
      "이 브라우저에만 보관합니다. 항목은 이름을 바꾸거나 삭제할 수 있습니다.":
        "Stored only in this browser. Rename or delete any entry.",
      "이 연도·품목·방향의 교역 기록이 없습니다.":
        "No trade records for this year, scope and direction.",
      "이 연도·품목의 베트남 수입 기록이 없습니다.":
        "No Vietnam import records for this year and scope.",
      "이 연도·품목의 한국 수출 기록이 없습니다.":
        "No South Korea export records for this year and scope.",
      "이 품목·방향의 교역 기록 없음":
        "No trade records for this scope and direction",
      "이름 변경": "Rename",
      "이미지를 만들지 못했습니다. 인쇄 또는 CSV를 이용해 주세요.":
        "Could not create the image. Use Print or CSV instead.",
      이전: "Previous",
      "이전 저장 항목 · 자료 버전 미지정":
        "Legacy entry · Data version unspecified",
      인쇄: "Print",
      "일치하는 국가를 찾지 못했습니다. 국가 이름이나 코드를 확인해 주세요.":
        "No matching country. Check the country name or code.",
      "일치하는 품목이 없습니다. 산업군 이름이나 HS 코드로 검색해 주세요.":
        "No matching product. Search by industry name or HS code.",
      "자료 미준비": "Data unavailable",
      "자료 버전": "Data release",
      "자료 범위": "Data coverage",
      "자료 범위·라이선스·계산 방법": "Coverage, licence and methods",
      "자료 불러오기 실패": "Data loading failed",
      "자료 없음": "No data",
      "자료 준비 중": "Preparing data",
      "자료가 준비되면 비교지표를 표시합니다.":
        "Comparison indicators will appear when the data is ready.",
      "자료를 불러오는 중입니다.": "Loading data.",
      "자료를 불러오지 못했습니다.": "Could not load data.",
      "자료의 범위와 계산 방법": "Data coverage and calculation methods",
      "저장 기준 · {0} · SHA-256 {1}…": "Saved release · {0} · SHA-256 {1}…",
      "저장 당시 자료 버전과 현재 자료가 다릅니다. 아래 ‘현재 자료로 다시 분석’을 선택하면 현재 자료로 조건과 메모를 복원합니다.":
        "The saved release differs from the current one. Select Reanalyze with current data below to restore its conditions and notes using the current data.",
      "저장 당시 자료와 현재 배포판이 다릅니다. 이전 배포판의 수치를 자동 복원하지 않습니다.":
        "The saved release differs from the current one. Values from the earlier release are not automatically restored.",
      "저장한 분석": "Saved analyses",
      "저장한 분석 닫기": "Close saved analyses",
      "저장한 분석을 갱신했습니다.": "Saved analysis updated.",
      "저장한 분석이 없습니다. 결과 화면에서 ‘분석 저장’을 눌러 보세요.":
        "No saved analyses. Select Save analysis on a result page.",
      전체: "All",
      "전체 {0} = 100%": "Total {0} = 100%",
      "전체 교역 상대국 표": "All trade partners table",
      "전체 보고서는 모든 연도 자료가 준비된 뒤 저장할 수 있습니다.":
        "The full report can be saved once all years are ready.",
      "전체 상대국": "All partners",
      "전체 상대국 CR5 {0} · HHI {1}": "All-partner CR5 {0} · HHI {1}",
      "전체 상대국 집중도(HHI)": "All-partner concentration (HHI)",
      "전체 상대국 펼치기": "Show all partners",
      "전체 상품": "All products",
      "전체 펼치기": "Show all",
      정렬: "Sort",
      "정렬 기준": "Sort by",
      "정책·월별 교역": "Policy and monthly trade",
      "제공 연도": "Available years",
      "조건에 맞는 상대국이 없습니다.": "No partners match these conditions.",
      "좌우가 평행한 정거원통 도법을 사용합니다. 위도·경도를 일정한 간격으로 펼친 평면 지도입니다. 면적을 비교할 때는 도법에 따른 차이가 있으므로 비중을 나타내는 색과 숫자를 함께 읽어 주세요. 지도의 깊이와 그림자는 시각 효과이며 통계값을 나타내지 않습니다.":
        "The map uses an equirectangular projection with straight sides and uniform latitude/longitude spacing. Geographic areas are distorted by projection, so use the share colors and values for trade comparisons. Depth and shadows are visual effects, not statistics.",
      "주 메뉴": "Main navigation",
      "주소의 상대국 코드를 확인해 주세요. 첫 번째 상대국을 표시했습니다.":
        "Check the partner code in the URL. The largest partner is shown instead.",
      "주요 품목": "Selected products",
      "주요 품목 · HS 4단위": "Selected products · HS 4-digit headings",
      증가: "Increase",
      "지도 PNG": "Map PNG",
      "지도 · Natural Earth via world-atlas 2.0.2 · 정거원통 도법":
        "Map · Natural Earth via world-atlas 2.0.2 · Equirectangular projection",
      "지도 보기": "Show map",
      "지도 읽기": "Reading the map",
      "지도 지역": "Map region",
      "지도 축소": "Zoom out",
      "지도 확대": "Zoom in",
      "지도, 연도별 수치, 구조 변화 전체 표, 동일 상대국 비교표, 출처를 하나의 HTML 파일에 담습니다. 저장한 파일을 브라우저에서 열어 인쇄하거나 PDF로 저장할 수 있습니다.":
        "Save maps, annual values, all structural changes, the same-partner comparison and sources in a single HTML file. Open it in a browser to print or save as PDF.",
      "지도: {0} · {1}": "Map: {0} · {1}",
      "지도·금액·비중을 같은 상대국 순서로":
        "Maps, values and shares aligned by partner",
      "지도·목록을 가리켜 함께 확인하세요.":
        "Point to a map or list item to highlight the same country.",
      "지도에서 상대국을 선택하면 비중과 금액을 확인할 수 있습니다.":
        "Select a partner on the map to view its share and value.",
      "지도의 비중과 색 읽기": "Reading shares and colors",
      "지원하는 연도·품목을 확인해 주세요. 제공 연도는 {0}년입니다.":
        "Check the supported years and scopes. Available years: {0}.",
      "집중도 계산 방법": "Concentration calculation",
      "집중도·전체 데이터 보기 →": "Concentration and full data →",
      차이: "Difference",
      "최소 절대 변화량 (%p)": "Minimum absolute change (pp)",
      출처: "Source",
      "출처 · {0} · {1} · {2}년 · {3} · 교역액은 경상 달러 기준":
        "Source · {0} · {1} · {2} · {3} · Current USD",
      "출처 · {0} · {1} · 기준연도 {2} · {3}":
        "Source · {0} · {1} · Year {2} · {3}",
      "출처를 포함한 PNG를 저장했습니다.": "PNG saved with sources.",
      "출처를 포함한 지도 이미지를 만드는 중입니다.":
        "Preparing the map image with sources.",
      "출처와 내려받기": "Sources and downloads",
      "출처와 재현 정보": "Sources and reproducibility",
      "카타르 교역 자료": "Qatar trade data",
      "카타르 데이터 확인하기 →": "View Qatar data →",
      "탐색 질문": "Analysis examples",
      "테두리는 선택한 상대국입니다. 지도나 표에서 상대국을 고르면 상세가 바뀝니다.":
        "The outlined country is the selected partner. Select a partner on the map or in the table to update details.",
      "페이지로 보기": "Use pages",
      "표시 지표": "Display metric",
      "표의 검색·정렬은 표시 순서와 대상을 바꾸며, 원래 순위·분모·집중도는 전체 상대국 기준으로 계산합니다.":
        "Search and sorting change the displayed rows and order. Original ranks, denominators and concentration always use all partners.",
      품목: "Product",
      "품목 범위": "Product scope",
      "품목 분류·자료 버전": "Classification and data release",
      "품목 이름·HS 코드": "Product name or HS code",
      "품목 탐색": "Product explorer",
      "품목 탐색 ↗": "Find product ↗",
      "품목 탐색 닫기": "Close product explorer",
      "핀은 대표 위치, 연결선은 선택한 교역 관계입니다. 실제 운송 경로를 뜻하지 않습니다.":
        "Pins show representative locations; lines show selected trade relationships, not transport routes.",
      "핀은 지도상의 대표 위치입니다. 연결선은 선택한 교역 관계이며 실제 운송 경로가 아닙니다.":
        "Pins mark representative locations. Lines show selected trade relationships, not actual transport routes.",
      "한 연도라도 기록이 없으면 차이를 계산하지 않습니다.":
        "Differences are not calculated when either year lacks a record.",
      "한국 수출 지도 보기 →": "View South Korea export map →",
      "한국, Korea, KOR": "Korea, KOR",
      "한국어·영어 이름 또는 국가 코드로 검색하세요.":
        "Search by Korean or English name, or country code.",
      "한국의 실제 수출 상대국과 상위 5개국 비중을 확인합니다.":
        "View South Korea's actual export partners and their top-five share.",
      "합계 {0} · 상위 5개 {1}": "Total {0} · Top five {1}",
      "해석할 때 확인할 점": "Interpretation limits",
      "현재 분석에 메모를 적용했습니다. 분석 저장을 누르면 이 브라우저에 보관됩니다.":
        "Note applied to this analysis. Select Save analysis to keep it in this browser.",
      "현재 자료로 다시 분석": "Reanalyze with current data",
      "홈 지도 수출·수입 선택": "Select exports or imports on the home map",
      "황토색은 기준국 · 바탕색은 교역 기록 또는 자료 없음":
        "Ochre = reporting country · Background = no trade record or data",
      "회원가입 없이 이용합니다. 직접 저장한 분석 조건은 이 브라우저에만 보관하며 서버로 전송하지 않습니다.":
        "No account is required. Analyses you explicitly save stay in this browser and are not sent to a server.",
      흐름: "Direction",
      "CEPII BACI (Gaulier & Zignago, 2010), UN Comtrade 기반":
        "CEPII BACI (Gaulier & Zignago, 2010), based on UN Comtrade",
      "천 미국 달러(경상)": "Thousand current US dollars",
      "나라 쌍별 합계를 천 달러 정수로 반올림. 반올림 후 0인 값은 제외.":
        "Bilateral totals are rounded to whole thousands of USD; values rounded to zero are excluded.",
      "x=수출, m=수입. 대만은 Other Asia, nes(S19). 기록 없음과 실제 0을 구분해 해석해야 합니다.":
        "x=exports, m=imports. Taiwan uses Other Asia, nes (S19). Missing records must not be interpreted as observed zeros.",
    },
    products: {
      all: {
        label: "All products",
        scope: "All products",
        description: "Annual trade value summed over all recorded merchandise.",
      },
      "01": {
        label: "Live animals",
        scope: "Live animals · HS 01",
        description:
          "Annual total for all products in HS22 chapter 01. The industry name is a short navigation label.",
      },
      "02": {
        label: "Meat",
        scope: "Meat · HS 02",
        description:
          "Annual total for all products in HS22 chapter 02. The industry name is a short navigation label.",
      },
      "03": {
        label: "Fish and seafood",
        scope: "Fish and seafood · HS 03",
        description:
          "Annual total for all products in HS22 chapter 03. The industry name is a short navigation label.",
      },
      "04": {
        label: "Dairy products, eggs and honey",
        scope: "Dairy products, eggs and honey · HS 04",
        description:
          "Annual total for all products in HS22 chapter 04. The industry name is a short navigation label.",
      },
      "05": {
        label: "Other animal products",
        scope: "Other animal products · HS 05",
        description:
          "Annual total for all products in HS22 chapter 05. The industry name is a short navigation label.",
      },
      "06": {
        label: "Live plants and flowers",
        scope: "Live plants and flowers · HS 06",
        description:
          "Annual total for all products in HS22 chapter 06. The industry name is a short navigation label.",
      },
      "07": {
        label: "Vegetables",
        scope: "Vegetables · HS 07",
        description:
          "Annual total for all products in HS22 chapter 07. The industry name is a short navigation label.",
      },
      "08": {
        label: "Fruit and nuts",
        scope: "Fruit and nuts · HS 08",
        description:
          "Annual total for all products in HS22 chapter 08. The industry name is a short navigation label.",
      },
      "09": {
        label: "Coffee, tea and spices",
        scope: "Coffee, tea and spices · HS 09",
        description:
          "Annual total for all products in HS22 chapter 09. The industry name is a short navigation label.",
      },
      10: {
        label: "Cereals",
        scope: "Cereals · HS 10",
        description:
          "Annual total for all products in HS22 chapter 10. The industry name is a short navigation label.",
      },
      11: {
        label: "Milling products and starches",
        scope: "Milling products and starches · HS 11",
        description:
          "Annual total for all products in HS22 chapter 11. The industry name is a short navigation label.",
      },
      12: {
        label: "Seeds and oil crops",
        scope: "Seeds and oil crops · HS 12",
        description:
          "Annual total for all products in HS22 chapter 12. The industry name is a short navigation label.",
      },
      13: {
        label: "Vegetable saps and extracts",
        scope: "Vegetable saps and extracts · HS 13",
        description:
          "Annual total for all products in HS22 chapter 13. The industry name is a short navigation label.",
      },
      14: {
        label: "Other vegetable materials",
        scope: "Other vegetable materials · HS 14",
        description:
          "Annual total for all products in HS22 chapter 14. The industry name is a short navigation label.",
      },
      15: {
        label: "Animal and vegetable fats and oils",
        scope: "Animal and vegetable fats and oils · HS 15",
        description:
          "Annual total for all products in HS22 chapter 15. The industry name is a short navigation label.",
      },
      16: {
        label: "Prepared meat and seafood",
        scope: "Prepared meat and seafood · HS 16",
        description:
          "Annual total for all products in HS22 chapter 16. The industry name is a short navigation label.",
      },
      17: {
        label: "Sugars and confectionery",
        scope: "Sugars and confectionery · HS 17",
        description:
          "Annual total for all products in HS22 chapter 17. The industry name is a short navigation label.",
      },
      18: {
        label: "Cocoa and preparations",
        scope: "Cocoa and preparations · HS 18",
        description:
          "Annual total for all products in HS22 chapter 18. The industry name is a short navigation label.",
      },
      19: {
        label: "Cereal, starch and milk preparations",
        scope: "Cereal, starch and milk preparations · HS 19",
        description:
          "Annual total for all products in HS22 chapter 19. The industry name is a short navigation label.",
      },
      20: {
        label: "Prepared vegetables and fruit",
        scope: "Prepared vegetables and fruit · HS 20",
        description:
          "Annual total for all products in HS22 chapter 20. The industry name is a short navigation label.",
      },
      21: {
        label: "Other food preparations",
        scope: "Other food preparations · HS 21",
        description:
          "Annual total for all products in HS22 chapter 21. The industry name is a short navigation label.",
      },
      22: {
        label: "Beverages, spirits and vinegar",
        scope: "Beverages, spirits and vinegar · HS 22",
        description:
          "Annual total for all products in HS22 chapter 22. The industry name is a short navigation label.",
      },
      23: {
        label: "Food residues and animal feed",
        scope: "Food residues and animal feed · HS 23",
        description:
          "Annual total for all products in HS22 chapter 23. The industry name is a short navigation label.",
      },
      24: {
        label: "Tobacco and related products",
        scope: "Tobacco and related products · HS 24",
        description:
          "Annual total for all products in HS22 chapter 24. The industry name is a short navigation label.",
      },
      25: {
        label: "Salt, sulphur, earths and stone",
        scope: "Salt, sulphur, earths and stone · HS 25",
        description:
          "Annual total for all products in HS22 chapter 25. The industry name is a short navigation label.",
      },
      26: {
        label: "Ores, slag and ash",
        scope: "Ores, slag and ash · HS 26",
        description:
          "Annual total for all products in HS22 chapter 26. The industry name is a short navigation label.",
      },
      27: {
        label: "Mineral fuels and related products",
        scope: "Mineral fuels and related products · HS 27",
        description:
          "All of HS 27: coal, petroleum, gas and their preparations, bituminous substances, mineral waxes and electrical energy.",
      },
      28: {
        label: "Inorganic chemicals",
        scope: "Inorganic chemicals · HS 28",
        description:
          "Annual total for all products in HS22 chapter 28. The industry name is a short navigation label.",
      },
      29: {
        label: "Organic chemicals",
        scope: "Organic chemicals · HS 29",
        description:
          "Annual total for all products in HS22 chapter 29. The industry name is a short navigation label.",
      },
      30: {
        label: "Pharmaceutical products",
        scope: "Pharmaceutical products · HS 30",
        description:
          "Annual total for all products in HS22 chapter 30. The industry name is a short navigation label.",
      },
      31: {
        label: "Fertilizers",
        scope: "Fertilizers · HS 31",
        description:
          "Annual total for all products in HS22 chapter 31. The industry name is a short navigation label.",
      },
      32: {
        label: "Dyes, pigments, paints and inks",
        scope: "Dyes, pigments, paints and inks · HS 32",
        description:
          "Annual total for all products in HS22 chapter 32. The industry name is a short navigation label.",
      },
      33: {
        label: "Essential oils and cosmetics",
        scope: "Essential oils and cosmetics · HS 33",
        description:
          "Annual total for all products in HS22 chapter 33. The industry name is a short navigation label.",
      },
      34: {
        label: "Soap, detergents and waxes",
        scope: "Soap, detergents and waxes · HS 34",
        description:
          "Annual total for all products in HS22 chapter 34. The industry name is a short navigation label.",
      },
      35: {
        label: "Proteins, modified starches and enzymes",
        scope: "Proteins, modified starches and enzymes · HS 35",
        description:
          "Annual total for all products in HS22 chapter 35. The industry name is a short navigation label.",
      },
      36: {
        label: "Explosives, matches and pyrotechnics",
        scope: "Explosives, matches and pyrotechnics · HS 36",
        description:
          "Annual total for all products in HS22 chapter 36. The industry name is a short navigation label.",
      },
      37: {
        label: "Photographic and cinematographic goods",
        scope: "Photographic and cinematographic goods · HS 37",
        description:
          "Annual total for all products in HS22 chapter 37. The industry name is a short navigation label.",
      },
      38: {
        label: "Other chemical products",
        scope: "Other chemical products · HS 38",
        description:
          "Annual total for all products in HS22 chapter 38. The industry name is a short navigation label.",
      },
      39: {
        label: "Plastics and articles",
        scope: "Plastics and articles · HS 39",
        description:
          "Annual total for all products in HS22 chapter 39. The industry name is a short navigation label.",
      },
      40: {
        label: "Rubber and articles",
        scope: "Rubber and articles · HS 40",
        description:
          "Annual total for all products in HS22 chapter 40. The industry name is a short navigation label.",
      },
      41: {
        label: "Raw hides, skins and leather",
        scope: "Raw hides, skins and leather · HS 41",
        description:
          "Annual total for all products in HS22 chapter 41. The industry name is a short navigation label.",
      },
      42: {
        label: "Leather goods and travel goods",
        scope: "Leather goods and travel goods · HS 42",
        description:
          "Annual total for all products in HS22 chapter 42. The industry name is a short navigation label.",
      },
      43: {
        label: "Furskins and articles",
        scope: "Furskins and articles · HS 43",
        description:
          "Annual total for all products in HS22 chapter 43. The industry name is a short navigation label.",
      },
      44: {
        label: "Wood and articles",
        scope: "Wood and articles · HS 44",
        description:
          "Annual total for all products in HS22 chapter 44. The industry name is a short navigation label.",
      },
      45: {
        label: "Cork and articles",
        scope: "Cork and articles · HS 45",
        description:
          "Annual total for all products in HS22 chapter 45. The industry name is a short navigation label.",
      },
      46: {
        label: "Plaiting materials and basketware",
        scope: "Plaiting materials and basketware · HS 46",
        description:
          "Annual total for all products in HS22 chapter 46. The industry name is a short navigation label.",
      },
      47: {
        label: "Pulp and recovered paper",
        scope: "Pulp and recovered paper · HS 47",
        description:
          "Annual total for all products in HS22 chapter 47. The industry name is a short navigation label.",
      },
      48: {
        label: "Paper, paperboard and articles",
        scope: "Paper, paperboard and articles · HS 48",
        description:
          "Annual total for all products in HS22 chapter 48. The industry name is a short navigation label.",
      },
      49: {
        label: "Printed matter",
        scope: "Printed matter · HS 49",
        description:
          "Annual total for all products in HS22 chapter 49. The industry name is a short navigation label.",
      },
      50: {
        label: "Silk",
        scope: "Silk · HS 50",
        description:
          "Annual total for all products in HS22 chapter 50. The industry name is a short navigation label.",
      },
      51: {
        label: "Wool and animal hair",
        scope: "Wool and animal hair · HS 51",
        description:
          "Annual total for all products in HS22 chapter 51. The industry name is a short navigation label.",
      },
      52: {
        label: "Cotton",
        scope: "Cotton · HS 52",
        description:
          "Annual total for all products in HS22 chapter 52. The industry name is a short navigation label.",
      },
      53: {
        label: "Other vegetable textile fibres",
        scope: "Other vegetable textile fibres · HS 53",
        description:
          "Annual total for all products in HS22 chapter 53. The industry name is a short navigation label.",
      },
      54: {
        label: "Man-made filaments",
        scope: "Man-made filaments · HS 54",
        description:
          "Annual total for all products in HS22 chapter 54. The industry name is a short navigation label.",
      },
      55: {
        label: "Man-made staple fibres",
        scope: "Man-made staple fibres · HS 55",
        description:
          "Annual total for all products in HS22 chapter 55. The industry name is a short navigation label.",
      },
      56: {
        label: "Nonwovens, special yarns and ropes",
        scope: "Nonwovens, special yarns and ropes · HS 56",
        description:
          "Annual total for all products in HS22 chapter 56. The industry name is a short navigation label.",
      },
      57: {
        label: "Carpets and textile floor coverings",
        scope: "Carpets and textile floor coverings · HS 57",
        description:
          "Annual total for all products in HS22 chapter 57. The industry name is a short navigation label.",
      },
      58: {
        label: "Special woven fabrics and embroidery",
        scope: "Special woven fabrics and embroidery · HS 58",
        description:
          "Annual total for all products in HS22 chapter 58. The industry name is a short navigation label.",
      },
      59: {
        label: "Coated and laminated textile fabrics",
        scope: "Coated and laminated textile fabrics · HS 59",
        description:
          "Annual total for all products in HS22 chapter 59. The industry name is a short navigation label.",
      },
      60: {
        label: "Knitted and crocheted fabrics",
        scope: "Knitted and crocheted fabrics · HS 60",
        description:
          "Annual total for all products in HS22 chapter 60. The industry name is a short navigation label.",
      },
      61: {
        label: "Knitted or crocheted apparel",
        scope: "Knitted or crocheted apparel · HS 61",
        description:
          "Annual total for all products in HS22 chapter 61. The industry name is a short navigation label.",
      },
      62: {
        label: "Other apparel",
        scope: "Other apparel · HS 62",
        description:
          "Annual total for all products in HS22 chapter 62. The industry name is a short navigation label.",
      },
      63: {
        label: "Other made-up textile articles",
        scope: "Other made-up textile articles · HS 63",
        description:
          "Annual total for all products in HS22 chapter 63. The industry name is a short navigation label.",
      },
      64: {
        label: "Footwear",
        scope: "Footwear · HS 64",
        description:
          "Annual total for all products in HS22 chapter 64. The industry name is a short navigation label.",
      },
      65: {
        label: "Headgear",
        scope: "Headgear · HS 65",
        description:
          "Annual total for all products in HS22 chapter 65. The industry name is a short navigation label.",
      },
      66: {
        label: "Umbrellas and walking sticks",
        scope: "Umbrellas and walking sticks · HS 66",
        description:
          "Annual total for all products in HS22 chapter 66. The industry name is a short navigation label.",
      },
      67: {
        label: "Feathers, artificial flowers and wigs",
        scope: "Feathers, artificial flowers and wigs · HS 67",
        description:
          "Annual total for all products in HS22 chapter 67. The industry name is a short navigation label.",
      },
      68: {
        label: "Stone and cement articles",
        scope: "Stone and cement articles · HS 68",
        description:
          "Annual total for all products in HS22 chapter 68. The industry name is a short navigation label.",
      },
      69: {
        label: "Ceramic products",
        scope: "Ceramic products · HS 69",
        description:
          "Annual total for all products in HS22 chapter 69. The industry name is a short navigation label.",
      },
      70: {
        label: "Glass and articles",
        scope: "Glass and articles · HS 70",
        description:
          "Annual total for all products in HS22 chapter 70. The industry name is a short navigation label.",
      },
      71: {
        label: "Precious metals, stones and jewellery",
        scope: "Precious metals, stones and jewellery · HS 71",
        description:
          "Annual total for all products in HS22 chapter 71. The industry name is a short navigation label.",
      },
      72: {
        label: "Iron and steel",
        scope: "Iron and steel · HS 72",
        description:
          "Annual total for all products in HS22 chapter 72. The industry name is a short navigation label.",
      },
      73: {
        label: "Articles of iron or steel",
        scope: "Articles of iron or steel · HS 73",
        description:
          "Annual total for all products in HS22 chapter 73. The industry name is a short navigation label.",
      },
      74: {
        label: "Copper and articles",
        scope: "Copper and articles · HS 74",
        description:
          "Annual total for all products in HS22 chapter 74. The industry name is a short navigation label.",
      },
      75: {
        label: "Nickel and articles",
        scope: "Nickel and articles · HS 75",
        description:
          "Annual total for all products in HS22 chapter 75. The industry name is a short navigation label.",
      },
      76: {
        label: "Aluminium and articles",
        scope: "Aluminium and articles · HS 76",
        description:
          "Annual total for all products in HS22 chapter 76. The industry name is a short navigation label.",
      },
      78: {
        label: "Lead and articles",
        scope: "Lead and articles · HS 78",
        description:
          "Annual total for all products in HS22 chapter 78. The industry name is a short navigation label.",
      },
      79: {
        label: "Zinc and articles",
        scope: "Zinc and articles · HS 79",
        description:
          "Annual total for all products in HS22 chapter 79. The industry name is a short navigation label.",
      },
      80: {
        label: "Tin and articles",
        scope: "Tin and articles · HS 80",
        description:
          "Annual total for all products in HS22 chapter 80. The industry name is a short navigation label.",
      },
      81: {
        label: "Other base metals",
        scope: "Other base metals · HS 81",
        description:
          "Annual total for all products in HS22 chapter 81. The industry name is a short navigation label.",
      },
      82: {
        label: "Tools and cutlery",
        scope: "Tools and cutlery · HS 82",
        description:
          "Annual total for all products in HS22 chapter 82. The industry name is a short navigation label.",
      },
      83: {
        label: "Miscellaneous base-metal articles",
        scope: "Miscellaneous base-metal articles · HS 83",
        description:
          "Annual total for all products in HS22 chapter 83. The industry name is a short navigation label.",
      },
      84: {
        label: "Machinery and mechanical appliances",
        scope: "Machinery and mechanical appliances · HS 84",
        description:
          "Annual total for all products in HS22 chapter 84. The industry name is a short navigation label.",
      },
      85: {
        label: "Electrical machinery and equipment",
        scope: "Electrical machinery and equipment · HS 85",
        description:
          "Annual total for all products in HS22 chapter 85. The industry name is a short navigation label.",
      },
      86: {
        label: "Railway vehicles and equipment",
        scope: "Railway vehicles and equipment · HS 86",
        description:
          "Annual total for all products in HS22 chapter 86. The industry name is a short navigation label.",
      },
      87: {
        label: "Motor vehicles",
        scope: "Motor vehicles · HS 87",
        description:
          "Annual total for all products in HS22 chapter 87. The industry name is a short navigation label.",
      },
      88: {
        label: "Aircraft and spacecraft",
        scope: "Aircraft and spacecraft · HS 88",
        description:
          "Annual total for all products in HS22 chapter 88. The industry name is a short navigation label.",
      },
      89: {
        label: "Ships and boats",
        scope: "Ships and boats · HS 89",
        description:
          "Annual total for all products in HS22 chapter 89. The industry name is a short navigation label.",
      },
      90: {
        label: "Optical, precision and medical instruments",
        scope: "Optical, precision and medical instruments · HS 90",
        description:
          "Annual total for all products in HS22 chapter 90. The industry name is a short navigation label.",
      },
      91: {
        label: "Clocks and watches",
        scope: "Clocks and watches · HS 91",
        description:
          "Annual total for all products in HS22 chapter 91. The industry name is a short navigation label.",
      },
      92: {
        label: "Musical instruments",
        scope: "Musical instruments · HS 92",
        description:
          "Annual total for all products in HS22 chapter 92. The industry name is a short navigation label.",
      },
      93: {
        label: "Arms and ammunition",
        scope: "Arms and ammunition · HS 93",
        description:
          "Annual total for all products in HS22 chapter 93. The industry name is a short navigation label.",
      },
      94: {
        label: "Furniture, lighting and prefabricated buildings",
        scope: "Furniture, lighting and prefabricated buildings · HS 94",
        description:
          "Annual total for all products in HS22 chapter 94. The industry name is a short navigation label.",
      },
      95: {
        label: "Toys, games and sports equipment",
        scope: "Toys, games and sports equipment · HS 95",
        description:
          "Annual total for all products in HS22 chapter 95. The industry name is a short navigation label.",
      },
      96: {
        label: "Miscellaneous manufactured articles",
        scope: "Miscellaneous manufactured articles · HS 96",
        description:
          "Annual total for all products in HS22 chapter 96. The industry name is a short navigation label.",
      },
      97: {
        label: "Art and collectors' pieces",
        scope: "Art and collectors' pieces · HS 97",
        description:
          "Annual total for all products in HS22 chapter 97. The industry name is a short navigation label.",
      },
      8542: {
        label: "Electronic integrated circuits",
        scope: "Electronic integrated circuits · HS 8542",
        description:
          "HS 8542 electronic integrated circuits. This does not represent semiconductor manufacturing equipment.",
      },
      8486: {
        label: "Semiconductor manufacturing equipment",
        scope: "Semiconductor manufacturing equipment · HS 8486",
        description:
          "HS 8486 machinery and apparatus for manufacturing semiconductor boules or wafers, semiconductor devices, electronic integrated circuits or flat-panel displays, and related equipment and parts covered by this heading.",
      },
      8703: {
        label: "Passenger motor vehicles",
        scope: "Passenger motor vehicles · HS 8703",
        description:
          "Annual total for all products in HS22 heading 8703. This is one of the selected 4-digit headings; the explorer does not list every heading.",
      },
      8708: {
        label: "Motor vehicle parts",
        scope: "Motor vehicle parts · HS 8708",
        description:
          "Annual total for all products in HS22 heading 8708. This is one of the selected 4-digit headings; the explorer does not list every heading.",
      },
      8507: {
        label: "Electric accumulators",
        scope: "Electric accumulators · HS 8507",
        description:
          "Annual total for all products in HS22 heading 8507. This is one of the selected 4-digit headings; the explorer does not list every heading.",
      },
      8517: {
        label: "Telecommunications equipment",
        scope: "Telecommunications equipment · HS 8517",
        description:
          "Annual total for all products in HS22 heading 8517. This is one of the selected 4-digit headings; the explorer does not list every heading.",
      },
      8471: {
        label: "Computers and data-processing machines",
        scope: "Computers and data-processing machines · HS 8471",
        description:
          "Annual total for all products in HS22 heading 8471. This is one of the selected 4-digit headings; the explorer does not list every heading.",
      },
      2709: {
        label: "Crude petroleum oils",
        scope: "Crude petroleum oils · HS 2709",
        description:
          "Annual total for all products in HS22 heading 2709. This is one of the selected 4-digit headings; the explorer does not list every heading.",
      },
      2710: {
        label: "Petroleum oil preparations",
        scope: "Petroleum oil preparations · HS 2710",
        description:
          "Annual total for all products in HS22 heading 2710. This is one of the selected 4-digit headings; the explorer does not list every heading.",
      },
      2711: {
        label: "Petroleum gases",
        scope: "Petroleum gases · HS 2711",
        description:
          "Annual total for all products in HS22 heading 2711. This is one of the selected 4-digit headings; the explorer does not list every heading.",
      },
      3004: {
        label: "Medicaments in retail packs",
        scope: "Medicaments in retail packs · HS 3004",
        description:
          "Annual total for all products in HS22 heading 3004. This is one of the selected 4-digit headings; the explorer does not list every heading.",
      },
      9018: {
        label: "Medical instruments and appliances",
        scope: "Medical instruments and appliances · HS 9018",
        description:
          "Annual total for all products in HS22 heading 9018. This is one of the selected 4-digit headings; the explorer does not list every heading.",
      },
      8802: {
        label: "Aircraft and spacecraft",
        scope: "Aircraft and spacecraft · HS 8802",
        description:
          "Annual total for all products in HS22 heading 8802. This is one of the selected 4-digit headings; the explorer does not list every heading.",
      },
      8541: {
        label: "Semiconductor devices",
        scope: "Semiconductor devices · HS 8541",
        description:
          "Annual total for all products in HS22 heading 8541. This is one of the selected 4-digit headings; the explorer does not list every heading.",
      },
      8501: {
        label: "Electric motors and generators",
        scope: "Electric motors and generators · HS 8501",
        description:
          "Annual total for all products in HS22 heading 8501. This is one of the selected 4-digit headings; the explorer does not list every heading.",
      },
      7208: {
        label: "Flat-rolled iron and steel products",
        scope: "Flat-rolled iron and steel products · HS 7208",
        description:
          "Annual total for all products in HS22 heading 7208. This is one of the selected 4-digit headings; the explorer does not list every heading.",
      },
      3901: {
        label: "Polymers of ethylene",
        scope: "Polymers of ethylene · HS 3901",
        description:
          "Annual total for all products in HS22 heading 3901. This is one of the selected 4-digit headings; the explorer does not list every heading.",
      },
      2811: {
        label: "Other inorganic acids and non-metal oxides",
        scope: "Other inorganic acids and non-metal oxides · HS 2811",
        description:
          "Annual total for all products in HS22 heading 2811. This is one of the selected 4-digit headings; the explorer does not list every heading.",
      },
      8112: {
        label: "Other base metals and cermets",
        scope: "Other base metals and cermets · HS 8112",
        description:
          "Annual total for all products in HS22 heading 8112. This is one of the selected 4-digit headings; the explorer does not list every heading.",
      },
    },
  };
  Object.assign(data.messages, {
    "선택 관계 확대": "Fit selected relationship",
    "선택한 상대국: {0}": "Selected partner: {0}",
    "미리보기: {0}": "Preview: {0}",
  });
  Object.assign(data.messages, {
    "산업 구성": "Industry composition",
    "산업 구성과 증감 기여": "Industry composition and growth contributions",
    "산업 구성 CSV": "Industry composition CSV",
    "HS 2단위 전체 산업을 비교합니다. 상단 품목 선택과 관계없이 상품 전체를 분모로 사용합니다.":
      "Compare all HS 2-digit chapters. The denominator is all products, independently of the product selected above.",
    "분석 범위": "Analysis scope",
    "국가 전체 교역": "All country trade",
    "선택 상대국과의 교역": "Trade with selected partner",
    "산업 검색": "Search industries",
    "산업명 또는 HS 코드": "Industry name or HS code",
    "산업 정렬": "Sort industries",
    "선택연도 금액순": "Selected-year value",
    "증가 기여순": "Largest growth contributions",
    "감소 기여순": "Largest decline contributions",
    "HS 코드순": "HS code",
    "기록 범위": "Record coverage",
    "한 연도 이상 기록": "Recorded in at least one year",
    "전체 96개 산업": "All 96 chapters",
    "다시 불러오기": "Reload",
    "기여도는 산업 증감액을 비교연도 상품 전체 금액으로 나눈 전체 증감률 기여(%p)입니다. 한쪽 연도 미기록 산업의 증감은 계산하지 않습니다.":
      "Contributions are industry value changes divided by the reference-year all-products value, in percentage points of total growth. Changes are not calculated when an industry is unrecorded in either year.",
    "산업 구성 표": "Industry composition table",
    "기록 범위 차이는 한쪽 연도에만 기록된 금액의 순차이입니다. 실제 신규·중단 교역을 뜻하지 않습니다. 반올림 차이는 상품 전체와 산업별 합계의 차이에서 발생합니다. 원인 분석이 아닌 산술 분해입니다.":
      "The coverage difference is the net difference of values recorded in only one year. It does not establish new or discontinued trade. The rounding difference comes from the gap between all-products totals and summed chapter values. This is an accounting decomposition, not a causal analysis.",
    "양쪽 연도 기록": "Recorded in both years",
    "선택연도만 기록": "Selected year only",
    "비교연도만 기록": "Reference year only",
    "양쪽 연도 미기록": "Unrecorded in both years",
    "산업 / HS 2단위": "Industry / HS 2-digit",
    "선택연도 산업 비중": "Selected-year industry share (%)",
    "전체 증감률 기여(%p)": "Contribution to total growth (pp)",
    "기록 상태": "Record status",
    "국가 전체 산업 비중": "Country-wide industry share (%)",
    "전체 증감액 대조": "Reconcile total value change",
    "양쪽 기록 산업 증감 합계": "Change in chapters recorded in both years",
    "기록 범위 차이": "Record coverage difference",
    "반올림 차이": "Rounding difference",
    "상품 전체 증감액": "All-products value change",
    "상품 전체 증감률": "All-products growth rate",
    "{0}개 산업 · CSV는 검색과 관계없이 전체 96개 산업을 포함합니다.":
      "{0} chapters · CSV includes all 96 chapters, independently of search.",
    "지도 탐색": "Explore map",
    "상대국 지도": "Partner map",
    "HS {0} {1} 상대국 지도": "Partner map for HS {0} {1}",
    "증감 기여 상위 산업": "Leading industry contributions",
    "선택연도 산업 구성": "Selected-year industry composition",
    "막대는 현재 검색·정렬 결과의 앞 10개 산업입니다. 전체 값은 아래 표에서 확인합니다.":
      "Bars show the first 10 chapters in the current search and sort order. The table contains all matching values.",
    "산업 자료를 불러오는 중입니다.": "Loading industry data.",
    "산업 자료를 불러오지 못했습니다. 다시 시도해 주세요.":
      "Industry data could not be loaded. Please retry.",
    "행 유형": "Row type",
    산업명: "Industry name",
    "비교연도 금액(천 달러)": "Reference-year value (thousand USD)",
    "선택연도 금액(천 달러)": "Selected-year value (thousand USD)",
    "금액 변화(천 달러)": "Value change (thousand USD)",
    "비교연도 산업 비중(%)": "Reference-year industry share (%)",
    "비교연도 상품 전체(천 달러)":
      "Reference-year all-products value (thousand USD)",
    "선택연도 상품 전체(천 달러)":
      "Selected-year all-products value (thousand USD)",
    "자료 버전": "Dataset version",
    "보고서 자료를 준비하고 있습니다.": "Preparing report data.",
    "분석 조건이 바뀌었습니다. 현재 조건으로 다시 저장해 주세요.":
      "Analysis conditions changed. Please save again using the current conditions.",
    "보고서 자료를 준비하지 못했습니다. 다시 시도해 주세요.":
      "Report data could not be prepared. Please retry.",
  });
  Object.assign(data.messages, {
    "상품 전체": "All products",
    금액: "Value",
    "금액 변화": "Value change",
    "비중 변화": "Share change",
  });
  Object.assign(data.messages, {
    "검색 결과가 없습니다.": "No results found.",
    "기준국 코드": "Reporting-country code",
    "상대국 코드": "Partner code",
    방향: "Direction",
    비교연도: "Reference year",
    선택연도: "Selected year",
  });
  if (typeof module !== "undefined" && module.exports) module.exports = data;
  else root.TW_LOCALE_EN = data;
})(globalThis);
