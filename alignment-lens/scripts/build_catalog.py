#!/usr/bin/env python3
"""Public annual totals only. Refresh explicitly; keep dated responses and snapshots."""
import argparse, hashlib, json, subprocess, time
from decimal import Decimal
from datetime import datetime
from pathlib import Path
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

ROOT=Path(__file__).resolve().parents[1]
COUNTRIES={156:'CHN',410:'KOR',842:'USA'}
YEARS=[2017,2018,2023]
def dump(x):return json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':'))
def sha(b):return hashlib.sha256(b).hexdigest()
def amount(v):return format(Decimal(str(v)),'f').removesuffix('.0')
def build(fetch=False):
    now=datetime.now(ZoneInfo('Asia/Seoul')).date().isoformat()
    base=ROOT/'raw'/'workbench'
    pointer=base/'latest.json'
    date=now if fetch else json.loads(pointer.read_text())['retrieved_on']
    raw=base/date;raw.mkdir(parents=True,exist_ok=True)
    manifest=[];records=[]
    for reporter,iso in COUNTRIES.items():
        partners=[n for n in COUNTRIES if n!=reporter]
        for year in YEARS:
            query=dict(period=year,reporterCode=reporter,cmdCode='TOTAL',flowCode='X,M',partnerCode=','.join(map(str,partners)),partner2Code=0,customsCode='C00',motCode=0,maxRecords=500)
            url='https://comtradeapi.un.org/public/v1/preview/C/A/HS?'+urlencode(query)
            p=raw/f'{reporter}-{year}.json'
            if fetch:
                time.sleep(2)  # Respect public-preview rate limits; no concurrent requests.
                temp=p.with_suffix('.part')
                subprocess.run(['curl','-fLsS','--retry','2','--max-time','45',url,'-o',str(temp)],check=True)
                # Only replace a cached response after parsing a successful, complete response.
                probe=json.loads(temp.read_text())
                if probe.get('error') or probe.get('count')!=4:raise ValueError(f'Incomplete {reporter}/{year}: {probe.get("error")}')
                temp.replace(p)
            body=p.read_bytes();doc=json.loads(body,parse_float=Decimal)
            if doc.get('error') or doc.get('count')!=4 or len(doc['data'])!=4:raise ValueError('Incomplete response')
            seen=set()
            for r in doc['data']:
                for key,value in dict(typeCode='C',freqCode='A',reporterCode=reporter,refYear=year,cmdCode='TOTAL',partner2Code=0,customsCode='C00',motCode=0).items():
                    if r.get(key)!=value:raise ValueError(f'Scope mismatch {key}')
                if r['partnerCode'] not in partners or r['flowCode'] not in ['X','M']:raise ValueError('Unexpected partner or flow')
                key=(r['partnerCode'],r['flowCode'])
                if key in seen:raise ValueError('Duplicate record')
                seen.add(key)
                val=r.get('primaryValue');basis='CIF' if r['flowCode']=='M' else 'FOB'
                if val is None or not Decimal(str(val)).is_finite() or Decimal(str(val))<0:raise ValueError('Missing/invalid amount')
                if r.get('cifvalue' if basis=='CIF' else 'fobvalue')!=val:raise ValueError('Price field does not match primaryValue')
                other=COUNTRIES[r['partnerCode']];origin,destination=(iso,other) if r['flowCode']=='X' else (other,iso)
                records.append(dict(id=f'un-{iso}-{other}-{year}-{r["flowCode"]}',origin=origin,destination=destination,reporter=iso,partner=other,flow=r['flowCode'],year=year,frequency='A',commodity='TOTAL',classification=r['classificationCode'],currency='USD',unit='1',valuation=basis,value=amount(val),publisher='UN Comtrade',retrieved_on=date,edition='Public API snapshot '+date,source_url=url,source_hash=sha(body),reported=r['isReported'],aggregate=r['isAggregate'],original_classification=r['isOriginalClassification'],partner_basis=None,trade_system=None,released_on=None))
            manifest.append(dict(file=p.name,url=url,sha256=sha(body)))
            print(iso,year,'verified',flush=True)
    # The separately dated Census table is a different publisher/vintage; never relabel it as Comtrade.
    case=json.loads((ROOT/'data/cases/usa-chn-2017.json').read_text())
    s=next(s for s in case['sources'] if s['id']=='census')
    for flow,field,basis in [('X','export_usd','FAS'),('M','import_usd','customs value')]:
        origin,destination=('USA','CHN') if flow=='X' else ('CHN','USA')
        records.append(dict(id='census-USA-CHN-2017-'+flow,origin=origin,destination=destination,reporter='USA',partner='CHN',flow=flow,year=2017,frequency='A',commodity='TOTAL',classification=None,currency='USD',unit='1',valuation=basis,value=case['census'][field],publisher='US Census',retrieved_on=s['retrieved_on'],edition='2017 table / snapshot '+s['retrieved_on'],source_url=s['url'],source_hash=s['sha256'],reported=None,aggregate=True,original_classification=None,partner_basis=None,trade_system=None,released_on=None))
    result=dict(schema_version=1,generated_on=date,countries=[dict(iso3='CHN',name_ko='중국',name_en='China'),dict(iso3='KOR',name_ko='한국',name_en='South Korea'),dict(iso3='USA',name_ko='미국',name_en='United States')],records=sorted(records,key=lambda r:r['id']))
    result['snapshot_id']=sha(dump(result).encode())
    out=ROOT/'data/workbench';(out/'snapshots').mkdir(parents=True,exist_ok=True)
    frozen=out/'snapshots'/(result['snapshot_id']+'.json')
    payload=json.dumps(result,ensure_ascii=False,indent=2)+'\n'
    if frozen.exists() and frozen.read_text()!=payload:raise ValueError('Immutable snapshot collision')
    if not frozen.exists():frozen.write_text(payload)
    if not fetch:
        old=json.loads((raw/'manifest.json').read_text())
        if manifest!=old['files']:raise ValueError('Raw hashes changed; restore inputs or fetch explicitly')
    (out/'catalog.json').write_text(payload)
    (raw/'manifest.json').write_text(json.dumps(dict(retrieved_on=date,files=manifest),indent=2))
    pointer.write_text(json.dumps(dict(retrieved_on=date)))
    print(f'Built {len(records)} observations, snapshot {result["snapshot_id"]}')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--fetch',action='store_true');build(p.parse_args().fetch)
