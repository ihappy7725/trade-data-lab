# 결정 기록

형식: `날짜 | 결정 | 이유`

- 2026-11-12 | 장기 프로젝트 Trade Data Lab 시작, 서비스 5개 후보 정리 | 데이터로 무역·정책 질문을 다뤄 본 경험을 쌓기 위해 (자세한 내용: trade-data-lab-ideas.md)
- 2026-11-12 | 첫 서비스로 Tradeweave(국가별 무역 의존도 지도) 진행 | 5개 후보 중 직접 선택
- 2026-11-13 | 저장소를 서비스별 폴더 구조로 정리, Tradeweave를 trade-weave/로 이동 | 루트가 Tradeweave 하나로 되어 있어 다른 서비스를 추가할 자리가 없었음
- 2026-11-13 | 두 번째 서비스로 정책 발표 → 무역 변화 추적기 진행, 이름 Policyline(부르는 말 "발표 전후 보기"), 첫 화면은 정책 카드 5장·전후 12개월 그래프, 데이터는 UN Comtrade 월별 (자세한 내용: policy-tracker/PLAN.md) | 정책 공부하는 사람이 발표 전후 변화를 출처와 함께 바로 볼 수 있게 하려고. BACI는 연별이라 월별 자료가 필요함
- 2026-11-13 | Policyline 디자인 방향을 "제도와 선 (밤 · 입체)"로 결정, 한/EN 전환과 기능 섹션 5개 추가, 첫 화면 예시 그래프와 연도 시간축은 뺌 (자세한 내용: policy-tracker/DESIGN.md) | 시안 1·2를 비교해 발표일 "선"이 서비스 이름·기능과 바로 이어지는 2번을 고름. 레퍼런스(findyourbeacon.app)의 남색·명조·흰 버튼 구성을 참고
- 2026-11-14 | Policyline 교역 자료를 UN Comtrade 월별 공개 미리보기 API로 받음. EU 상계관세 사례만 EU 27개국 수입 신고값을 씀, 비교는 앞뒤 12개월 월평균 | 중국 신고 2025년 월별 자료가 비어 있었고, 상계관세는 EU 수입에 매기는 것이라 수입국 신고값이 더 맞음. 빈 달이 있어도 비교가 흔들리지 않게 월평균 사용
- 2026-11-16 | 따로 있던 Trade News Room(옛 Docklab) 저장소를 trade-data-lab의 `trade-news-room/` 폴더로 합침. git 기록은 옮기지 않고 옛 저장소에 보관, Vercel은 기존 프로젝트의 Git 연결을 trade-data-lab으로 바꾸고 Root Directory를 `trade-news-room`으로 지정 | 기획서의 서비스 6개를 한 저장소·같은 규칙으로 관리하려고. 기존 Vercel 프로젝트를 그대로 써야 주소(trade-news-room.vercel.app)와 API 키 설정이 유지됨
- 2026-11-16 | Report Plain은 골라 둔 보고서 서가(검수 완료)와 내 PDF 바로 요약(자동, 검수 전)을 함께 둠 (자세한 내용: report-digest/PLAN.md) | 서가만으로는 도구로 쓰기 어렵고, 바로 요약만으로는 일반 AI 요약과 차이가 없음. 같은 요약 과정에 검수 여부를 배지로 나눠 보여 주는 것이 차별점
- 2026-11-16 | Report Plain에 A(보고서 숫자 → Tradeweave·Policyline 확인)·B(같은 질문 다른 기관)·C(한계 점검표)와 부가 탭 정책 용어 사전·보고서 달력을 모두 넣고, 1단계 핵심+A → 2단계 C → 3단계 용어 사전 → 4단계 B·달력 순서로 만듦 (자세한 내용: report-digest/IDEAS.md) | 기능을 모두 넣고 싶지만 B와 달력은 자료 확인 작업이 가장 많아서, 링크만으로 되는 A부터 하고 화면 틀은 처음부터 만들어 둠
- 2026-11-16 | Report Plain 첫 서가를 WTO Global Trade Outlook(2026-10-08)과 IMF WEO 2026년 10월 1장으로 정함, 원문 PDF는 저장소에 올리지 않음 | 둘 다 최근 세계 교역 전망이라 4단계 B의 첫 비교 사례가 됨. KITA 2027 전망은 아직 발간 전. IMF 이용 조건이 재배포·2차 저작물을 막고 인용 분량을 제한해서 링크·출처 표기·짧은 인용만 씀
- 2026-11-16 | 보고서 요약 서비스 이름을 Report Plain에서 Trade Digest로 바꾸고 폴더를 report-digest/에서 trade-digest/로 옮김 | 기획서의 이름은 임시였고, 폴더 이름이 서비스 이름을 따르도록 하려고. 위쪽 기록의 Report Plain·report-digest 표기는 당시 기록이라 그대로 둠
