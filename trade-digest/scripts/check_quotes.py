"""요약 문장의 근거 구절이 정말 그 쪽에 있는지 대조한다.

쓰는 법:
    .venv/bin/python scripts/check_quotes.py <쪽별글자.json> <요약.json> [--write]

- 요약.json은 {"items": [{"id": "...", "page": "7", "quote": "원문 그대로의 짧은 구절"}, ...]} 모양.
  page는 인쇄된 쪽 번호(label)다.
- 결과: 쪽수 확인됨(ok) / 다른 쪽에 있음(moved) / 찾지 못함(miss)
- --write를 붙이면 요약.json의 항목마다 "verified": true/false 와 "found_on"을 적는다.
- 줄바꿈, 하이픈으로 끊긴 단어, 둥근 따옴표, 대시 차이는 무시하고 비교한다.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path


def norm(text: str) -> str:
    t = unicodedata.normalize("NFKC", text)
    t = re.sub(r"-\s*\n\s*", "", t)                      # 줄 끝에서 끊긴 단어 잇기
    t = t.translate(str.maketrans({"‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-", " ": " "}))
    t = re.sub(r"\s+", " ", t)
    return t.strip().lower()


def check(pages: list, items: list) -> list:
    by_label = {}
    for p in pages:
        by_label.setdefault(str(p["label"]), []).append(norm(p["text"]))
    all_pages = [(str(p["label"]), norm(p["text"])) for p in pages]
    results = []
    for it in items:
        q = norm(it.get("quote", ""))
        page = str(it.get("page", ""))
        if not q:
            results.append({**it, "status": "miss", "found_on": []})
            continue
        if any(q in t for t in by_label.get(page, [])):
            results.append({**it, "status": "ok", "found_on": [page]})
            continue
        found = [lab for lab, t in all_pages if q in t]
        results.append({**it, "status": "moved" if found else "miss", "found_on": found})
    return results


def main() -> None:
    args = [a for a in sys.argv[1:] if a != "--write"]
    if len(args) != 2:
        sys.exit("쓰는 법: check_quotes.py <쪽별글자.json> <요약.json> [--write]")
    pages = json.loads(Path(args[0]).read_text(encoding="utf-8"))["pages"]
    summary_path = Path(args[1])
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    results = check(pages, summary["items"])

    mark = {"ok": "✓ 쪽수 확인됨", "moved": "→ 다른 쪽에 있음", "miss": "! 찾지 못함"}
    for r in results:
        where = f" (실제: p.{', '.join(r['found_on'])})" if r["status"] == "moved" else ""
        print(f"{r.get('id', '?'):>6}  p.{r.get('page', '?'):<5} {mark[r['status']]}{where}")
    counts = {k: sum(r["status"] == k for r in results) for k in mark}
    print(f"\n확인됨 {counts['ok']} · 다른 쪽 {counts['moved']} · 못 찾음 {counts['miss']} / 전체 {len(results)}")

    if "--write" in sys.argv:
        for it, r in zip(summary["items"], results):
            it["verified"] = r["status"] == "ok"
            it["found_on"] = r["found_on"]
        summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"→ {summary_path}에 결과를 적었습니다")
    if counts["ok"] != len(results):
        sys.exit(1)


if __name__ == "__main__":
    main()
