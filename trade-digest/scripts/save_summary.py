"""요약 한 권을 원문 대조 후 data/reports.json에 저장한다.

쓰는 법:  .venv/bin/python scripts/save_summary.py <명세.json>
- 명세: 보고서 메타 + items/checks/terms (quote는 원문 그대로, page는 원문 쪽 라벨)
- 모든 items의 quote가 지정 쪽에서 찾아지지 않으면 저장하지 않는다 (실패 항목 목록 출력).
- 저장 후 catalog.json의 summary 표시와 build_data.py 실행을 같이 한다.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_quotes import check  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    rid = spec["id"]
    rep = spec["report"]
    spec = {"items": rep["items"], "checks": rep["checks"], "report": rep, "id": rid}
    pages = json.loads((ROOT / "sources" / f"{rid}.pages.json").read_text(encoding="utf-8"))["pages"]
    rows = [{"id": i["id"], "page": i["page"], "quote": i["quote"]} for i in spec["items"]]
    rows += [{"id": "chk-" + c["q"], "page": c["page"], "quote": c["quote"]} for c in spec["checks"] if c.get("quote")]
    res = check(pages, rows)
    bad = [(r["id"], x["status"], x["found_on"]) for r, x in zip(rows, res) if x["status"] != "ok"]
    if bad:
        print("저장 안 함. 확인 못 한 근거:", bad)
        sys.exit(1)
    P = ROOT / "data" / "reports.json"
    R = json.loads(P.read_text(encoding="utf-8"))
    R["reports"] = [r for r in R["reports"] if r["id"] != rid] + [spec["report"]]
    P.write_text(json.dumps(R, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    C = ROOT / "data" / "catalog.json"
    cat = json.loads(C.read_text(encoding="utf-8"))
    for r in cat["reports"]:
        if r["id"] == rid:
            r["link_check"] = "ok"
            r["summary"] = True
    C.write_text(json.dumps(cat, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{rid}: 근거 {len(rows)}/{len(rows)} 확인, 저장 완료")


if __name__ == "__main__":
    main()
