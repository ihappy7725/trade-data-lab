"""BACI 원자료에서 Tradeweave 지도용 JSON을 만든다.

사용법:
  python3 scripts/build_trade_data.py <BACI_HS22_Y2024_V202601.csv> <country_codes_V202601.csv> data/trade-2024.json

- 상품(k)을 모두 더해 수출국(i) → 수입국(j) 나라 쌍별 총액(천 미국 달러)을 만든다.
- 나라마다 수출 상대국(i=나라)과 수입 상대국(j=나라)을 모두 큰 순서로 저장한다.
- 숫자를 새로 만들거나 고치지 않는다. 반올림은 천 달러 단위 정수까지만 한다.
"""
import json, sys, gettext
import pandas as pd
import pycountry

flows_path, codes_path, out_path = sys.argv[1:4]

df = pd.read_csv(flows_path, usecols=["t", "i", "j", "v"], dtype={"t": "int16", "i": "int32", "j": "int32", "v": "float64"})
years = sorted(df["t"].unique().tolist())
assert len(years) == 1, years
pairs = df.groupby(["i", "j"], as_index=False)["v"].sum()

codes = pd.read_csv(codes_path, dtype=str, keep_default_na=False)
code2iso = dict(zip(codes["country_code"].astype(int), codes["country_iso3"]))
code2en = dict(zip(codes["country_code"].astype(int), codes["country_name"]))

ko = gettext.translation("iso3166-1", pycountry.LOCALES_DIR, languages=["ko"])
KO_OVERRIDE = {
    "S19": "대만", "R20": "기타 유럽자유무역연합 (BACI 표기: Europe EFTA, nes)",
    "TWN": "대만", "PRK": "북한", "RUS": "러시아", "LAO": "라오스", "IRN": "이란", "BOL": "볼리비아",
    "VEN": "베네수엘라", "TZA": "탄자니아", "SYR": "시리아", "MDA": "몰도바", "COD": "콩고민주공화국",
    "COG": "콩고공화국", "HKG": "홍콩", "MAC": "마카오", "VGB": "영국령 버진아일랜드", "FSM": "미크로네시아",
    "AUS": "오스트레일리아", "ARE": "아랍에미리트", "ZAF": "남아프리카공화국", "CZE": "체코", "USA": "미국",
    "GBR": "영국", "NLD": "네덜란드", "PHL": "필리핀", "VNM": "베트남", "KOR": "대한민국", "BRN": "브루나이",
    "MKD": "북마케도니아", "SWZ": "에스와티니", "CIV": "코트디부아르", "PSE": "팔레스타인", "VAT": "바티칸",
}
def ko_name(iso3, en):
    if iso3 in KO_OVERRIDE: return KO_OVERRIDE[iso3]
    c = pycountry.countries.get(alpha_3=iso3)
    return ko.gettext(c.name) if c else en

# 지도(world-atlas, ISO 숫자 코드)와 잇기 위한 ISO 숫자 코드. BACI의 S19는 대만(158)으로 그린다.
def iso_num(iso3):
    if iso3 == "S19": return "158"
    c = pycountry.countries.get(alpha_3=iso3)
    return c.numeric if c else None

countries = {}
used = sorted(set(pairs["i"]).union(pairs["j"]))
for code in used:
    iso3 = code2iso[code]
    exp = pairs[pairs["i"] == code].sort_values("v", ascending=False)
    imp = pairs[pairs["j"] == code].sort_values("v", ascending=False)
    countries[iso3] = {
        "ko": ko_name(iso3, code2en[code]), "en": code2en[code], "num": iso_num(iso3),
        "x": [[code2iso[j], round(v)] for j, v in zip(exp["j"], exp["v"]) if round(v) > 0],
        "m": [[code2iso[i], round(v)] for i, v in zip(imp["i"], imp["v"]) if round(v) > 0],
    }

out = {
    "meta": {
        "source": "CEPII BACI (Gaulier & Zignago, 2010), UN Comtrade 기반",
        "version": "HS22 V202601", "year": int(years[0]), "unit": "천 미국 달러(경상)",
        "license": "Etalab Open Licence 2.0",
        "note": "상품 전체 합계. 대만은 BACI의 Other Asia, nes(코드 490, S19) 값이다. x=그 나라의 수출(상대국=수입국), m=그 나라의 수입(상대국=수출국).",
    },
    "countries": countries,
}
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
print("countries", len(countries), "pairs", len(pairs), "world total (천 달러)", round(df["v"].sum()))
