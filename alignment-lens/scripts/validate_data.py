"""Independent Decimal/stdlib recalculation from original CSV records.

Does not use aggregation caches or the build's integer parser. Reports the two
directions separately and preserves the exact summed source decimals.
"""
import csv
from decimal import Decimal, getcontext
import hashlib
import io
import json
from pathlib import Path
import random
import zipfile

BASE = Path(__file__).resolve().parent.parent
getcontext().prec = 50
RAW, DATA, REVIEW = BASE / "raw", BASE / "data", BASE / "review"


def main():
    meta = json.loads((DATA / "meta.json").read_text())
    countries = json.loads((DATA / "countries.json").read_text())
    candidates = [c["iso3"] for c in countries if 2023 in c["vote_years_available"] and 2023 in c["trade_years_available"] and c['iso3'] not in {'SRB','SCG','SDN','MNE','ANT','CUW','SXM','BES'}]
    examples = [("KOR","CHN"),("KOR","USA"),("DEU","RUS")]
    rng = random.Random(20261117)
    pairs = list(examples)
    while len(pairs) < 10:
        pair = tuple(sorted(rng.sample(candidates,2)))
        if pair not in pairs and pair[::-1] not in pairs:
            pairs.append(pair)
    years = [1995, 2010, 2023, 2024]
    selected = {c for pair in pairs for c in pair}
    source_codes = {}
    with (RAW / "country_codes_V202601.csv").open() as handle:
        for row in csv.DictReader(handle):
            if row["country_iso3"] in selected and '(...' not in row['country_name']:
                source_codes[int(row["country_code"])] = row["country_iso3"]
    # The validation sample is contemporary ISO3 countries without historical
    # aliases; assert this instead of reusing the build's mapping helper.
    assert len(source_codes) == len(selected), "Validation sample includes a historical alias; choose an independently resolvable sample"
    score = {}
    with (RAW / meta["sources"]["unga"]["filename"]).open() as handle:
        for row in csv.DictReader(handle):
            year = int(row["session"]) + 1945
            if row["iso3c"] in selected and year in years and row["IdealPointAll"] not in {"", "NA"}:
                score[(row["iso3c"],year)] = Decimal(row["IdealPointAll"])
    output = []
    with zipfile.ZipFile(RAW / "BACI_HS92_V202601.zip") as archive:
        for year in years:
            totals = {c: Decimal(0) for c in selected}
            values = {pair: Decimal(0) for pair in pairs}
            seen = {pair: False for pair in pairs}
            name = f"BACI_HS92_Y{year}_V202601.csv"
            print(f"Independent source scan: {year}", flush=True)
            with archive.open(name) as binary:
                for row in csv.DictReader(io.TextIOWrapper(binary,encoding="utf-8")):
                    a, b = source_codes.get(int(row["i"])), source_codes.get(int(row["j"]))
                    if a is None and b is None:
                        continue
                    value = Decimal(row["v"])
                    if a in totals:
                        totals[a] += value
                    if b in totals:
                        totals[b] += value
                    if a and b:
                        for pair in pairs:
                            if (a,b) == pair or (b,a) == pair:
                                values[pair] += value
                                seen[pair] = True
            for pair in pairs:
                a,b = pair
                for base,partner in [(a,b),(b,a)]:
                    payload=json.loads((DATA/'country'/f'{base}.json').read_text())
                    index=payload['years'].index(year)
                    expected_share=values[pair]/totals[base]*100 if seen[pair] and totals[base] else None
                    expected_dist=abs(score[(a,year)]-score[(b,year)]) if (a,year) in score and (b,year) in score else None
                    actual=payload['partners'][partner]
                    def matches(expected,observed):
                        return observed is None if expected is None else observed is not None and abs(float(expected)-observed) <= 1e-10
                    ok=matches(expected_share,actual['share'][index]) and matches(expected_dist,actual['dist'][index])
                    if not ok:
                        raise AssertionError(f'Independent mismatch {base}/{partner}/{year}')
                    output.append(dict(base=base,partner=partner,year=year,kind='example' if pair in examples else 'seeded_random',
                        bilateral_value_thousand_usd=str(values[pair]) if seen[pair] else None,
                        total_trade_thousand_usd=str(totals[base]),
                        score_base=str(score[(base,year)]) if (base,year) in score else None,
                        score_partner=str(score[(partner,year)]) if (partner,year) in score else None,
                        distance=str(expected_dist) if expected_dist is not None else None,
                        share_percent=str(expected_share) if expected_share is not None else None,
                        rendered_data_distance=actual['dist'][index],rendered_data_share=actual['share'][index],passed=ok))
    report=dict(seed=20261117,pairs=pairs,years=years,method='Independent standard-library CSV scan and Decimal arithmetic on original BACI and UN CSV; not a human hand calculation.',
        tolerance_absolute=1e-10,sources=meta['sources'],rows=output,passed=True)
    (REVIEW/'independent-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    lines=['# 원자료 독립 재계산 대조','', '예시 3쌍과 고정 시드 무작위 7쌍. 원 CSV를 다시 읽고 Decimal로 합산했다. 사람이 손으로 계산한 결과라고 부르지 않는다. 분자·분모·두 점수를 공개해 수동 재계산할 수 있게 한다.','',
           '출처: UNGA Dataverse 39판 내 Jun2024 전체 투표 점수 / BACI, CEPII HS92 V202601. 값의 단위는 교역액 천 USD, 교역 비중 %, 거리 원점수 차이.','',
           '| 기준국 | 상대국 | 연도 | 양방향 교역액 | 기준국 전체 교역 | 외교 거리 | 교역 비중 % | 대조 |','|---|---|---|---|---|---|---|---|']
    for r in output:
        lines.append(f"| {r['base']} | {r['partner']} | {r['year']} | {r['bilateral_value_thousand_usd']} | {r['total_trade_thousand_usd']} | {r['distance'] if r['distance'] is not None else '자료 없음'} | {r['share_percent']} | 일치 |")
    (REVIEW/'independent-validation.md').write_text('\n'.join(lines)+'\n')
    print(f"PASS: {len(pairs)} pairs × {len(years)} source years × both directions",flush=True)


if __name__=='__main__':
    main()
