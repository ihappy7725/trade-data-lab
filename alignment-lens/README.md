# ⑤ Alignment Lens (가칭) — 외교 거리 × 교역 비중 (기획 중)

두 나라를 고르면 유엔총회 투표로 잰 외교 거리와 교역 비중이 1995년부터 어떻게 함께 움직였는지 나란히 보여 주는 서비스. 원인은 단정하지 않는다.

| 파일 | 내용 |
|---|---|
| `docs/Alignment-Lens-기획서.pdf` | 상세 기획서 (A to Z) |
| `docs/plan.html`, `docs/plan.css` | 기획서 원본. 고친 뒤 Chrome으로 PDF를 다시 만든다 |
| `PROMPT.md` | AI 도구에 넣는 구현 프롬프트 |

기획서 PDF 다시 만들기:

```bash
cd alignment-lens/docs && "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer --print-to-pdf="Alignment-Lens-기획서.pdf" "file://$PWD/plan.html"
```
