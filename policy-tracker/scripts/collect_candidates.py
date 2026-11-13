"""새 정책 후보를 모은다 (매주 GitHub Actions 에서 실행, 키 필요 없음).

- 미국: Federal Register API — 대통령 포고문·행정명령(관세 · 232조 · 301조), USTR 발표, 상무부 BIS 규정
- EU : EU 관보(Publications Office SPARQL) — 반덤핑 · 상계관세 · 세이프가드 규정
모은 후보는 "검토 대기"일 뿐이다. 날짜 · 대상 품목(HS) · 볼 교역 흐름은 사람이 원문으로 확인한 뒤
data/policies-list.json 에 직접 넣어야 화면에 나온다.

실행 (policy-tracker 폴더에서):
    python3 scripts/collect_candidates.py --days 8            찾은 후보를 화면에 출력만
    python3 scripts/collect_candidates.py --days 8 --issues   GitHub 이슈로 올리기 (gh CLI · GH_TOKEN 필요)
"""
import argparse
import json
import os
import subprocess
import sys
import urllib.parse
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_trade import get_json  # noqa: E402

LABEL = "policy-candidate"
# 정책이 아닌 행정 공지는 거른다
SKIP_TITLES = ("information collection", "sunshine act", "meeting", "hearing", "request for comments",
               "privacy act", "delegation of authority", "technical amendment", "correction")
MAX_ISSUES = 20

FR_QUERIES = [
    # (설명, 조건)
    ("대통령 문서 · 관세", {"type][": "PRESDOCU", "term": "tariff"}),
    ("대통령 문서 · 수입 조정(232조)", {"type][": "PRESDOCU", "term": "\"adjusting imports\""}),
    ("대통령 문서 · 관세율", {"type][": "PRESDOCU", "term": "\"duties\""}),
    ("USTR · 301조", {"agencies][": "trade-representative-office-of-united-states", "term": "\"section 301\""}),
    ("USTR · 관세", {"agencies][": "trade-representative-office-of-united-states", "term": "tariff"}),
    ("상무부 BIS · 규정", {"agencies][": "industry-and-security-bureau", "type][": "RULE"}),
    ("상무부 BIS · 232조 조사", {"agencies][": "industry-and-security-bureau", "term": "\"section 232\""}),
]


def federal_register(since):
    out = {}
    for label, cond in FR_QUERIES:
        q = [("per_page", "50"), ("order", "newest"),
             ("conditions[publication_date][gte]", since.isoformat())]
        for k, v in cond.items():
            q.append((f"conditions[{k}]" + ("" if k.endswith("][") else ""), v))
        for f in ("title", "document_number", "publication_date", "signing_date", "html_url", "type", "agency_names", "proclamation_number", "executive_order_number"):
            q.append(("fields[]", f))
        url = "https://www.federalregister.gov/api/v1/documents.json?" + urllib.parse.urlencode(q).replace("%5D%5B=", "%5D%5B%5D=")
        d = get_json(url)
        for r in d.get("results", []):
            cid = "FR:" + r["document_number"]
            if cid in out or any(x in r["title"].lower() for x in SKIP_TITLES):
                continue
            num = r.get("proclamation_number") or r.get("executive_order_number")
            out[cid] = {"id": cid, "where": "미국 Federal Register", "query": label,
                        "date": r.get("signing_date") or r.get("publication_date"),
                        "published": r.get("publication_date"),
                        "title": r["title"] + (f" (No. {num})" if num else ""),
                        "agency": ", ".join(r.get("agency_names") or []), "url": r["html_url"]}
    return list(out.values())


