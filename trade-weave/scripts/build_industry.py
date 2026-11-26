"""Build country-sized HS2 composition slices from the existing, rounded BACI snapshots."""
import gzip, hashlib, json
from pathlib import Path
BASE = Path(__file__).resolve().parents[1]

def build():
    catalog = json.loads((BASE / 'data/catalog.json').read_text())
    chapters = [p['id'] for p in catalog['products'] if p.get('level') == 2]
    countries = list(catalog['countries'])
    payloads = {code: {'schema': 1, 'country': code, 'version': catalog['version'],
                      'archive_sha256': catalog['archive_sha256'], 'unit': catalog['unit'], 'years': {}} for code in countries}
    source_hashes = {}
    for year in catalog['years']:
        for product in ['all', *chapters]:
            filename = catalog['datasets'][f'{year}/{product}']
            raw = (BASE / 'data' / filename).read_bytes()
            source_hashes[filename] = hashlib.sha256(raw).hexdigest()
            data = json.loads(raw)
            for code in countries:
                row = data['countries'].get(code, {'x': [], 'm': []})
                target = payloads[code]['years'].setdefault(str(year), {'all': None, 'chapters': []})
                value = [row['x'], row['m']]
                if product == 'all':
                    target['all'] = value
                else:
                    target['chapters'].append([product, *value])
    out = BASE / 'data/industry/HS22-V202601'
    out.mkdir(parents=True, exist_ok=True)
    files = {}
    for code, payload in payloads.items():
        raw = json.dumps(payload, separators=(',', ':'), ensure_ascii=False).encode()
        compressed = gzip.compress(raw, compresslevel=9, mtime=0)
        (out / f'{code}.json.gz').write_bytes(compressed)
        files[code] = {'bytes': len(compressed), 'json_bytes': len(raw), 'sha256': hashlib.sha256(compressed).hexdigest()}
    manifest = {'schema': 1, 'version': catalog['version'], 'archive_sha256': catalog['archive_sha256'],
                'source': catalog['source'], 'unit': catalog['unit'], 'license': catalog['license'],
                'years': catalog['years'], 'chapters': chapters, 'files': files, 'sources': source_hashes,
                'rounding': 'Each existing snapshot is independently rounded to thousand USD. Reconcile all-products totals against the sum of recorded HS2 values; do not allocate the residual to an industry.'}
    (out / 'manifest.json').write_text(json.dumps(manifest, separators=(',', ':'), ensure_ascii=False))
    print(json.dumps({'countries': len(files), 'chapters': len(chapters), 'source_snapshots': len(source_hashes),
                      'compressed_bytes': sum(f['bytes'] for f in files.values()), 'largest_bytes': max(f['bytes'] for f in files.values())}))

if __name__ == '__main__':
    build()
