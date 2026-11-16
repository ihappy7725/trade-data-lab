"""원문 PDF에서 쪽별 글자를 뽑아 JSON으로 저장한다.

쓰는 법:
    .venv/bin/python scripts/extract_pages.py sources/wto-gtos-2026-10.pdf sources/wto-gtos-2026-10.pages.json

- 결과에는 원문 전체 글자가 들어가므로 sources/ 안에만 둔다 (git에 올리지 않음).
- 쪽마다 PDF 순서(index, 1부터)와 인쇄된 쪽 번호(label)를 함께 적는다.
  보고서가 말하는 "몇 쪽"은 인쇄된 쪽 번호(label)이다.
"""
import json
import sys
from pathlib import Path

from pypdf import PdfReader


def extract(pdf_path: Path) -> dict:
    reader = PdfReader(str(pdf_path))
    labels = list(reader.page_labels) if reader.page_labels else []
    pages = []
    for i, page in enumerate(reader.pages):
        label = labels[i] if i < len(labels) else str(i + 1)
        text = (page.extract_text() or "").encode("utf-8", "replace").decode("utf-8")
        pages.append({"index": i + 1, "label": label, "text": text})
    return {"file": pdf_path.name, "page_count": len(pages), "pages": pages}


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit("쓰는 법: extract_pages.py <원문.pdf> <결과.json>")
    pdf, out = Path(sys.argv[1]), Path(sys.argv[2])
    data = extract(pdf)
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    empty = [p["index"] for p in data["pages"] if not p["text"].strip()]
    print(f"{data['file']}: {data['page_count']}쪽 → {out}")
    if empty:
        print(f"글자가 없는 쪽(그림·스캔일 수 있음): {empty}")


if __name__ == "__main__":
    main()
