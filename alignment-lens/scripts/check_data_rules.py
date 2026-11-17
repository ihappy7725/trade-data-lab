"""Check consequential boundary cases and identities against actual UN rows."""
import csv
from pathlib import Path

from data_rules import SourceConflict, comparison_windows, numeric_change, trade_identity, vote_identity

BASE = Path(__file__).resolve().parent.parent


def check():
    with (BASE / "raw/IdealpointestimatesAll_Jun2024.csv").open() as handle:
        legacy = list(csv.DictReader(handle))
    with (BASE / "raw/IdealpointestimatesFP_2026FP.csv").open() as handle:
        reference = list(csv.DictReader(handle))
    # Reference is used only for identity metadata, never for its score values.
    identity_reference = {(int(r["ccode"]), int(r["year"])): r["iso3c"] for r in reference}
    yug = [r for r in legacy if r["iso3c"] == "YUG" and int(r["session"]) >= 50]
    assert min(int(r["session"]) + 1945 for r in yug) == 2000
    for row in yug:
        year = int(row["session"]) + 1945
        mapped = vote_identity(row["iso3c"], row["ccode"], year)
        assert mapped.iso3 == identity_reference[(int(row["ccode"]), year)]
    assert trade_identity(891, "SCG", 2005).iso3 == "SCG"
    assert trade_identity(688, "SRB", 2006).iso3 == "SRB"
    assert trade_identity(891, "SCG", 2006).iso3 is None
    assert trade_identity(490, "S19", 2024).iso3 == "TWN"
    assert trade_identity(58, "BEL", 1998).iso3 is None
    assert trade_identity(56, "BEL", 1999).iso3 == "BEL"
    assert trade_identity(736, "SDN", 2010).scope == "SDN_PRE2011"
    assert trade_identity(736, "SDN", 2011).iso3 is None
    assert trade_identity(729, "SDN", 2012).scope == "SDN_POST2011"
    assert vote_identity("SDN", 625, 2010).scope != vote_identity("SDN", 625, 2011).scope
    assert trade_identity(711, "ZA1", 1999).kind == "aggregate"
    for code, iso3, year in [(891, "SCG", 2007), (58, "BEL", 1999), (736, "SDN", 2012), (280, "DEU", 1995)]:
        try:
            trade_identity(code, iso3, year)
        except SourceConflict:
            pass
        else:
            raise AssertionError(f"Undetected source conflict: {code}, {year}")
    assert numeric_change(0, "0.0001")["direction"] == "increase"
    assert numeric_change(0, "0.0001")["magnitude"] == "<0.01"
    assert numeric_change("0.0001", 0)["direction"] == "decrease"
    assert numeric_change(0, 0)["direction"] == "unchanged_exact"
    assert numeric_change(None, 0) is None
    assert numeric_change("NaN", 0) is None
    years = list(range(1995, 2024))
    scopes = ["PRE" if y < 2011 else "POST" for y in years]
    valid = [y != 2011 for y in years]
    assert comparison_windows(years, valid, scopes) == {
        "first": [2012, 2013, 2014], "last": [2021, 2022, 2023], "scope": "POST"}
    assert comparison_windows(list(range(2000, 2005)), [True] * 5, ["A"] * 5) is None
    assert comparison_windows(list(range(2000, 2006)), [True] * 6, ["A"] * 6)["first"] == [2000, 2001, 2002]
    assert comparison_windows(list(range(2000, 2007)), [True] * 6 + [False], ["A"] * 7) is not None
    print(f"PASS: legacy YUG identity matches {len(yug)} observed source rows; historical boundaries, missing values, small-change signs, and comparison windows")


if __name__ == "__main__":
    check()
