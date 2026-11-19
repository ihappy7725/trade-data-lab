#!/usr/bin/env python3
"""Build one auditable case from public official sources. No key or paid API.

python3 scripts/build_mirrorline_case.py --fetch
python3 scripts/build_mirrorline_case.py --retrieved-on YYYY-MM-DD
The latter requires existing raw files and records the supplied actual retrieval date.
"""
import argparse
from datetime import datetime
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "raw" / "mirrorline"
OUT = ROOT / "data" / "cases" / "usa-chn-2017.json"
URLS = {
    "ustr": "https://ustr.gov/sites/default/files/files/Press/Reports/2018%20National%20Trade%20Estimate%20Report.pdf",
    "china": "https://na.china-embassy.gov.cn/eng/sgxw/201810/t20181015_6554556.htm",
    "census": "https://www.census.gov/foreign-trade/balance/c5700.html",
    "un-method": "https://uncomtrade.org/docs/bilateral-asymmetries/",
    "census-method": "https://www.census.gov/foreign-trade/reference/guides/tradestatsinfo.html",
    "api-method": "https://uncomtrade.org/docs/un-comtrade-api/",
    "joint": "https://www.census.gov/foreign-trade/reconciliation/recon_china_080910.pdf",
}
FILES = dict(zip(URLS, ["ustr-2018.pdf", "china-whitepaper-2018.html", "census-china.html", "comtrade-asymmetries.html", "census-method.html", "comtrade-api.html", "joint-reconciliation-2012.pdf"]))
for iso, reporter, partner in [("chn", 156, 842), ("usa", 842, 156)]:
    URLS[iso] = "https://comtradeapi.un.org/public/v1/preview/C/A/HS?" + urlencode(dict(period=2017, reporterCode=reporter, cmdCode="TOTAL", flowCode="X,M", partnerCode=partner, partner2Code=0, customsCode="C00", motCode=0, maxRecords=500))
    FILES[iso] = iso + "-2017.json"

def amount(x):
    return format(Decimal(str(x)), "f").removesuffix(".0")

