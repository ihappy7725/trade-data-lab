#!/usr/bin/env python3
"""Extend the original CrossCite catalog with UN Comtrade annual HS records."""
import argparse
import json
import subprocess
import time
from datetime import datetime
from decimal import Decimal
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

from build_catalog import COUNTRIES, ROOT, amount, dump, sha

YEARS = range(2017, 2024)
CHAPTERS = ('84', '85', '87')
BASE = ROOT / 'data/workbench'
ORIGINAL = 'bc3fcd2a96675ebd32144f8662f2338985b23a6df489a6e064b44bbb9a3d5cab'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fetch', action='store_true')
    parser.add_argument('--date', default=datetime.now(ZoneInfo('Asia/Seoul')).date().isoformat())
    args = parser.parse_args()
    date = datetime.strptime(args.date, '%Y-%m-%d').date().isoformat()
    raw = ROOT / 'raw/workbench' / ('expansion-' + date)
    raw.mkdir(parents=True, exist_ok=True)
    manifest = raw / 'manifest.json'
    if not args.fetch and not manifest.is_file():
        raise SystemExit('Missing saved input manifest. Run with --fetch for the first collection.')
    original = json.loads((BASE / 'snapshots' / (ORIGINAL + '.json')).read_text())
    existing = {r['id']: r for r in original['records']}
    additions, files = [], []
    for reporter, iso in COUNTRIES.items():
        partners = [code for code in COUNTRIES if code != reporter]
        for year in YEARS:
            codes = CHAPTERS if year in (2017, 2018, 2023) else ('TOTAL', *CHAPTERS)
            query = dict(period=year, reporterCode=reporter, cmdCode=','.join(codes),
                         flowCode='X,M', partnerCode=','.join(map(str, partners)),
                         partner2Code=0, customsCode='C00', motCode=0, maxRecords=500)
            url = 'https://comtradeapi.un.org/public/v1/preview/C/A/HS?' + urlencode(query)
            path = raw / f'{reporter}-{year}.json'
            if args.fetch and not path.exists():
                time.sleep(3)
                temp = path.with_suffix('.part')
                subprocess.run(['curl','-fsSL','--retry','6','--retry-max-time','180',
                                '--max-time','30',url,'-o',str(temp)], check=True)
                parsed = json.loads(temp.read_text())
                if parsed.get('error') or not parsed.get('data'):
                    raise ValueError(f'Empty or failed API response: {reporter}/{year}')
                temp.replace(path)
            body = path.read_bytes()
            doc = json.loads(body, parse_float=Decimal)
            rows = doc['data']
            if doc.get('error') or doc['count'] != len(rows) or not 0 < len(rows) <= 4 * len(codes):
                raise ValueError(f'Unexpected response size: {path.name}')
            seen = set()
            for r in rows:
                cmd, flow, partner = r['cmdCode'], r['flowCode'], r['partnerCode']
                checks = dict(typeCode='C', freqCode='A', reporterCode=reporter, refYear=year,
                              partner2Code=0, customsCode='C00', motCode=0)
                if any(r.get(k) != v for k,v in checks.items()):
                    raise ValueError(f'Scope mismatch: {path.name}')
                key = cmd, flow, partner
                if cmd not in codes or flow not in ('M','X') or partner not in partners or key in seen:
                    raise ValueError(f'Unexpected or duplicate record: {path.name} {key}')
                seen.add(key)
                other = COUNTRIES[partner]
                origin, destination = (iso, other) if flow == 'X' else (other, iso)
                basis, field = ('FOB','fobvalue') if flow == 'X' else ('CIF','cifvalue')
                val = r.get('primaryValue')
                if val is None or not Decimal(str(val)).is_finite() or val < 0 or val != r.get(field):
                    raise ValueError(f'Invalid price field: {path.name} {key}')
                classification = r.get('classificationCode')
                if cmd != 'TOTAL' and (classification not in ('H5','H6') or r.get('isOriginalClassification') is not True):
                    raise ValueError(f'Unexpected chapter classification: {path.name} {key}')
                tag = '' if cmd == 'TOTAL' else '-' + cmd
                additions.append(dict(id=f'un-{iso}-{other}-{year}-{flow}{tag}',
                    origin=origin,destination=destination,reporter=iso,partner=other,flow=flow,
                    year=year,frequency='A',commodity=cmd,classification=classification,
                    currency='USD',unit='1',valuation=basis,value=amount(val),publisher='UN Comtrade',
                    retrieved_on=date,edition='Public API snapshot '+date,source_url=url,source_hash=sha(body),
                    reported=r['isReported'],aggregate=r['isAggregate'],
                    original_classification=r['isOriginalClassification'],partner_basis=None,trade_system=None,released_on=None))
            files.append(dict(file=path.name,url=url,sha256=sha(body)))
            print(iso,year,len(rows),'verified',flush=True)

    # A selectable comparison requires both reports and, for a chapter, the same HS edition.
    index = {(r['origin'],r['destination'],r['year'],r['commodity'],r['classification'] if r['commodity']!='TOTAL' else None,r['flow']):r for r in additions}
    eligible = [r for key,r in index.items() if (*key[:-1], 'M' if key[-1]=='X' else 'X') in index]
    if len(index) != len(additions) or not eligible or any(r['id'] in existing for r in eligible):
        raise ValueError('Empty expansion or original ID collision')
    result = dict(schema_version=1,generated_on=date,countries=original['countries'],
                  records=sorted([*existing.values(),*eligible],key=lambda r:r['id']))
    result['snapshot_id'] = sha(dump(result).encode())
    payload = json.dumps(result,ensure_ascii=False,indent=2)+'\n'
    frozen = BASE / 'snapshots' / (result['snapshot_id']+'.json')
    if manifest.exists() and json.loads(manifest.read_text()) != files:
        raise ValueError('Input hashes changed')
    manifest.write_text(json.dumps(files,indent=2)+'\n')
    if frozen.exists() and frozen.read_text() != payload:
        raise ValueError('Immutable snapshot collision')
    if not frozen.exists():
        frozen.write_text(payload)
    (BASE/'catalog.json').write_text(payload)
    print(f'{len(eligible)} new records; {len(additions)-len(eligible)} excluded; snapshot {result["snapshot_id"]}')


if __name__ == '__main__':
    main()
