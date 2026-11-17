# ⑥ Mirror Gap (가칭) — 거울 통계 차이 (기획 중)

같은 교역을 두 나라가 각자 신고한 값(A의 수출, B의 수입)을 나란히 놓고 얼마나·어디서·언제부터 어긋나는지 보여 주는 서비스. 차이의 원인은 단정하지 않는다.

| 파일 | 내용 |
|---|---|
| `docs/Mirror-Gap-기획서.pdf` | 상세 기획서 (A to Z) |
| `docs/plan.html`, `docs/plan.css` | 기획서 원본. 고친 뒤 Chrome으로 PDF를 다시 만든다 |
| `PROMPT.md` | AI 도구에 넣는 구현 프롬프트 |

기획서 PDF 다시 만들기:

```bash
cd mirror-gap/docs && "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer --print-to-pdf="Mirror-Gap-기획서.pdf" "file://$PWD/plan.html"
```
