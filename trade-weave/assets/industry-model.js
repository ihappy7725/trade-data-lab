/* Accounting decomposition of existing rounded HS2 records; no imputed zeros. */
(function (root) {
  "use strict";
  function amount(vector, partner) {
    if (partner) return vector.find((r) => r[0] === partner)?.[1] ?? null;
    return vector.length ? vector.reduce((n, r) => n + r[1], 0) : null;
  }
  function analyze(payload, { year, compareYear, flow, partner = "" }) {
    const field = flow === "import" ? 1 : 0;
    const before = payload.years[compareYear],
      after = payload.years[year];
    if (!before || !after || year === compareYear)
      throw new Error("Invalid industry periods");
    const totalBefore = amount(before.all[field], partner),
      totalAfter = amount(after.all[field], partner);
    const globalTotal = amount(after.all[field], "");
    const old = new Map(before.chapters.map((r) => [r[0], r]));
    const rows = after.chapters.map((r) => {
      const b = amount(old.get(r[0])[field + 1], partner),
        a = amount(r[field + 1], partner);
      const both = b !== null && a !== null;
      const shareBefore =
        b !== null && totalBefore > 0 ? (b / totalBefore) * 100 : null;
      const shareAfter =
        a !== null && totalAfter > 0 ? (a / totalAfter) * 100 : null;
      const global = amount(r[field + 1], "");
      return {
        id: r[0],
        before: b,
        after: a,
        shareBefore,
        shareAfter,
        shareChange:
          both && shareBefore !== null && shareAfter !== null
            ? shareAfter - shareBefore
            : null,
        delta: both ? a - b : null,
        contribution:
          both && totalBefore > 0 ? ((a - b) / totalBefore) * 100 : null,
        baselineShare:
          global !== null && globalTotal > 0
            ? (global / globalTotal) * 100
            : null,
        status: both
          ? "both"
          : a !== null
            ? "current_only"
            : b !== null
              ? "reference_only"
              : "neither",
      };
    });
    const recordedBefore = rows.reduce((n, r) => n + (r.before ?? 0), 0);
    const recordedAfter = rows.reduce((n, r) => n + (r.after ?? 0), 0);
    const comparable = totalBefore !== null && totalAfter !== null;
    const totalDelta = comparable ? totalAfter - totalBefore : null;
    const commonDelta = comparable
      ? rows.reduce((n, r) => n + (r.delta ?? 0), 0)
      : null;
    const roundingBefore =
      totalBefore === null ? null : totalBefore - recordedBefore;
    const roundingAfter =
      totalAfter === null ? null : totalAfter - recordedAfter;
    const roundingDelta = comparable ? roundingAfter - roundingBefore : null;
    const coverageDelta = comparable
      ? totalDelta - commonDelta - roundingDelta
      : null;
    return {
      rows,
      totalBefore,
      totalAfter,
      totalDelta,
      commonDelta,
      coverageDelta,
      roundingDelta,
      roundingBefore,
      roundingAfter,
      recordedBefore,
      recordedAfter,
      growth:
        comparable && totalBefore > 0 ? (totalDelta / totalBefore) * 100 : null,
    };
  }
  const api = { analyze, amount };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TradeweaveIndustryModel = api;
})(globalThis);
