# Trade Data Lab · Tradeweave

나라 하나를 고르면 교역 상대국과 쏠림 정도를 지도 한 장으로 보여 주는 서비스 **Tradeweave**의 기획 단계 결과물입니다. 빌드 과정 없는 정적 HTML이라 Vercel에 그대로 올릴 수 있습니다.

## 구조

| 경로 | 내용 | 원본 |
|---|---|---|
| `/` (`index.html`) | 결과물 모음 첫 화면 | 새로 작성 |
| `/landing/` | 랜딩 페이지 v2 | claude.ai 아티팩트 |
| `/concentration/` | 쏠림 계산기 (CR1·CR3·CR5·HHI) | claude.ai 아티팩트 |
| `/deck/` | 투자자 소개 5장 (정적 뷰어) | Slides 아티팩트의 장 파일 |
| `/launch-copy/` | 런칭 문구 | claude.ai 아티팩트 |
| `/design-system/` | 디자인 시스템 (README·토큰·컴포넌트) | Design System 아티팩트 |
| `/docs/` | 한 장 기획서, 아이디어 메모 (Markdown) | 프로젝트 파일 |
| `/data/` | 월별 예상 방문자 **가상 데이터** (xlsx) | 프로젝트 파일 |

## claude.ai 밖에서 달라지는 점

- **쏠림 계산기 저장**: claude.ai에서는 계정 저장소에 저장했지만, Vercel에서는 그 기능이 없어 **브라우저 localStorage에만** 저장됩니다. 다른 기기·브라우저에서는 보이지 않습니다.
- **"Claude에게 결과 풀이 듣기" 버튼**: claude.ai 런타임 전용이라 Vercel에서는 자동으로 숨겨집니다. 계산 결과와 설명은 그대로 작동합니다.
- **투자자 소개·디자인 시스템**: claude.ai 전용 뷰어 대신 같은 내용을 정적 HTML로 옮겼습니다. 편집 기능, 댓글, Google Slides 보내기는 없습니다.
- **월별 방문자 대시보드**: 데이터가 claude.ai 아티팩트 안에 있어 옮기지 않았습니다. 원본 엑셀만 `/data/`에 있습니다.

## 로컬에서 보기

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## 데이터 출처(계획)

CEPII BACI 202601 (Gaulier & Zignago, 2010), UN Comtrade 기반 · 기준연도 2024 · Etalab Open Licence 2.0. 현재 화면에는 실제 무역 수치가 연결되어 있지 않으며, 예시 숫자는 모두 "가상국" 숫자입니다.
