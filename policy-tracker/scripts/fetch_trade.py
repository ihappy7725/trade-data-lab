"""data/policies-list.json 의 정책마다 발표 전후 월별 교역액을 받아 data/policies.json · data/policies.js 를 만든다.

데이터 준비 스크립트다 (서버 파일 아님). 내 컴퓨터나 GitHub Actions(매달 자동)에서 돌린다.
실행 (policy-tracker 폴더에서):
    python3 scripts/fetch_trade.py               전체
    python3 scripts/fetch_trade.py <정책 id> ...  그 정책만 다시 (나머지는 기존 값 유지)

출처 (정책마다 source.api 로 정한다)
- comtrade : UN Comtrade 월별. COMTRADE_KEY 가 있으면 정식 API로 12개월씩, 없으면 공개 미리보기로 한 달씩.
- eurostat : Eurostat Comext DS-045409 월별 (키 필요 없음, 유로). 보통 6주쯤 늦게 나온다.
- census   : 미국 Census 국제무역 API 월별 (CENSUS_KEY 필요, 미국 달러). 보통 5주쯤 늦게 나온다.
             키가 없으면 source.fallback 에 적힌 출처를 쓴다.
키는 환경 변수 또는 policy-tracker/.env 에서 읽고, 화면·로그·파일 어디에도 찍지 않는다.
값은 고치거나 추정하지 않는다. 기록이 없는 달은 null, 아직 오지 않은 달은 null + future: true.
"""
import json
import os
import subprocess
import sys
import time
import urllib.parse
from datetime import date

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # policy-tracker/
LIST = os.path.join(HERE, "data", "policies-list.json")
OUT_JSON = os.path.join(HERE, "data", "policies.json")
OUT_JS = os.path.join(HERE, "data", "policies.js")
RAW = os.path.join(HERE, "data", "comtrade-raw.json")  # .gitignore — 내 컴퓨터에만

SOURCES = {
    "comtrade": {"name": "UN Comtrade", "url": "https://comtradeplus.un.org/", "currency": "USD"},
    "eurostat": {"name": "Eurostat Comext", "url": "https://ec.europa.eu/eurostat/comext/newxtweb/", "currency": "EUR"},
    "census": {"name": "US Census Bureau", "url": "https://www.census.gov/foreign-trade/data/index.html", "currency": "USD"},
}


# ---------- 공통 ----------
def env_value(name):
    v = os.environ.get(name, "").strip()
    if v:
        return v
    path = os.path.join(HERE, ".env")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith(name + "="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def months_around(day, span=12):
    y, m = int(day[:4]), int(day[5:7])
    out = []
    for k in range(-span, span + 1):
        idx = y * 12 + (m - 1) + k
        out.append(f"{idx // 12}-{idx % 12 + 1:02d}")
    return out


def get_json(url, headers=None, tries=5):
    """curl 로 JSON 을 받는다 (일부 macOS Python 에 인증서가 없어 urllib 대신).
    머리글(키 포함)은 명령줄이 아니라 표준 입력으로 넘겨 다른 프로그램에 보이지 않게 한다."""
    cfg = "".join(f'header = "{k}: {v}"\n' for k, v in (headers or {}).items())
    last = None
    for attempt in range(tries):
        r = subprocess.run(["curl", "-s", "-m", "90", "-K", "-", url], input=cfg, capture_output=True, text=True)
        try:
            return json.loads(r.stdout)
        except Exception as e:  # 429 · 일시 오류는 잠시 쉬었다 다시
            last = r.stdout[:120] or str(e)
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"요청 실패: {last}")


class QuotaError(RuntimeError):
    """하루 호출 한도를 다 썼을 때. 다시 시도해도 소용없으므로 바로 멈춘다."""


