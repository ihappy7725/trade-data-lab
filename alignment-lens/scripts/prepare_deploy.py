#!/usr/bin/env python3
"""Stage only CrossCite's public static files; no build or dependencies required."""
from pathlib import Path
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
STAGE = ROOT / 'raw' / 'deploy-stage'
PROJECT = 'prj_od2PTp3PXz8Sfwzq7Q0jpXktpYhm'
TEAM = 'team_WdJsHfnIC0TYxOhmShlAyndE'
FILES = [
    'index.html', 'mirrorline-case.html', 'vercel.json',
    'favicon.svg', 'favicon-32x32.png', 'favicon.ico',
    'apple-touch-icon.png', 'site.webmanifest',
    'assets/mirrorline.css', 'assets/mirrorline.js',
    'assets/comparison-core.js', 'assets/workbench.js',
    'assets/brand/crosscite.svg', 'assets/brand/credits.json',
    'assets/brand/icon-192.png', 'assets/brand/icon-512.png',
    'data/cases/usa-chn-2017.json', 'data/workbench/catalog.json',
]
FILES += [str(p.relative_to(ROOT)) for p in sorted((ROOT / 'data/workbench/snapshots').glob('*.json'))]


def main():
    for name in FILES:
        if not (ROOT / name).is_file() or (ROOT / name).is_symlink():
            raise SystemExit(f'Missing or symlinked public file: {name}')
    if STAGE.exists():
        shutil.rmtree(STAGE)
    public = STAGE / 'alignment-lens'
    manifest = {}
    for name in FILES:
        target = public / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, target)
        manifest[name] = hashlib.sha256(target.read_bytes()).hexdigest()
    link = STAGE / '.vercel' / 'project.json'
    link.parent.mkdir(parents=True)
    link.write_text(json.dumps({'projectId': PROJECT, 'orgId': TEAM, 'projectName': 'crosscite'}) + '\n')
    (ROOT / 'raw' / 'deploy-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'Staged {len(FILES)} public files at {STAGE}')
    print('Vercel project: crosscite; Root Directory: alignment-lens')


if __name__ == '__main__':
    main()
