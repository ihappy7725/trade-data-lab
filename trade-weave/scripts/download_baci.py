"""Download the official HS22 archive with resumable, verified HTTP ranges."""

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import re
import shutil
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", default="202601")
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()
    if not re.fullmatch(r"\d{6}", args.version) or not 1 <= args.workers <= 8:
        parser.error("Use a six-digit version and 1–8 workers.")

    raw = Path(__file__).resolve().parent.parent / "raw"
    raw.mkdir(exist_ok=True)
    filename = f"BACI_HS22_V{args.version}.zip"
    url = f"https://www.cepii.fr/DATA_DOWNLOAD/baci/data/{filename}"
    headers = subprocess.run([
        "curl", "--fail", "--location", "--silent", "--show-error",
        "--head", "--max-time", "30", url,
    ], check=True, capture_output=True, text=True).stdout
    size = int(re.findall(r"content-length:\s*(\d+)", headers, re.I)[-1])
    target = raw / filename
    if target.exists() and target.stat().st_size == size:
        print("Archive already downloaded. The build verifies ZIP checksums.")
        return

    chunk_size = 8 * 1024 * 1024
    count = (size + chunk_size - 1) // chunk_size
    parts = raw / (filename + ".parts")
    parts.mkdir(exist_ok=True)
    partial = raw / (filename + ".partial")
    if partial.exists():
        with partial.open("rb") as source:
            for index in range(partial.stat().st_size // chunk_size):
                path = parts / f"{index:03}.part"
                payload = source.read(chunk_size)
                if not path.exists():
                    path.write_bytes(payload)

    def download(index):
        start = index * chunk_size
        end = min(size, start + chunk_size) - 1
        path = parts / f"{index:03}.part"
        if path.exists() and path.stat().st_size == end - start + 1:
            return
        temporary = path.with_suffix(".tmp")
        headers = path.with_suffix(".headers")
        for attempt in range(3):
            result = subprocess.run([
                "curl", "--fail", "--location", "--silent", "--show-error",
                "--connect-timeout", "15", "--max-time", "180",
                "--header", "Accept-Encoding: identity", "--range", f"{start}-{end}",
                "--dump-header", str(headers), "--output", str(temporary), url,
            ])
            ranges = re.findall(r"content-range:\s*bytes\s+(\d+)-(\d+)/(\d+)", headers.read_text(), re.I)
            valid_range = ranges and tuple(map(int, ranges[-1])) == (start, end, size)
            if result.returncode == 0 and valid_range and temporary.stat().st_size == end - start + 1:
                temporary.replace(path)
                return
            if attempt == 2:
                raise RuntimeError(f"Part {index} failed. Run again to resume.")

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(download, index) for index in range(count)]
        for done, future in enumerate(as_completed(futures), 1):
            future.result()
            print(f"Verified download parts {done}/{count}", flush=True)
    assembled = target.with_suffix(".assembling")
    with assembled.open("wb") as output:
        for index in range(count):
            with (parts / f"{index:03}.part").open("rb") as source:
                shutil.copyfileobj(source, output)
    if assembled.stat().st_size != size:
        raise RuntimeError("Archive size mismatch.")
    assembled.replace(target)
    print(f"Saved {target.name}, {size} bytes. ZIP checksums are verified during build.", flush=True)


if __name__ == "__main__":
    main()
