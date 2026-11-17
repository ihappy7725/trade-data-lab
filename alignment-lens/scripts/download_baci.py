"""Download the official BACI ZIP in resumable bounded HTTP ranges.

Only writes raw/. Verify file sizes and ZIP entry CRCs during the data build.
"""
import concurrent.futures
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import time

BASE = Path(__file__).resolve().parent.parent
RAW = BASE / "raw"
MANIFEST = json.loads((RAW / "baci-zip-directory.json").read_text())
URL, SIZE = MANIFEST["url"], MANIFEST["size"]
CHUNK = 8 * 1024 * 1024
PARTS = RAW / "baci-download-parts"
TARGET = RAW / "BACI_HS92_V202601.zip"


def main():
    PARTS.mkdir(exist_ok=True)
    if TARGET.exists() and TARGET.stat().st_size == SIZE:
        print("Official archive already downloaded", flush=True)
        return
    partial = RAW / "BACI_HS92_V202601.sequential-partial"
    if TARGET.exists():
        TARGET.rename(partial)
    if partial.exists():
        with partial.open("rb") as source:
            for index in range(partial.stat().st_size // CHUNK):
                payload = source.read(CHUNK)
                path = PARTS / f"{index:04}.part"
                if not path.exists():
                    path.write_bytes(payload)
    count = (SIZE + CHUNK - 1) // CHUNK

    def download(index):
        start, end = index * CHUNK, min((index + 1) * CHUNK, SIZE) - 1
        path = PARTS / f"{index:04}.part"
        if path.exists() and path.stat().st_size == end - start + 1:
            return index
        temporary = path.with_suffix(".tmp")
        headers = path.with_suffix('.headers')
        for attempt in range(3):
            result = subprocess.run(["curl", "--fail", "--location", "--silent", "--show-error",
                            "--connect-timeout", "15", "--max-time", "150", "--header", "Accept-Encoding: identity",
                            "--range", f"{start}-{end}", "--dump-header", str(headers),
                            "--output", str(temporary), URL])
            content_ranges = re.findall(r'content-range:\s*bytes\s+(\d+)-(\d+)/(\d+)',headers.read_text(),re.I) if headers.exists() else []
            valid_range = content_ranges and tuple(map(int,content_ranges[-1])) == (start,end,SIZE)
            if result.returncode == 0 and temporary.stat().st_size == end-start+1 and valid_range:
                break
            if attempt == 2:
                raise ValueError(f"Invalid range or publisher error page for part {index}; rerun to resume")
            time.sleep(2)
        temporary.rename(path)
        return index

    done, started = 0, time.monotonic()
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for future in concurrent.futures.as_completed([pool.submit(download, i) for i in range(count)]):
            future.result()
            done += 1
            if done % 8 == 0 or done == count:
                print(f"BACI download: {done}/{count} parts verified by size; {time.monotonic()-started:.0f}s", flush=True)
    assembled = TARGET.with_suffix(".assembling")
    with assembled.open("wb") as output:
        for index in range(count):
            with (PARTS / f"{index:04}.part").open("rb") as source:
                shutil.copyfileobj(source, output)
    if assembled.stat().st_size != SIZE:
        raise ValueError("Archive length mismatch")
    assembled.rename(TARGET)
    print(f"Official archive assembled: {SIZE} bytes. CRC checks follow during build.", flush=True)


if __name__ == "__main__":
    main()
