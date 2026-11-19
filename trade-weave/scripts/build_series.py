"""Build year/product snapshots from the official BACI HS22 ZIP.

Usage: python3 scripts/build_series.py
Raw archives stay in raw/. The catalog is published after all snapshots validate.
"""

import argparse
from collections import defaultdict
import csv
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_EVEN, getcontext
import hashlib
import io
import json
from pathlib import Path
import re
from zipfile import ZipFile

getcontext().prec = 50
BASE = Path(__file__).resolve().parent.parent
PRODUCTS = json.loads((BASE / "scripts/product-scopes.json").read_text())


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temporary.replace(path)


def rounded(value):
    return int(value.to_integral_value(rounding=ROUND_HALF_EVEN))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, default=BASE / "raw/BACI_HS22_V202601.zip")
    args = parser.parse_args()
    version_match = re.fullmatch(r"BACI_HS22_V(\d{6})\.zip", args.archive.name)
    if not version_match:
        parser.error("Use the official BACI_HS22_VYYYYMM.zip archive name.")
    version = version_match[1]
    legacy = json.loads((BASE / "data/trade-2024.json").read_text())
    labels = {code: {key: value for key, value in country.items() if key in ("ko", "en", "num")}
              for code, country in legacy["countries"].items()}
    source = "CEPII BACI (Gaulier & Zignago, 2010), UN Comtrade 기반"
    archive_url = f"https://www.cepii.fr/DATA_DOWNLOAD/baci/data/{args.archive.name}"
    snapshots = {}
    audit = {"archive": args.archive.name, "url": archive_url, "version": version,
             "arithmetic": "Decimal precision 50; per-pair half-even rounding to integer thousand USD", "years": {}}
    used_codes = set()
    code_to_iso = {}
    code_to_en = {}
    with ZipFile(args.archive) as archive:
        code_file = f"country_codes_V{version}.csv"
        for row in csv.DictReader(io.StringIO(archive.read(code_file).decode("utf-8-sig"))):
            number = int(row["country_code"])
            code_to_iso[number] = row["country_iso3"]
            code_to_en[number] = row["country_name"]
        files = sorted((int(match[1]), name) for name in archive.namelist()
                       if (match := re.fullmatch(rf"BACI_HS22_Y(\d{{4}})_V{version}\.csv", name)))
        if not files:
            raise ValueError("No HS22 yearly source files found.")
        for year, filename in files:
            totals = {product["id"]: defaultdict(Decimal) for product in PRODUCTS}
            record_count = 0
            with archive.open(filename) as stream:
                reader = csv.DictReader(io.TextIOWrapper(stream, encoding="utf-8-sig", newline=""))
                for row in reader:
                    if int(row["t"]) != year:
                        raise ValueError(f"Unexpected year in {filename}")
                    exporter, importer = int(row["i"]), int(row["j"])
                    code = row["k"].zfill(6)
                    value = Decimal(row["v"])
                    if not value.is_finite() or value <= 0 or not re.fullmatch(r"\d{6}", code):
                        raise ValueError(f"Invalid value or HS code in {filename}")
                    key = (exporter, importer)
                    used_codes.update(key)
                    totals["all"][key] += value
                    for prefix in (code[:2], code[:4]):
                        if prefix in totals:
                            totals[prefix][key] += value
                    record_count += 1
            info = archive.getinfo(filename)
            audit["years"][str(year)] = {"rows": record_count, "crc32": info.CRC, "bytes": info.file_size,
                                           "full_zip_entry_read": True, "products": {}}
            for product in PRODUCTS:
                product_id = product["id"]
                pairs = [(code_to_iso[a], code_to_iso[b], rounded(value))
                         for (a, b), value in sorted(totals[product_id].items(), key=lambda entry: (-entry[1], entry[0]))
                         if rounded(value) > 0]
                snapshots[(year, product_id)] = pairs
                audit["years"][str(year)]["products"][product_id] = {
                    "pairs": len(pairs), "raw_total_thousand_usd": str(sum(totals[product_id].values())),
                    "rounded_total_thousand_usd": sum(value for _, _, value in pairs),
                }
            print(f"Aggregated {year}: {record_count:,} source rows; ZIP entry CRC verified", flush=True)

    for number in sorted(used_codes):
        iso = code_to_iso[number]
        if iso not in labels:
            labels[iso] = {"ko": code_to_en[number], "en": code_to_en[number], "num": None}

    legacy_year = legacy["meta"]["year"]
    legacy_key = (legacy_year, "all")
    legacy_version = legacy["meta"]["version"] == f"HS22 V{version}"
    if legacy_version and legacy_key in snapshots:
        original = {(a, b): value for a, country in legacy["countries"].items() for b, value in country["x"]}
        regenerated = {(a, b): value for a, b, value in snapshots[legacy_key]}
        differences = [(a, b, original.get((a, b)), regenerated.get((a, b)))
                       for a, b in sorted(set(original) | set(regenerated))
                       if original.get((a, b)) != regenerated.get((a, b))]
        audit["legacy_differences"] = differences
        write_json(BASE / "raw/series-build-audit.json", audit)
        if differences:
            raise ValueError(f"Legacy snapshot differs in {len(differences)} pairs. Inspect raw/series-build-audit.json.")

    dataset_paths = {}
    for (year, product_id), pairs in snapshots.items():
        countries = {iso: dict(country, x=[], m=[]) for iso, country in labels.items()}
        for exporter, importer, value in pairs:
            countries[exporter]["x"].append([importer, value])
            countries[importer]["m"].append([exporter, value])
        product = next(item for item in PRODUCTS if item["id"] == product_id)
        meta = {"source": source, "version": f"HS22 V{version}", "classification": "HS22", "year": year,
                "scope": product["scope"], "product": product_id, "unit": "천 미국 달러(경상)",
                "license": "Etalab Open Licence 2.0", "archive_url": archive_url,
                "source_file": f"BACI_HS22_Y{year}_V{version}.csv",
                "precision": "나라 쌍별 합계를 천 달러 정수로 반올림. 반올림 후 0인 값은 제외.",
                "note": "x=수출, m=수입. 대만은 Other Asia, nes(S19). 기록 없음과 실제 0을 구분해 해석해야 합니다."}
        relative = f"series/HS22-V{version}/{year}/{product_id}.json"
        if legacy_version and (year, product_id) == legacy_key:
            relative = "trade-2024.json"
        else:
            write_json(BASE / "data" / relative, {"meta": meta, "countries": countries})
        dataset_paths[f"{year}/{product_id}"] = relative

    years = sorted({year for year, _ in snapshots})
    with args.archive.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    catalog = {"schema": 1, "default": {"year": max(years), "product": "all"}, "years": years,
               "products": PRODUCTS, "countries": labels, "datasets": dataset_paths,
               "source": source, "version": f"HS22 V{version}", "classification": "HS22",
               "unit": "천 미국 달러(경상)", "license": "Etalab Open Licence 2.0", "archive_url": archive_url,
               "archive_sha256": digest, "built_on": datetime.now(timezone.utc).date().isoformat()}
    audit["archive_sha256"] = digest
    write_json(BASE / "raw/series-build-audit.json", audit)
    write_json(BASE / "data/catalog.json", catalog)
    print(f"Published {len(dataset_paths)} snapshots across {years}, {len(labels)} country labels.", flush=True)


if __name__ == "__main__":
    main()
