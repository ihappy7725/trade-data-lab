"""data/reports.json → data/reports.js (화면이 서버 없이도 읽을 수 있게).

쓰는 법:
    .venv/bin/python scripts/build_data.py

- 원문 쪽별 글자(sources/<보고서 id>.pages.json)가 있으면 근거 구절을 다시 대조해
  항목마다 "verified"(쪽수 확인됨 여부)를 적는다. 없으면 기존 값을 그대로 둔다.
- data/reports.js는 이 스크립트가 만든다. 직접 고치지 않는다.
"""
import json
from pathlib import Path

from check_quotes import check

ROOT = Path(__file__).resolve().parent.parent
src = ROOT / "data" / "reports.json"
data = json.loads(src.read_text(encoding="utf-8"))

for rep in data["reports"]:
    pages_file = ROOT / "sources" / f"{rep['id']}.pages.json"
    if not pages_file.exists():
        print(f"{rep['id']}: 원문 글자 파일이 없어 대조를 건너뜀")
        continue
    pages = json.loads(pages_file.read_text(encoding="utf-8"))["pages"]
    for group in ("items", "checks"):
        rows = [x for x in rep.get(group, []) if x.get("quote")]
        for row, res in zip(rows, check(pages, rows)):
            row["verified"] = res["status"] == "ok"
    ok = sum(x.get("verified", False) for x in rep["items"])
    print(f"{rep['id']}: 근거 구절 {ok}/{len(rep['items'])} 쪽수 확인됨")

src.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
out = ROOT / "data" / "reports.js"
out.write_text("// scripts/build_data.py 가 만든 파일 — 직접 고치지 않는다\nwindow.TD_REPORTS = "
               + json.dumps(data, ensure_ascii=False) + ";\n", encoding="utf-8")
print(f"→ {out.relative_to(ROOT)}")
