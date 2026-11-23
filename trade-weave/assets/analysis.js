/* Pure analyses: missing records are not zero-valued trades. */
(function (root) {
  function changes(before, current) {
    var a = new Map(
        before.list.map(function (r) {
          return [r.iso, r];
        }),
      ),
      b = new Map(
        current.list.map(function (r) {
          return [r.iso, r];
        }),
      );
    var common = [],
      entered = [],
      absent = [];
    new Set(Array.from(a.keys()).concat(Array.from(b.keys()))).forEach(
      function (code) {
        var old = a.get(code),
          now = b.get(code);
        if (old && now)
          common.push({
            iso: code,
            before: old,
            after: now,
            pp: now.p - old.p,
            rankChange: old.rank - now.rank,
            valueChange: now.v - old.v,
            percentChange: (now.v / old.v - 1) * 100,
          });
        else if (now) entered.push({ iso: code, after: now });
        else absent.push({ iso: code, before: old });
      },
    );
    return { common: common, entered: entered, absent: absent };
  }
  function sortChanges(items, mode) {
    return items.slice().sort(function (a, b) {
      return mode === "loss"
        ? a.pp - b.pp || a.after.rank - b.after.rank
        : mode === "rank"
          ? Math.abs(b.rankChange) - Math.abs(a.rankChange) || b.pp - a.pp
          : b.pp - a.pp || a.after.rank - b.after.rank;
    });
  }
  function hhi(data) {
    return data.list.length
      ? data.list.reduce(function (s, r) {
          return s + r.p * r.p;
        }, 0)
      : null;
  }
  function signed(value, unit) {
    if (Math.abs(value) < 0.000000001) return "0.0" + unit;
    if (Math.abs(value) < 0.05)
      return (value > 0 ? "+" : "−") + "0.1" + unit + " 미만";
    return (value > 0 ? "+" : "−") + Math.abs(value).toFixed(1) + unit;
  }
  function periodRows(before, current) {
    const delta = changes(before, current);
    return [...delta.common, ...delta.entered, ...delta.absent].map((row) => ({
      ...row,
      status:
        row.before && row.after ? "both" : row.before ? "absent" : "entered",
      pp: row.before && row.after ? row.after.p - row.before.p : null,
      valueChange: row.before && row.after ? row.after.v - row.before.v : null,
      rankChange:
        row.before && row.after ? row.before.rank - row.after.rank : null,
    }));
  }
  var api = {
    periodRows: periodRows,
    changes: changes,
    sortChanges: sortChanges,
    hhi: hhi,
    signed: signed,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TradeweaveAnalysis = api;
})(typeof window !== "undefined" ? window : this);
