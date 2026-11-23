/* Run: node scripts/test-research.cjs. Uses shipped calculations and local BACI files. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const base = path.resolve(__dirname, "..");
const math = require("../assets/analysis.js");
const workspace = require("../assets/workspace-state.js");
const catalog = JSON.parse(
  fs.readFileSync(path.join(base, "data/catalog.json")),
);
const app = fs.readFileSync(path.join(base, "assets/app.js"), "utf8");
function extract(name) {
  const start = app.indexOf("  function " + name + "(");
  const next = /\n  (?:async )?function /.exec(app.slice(start + 1));
  assert.ok(start >= 0 && next);
  return app.slice(start, start + 1 + next.index);
}
const ctx = vm.createContext({ TRADE: null });
vm.runInContext(extract("rows"), ctx);
let checked = 0,
  missing = 0;
for (const product of ["all", "27", "8542"]) {
  const series = Object.fromEntries(
    catalog.years.map((year) => [
      year,
      JSON.parse(
        fs.readFileSync(
          path.join(base, "data", catalog.datasets[year + "/" + product]),
        ),
      ),
    ]),
  );
  for (const [oldYear, newYear] of [
    [2022, 2023],
    [2023, 2024],
    [2024, 2022],
  ])
    for (const flow of ["export", "import"]) {
      const before = ctx.rows("KOR", flow, series[oldYear]),
        now = ctx.rows("KOR", flow, series[newYear]);
      const actual = math.periodRows(before, now),
        a = new Map(before.list.map((row) => [row.iso, row])),
        b = new Map(now.list.map((row) => [row.iso, row]));
      assert.equal(actual.length, new Set([...a.keys(), ...b.keys()]).size);
      for (const row of actual) {
        if (a.has(row.iso) && b.has(row.iso)) {
          assert.equal(row.pp, b.get(row.iso).p - a.get(row.iso).p);
          assert.equal(row.valueChange, b.get(row.iso).v - a.get(row.iso).v);
          assert.equal(
            row.rankChange,
            a.get(row.iso).rank - b.get(row.iso).rank,
          );
        } else {
          assert.equal(row.pp, null);
          assert.equal(row.valueChange, null);
          assert.equal(row.rankChange, null);
          missing++;
        }
        checked++;
      }
    }
}
const item = {
  id: "test1",
  name: "한국 반도체",
  hash: "#see/KOR/export?product=8542&partner=CHN",
  note: "<표> & 메모",
  snapshot: { version: catalog.version, archiveSha256: catalog.archive_sha256 },
  ui: { "matrix-metric": "rank", "change-query": "CHN" },
  temporal: { query: "CHN", sort: "gain", all: true },
};
const normalized = workspace.normalizeSaved(item, catalog);
assert.equal(normalized.note, item.note);
assert.equal(normalized.ui["matrix-metric"], "rank");
assert.equal(workspace.versionMatches(normalized, catalog), true);
assert.equal(
  workspace.versionMatches(
    {
      ...normalized,
      snapshot: { version: "old", archiveSha256: "0".repeat(64) },
    },
    catalog,
  ),
  false,
);
assert.equal(
  workspace.normalizeSaved(
    { id: "legacy", name: "예전 저장", hash: "#see/KOR/export/partners" },
    catalog,
  ).snapshot,
  null,
);
for (const hash of [
  "javascript:alert(1)",
  "https://evil.test/",
  "#see/ZZZ/export",
  "#see/KOR/export?product=9999",
  "#see/KOR/export?year=2099",
  "#see/KOR/export?partner=KOR",
  "#see/KOR/export?compare=2024",
])
  assert.equal(
    workspace.normalizeSaved({ ...item, hash }, catalog),
    null,
    hash,
  );
assert.equal(
  workspace.normalizeSaved({ ...item, note: "x".repeat(2001) }, catalog),
  null,
);
assert.equal(
  workspace.normalizeSaved(
    { ...item, snapshot: { version: "bad", archiveSha256: "not-a-hash" } },
    catalog,
  ),
  null,
);
assert.equal(
  workspace.decodeBackup(
    { schema: 2, application: "Tradeweave", items: [item] },
    catalog,
  ).length,
  1,
);
assert.throws(() =>
  workspace.decodeBackup(
    {
      schema: 2,
      application: "Tradeweave",
      items: [item, { hash: "javascript:alert(1)" }],
    },
    catalog,
  ),
);
assert.throws(() =>
  workspace.decodeBackup(
    { schema: 9, application: "Tradeweave", items: [] },
    catalog,
  ),
);
assert.throws(() =>
  workspace.decodeBackup(
    { schema: 2, application: "Tradeweave", items: Array(31).fill(item) },
    catalog,
  ),
);
(async () => {
  let fetched = 0,
    fail = false;
  const cacheCtx = vm.createContext({
    CATALOG: catalog,
    selection: { product: "all" },
    datasetCache: new Map(),
    cacheLimit: 12,
    fetch: async () => {
      fetched++;
      return { ok: !fail, json: async () => ({ countries: {} }) };
    },
  });
  vm.runInContext(extract("getDataset"), cacheCtx);
  const sameA = cacheCtx.getDataset(2024, "all"),
    sameB = cacheCtx.getDataset(2024, "all");
  assert.equal(sameA, sameB);
  await sameA;
  assert.equal(fetched, 1);
  for (const product of catalog.products.slice(1, 21)) {
    cacheCtx.selection.product = product.id;
    await cacheCtx.getDataset(2024, product.id);
    assert.ok(cacheCtx.datasetCache.size <= 12);
  }
  fail = true;
  await assert.rejects(cacheCtx.getDataset(2022, "8542"));
  assert.equal(cacheCtx.datasetCache.has("2022/8542"), false);
  fail = false;
  await cacheCtx.getDataset(2022, "8542");
  console.log(
    JSON.stringify(
      {
        result: "pass",
        periodRows: checked,
        missingDifferences: missing,
        workspaceValidation: "pass",
        cacheBoundAndRetry: "pass",
      },
      null,
      2,
    ),
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
