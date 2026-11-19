#!/usr/bin/env python3
"""Official raw BACI HS92 + selected UNGA estimates -> static country JSON.

No imputation, inferred zero records, vote re-estimation or generated commentary.
Preserves literal decimal source amounts with Decimal; no decimal truncation.
"""
import argparse
import csv
import hashlib
import io
import json
from collections import defaultdict
from datetime import datetime
from decimal import Decimal, getcontext
from fractions import Fraction
from pathlib import Path
import zipfile
from zoneinfo import ZoneInfo

import pandas as pd

from data_rules import SourceConflict, comparison_windows, trade_identity, vote_identity, spearman_coefficient

BASE = Path(__file__).resolve().parent.parent
RAW, DATA = BASE / "raw", BASE / "data"
getcontext().prec = 50


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":"), indent=2 if path.name in {'meta.json','countries.json'} else None, allow_nan=False) + "\n", encoding="utf-8")
    temporary.replace(path)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def decimal_values(values):
    amounts = values.map(Decimal)
    if not amounts.map(lambda value: value.is_finite() and value > 0).all():
        raise SourceConflict("Unexpected nonpositive or nonfinite BACI flow")
    return amounts


def aggregate_year(archive, info, year, cache, force):
    path = cache / f"{year}.json"
    signature = {"crc32": info.CRC, "bytes": info.file_size, "arithmetic": "literal_decimal_precision_50", "revision": 2}
    if path.exists() and not force:
        saved = read_json(path)
        if saved.get("source") == signature:
            print(f"BACI {year}: verified aggregation cache", flush=True)
            return saved
    pairs, rows, raw_total = defaultdict(Decimal), 0, Decimal(0)
    with archive.open(info) as source:
        header = source.readline().decode("utf-8-sig").strip().split(",")
        if header != ["t", "i", "j", "k", "v", "q"]:
            raise SourceConflict(f"Unexpected BACI columns: {header}")
    # Reading the full ZIP member to EOF verifies its published-in-archive CRC.
    with archive.open(info) as source:
        for chunk in pd.read_csv(source, usecols=["t", "i", "j", "v"],
                                 dtype={"t": "uint16", "i": "uint16", "j": "uint16", "v": "string"},
                                 chunksize=500000, keep_default_na=False):
            if not (chunk["t"] == year).all():
                raise SourceConflict(f"Year column disagrees with member filename {year}")
            chunk["units"] = decimal_values(chunk["v"])
            grouped = chunk.groupby(["i", "j"], sort=False)["units"].sum()
            for (exporter, importer), value in grouped.items():
                pairs[(int(exporter), int(importer))] += value
            rows += len(chunk)
            raw_total += chunk["units"].sum()
    if raw_total != sum(pairs.values()):
        raise ValueError("Raw flow conservation failed")
    saved = dict(year=year, source=signature, rows=rows, raw_total_units=str(raw_total),
                 pairs=[[i, j, str(value)] for (i, j), value in sorted(pairs.items())])
    dump(path, saved)
    print(f"BACI {year}: {rows:,} source rows -> {len(pairs):,} directed pairs; CRC and conservation passed", flush=True)
    return saved


