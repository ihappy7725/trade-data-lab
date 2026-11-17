#!/usr/bin/env python3
"""Stage 1: inspect official sources; never calculate or publish website data.

Run from alignment-lens: python3 scripts/inspect_sources.py [--fetch]
All downloads and reports stay inside this service. No third-party packages.
"""

import argparse
import csv
import hashlib
import json
import re
import struct
import subprocess
import zlib
from collections import Counter
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

BASE = Path(__file__).resolve().parent.parent
RAW = BASE / "raw"
REVIEW = BASE / "review"
DATA = BASE / "data"
DOI = "https://doi.org/10.7910/DVN/LEJUQZ"
API = "https://dataverse.harvard.edu/api/"
CEPII = "https://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37"
DOC = "https://www.cepii.fr/DATA_DOWNLOAD/baci/doc/baci_webpage.html"
ZIP = "https://www.cepii.fr/DATA_DOWNLOAD/baci/data/BACI_HS92_V202601.zip"
SELECTED = "IdealpointestimatesAll_Jun2024.csv"
APPROVED_VERSION = 39


def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def curl(url, start=None, end=None, max_bytes=10485760):
    command = ["curl", "--fail", "--location", "--silent", "--show-error",
               "--max-time", "60", "--max-filesize", str(max_bytes)]
    if start is not None:
        command += ["--range", f"{start}-{end}"]
    result = subprocess.run(command + [url], capture_output=True, check=True).stdout
    if start is not None and len(result) != end - start + 1:
        raise ValueError("Server did not return the requested byte range")
    return result


def fetch_baci_metadata():
    headers = subprocess.run(
        ["curl", "--fail", "--location", "--silent", "--show-error", "--head",
         "--max-time", "50", ZIP], capture_output=True, check=True).stdout.decode()
    lengths = re.findall(r"^content-length:\s*(\d+)", headers, re.I | re.M)
    if not lengths:
        raise ValueError("BACI ZIP Content-Length is missing")
    size = int(lengths[-1])
    start = max(0, size - 131072)
    tail = curl(ZIP, start, size - 1)
    end_position = tail.rfind(b"PK\x05\x06")
    if end_position < 0:
        raise ValueError("ZIP end record is missing")
    end = struct.unpack_from("<4s4H2IH", tail, end_position)
    if end[1] or end[2] or end[3] != end[4] or end[6] == 0xFFFFFFFF:
        raise ValueError("Multi-volume or ZIP64 archive requires separate inspection")
    cursor = end[6] - start
    if cursor < 0:
        raise ValueError("ZIP directory is larger than the inspected tail")
    entries = []
    for _ in range(end[4]):
        row = struct.unpack_from("<4s6H3I5H2I", tail, cursor)
        if row[0] != b"PK\x01\x02":
            raise ValueError("Invalid central directory")
        length, extra, comment = row[10:13]
        name = tail[cursor + 46:cursor + 46 + length].decode("utf-8")
        entries.append(dict(name=name, method=row[4], crc32=row[7],
                            compressed_size=row[8], size=row[9], offset=row[16]))
        cursor += 46 + length + extra + comment
    dump(RAW / "baci-zip-directory.json", dict(url=ZIP, size=size, files=entries))
    for entry in entries:
        country = entry["name"] == "country_codes_V202601.csv"
        sample = entry["name"] == "BACI_HS92_Y1995_V202601.csv"
        if not (country or sample):
            continue
        offset = entry["offset"]
        header = struct.unpack("<4s5H3I2H", curl(ZIP, offset, offset + 29))
        if header[0] != b"PK\x03\x04":
            raise ValueError("Invalid local ZIP header")
        data_start = offset + 30 + header[-2] + header[-1]
        length = entry["compressed_size"] if country else min(32768, entry["compressed_size"])
        payload = curl(ZIP, data_start, data_start + length - 1)
        if entry["method"] == 8:
            payload = zlib.decompressobj(-15).decompress(payload, entry["size"] + 1 if country else 4096)
        elif entry["method"] != 0:
            raise ValueError("Unsupported compression")
        if country:
            if len(payload) != entry["size"] or zlib.crc32(payload) != entry["crc32"]:
                raise ValueError("BACI country table CRC32 mismatch")
            (RAW / entry["name"]).write_bytes(payload)
        else:
            # This is explicitly a truncated header sample, not an annual source file.
            (RAW / "BACI_HS92_Y1995_V202601.header-sample.csv").write_text(
                "\n".join(payload.decode("utf-8").splitlines()[:4]) + "\n", encoding="utf-8")


