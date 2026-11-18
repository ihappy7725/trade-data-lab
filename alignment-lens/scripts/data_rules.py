"""Evidence-based identity and descriptive-comparison rules for PARALLEL.

No vote estimates are changed or interpolated here. Aggregates retain their raw
identity so their flows can remain in other countries' trade denominators.
"""

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
import re
import math


class SourceConflict(ValueError):
    """An observed row conflicts with documented coverage; stop for review."""


@dataclass(frozen=True)
class Identity:
    iso3: str | None
    scope: str
    kind: str = "country"


def vote_identity(iso3, ccode, year):
    """Resolve an existing selected-UNGA source row; never generate a new row."""
    year, ccode = int(year), int(ccode)
    if year < 1995:
        return None
    if iso3 == "YUG":
        if ccode != 345:
            raise SourceConflict("Unexpected COW code for legacy YUG")
        return Identity("SCG", "SCG") if year <= 2005 else Identity("SRB", "SRB")
    if iso3 == "SDN":
        return Identity("SDN", "SDN_PRE2011" if year < 2011 else "SDN_POST2011")
    if iso3 == "TWN":
        raise SourceConflict("Unexpected Taiwan vote row in the service period")
    if iso3 in {"YAR", "YMD", "DDR", "CSK", "SUN"}:
        raise SourceConflict(f"Unexpected historical UN entity in {year}: {iso3}")
    if not re.fullmatch(r"[A-Z]{3}", iso3):
        raise SourceConflict(f"Invalid UN ISO3: {iso3!r}")
    return Identity(iso3, iso3)


def trade_identity(country_code, source_iso3, year):
    """Use BACI's own code table, with explicit historical/aggregate exceptions.

    A None iso3 means a retained raw aggregate, not a missing flow or zero value.
    Unknown date conflicts must not be silently mapped to a modern country.
    """
    code, year = int(country_code), int(year)
    if year < 1995:
        return None
    if code == 490:
        return Identity("TWN", "TWN")
    if code == 58:
        if year > 1998:
            raise SourceConflict(f"Belgium-Luxembourg aggregate after 1998: {year}")
        return Identity(None, "BACI:58", "aggregate")
    if code in {56, 442} and year < 1999:
        raise SourceConflict(f"Separate Belgium/Luxembourg before documented start: {code}, {year}")
    if code == 736:
        if year > 2011:
            raise SourceConflict(f"Old Sudan code after 2011: {year}")
        if year == 2011:
            # Annual old-boundary trade cannot be assigned to a post-split vote.
            return Identity(None, "BACI:736:TRANSITION2011", "transition_aggregate")
        return Identity("SDN", "SDN_PRE2011", "historical_country")
    if code == 729:
        if year < 2011:
            raise SourceConflict(f"Post-split Sudan before 2011: {year}")
        return Identity("SDN", "SDN_POST2011")
    if code == 728 and year < 2011:
        raise SourceConflict(f"South Sudan before independence: {year}")
    if code == 891:
        if year == 2006:
            # Comtrade's 891 validity extends into May 2006. A possible partial
            # year must not be assigned to the 2006 post-dissolution UN score.
            return Identity(None, "BACI:891:TRANSITION2006", "transition_aggregate")
        if year > 2006:
            raise SourceConflict(f"SCG trade after documented coverage: {year}")
        return Identity("SCG", "SCG", "historical_country")
    if code in {688, 499} and year < 2006:
        raise SourceConflict(f"Separate Serbia/Montenegro before 2006: {code}, {year}")
    if code in {200, 278, 280, 810}:
        raise SourceConflict(f"Pre-1995 entity appears in service-period trade: {code}, {year}")
    if code == 711:
        if year > 1999:
            raise SourceConflict(f"SACU aggregate after documented coverage: {year}")
        return Identity(None, "BACI:711", "aggregate")
    if code in {697, 849}:
        return Identity(None, f"BACI:{code}", "aggregate")
    if code == 530 and year > 2010:
        raise SourceConflict(f"Netherlands Antilles after dissolution: {year}")
    if code in {531, 534, 535} and year < 2010:
        raise SourceConflict(f"Post-Antilles territory before 2010: {code}, {year}")
    if not re.fullmatch(r"[A-Z]{3}", source_iso3):
        raise SourceConflict(f"Unresolved BACI entity: {code}, {source_iso3!r}")
    return Identity(source_iso3, source_iso3)


def numeric_change(first, last, decimal_places=2):
    """Describe the arithmetic change; no 'nearly equal' or significance label.

    Small nonzero changes retain their sign instead of appearing as 0.00.
    Decimal quantization is display-only and must not feed later calculations.
    """
    if first is None or last is None:
        return None
    first, last = Decimal(str(first)), Decimal(str(last))
    if not (first.is_finite() and last.is_finite()):
        return None
    delta = last - first
    quantum = Decimal(1).scaleb(-decimal_places)
    direction = "increase" if delta > 0 else "decrease" if delta < 0 else "unchanged_exact"
    magnitude = format(abs(delta).quantize(quantum, rounding=ROUND_HALF_UP), f".{decimal_places}f")
    if delta and abs(delta) < quantum:
        magnitude = "<" + format(quantum, f".{decimal_places}f")
    return dict(delta=str(delta), direction=direction, magnitude=magnitude,
                interpretation="descriptive_arithmetic_only")


def comparison_windows(years, valid, scope_keys):
    """First/last three complete years in the latest comparable observed run.

    The caller supplies finite-value validity for every metric being compared,
    and both entities' scope IDs. Gaps and scope changes always split a run.
    A latest run shorter than six years is reported as insufficient; we do not
    search backwards for a more convenient trend or overlap the two windows.
    """
    if not (len(years) == len(valid) == len(scope_keys)):
        raise ValueError("Misaligned year, validity, and scope arrays")
    if list(years) != sorted(set(years)):
        raise ValueError("Years must be unique and ascending")
    runs, current = [], []
    for index, year in enumerate(years):
        if not valid[index] or scope_keys[index] is None:
            if current:
                runs.append(current)
                current = []
            continue
        if current and (year != years[current[-1]] + 1 or scope_keys[index] != scope_keys[current[-1]]):
            runs.append(current)
            current = []
        current.append(index)
    if current:
        runs.append(current)
    if not runs or len(runs[-1]) < 6:
        return None
    latest = runs[-1]
    return dict(first=[years[i] for i in latest[:3]], last=[years[i] for i in latest[-3:]],
                scope=scope_keys[latest[-1]])


def spearman_coefficient(distances, shares):
    """Pearson correlation of average ranks; no display filter or p-value."""
    pairs=[(x,y) for x,y in zip(distances,shares)
           if x is not None and y is not None and math.isfinite(x) and math.isfinite(y)]
    count=len(pairs)
    if count < 2:
        return None,count
    def ranks(values):
        order=sorted(range(len(values)),key=values.__getitem__)
        ranked=[0.0]*len(values)
        start=0
        while start<len(order):
            end=start+1
            while end<len(order) and values[order[end]]==values[order[start]]:
                end+=1
            rank=(start+1+end)/2
            for i in order[start:end]:ranked[i]=rank
            start=end
        return ranked
    rx,ry=ranks([p[0] for p in pairs]),ranks([p[1] for p in pairs])
    center=(count+1)/2
    numerator=sum((x-center)*(y-center) for x,y in zip(rx,ry))
    denominator=math.sqrt(sum((x-center)**2 for x in rx)*sum((y-center)**2 for y in ry))
    return (max(-1.0,min(1.0,numerator/denominator)) if denominator else None),count
