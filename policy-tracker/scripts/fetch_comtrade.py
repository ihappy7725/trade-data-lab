"""UN Comtrade 공개 미리보기 API에서 정책 5건의 발표 전후 월별 교역액을 받아 data/policies.json 을 만든다.

내 컴퓨터에서 한 번 돌리는 데이터 준비 스크립트다 (서버 파일 아님, API 키 필요 없음).
실행: python3 scripts/fetch_comtrade.py      (policy-tracker 폴더에서)

- 미리보기 API는 한 번에 한 달만 받으므로 정책마다 25번(발표 달 앞뒤 12개월) 부른다.
- 값은 고치거나 추정하지 않는다. 자료가 없는 달은 null 로 둔다.
- 받은 원자료 행은 data/comtrade-raw.json 에 그대로 남긴다.
"""
import json
import subprocess
import time
import urllib.parse
from datetime import date

API = "https://comtradeapi.un.org/public/v1/preview/C/M/HS"

# Comtrade 국가 코드 (EU 27개국: 이탈리아 381, 프랑스 251 은 Comtrade 고유 코드)
EU27 = [40, 56, 100, 191, 196, 203, 208, 233, 246, 251, 276, 300, 348, 372, 381,
        428, 440, 442, 470, 528, 616, 620, 642, 703, 705, 724, 752]

POLICIES = [
    {
        "id": "eu-bev-cvd-2024",
        "announced": "2024-07-04", "effective": "2024-07-05",
        "title": {"ko": "EU, 중국산 전기차에 상계관세", "en": "EU countervailing duties on Chinese EVs"},
        "type": "tariff", "hs": "870380",
        "item": {"ko": "전기 승용차", "en": "Electric cars"},
        "flow": {"ko": "EU 27개국의 중국산 수입 (EU 각국 신고)", "en": "EU-27 imports from China (reported by EU members)"},
        "reporter": EU27, "partners": [156], "flowCode": "M",
        "policy_source": {"label": "Commission Implementing Regulation (EU) 2024/1866 (3 July 2024, OJ 4 July 2024)",
                          "url": "https://eur-lex.europa.eu/eli/reg_impl/2024/1866/oj"},
        "date_note": {"ko": "잠정 상계관세 규정은 7월 3일 채택, 7월 4일 관보 게재, 7월 5일부터 적용. 확정 관세는 2024년 10월 29일 규정(EU) 2024/2754.",
                      "en": "Provisional regulation adopted 3 July, published 4 July, applied from 5 July 2024. Definitive duties: Regulation (EU) 2024/2754 of 29 October 2024."},
    },
    {
        "id": "us-ev-301-2024",
        "announced": "2024-05-14", "effective": "2024-09-27",
        "title": {"ko": "미국, 중국산 전기차 관세 100%", "en": "US 100% tariff on Chinese EVs"},
        "type": "tariff", "hs": "870380",
        "item": {"ko": "전기 승용차", "en": "Electric cars"},
        "flow": {"ko": "미국의 중국산 수입 (미국 신고)", "en": "US imports from China (reported by the US)"},
        "reporter": 842, "partners": [156], "flowCode": "M",
        "policy_source": {"label": "USTR Section 301 four-year review and modifications (Federal Register, Sept 2024)",
                          "url": "https://ustr.gov/sites/default/files/Section%20301%20Modifications%20Determination%20FRN%20(Sept%2012%202024)%20(FINAL).pdf"},
        "date_note": {"ko": "2024년 5월 14일 인상 계획 발표, 2024년 9월 27일 이후 통관분부터 100% 적용.",
                      "en": "Increase announced 14 May 2024; 100% applies to entries on or after 27 September 2024."},
    },
    {
        "id": "cn-ga-ge-2023",
        "announced": "2023-07-03", "effective": "2023-08-01",
        "title": {"ko": "중국, 갈륨·게르마늄 수출통제", "en": "China's gallium and germanium export controls"},
        "type": "export", "hs": "811292",
        "item": {"ko": "갈륨·게르마늄 등 (가공 전 금속·분말)", "en": "Gallium, germanium etc. (unwrought, powders)"},
        "flow": {"ko": "중국 → 전 세계 수출 (중국 신고)", "en": "China → world exports (reported by China)"},
        "reporter": 156, "partners": [0], "flowCode": "X",
        "policy_source": {"label": "MOFCOM·GACC Announcement No. 23 of 2023 (summary: IEA policy database)",
                          "url": "https://www.iea.org/policies/17893-announcement-on-the-implementation-of-export-control-of-items-related-to-gallium-and-germanium"},
        "date_note": {"ko": "2023년 7월 3일 공고, 8월 1일 시행. HS 8112.92 에는 인듐 등 다른 금속도 함께 들어 있다.",
                      "en": "Announced 3 July 2023, effective 1 August 2023. HS 8112.92 also includes other metals such as indium."},
    },
    {
        "id": "us-semi-2022",
        "announced": "2022-10-07", "effective": "2022-10-07",
        "title": {"ko": "미국, 대중국 반도체 장비 수출통제", "en": "US chip-equipment export controls on China"},
        "type": "export", "hs": "8486",
        "item": {"ko": "반도체 제조장비", "en": "Chipmaking equipment"},
        "flow": {"ko": "미국 → 중국 수출 (미국 신고)", "en": "US → China exports (reported by the US)"},
        "reporter": 842, "partners": [156], "flowCode": "X",
        "policy_source": {"label": "BIS press release, 7 October 2022",
                          "url": "https://www.bis.gov/press-release/commerce-implements-new-export-controls-advanced-computing-semiconductor-manufacturing-items-peoples"},
        "date_note": {"ko": "2022년 10월 7일 발표. 반도체 제조장비 통제는 같은 날, 일부 조항은 10월 12일·21일 시행.",
                      "en": "Announced 7 October 2022. Equipment controls effective the same day; other parts on 12 and 21 October."},
    },
    {
        "id": "jp-kr-2019",
        "announced": "2019-07-01", "effective": "2019-07-04",
        "title": {"ko": "일본, 대한국 수출규제", "en": "Japan's export restrictions on Korea"},
        "type": "export", "hs": "281111",
        "item": {"ko": "불화수소", "en": "Hydrogen fluoride"},
        "flow": {"ko": "일본 → 한국 수출 (일본 신고)", "en": "Japan → Korea exports (reported by Japan)"},
        "reporter": 392, "partners": [410], "flowCode": "X",
        "policy_source": {"label": "METI, Update of licensing policies and procedures in relation to the Republic of Korea (1 July 2019)",
                          "url": "https://www.meti.go.jp/policy/external_economy/export_control_korea/index-en.html"},
        "date_note": {"ko": "2019년 7월 1일 발표, 7월 4일부터 개별 허가.",
                      "en": "Announced 1 July 2019; individual licences required from 4 July."},
    },
]