def fetch(with_agreement=False):
    payload = curl(API + "datasets/:persistentId/?persistentId=doi:10.7910/DVN/LEJUQZ")
    version = json.loads(payload)["data"]["latestVersion"]
    if version["versionNumber"] != APPROVED_VERSION or version["versionMinorNumber"] != 0:
        raise ValueError("Dataverse version changed; obtain user selection before replacing sources")
    (RAW / "dataverse-latest.json").write_bytes(payload)
    source = next(f["dataFile"] for f in version["files"] if f["dataFile"]["filename"] == SELECTED)
    payload = curl(API + f"access/datafile/{source['id']}")
    if hashlib.md5(payload).hexdigest() != source["checksum"]["value"]:
        raise ValueError("UN source MD5 mismatch")
    (RAW / SELECTED).write_bytes(payload)
    # Used only to cross-check COW 345's changing identity in check_data_rules.
    # Its newer ideal-point estimates are never used by build_data.py.
    reference = next(f['dataFile'] for f in version['files']
                     if f['dataFile']['filename'] == 'IdealpointestimatesFP_2026FP.csv')
    reference_payload = curl(API + f"access/datafile/{reference['id']}")
    if hashlib.md5(reference_payload).hexdigest() != reference['checksum']['value']:
        raise ValueError('Identity-reference source checksum mismatch')
    (RAW / reference['filename']).write_bytes(reference_payload)
    if with_agreement:
        agreement = next(f["dataFile"] for f in version["files"]
                         if f["dataFile"]["filename"] == "AgreementScoresAll_Jun2024.csv")
        path = RAW / agreement["filename"]
        if not path.exists() or hashlib.md5(path.read_bytes()).hexdigest() != agreement["checksum"]["value"]:
            payload = curl(API + f"access/datafile/{agreement['id']}", max_bytes=150000000)
            if hashlib.md5(payload).hexdigest() != agreement["checksum"]["value"]:
                raise ValueError("Agreement file MD5 mismatch")
            path.write_bytes(payload)
    for name, url in [("cepii-page.html", CEPII), ("cepii-documentation.html", DOC)]:
        (RAW / name).write_bytes(curl(url))
    fetch_baci_metadata()


def read_table(name):
    with (RAW / name).open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return reader.fieldnames, list(reader)