# ---------- UN Comtrade ----------
def fetch_comtrade(src, months, raw):
    key = env_value("COMTRADE_KEY")
    base = "https://comtradeapi.un.org/data/v1/get/C/M/HS" if key else "https://comtradeapi.un.org/public/v1/preview/C/M/HS"
    rep = src["reporter"] if isinstance(src["reporter"], list) else [src["reporter"]]
    params = {"reporterCode": ",".join(map(str, rep)), "partnerCode": ",".join(map(str, src["partners"])),
              "cmdCode": src["cmd"], "flowCode": src["flowCode"]}
    step = 12 if key else 1
    rows_by = {m: [] for m in months}
    for i in range(0, len(months), step):
        chunk = [m.replace("-", "") for m in months[i:i + step]]
        for attempt in range(6):
            d = get_json(base + "?" + urllib.parse.urlencode({**params, "period": ",".join(chunk)}),
                         {"Ocp-Apim-Subscription-Key": key} if key else None)
            if "data" in d:
                break
            if "quota" in str(d.get("message", "")).lower():
                raise QuotaError(f"Comtrade 호출 한도 초과: {d.get('message')}")
            time.sleep(3 * (attempt + 1))  # 429: 잠시 후 다시
        else:
            raise RuntimeError(f"Comtrade 응답 이상: {str(d)[:160]}")
        for r in d.get("data", []):
            p = str(r.get("period"))
            m = f"{p[:4]}-{p[4:]}"
            if m in rows_by and r.get("partner2Code", 0) == 0 and r.get("customsCode") == "C00" and r.get("motCode", 0) == 0:
                rows_by[m].append(r)
        time.sleep(1.1)
    out = {}
    for m, rows in rows_by.items():
        raw.extend(rows)
        out[m] = {"v": sum(r["primaryValue"] for r in rows) if rows else None,
                  "reporters": len({r["reporterCode"] for r in rows})}
    return out


# ---------- Eurostat Comext ----------
def fetch_eurostat(src, months, raw):
    q = {"format": "JSON", "lang": "en", "freq": "M", "reporter": src["reporter"], "partner": src["partner"],
         "product": src["product"], "flow": src["flow"], "indicators": "VALUE_IN_EUROS",
         "sinceTimePeriod": months[0], "untilTimePeriod": months[-1]}
    d = get_json("https://ec.europa.eu/eurostat/api/comext/dissemination/statistics/1.0/data/DS-045409?" + urllib.parse.urlencode(q))
    if "value" not in d:
        raise RuntimeError(f"Eurostat 응답 이상: {str(d)[:160]}")
    idx = d["dimension"]["time"]["category"]["index"]
    out = {}
    for m in months:
        i = idx.get(m)
        v = d["value"].get(str(i)) if i is not None else None
        out[m] = {"v": v}
    return out


# ---------- US Census ----------
def fetch_census(src, months, raw):
    key = env_value("CENSUS_KEY")
    imp = src["direction"] == "imports"
    val = "GEN_VAL_MO" if imp else "ALL_VAL_MO"
    com = "I_COMMODITY" if imp else "E_COMMODITY"
    q = {"get": f"{val},CTY_CODE", "COMM_LVL": src["level"], com: src["commodity"],
         "time": f"from {months[0]} to {months[-1]}", "key": key}
    url = f"https://api.census.gov/data/timeseries/intltrade/{src['direction']}/hs?" + urllib.parse.urlencode(q)
    d = get_json(url)
    if not isinstance(d, list) or not d:
        raise RuntimeError("Census 응답 이상")
    head = d[0]
    iv, ic, it = head.index(val), head.index("CTY_CODE"), head.index("time")
    out = {m: {"v": None} for m in months}
    for row in d[1:]:
        if row[ic] == src["country"] and row[it] in out:
            out[row[it]] = {"v": float(row[iv])}
    return out


FETCHERS = {"comtrade": fetch_comtrade, "eurostat": fetch_eurostat, "census": fetch_census}


def pick_source(p):
    src = dict(p["source"])
    if src["api"] == "census" and not env_value("CENSUS_KEY"):
        src = dict(src["fallback"])
    src.setdefault("cmd", p["hs"])
    return src