def months_around(day: str, span: int = 12):
    y, m = int(day[:4]), int(day[5:7])
    out = []
    for k in range(-span, span + 1):
        idx = y * 12 + (m - 1) + k
        out.append(f"{idx // 12}{idx % 12 + 1:02d}")
    return out


def fetch(params):
    # urllib 대신 curl 을 쓴다 (일부 macOS Python 설치본에 인증서가 없어 HTTPS 가 실패함)
    url = API + "?" + urllib.parse.urlencode(params)
    last = None
    for attempt in range(4):
        r = subprocess.run(["curl", "-s", "-m", "40", url], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
            last = RuntimeError(str(d)[:200])
        except Exception as e:
            last = e
        time.sleep(3 * (attempt + 1))  # 429 등은 잠시 쉬었다 다시
    raise last


def main():
    import sys
    only = set(sys.argv[1:])
    old = {}
    if only:
        with open("data/policies.json", encoding="utf-8") as f:
            old = {x["id"]: x for x in json.load(f)["policies"]}
    raw, out = [], []
    for p in POLICIES:
        if only and p["id"] not in only:
            out.append(old[p["id"]])
            continue
        series = []
        for per in months_around(p["announced"]):
            rep = p["reporter"] if isinstance(p["reporter"], list) else [p["reporter"]]
            d = fetch({"reporterCode": ",".join(map(str, rep)), "period": per,
                       "partnerCode": ",".join(map(str, p["partners"])),
                       "cmdCode": p["hs"], "flowCode": p["flowCode"]})
            rows = [r for r in d.get("data", [])
                    if r.get("partner2Code", 0) == 0 and r.get("customsCode") == "C00" and r.get("motCode", 0) == 0]
            raw.extend(rows)
            value = sum(r["primaryValue"] for r in rows) if rows else None
            series.append({"m": f"{per[:4]}-{per[4:]}", "v": value,
                           "reporters": len({r["reporterCode"] for r in rows}),
                           "partners": len({r["partnerCode"] for r in rows})})
            time.sleep(1.1)
        print(p["id"], sum(1 for s in series if s["v"] is not None), "/ 25 months")
        keep = {k: p[k] for k in p if k not in ("reporter", "partners", "flowCode")}
        keep["comtrade"] = {"reporter": p["reporter"], "partners": p["partners"], "flowCode": p["flowCode"]}
        keep["series"] = series
        out.append(keep)
    meta = {
        "source": "UN Comtrade Database, monthly, HS (public preview API)",
        "url": "https://comtradeplus.un.org/",
        "unit": "US dollars (current), primaryValue",
        "fetched": date.today().isoformat(),
        "note": "Values are as reported; not edited or estimated. Months with no record are null.",
    }
    with open("data/policies.json", "w", encoding="utf-8") as f:
        json.dump({"meta": meta, "policies": out}, f, ensure_ascii=False, indent=1)
    raw_path = "data/comtrade-raw.json"
    if only:
        with open(raw_path, encoding="utf-8") as f:
            prev = json.load(f)
        raw = prev + raw
    with open(raw_path, "w", encoding="utf-8") as f:
        json.dump(raw, f, ensure_ascii=False)
    write_js()


def write_js():
    """화면이 file:// 로 열려도 읽을 수 있게 같은 내용을 data/policies.js 로도 쓴다."""
    with open("data/policies.json", encoding="utf-8") as f:
        data = json.load(f)
    with open("data/policies.js", "w", encoding="utf-8") as f:
        f.write("// scripts/fetch_comtrade.py 가 만든 파일 — 직접 고치지 않는다\n")
        f.write("window.POLICYLINE_DATA = " + json.dumps(data, ensure_ascii=False) + ";\n")


if __name__ == "__main__":
    main()