def eu_journal(since):
    sparql = f"""PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
SELECT DISTINCT ?celex ?date ?title WHERE {{
 ?w cdm:resource_legal_id_celex ?celex ; cdm:work_date_document ?date .
 ?e cdm:expression_belongs_to_work ?w ; cdm:expression_title ?title ;
    cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/ENG> .
 FILTER(?date >= "{since.isoformat()}"^^xsd:date)
 FILTER(REGEX(?celex, "^3[0-9]{{4}}R"))
 FILTER((CONTAINS(LCASE(STR(?title)), "anti-dumping duty") || CONTAINS(LCASE(STR(?title)), "countervailing duty")
        || CONTAINS(LCASE(STR(?title)), "safeguard measure")) && CONTAINS(LCASE(STR(?title)), "imposing"))
}} ORDER BY DESC(?date) LIMIT 50"""
    url = "https://publications.europa.eu/webapi/rdf/sparql?" + urllib.parse.urlencode({"query": sparql})
    d = get_json(url, {"Accept": "application/sparql-results+json"})
    out = []
    for b in d.get("results", {}).get("bindings", []):
        celex = b["celex"]["value"]
        out.append({"id": "CELEX:" + celex, "where": "EU 관보", "query": "반덤핑 · 상계관세 · 세이프가드",
                    "date": b["date"]["value"][:10], "published": b["date"]["value"][:10],
                    "title": b["title"]["value"][:300], "agency": "European Commission",
                    "url": f"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:{celex}"})
    return out


def issue_body(c):
    return f"""새 정책 후보입니다. 아직 Policyline 화면에 들어가지 않았습니다.

- 출처: {c['where']} ({c['query']})
- 문서: [{c['title']}]({c['url']})
- 날짜: {c['date']} (게재 {c['published']})
- 기관: {c['agency']}

### 넣기 전에 원문으로 확인할 것
- [ ] 발표일과 시행일
- [ ] 대상 품목과 가장 가까운 HS 코드
- [ ] 볼 교역 흐름 (누가 신고한 어느 나라 → 어느 나라, 수출/수입)
- [ ] 쓸 자료 출처 (Comtrade / Eurostat / Census)

### 승인하는 방법
`policy-tracker/data/policies-list.json` 에 한 덩어리를 추가하고 `python3 scripts/fetch_trade.py <id>` 를 돌린다.
(Claude Code 에 "이슈 #번호 정책을 추가해 줘" 라고 해도 된다.) 넣지 않을 후보는 이슈를 닫는다.

<!-- candidate-id: {c['id']} -->
"""


def gh(*args, input=None):
    return subprocess.run(["gh", *args], input=input, capture_output=True, text=True)


def post_issues(cands):
    gh("label", "create", LABEL, "--color", "FF6B3D", "--description", "Policyline 새 정책 후보 (검토 대기)", "--force")
    made = 0
    for c in cands:
        if made >= MAX_ISSUES:
            print(f"이번 실행은 {MAX_ISSUES}개까지만 올립니다.")
            break
        found = gh("issue", "list", "--label", LABEL, "--state", "all", "--search", f"\"candidate-id: {c['id']}\" in:body", "--json", "number")
        if found.returncode == 0 and json.loads(found.stdout or "[]"):
            continue
        title = f"[정책 후보] {c['date']} · {c['title'][:90]}"
        r = gh("issue", "create", "--title", title, "--label", LABEL, "--body-file", "-", input=issue_body(c))
        print(("올림: " if r.returncode == 0 else "실패: ") + title + (" " + r.stderr.strip() if r.returncode else ""))
        made += r.returncode == 0
    print(f"새 이슈 {made}개")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=8)
    ap.add_argument("--issues", action="store_true")
    a = ap.parse_args()
    since = date.today() - timedelta(days=a.days)
    cands = []
    for name, fn in (("Federal Register", federal_register), ("EU 관보", eu_journal)):
        try:
            got = fn(since)
            print(f"{name}: {len(got)}건")
            cands += got
        except Exception as e:  # 한 곳이 실패해도 나머지는 계속
            print(f"{name}: 실패 — {e}")
    cands.sort(key=lambda c: c["date"] or "", reverse=True)
    if a.issues:
        post_issues(cands)
    else:
        for c in cands:
            print(f"- {c['date']} [{c['where']}] {c['title'][:100]}  {c['url']}")


if __name__ == "__main__":
    main()