def build(p, raw):
    src = pick_source(p)
    months = months_around(p["announced"])
    now = date.today().strftime("%Y-%m")
    asked = [m for m in months if m <= now]
    got = FETCHERS[src["api"]](src, asked, raw)
    series = []
    for m in months:
        item = {"m": m, "v": None}
        if m in got:
            item.update(got[m])
        if m > now:
            item["future"] = True
        series.append(item)
    out = {k: v for k, v in p.items() if k != "source"}
    out["data_source"] = {**SOURCES[src["api"]], "api": src["api"],
                          "query": {k: v for k, v in src.items() if k != "fallback"}}
    out["series"] = series
    out["fetched"] = date.today().isoformat()
    return out


def main():
    only = set(sys.argv[1:])
    with open(LIST, encoding="utf-8") as f:
        plist = json.load(f)["policies"]
    old = {}
    if os.path.exists(OUT_JSON):
        with open(OUT_JSON, encoding="utf-8") as f:
            old = {x["id"]: x for x in json.load(f).get("policies", [])}
    print("키:", "Comtrade" if env_value("COMTRADE_KEY") else "Comtrade 없음(미리보기)",
          "/", "Census" if env_value("CENSUS_KEY") else "Census 없음(대체 출처)")
    raw, out, failed, quota_hit = [], [], [], False
    for p in plist:
        if only and p["id"] not in only and p["id"] in old:
            out.append(old[p["id"]])
            continue
        try:
            if quota_hit and pick_source(p)["api"] == "comtrade":
                raise QuotaError("앞에서 Comtrade 호출 한도에 걸려 건너뜀")
            b = build(p, raw)
        except Exception as e:  # 한 정책이 실패해도 나머지는 계속, 이 정책은 이전 값을 유지
            quota_hit = quota_hit or isinstance(e, QuotaError)
            failed.append((p["id"], str(e)[:160]))
            prev = old.get(p["id"])
            if prev:
                out.append(prev)
                print(f'{p["id"]}: 실패 — 이전 값 유지 (받은 날 {prev.get("fetched", "이전")}) · {str(e)[:120]}', flush=True)
            else:
                print(f'{p["id"]}: 실패 — 이전 값도 없어 이번에는 빠짐 · {str(e)[:120]}', flush=True)
            continue
        n = sum(1 for s in b["series"] if s["v"] is not None)
        fut = sum(1 for s in b["series"] if s.get("future"))
        print(f'{p["id"]}: {b["data_source"]["name"]} {n}/25개월' + (f" (아직 오지 않은 달 {fut})" if fut else ""), flush=True)
        out.append(b)
    if not any(x.get("fetched") == date.today().isoformat() for x in out) and failed:
        print("모든 정책이 실패해 파일을 바꾸지 않습니다.")
        report(failed)
        sys.exit(1)
    meta = {"fetched": date.today().isoformat(),
            "note": "Values are as reported by each source; not edited or estimated. Months with no record are null."}
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump({"meta": meta, "policies": out}, f, ensure_ascii=False, indent=1)
    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write("// scripts/fetch_trade.py 가 만든 파일 — 직접 고치지 않는다\n")
        f.write("window.POLICYLINE_DATA = " + json.dumps({"meta": meta, "policies": out}, ensure_ascii=False) + ";\n")
    if raw:
        with open(RAW, "w", encoding="utf-8") as f:
            json.dump(raw, f, ensure_ascii=False)
    report(failed)


def report(failed):
    if not failed:
        print("모든 정책을 새로 받았습니다.")
        return
    print(f"실패 {len(failed)}건 (이전 값 유지):")
    for pid, msg in failed:
        print(f"  - {pid}: {msg}")
        if os.environ.get("GITHUB_ACTIONS"):  # Actions 화면에 노란 경고로 보이게
            print(f"::warning title=Policyline 자료 받기 실패 ({pid})::{msg}")


if __name__ == "__main__":
    main()