def audit():
    checked = datetime.now(ZoneInfo("Asia/Seoul")).isoformat(timespec="seconds")
    version = json.loads((RAW / "dataverse-latest.json").read_text())["data"]["latestVersion"]
    if version["versionNumber"] != APPROVED_VERSION:
        raise ValueError("Unexpected version")
    page = re.sub(r"<[^>]+>", " ", (RAW / "cepii-page.html").read_text(encoding="utf-8"))
    release = re.search(r"This is the\s*(\d{6})\s*version", page)
    if not release or release.group(1) != "202601":
        raise ValueError("CEPII release changed or could not be verified; inspect before updating")
    source = next(f["dataFile"] for f in version["files"] if f["dataFile"]["filename"] == SELECTED)
    source_bytes = (RAW / SELECTED).read_bytes()
    if hashlib.md5(source_bytes).hexdigest() != source["checksum"]["value"]:
        raise ValueError("UN source MD5 mismatch")
    un_columns, votes = read_table(SELECTED)
    baci_columns, countries = read_table("country_codes_V202601.csv")
    trade_columns, _ = read_table("BACI_HS92_Y1995_V202601.header-sample.csv")
    if not {"ccode", "session", "IdealPointAll", "iso3c", "Countryname"} <= set(un_columns):
        raise ValueError("UN columns changed")
    if not {"country_code", "country_iso3", "country_name"} <= set(baci_columns):
        raise ValueError("BACI country columns changed")
    if trade_columns != ["t", "i", "j", "k", "v", "q"]:
        raise ValueError("BACI trade columns changed")
    agreement_path = RAW / "AgreementScoresAll_Jun2024.csv"
    session_years = {}
    agreement_rows = 0
    agreement_columns = None
    agreement = next(f["dataFile"] for f in version["files"]
                     if f["dataFile"]["filename"] == agreement_path.name)
    if agreement_path.exists():
        if hashlib.md5(agreement_path.read_bytes()).hexdigest() != agreement["checksum"]["value"]:
            raise ValueError("Agreement file MD5 mismatch")
        with agreement_path.open(encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            agreement_columns = reader.fieldnames
            for row in reader:
                session, year = int(row["session.x"]), int(row["year"])
                if session in session_years and session_years[session] != year:
                    raise ValueError("Multiple years assigned to one session")
                session_years[session] = year
                agreement_rows += 1
        if any(int(r["session"]) not in session_years for r in votes):
            raise ValueError("Session-year crosswalk is incomplete")
    un_codes = {r["iso3c"] for r in votes}
    baci_codes = {r["country_iso3"] for r in countries}
    duplicates = {code: [r for r in countries if r["country_iso3"] == code]
                  for code, count in Counter(r["country_iso3"] for r in countries).items() if count > 1}
    duplicate_votes = [dict(iso3=code, session=session, count=count)
                       for (code, session), count in Counter((r["iso3c"], r["session"]) for r in votes).items()
                       if count > 1]
    directory = json.loads((RAW / "baci-zip-directory.json").read_text())
    country_entry = next(f for f in directory["files"] if f["name"] == "country_codes_V202601.csv")
    if zlib.crc32((RAW / country_entry["name"]).read_bytes()) != country_entry["crc32"]:
        raise ValueError("BACI country-table CRC32 mismatch")
    trade_years = sorted(int(m.group(1)) for f in directory["files"]
                         if (m := re.fullmatch(r"BACI_HS92_Y(\d{4})_V202601.csv", f["name"])))
    report = dict(checked_at=checked, stage="source_inspection", selected_by_user=SELECTED,
                  dataverse_version=version["versionNumber"], dataverse_released_at=version["releaseTime"],
                  unga_columns=un_columns, unga_rows=len(votes),
                  unga_sessions=[min(int(r["session"]) for r in votes), max(int(r["session"]) for r in votes)],
                  unga_unique_codes=len(un_codes), baci_country_rows=len(countries),
                  baci_trade_columns=trade_columns, baci_country_columns=baci_columns,
                  baci_trade_years=trade_years, baci_archive_bytes=directory["size"],
                  literal_matches=len(un_codes & baci_codes), un_only=sorted(un_codes - baci_codes),
                  baci_only=[r for r in countries if r["country_iso3"] not in un_codes],
                  duplicate_baci_iso3=duplicates, duplicate_un_country_sessions=duplicate_votes,
                  agreement_columns=agreement_columns, agreement_rows=agreement_rows,
                  session_years=dict(sorted(session_years.items())),
                  limitations=["Country-table comparison includes historical entries; it does not establish annual trade coverage.",
                               "Only a header sample of the annual BACI trade file has been downloaded.",
                               "No country JSON, bilateral values, or graphs have been calculated.",
                               "The score file has no year column; its sessions are linked through the agreement source's year column when available."])
    dump(REVIEW / "source-audit.json", report)
    meta = dict(status="awaiting_method_decisions", checked_at=checked, generated_at=None,
                sources=dict(unga=dict(name="United Nations General Assembly Ideal Points", url=DOI,
                    version="39.0", release_date=version["releaseTime"][:10], filename=SELECTED,
                    file_id=source["id"], file_published=source["publicationDate"],
                    downloaded_on=datetime.fromtimestamp((RAW / SELECTED).stat().st_mtime, ZoneInfo("Asia/Seoul")).date().isoformat(),
                    license="CC0 1.0", checksum=source["checksum"],
                    score_column="IdealPointAll", country_column="iso3c", session_column="session",
                    year_column=None, year_mapping=dict(source_file=agreement_path.name,
                        session_column="session.x", year_column="year", session_years=dict(sorted(session_years.items()))) if session_years else None,
                    sessions=report["unga_sessions"]),
                    agreement=dict(filename=agreement_path.name, file_id=agreement["id"],
                        checksum=agreement["checksum"], status="downloaded_and_verified" if session_years else "not_downloaded"),
                    baci=dict(name="BACI, CEPII", url=CEPII, documentation_url=DOC,
                    version="V202601", classification="HS92", license="Etalab Open Licence 2.0",
                    archive_url=ZIP, country_file="country_codes_V202601.csv",
                    country_table_downloaded_on=datetime.fromtimestamp((RAW / "country_codes_V202601.csv").stat().st_mtime, ZoneInfo("Asia/Seoul")).date().isoformat(), trade_downloaded_on=None,
                    available_trade_years=trade_years, trade_columns=trade_columns, value_unit="thousand USD")),
                period=dict(start=1995, vote_end=max(session_years.values()) if session_years else None, trade_end=max(trade_years)),
                thresholds=dict(tiny_partner_share_pct=0.01, tiny_partner_confirmed=False,
                                nearly_unchanged_relative=None),
                pending=(["session_year_mapping"] if not session_years else []) + ["historical_entity_mapping", "nearly_unchanged_threshold",
                         "tiny_partner_threshold_confirmation", "design_selection"])
    if not (DATA / "meta.json").exists():
        dump(DATA / "meta.json", meta)
    if not (DATA / "code-fixes.json").exists():
        dump(DATA / "code-fixes.json", [dict(source="BACI", original_code="S19", country_code=490,
        replacement_code="TWN", reason="User specification: display Other Asia, nes as Taiwan; keep trade in denominators; vote data absent in service period.",
        status="confirmed_in_user_request")])
    (REVIEW / "source-audit.md").write_text(markdown(report), encoding="utf-8")
    print(json.dumps({k: report[k] for k in ["dataverse_version", "unga_sessions", "unga_rows", "baci_country_rows", "literal_matches", "un_only"]}, ensure_ascii=False))
    print("Reports: review/source-audit.md, review/source-audit.json")


def markdown(r):
    lines = ["# Alignment Lens — 자료 확인", "", f"확인 시각: {r['checked_at']}", "",
        "## 확정된 원자료", "", f"- UN: Dataverse 39.0 ({r['dataverse_released_at']}); 사용자 선택: `{SELECTED}`.",
        f"- UN 원파일 {r['unga_rows']}행, 회기 {r['unga_sessions'][0]}–{r['unga_sessions'][1]}. `year` 열 없음.",
        "- BACI: HS92 V202601, 공식 ZIP의 연도별 파일명 기준 1995–2024.",
        "- BACI 전체 연도 파일은 아직 받지 않음. 나라 코드표는 ZIP CRC32 검증 완료; UN CSV는 Dataverse MD5 검증 완료.",
        "- 교역 열: `t,i,j,k,v,q`; 나라 코드표 열: `country_code,country_name,country_iso2,country_iso3`.",
        "- UN 열: " + ", ".join(f"`{c or '(행 번호)'}`" for c in r['unga_columns']) + ".", "",
        f"- 동의 비율 파일 {r['agreement_rows']}행을 검사해 `session.x`–`year` 대응 확인.",
        "- 동의 비율 열: " + ", ".join(f"`{c or '(행 번호)'}`" for c in (r['agreement_columns'] or [])) + ".", "",
        "## 나라 코드 대조", "", f"UN 코드 {r['unga_unique_codes']}개, BACI 코드표 {r['baci_country_rows']}행; 문자 코드 일치 {r['literal_matches']}개.",
        "전체 코드표 대조이며, 각 연도의 실제 교역 기록 유무를 뜻하지 않음.", "",
        "UN에만 있는 코드: " + ", ".join(r['un_only']) + ".", "",
        "| BACI 숫자 코드 | 원래 문자 코드 | 원래 이름 |", "|---|---|---|"]
    lines += [f"| {c['country_code']} | {c['country_iso3']} | {c['country_name']} |" for c in r['baci_only']]
    lines += ["", "## 동일 ISO3를 쓰는 BACI 행", "", "| ISO3 | 숫자 코드 및 원래 이름 |", "|---|---|"]
    lines += [f"| {code} | " + "; ".join(f"{c['country_code']}: {c['country_name']}" for c in rows) + " |" for code, rows in r['duplicate_baci_iso3'].items()]
    lines += ["", "## 적용 전 확인할 처리", "",
        "- `490/S19 → TWN`: 사용자 명세에 따라 확정. 서비스 기간의 투표값은 null; 교역 분모에 포함.",
        "- 기존 UN `YUG`(COW 345)는 마지막 회기까지 이어짐. BACI `SCG`(891)·`SRB`(688)와 기간별 대응을 확인해야 함. 일괄 치환 금지.",
        "- `BEL`의 58은 벨기에·룩셈부르크 합산 실체. 56의 벨기에 값과 자동 연결하지 않음.",
        "- `SDN`의 736과 729는 범위가 다른 실체. 자동 합치지 않음.",
        "- `DEU`의 280은 1990년 이전 항목. 실제 1995년 이후 데이터 출현 여부를 전체 원자료에서 확인 예정.",
        "- `R20`, `ZA1`, `PUS` 등은 현재 ISO3 국가와 단순 연결할 수 없음. 분모에서 임의로 빼지 않음.",
        "- `LIE`, `MCO` 및 투표가 없는 지역은 다른 나라 값으로 채우지 않음.",
        "- 원래 코드표의 일부 영문 이름은 문자 깨짐이 있음. 원파일은 보존하고 화면용 이름은 별도로 검수할 것.", "",
        "## 다음 단계에 필요한 결정", "",
        "- 동의 비율 원파일 `session.x`–`year`로 연도를 연결. 점수는 사용자가 선택한 기존 전체 투표 파일에서 읽음.",
        ("- 확인된 대응: `year = session + 1945`; 제78차 회기 → 2023년. 투표 1995–2023년, 교역 1995–2024년. 2024년 외교 거리 null."
         if r['session_years'] else "- 동의 비율 원파일을 받아 회기-연도 대응 확인이 필요함."),
        "- 거의 같았다 기준: 처음 3년 평균 대비 변화율 5% 이내 제안. 처음 평균이 0인 경우 별도 처리 필요. 미확정.",
        "- 아주 작은 상대국 기준 0.01%: 명세의 기본값을 기록했으나 사용자 확인 대기.",
        "- DESIGN.md 없음. 다음 화면 구현 전, 데이터 숫자가 없는 시안 두 개를 제시하고 선택받을 것.", "",
        "## 재확인", "", "```sh", "python3 scripts/inspect_sources.py", "# 공식 경로에서 작은 원자료와 메타데이터 다시 받기", "python3 scripts/inspect_sources.py --fetch", "# 동의 비율 파일도 받기 (약 143 MB)", "python3 scripts/inspect_sources.py --fetch --with-agreement", "```", "",
        "`--fetch`는 BACI 전체 ZIP을 받지 않고 byte range로 코드표와 CSV 헤더만 읽음. 판이 바뀌면 중단함.",
        "데이터 빌드 스크립트와 쌍 화면은 다음 단계. 수치 대조 검수는 아직 수행하지 않음.", "",
        "## 공식 출처", "", f"- [Harvard Dataverse]({DOI})", f"- [CEPII BACI]({CEPII})", f"- [BACI 문서]({DOC})",
        "- [제78차 회기 일정](https://public.e-delegate.un.org/reports/ga78_schedule.html)", "",
        "## 작업 범위", "", "변경은 alignment-lens/ 내부로 한정. 커밋·브랜치 생성·push·배포 없음.",
        "작업 전 기존 변경: trade-digest/api/shelf.js, trade-digest/db/schema.sql. 수정하지 않음.", ""]
    text = "\n".join(lines)
    meta_path = DATA / "meta.json"
    if meta_path.exists() and json.loads(meta_path.read_text()).get("method_decision_date"):
        start = text.index("## 다음 단계에 필요한 결정")
        end = text.index("## 재확인", start)
        text = text[:start] + (
            "## 근거 검토 후 확정한 규칙\n\n"
            "2026-11-17 사용자 위임에 따라 기준과 역사적 실체 처리를 확정했다. "
            "상세 근거·참고문헌·적용 범위는 서비스 내부 `docs/method-decisions.md`에 있다.\n\n"
            "- 근거 없는 상대 5% 동등성 분류는 사용하지 않는다. 반올림 전 변화량과 방향을 표시한다.\n"
            "- 0.01%는 화면 필터이며 분모·사실 카드·CSV·순위 상관에 적용하지 않는다.\n"
            "- YUG는 실제 존재하는 행만 기간별 SCG/SRB로 연결한다. 1995–1999년 점수를 만들지 않는다.\n"
            "- 수단의 분리 전·후 집계 범위를 구분하고 전환기 합산과 개별 국가를 섞지 않는다.\n"
            "- 벨기에–룩셈부르크 등 합산 실체는 보존하되 개별 국가에 배분하지 않는다.\n"
            "- 전체 연도 BACI 실제 행의 검증은 데이터 빌드 단계에서 수행한다.\n"
            "- 다음 화면 작업 전 숫자가 없는 디자인 시안 두 개를 제시하고 선택받는다.\n\n"
        ) + text[end:]
        # The bullets above are the initial issues, retained as audit history.
        text = text.replace("## 적용 전 확인할 처리", "## 최초 확인한 처리 쟁점 (확정 규칙은 아래 기록 참조)")
    return text


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fetch", action="store_true", help="Fetch small official source files; never fetch the full BACI ZIP")
    parser.add_argument("--with-agreement", action="store_true", help="With --fetch, download the agreement source for session-year mapping")
    args = parser.parse_args()
    for folder in [RAW, REVIEW, DATA]:
        folder.mkdir(exist_ok=True)
    if args.fetch:
        fetch(args.with_agreement)
    audit()