def build(force=False):
    meta = read_json(DATA / "meta.json")
    years = list(range(meta["period"]["start"], max(meta["period"]["vote_end"], meta["period"]["trade_end"]) + 1))
    with (RAW / meta["sources"]["baci"]["country_file"]).open(encoding="utf-8-sig", newline="") as handle:
        country_rows = list(csv.DictReader(handle))
    raw_codes = {int(r["country_code"]): r for r in country_rows}
    names = read_json(BASE / "scripts/country-labels.json")
    source_file = RAW / meta["sources"]["unga"]["filename"]
    if hashlib.md5(source_file.read_bytes()).hexdigest() != meta["sources"]["unga"]["checksum"]["value"]:
        raise SourceConflict("Selected UN source checksum mismatch")
    year_map = {int(k): v for k, v in meta["sources"]["unga"]["year_mapping"]["session_years"].items()}
    scores, vote_scopes, cow_map = {}, {}, {}
    with source_file.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            year = year_map[int(row["session"])]
            if year not in years:
                continue
            identity = vote_identity(row["iso3c"], row["ccode"], year)
            if identity is None or row["IdealPointAll"] in {"", "NA"}:
                continue
            key = (identity.iso3, year)
            if key in scores:
                raise SourceConflict(f"Duplicate country-year score: {key}")
            scores[key] = Decimal(row["IdealPointAll"])
            vote_scopes[key] = identity.scope
            cow_map[(int(row["ccode"]), year)] = identity.iso3

    archive_path = RAW / "BACI_HS92_V202601.zip"
    directory = read_json(RAW / "baci-zip-directory.json")
    if not archive_path.exists() or archive_path.stat().st_size != directory["size"]:
        raise FileNotFoundError("Official BACI archive is incomplete. Run scripts/download_baci.py first.")
    expected = {r["name"]: r for r in directory["files"]}
    cache = RAW / "aggregates"
    flows, exports, imports, trade_scopes = {}, {}, {}, {}
    aggregation_audit = []
    observed_codes = defaultdict(set)
    with zipfile.ZipFile(archive_path) as archive:
        for year in years:
            filename = f"BACI_HS92_Y{year}_V202601.csv"
            if filename not in expected:
                continue
            info = archive.getinfo(filename)
            if info.CRC != expected[filename]["crc32"] or info.file_size != expected[filename]["size"]:
                raise SourceConflict(f"Archive directory disagrees with HTTPS source manifest: {filename}")
            aggregated = aggregate_year(archive, info, year, cache, force)
            directed, ex, im = defaultdict(Decimal), defaultdict(Decimal), defaultdict(Decimal)
            mapping = {}
            actual_codes = {code for i, j, _ in aggregated["pairs"] for code in (i, j)}
            for code in sorted(actual_codes):
                if code not in raw_codes:
                    raise SourceConflict(f"BACI code missing from same-version table: {code}")
                identity = trade_identity(code, raw_codes[code]["country_iso3"], year)
                mapping[code] = identity
                observed_codes[code].add(year)
                if identity.iso3:
                    key = (identity.iso3, year)
                    if key in trade_scopes and trade_scopes[key] != identity.scope:
                        raise SourceConflict(f"Conflicting geographical scopes for {key}")
                    trade_scopes[key] = identity.scope
            for i, j, value in aggregated["pairs"]:
                value = Decimal(value)
                a, b = mapping[i], mapping[j]
                # Every partner's raw flow, including aggregate partners, stays
                # in the identifiable base country's export/import denominator.
                if a.iso3:
                    ex[a.iso3] += value
                if b.iso3:
                    im[b.iso3] += value
                if a.iso3 and b.iso3:
                    directed[(a.iso3, b.iso3)] += value
            flows[year], exports[year], imports[year] = dict(directed), dict(ex), dict(im)
            aggregation_audit.append(dict(year=year, source_rows=aggregated["rows"],
                raw_total_units=aggregated["raw_total_units"],
                raw_directed_pairs=len(aggregated["pairs"]), crc32_verified=True,
                identifiable_export_units=str(sum(ex.values())), identifiable_import_units=str(sum(im.values()))))

    agreement = {}
    agreement_path = RAW / meta["sources"]["agreement"]["filename"]
    if hashlib.md5(agreement_path.read_bytes()).hexdigest() != meta["sources"]["agreement"]["checksum"]["value"]:
        raise SourceConflict("Agreement source checksum mismatch")
    with agreement_path.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            year = int(row["year"])
            if year not in years or row["agree"] in {"", "NA"}:
                continue
            a = cow_map.get((int(row["ccode1"]), year))
            b = cow_map.get((int(row["ccode2"]), year))
            if a and b and a != b:
                key = (min(a, b), max(a, b), year)
                value = float(row["agree"])
                if key in agreement and agreement[key] != value:
                    raise SourceConflict(f"Conflicting agreement scores for {key}")
                agreement[key] = value

    codes = sorted({c for c, y in scores} | {c for c, y in trade_scopes})
    def total(code, year):
        amount = exports.get(year, {}).get(code, 0) + imports.get(year, {}).get(code, 0)
        return amount if (code, year) in trade_scopes else None

    def share(a, b, year):
        denominator = total(a, year)
        ab, ba = flows.get(year, {}).get((a, b)), flows.get(year, {}).get((b, a))
        if not denominator or (ab is None and ba is None):
            return None
        return float(((ab or 0) + (ba or 0)) / denominator * 100)

    transition = meta["comparison"]["transition_years_excluded_from_windows"]
    def summary(a, b, distance, shares, require_votes):
        valid, scopes = [], []
        for index, year in enumerate(years):
            sa, sb = trade_scopes.get((a, year)), trade_scopes.get((b, year))
            ok = shares[index] is not None and share(b, a, year) is not None and bool(sa and sb)
            if require_votes:
                ok = ok and distance[index] is not None and vote_scopes.get((a, year)) == sa and vote_scopes.get((b, year)) == sb
            ok = ok and year not in transition.get(a, []) and year not in transition.get(b, [])
            valid.append(ok)
            scopes.append(f"{sa}|{sb}" if sa and sb else None)
        windows = comparison_windows(years, valid, scopes)
        if not windows:
            return None
        first, last = [years.index(y) for y in windows["first"]], [years.index(y) for y in windows["last"]]
        result = dict(years_first=windows["first"], years_last=windows["last"])
        for label, array in [("share", shares)] + ([("dist", distance)] if require_votes else []):
            def exact(index):
                year = years[index]
                if label == 'share':
                    amount=flows[year].get((a,b),0)+flows[year].get((b,a),0)
                    return Fraction(amount)/Fraction(total(a,year))*100
                return Fraction(abs(scores[(a,year)]-scores[(b,year)]))
            start=sum((exact(i) for i in first),Fraction(0))/3
            end=sum((exact(i) for i in last),Fraction(0))/3
            result[label + "_first"] = float(start)
            result[label + "_last"] = float(end)
            result[label + "_change"] = float(end-start)
        return result

    catalog = []
    for a in codes:
        partners = {}
        for b in codes:
            if b == a:
                continue
            distance = [float(abs(scores[(a, y)] - scores[(b, y)])) if (a, y) in scores and (b, y) in scores else None for y in years]
            shares = [share(a, b, y) for y in years]
            values, export_share, import_share = [], [], []
            for year in years:
                ab, ba = flows.get(year, {}).get((a, b)), flows.get(year, {}).get((b, a))
                values.append(float((ab or 0) + (ba or 0)) if ab is not None or ba is not None else None)
                ex, im = exports.get(year, {}).get(a), imports.get(year, {}).get(a)
                export_share.append(float(ab / ex * 100) if ab is not None and ex else None)
                import_share.append(float(ba / im * 100) if ba is not None and im else None)
            partners[b] = dict(dist=distance, share=shares, share_export=export_share, share_import=import_share,
                trade_scope=[trade_scopes.get((b,y)) for y in years],
                value=values, agreement=[agreement.get((min(a,b), max(a,b), y)) for y in years],
                comparison=summary(a, b, distance, shares, True), trade_comparison=summary(a, b, distance, shares, False))
        payload = dict(iso3=a, years=years, score=[float(scores[(a,y)]) if (a,y) in scores else None for y in years],
            total_trade=[float(total(a,y)) if total(a,y) is not None else None for y in years],
            total_export=[float(exports.get(y,{}).get(a,0)) if (a,y) in trade_scopes else None for y in years],
            total_import=[float(imports.get(y,{}).get(a,0)) if (a,y) in trade_scopes else None for y in years],
            vote_scope=[vote_scopes.get((a,y)) for y in years], trade_scope=[trade_scopes.get((a,y)) for y in years],
            partners=partners)
        correlations=[spearman_coefficient([v['dist'][i] for v in partners.values()],
                                           [v['share'][i] for v in partners.values()]) for i in range(len(years))]
        payload['rank_correlation']=[r[0] for r in correlations]
        payload['rank_correlation_n']=[r[1] for r in correlations]
        dump(DATA / "country" / f"{a}.json", payload)
        vy, ty = [y for y in years if (a,y) in scores], [y for y in years if (a,y) in trade_scopes]
        catalog.append(dict(iso3=a, name_ko=names[a]["name_ko"], name_en=names[a]["name_en"],
            aliases=names[a].get('aliases',[]),
            vote_years=[min(vy),max(vy)] if vy else None, trade_years=[min(ty),max(ty)] if ty else None,
            vote_years_available=vy, trade_years_available=ty))
        print(f"Country JSON: {a}", flush=True)
    dump(DATA / "countries.json", catalog)
    if not (DATA / "interpretations.json").exists():
        dump(DATA / "interpretations.json", {})
    now = datetime.now(ZoneInfo("Asia/Seoul")).isoformat(timespec="seconds")
    meta["generated_at"], meta["status"], meta["pending"] = now, "data_ready_pair_review", ["pair_screen_review"]
    meta.setdefault("design", dict(selection="User-annotated globe-first comparison landing", selected_on="2026-11-18", ship_hero=False, services_remain_separate=True))
    meta["service_name"] = "PARALLEL"
    example_year = meta["period"]["vote_end"]
    if ("KOR",example_year) in scores and ("CHN",example_year) in scores:
        score_a, score_b = scores[("KOR",example_year)], scores[("CHN",example_year)]
        meta["method_example"] = dict(year=example_year, country_a="KOR", country_b="CHN", score_a=float(score_a), score_b=float(score_b), distance=float(abs(score_a-score_b)), source_file=meta["sources"]["unga"]["filename"], source_version=meta["sources"]["unga"]["version"])
    else:
        meta.pop("method_example", None)
    meta["sources"]["baci"]["trade_downloaded_on"] = datetime.fromtimestamp(archive_path.stat().st_mtime,ZoneInfo("Asia/Seoul")).date().isoformat()
    meta["sources"]["baci"]["archive_sha256"] = hashlib.file_digest(archive_path.open("rb"),"sha256").hexdigest()
    meta["value_unit"] = "thousand USD"
    meta["aggregation"] = dict(source_record_absence="null", arithmetic="literal_Decimal_sum_precision_50_and_exact_Fraction_window_comparison", countries=len(codes))
    dump(DATA / "meta.json", meta)
    dump(BASE / "review" / "build-audit.json", dict(generated_at=now, years=aggregation_audit,
        observed_baci_codes={str(k):sorted(v) for k,v in observed_codes.items()},
        limitations=["Point estimates are descriptive, not causal estimates.","Full independent source validation is recorded separately."]))
    print(f"Built {len(codes)} country files, {years[0]}–{years[-1]}. No invented observations.", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="Re-read every raw CSV instead of validated aggregation caches")
    args = parser.parse_args()
    try:
        build(args.force)
    except SourceConflict as error:
        dump(BASE / "review" / "source-conflict.json", dict(error=str(error), action="build_stopped_no_automatic_substitution"))
        raise