def extract_census():
    text = (RAW / FILES["census"]).read_text()
    section = text[text.index('<A name="2017">'):text.index('<A name="2016">')]
    for row in re.findall(r"<tr\b[^>]*>(.*?)</tr>", section, re.S | re.I):
        cells = [" ".join(re.sub("<[^>]+>", " ", cell).split()) for cell in re.findall(r"<td\b[^>]*>(.*?)</td>", row, re.S | re.I)]
        if cells and cells[0] == "TOTAL 2017":
            ex, im, bal = [Decimal(c.replace(",", "")) * 1000000 for c in cells[1:]]
            assert ex - im == bal, "Census total arithmetic changed"
            return dict(export_usd=amount(ex), import_usd=amount(im), deficit_usd=amount(-bal))
    raise ValueError("Census 2017 total row missing; do not substitute data")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--fetch", action="store_true")
    parser.add_argument("--retrieved-on")
    args = parser.parse_args()
    RAW.mkdir(parents=True, exist_ok=True)
    today = datetime.now(ZoneInfo("Asia/Seoul")).date().isoformat()
    manifest_path = RAW / "manifest.json"
    if args.fetch:
        # curl uses the host trust store; never disable TLS certificate checking.
        for key, url in URLS.items():
            subprocess.run(["curl", "-fLsS", "--retry", "2", "--max-time", "60", url, "-o", str(RAW / FILES[key])], check=True)
        retrieved = today
    elif args.retrieved_on:
        datetime.strptime(args.retrieved_on, "%Y-%m-%d")
        retrieved = args.retrieved_on
    elif manifest_path.exists():
        previous = json.loads(manifest_path.read_text())
        retrieved = previous["retrieved_on"]
        for source in previous["files"]:
            assert hashlib.sha256((RAW / source["file"]).read_bytes()).hexdigest() == source["sha256"], "Raw file changed: fetch or confirm actual retrieval date"
    else:
        raise ValueError("Use --fetch, or provide the actual --retrieved-on date")
    sources = []
    for key, url in URLS.items():
        p = RAW / FILES[key]
        if not p.is_file() or not p.stat().st_size:
            raise ValueError(f"Missing official input: {p.name}")
        sources.append(dict(id=key, url=url, file=p.name, sha256=hashlib.sha256(p.read_bytes()).hexdigest(), retrieved_on=retrieved))
    records = []
    for iso, reporter, partner in [("chn",156,842),("usa",842,156)]:
        doc = json.loads((RAW / FILES[iso]).read_text(), parse_float=Decimal)
        assert not doc.get("error") and doc["count"] == 2 and len(doc["data"]) == 2, "Unexpected API shape or truncated result"
        assert {r["flowCode"] for r in doc["data"]} == {"M", "X"}
        for r in doc["data"]:
            expected = dict(typeCode="C", freqCode="A", period="2017", reporterCode=reporter, partnerCode=partner, partner2Code=0, cmdCode="TOTAL", customsCode="C00", motCode=0, classificationCode="H5")
            for key,value in expected.items():
                assert r[key] == value, f"Scope changed: {key}: {r[key]}"
            value = Decimal(str(r["primaryValue"]))
            assert value.is_finite() and value >= 0
            basis = "CIF" if r["flowCode"] == "M" else "FOB"
            assert Decimal(str(r["cifvalue" if basis == "CIF" else "fobvalue"])) == value
            records.append(dict(id=iso+"-"+r["flowCode"].lower(), reporter=iso.upper(), partner=("USA" if iso=="chn" else "CHN"), flow=r["flowCode"], value_usd=amount(value), basis=basis, year=2017, classification="H5", commodity="TOTAL", source_id=iso, is_reported=r["isReported"], is_aggregate=r["isAggregate"]))
    by_id={r["id"]:r for r in records}
    flows=[]
    for key,export_id,import_id in [("chn-usa","chn-x","usa-m"),("usa-chn","usa-x","chn-m")]:
        ex=Decimal(by_id[export_id]["value_usd"]);im=Decimal(by_id[import_id]["value_usd"])
        flows.append(dict(id=key, export_id=export_id, import_id=import_id, gap_usd=amount(im-ex)))
    # Verify the selected statement is really present, without generating political interpretation.
    china_text=re.sub(r"<[^>]+>", " ", (RAW / FILES["china"]).read_text())
    assert "US statistics exaggerate its deficit in trade in goods with China" in china_text
    assert "275.8" in china_text and "395.8" in china_text
    case=dict(id="usa-chn-2017", year=2017, retrieved_on=retrieved,
        edition="UN Comtrade public API / fixed retrieval snapshot "+retrieved,
        version_note="The API response provides no dataset release number. Retrieval date and SHA-256 identify this snapshot; it is not a reconstruction of the 2018 release.",
        scope=dict(type="Goods",frequency="Annual",currency="USD",classification="HS 2017 (H5)",commodity="TOTAL",adjustment="No CIF/FOB adjustment, time shift, interpolation, or reconciliation"),
        statements=[dict(id="us",source_id="ustr",published_on="2018-03-30",locator="China / Trade Summary / printed p.91, PDF p.99",quote="The U.S. goods trade deficit with China was $375.2 billion in 2017",quoted_amount_usd="375200000000",quote_kind="Reported 2018 statement, not recalculated from current data"),
                    dict(id="cn",source_id="china",published_on="2018-09",reposted_on="2018-10-15",locator="II. Clarifications / statistical divergence paragraph",quote="US statistics exaggerate its deficit in trade in goods with China.",quoted_china_surplus_usd="275800000000",quoted_us_deficit_usd="395800000000",quote_kind="Attributed position; quoted figures preserved as published, not verified as a common-basis comparison")],
        records=records,flows=flows,census=extract_census(),
        interpretation=dict(human_reviewed=False,text=None),sources=sources)
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(case,ensure_ascii=False,indent=2)+"\n")
    manifest_path.write_text(json.dumps(dict(retrieved_on=retrieved,files=sources),ensure_ascii=False,indent=2)+"\n")
    print(f"Built {OUT.relative_to(ROOT)}: {len(records)} original aggregates, {len(flows)} matched directions; snapshot {retrieved}")

if __name__ == "__main__":
    main()
