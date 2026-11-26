const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  zlib = require("node:zlib"),
  crypto = require("node:crypto");
const model = require("../assets/industry-model.js");
const base = path.resolve(__dirname, ".."),
  catalog = JSON.parse(fs.readFileSync(base + "/data/catalog.json"));
const dir = base + "/data/industry/HS22-V202601";
const manifest = JSON.parse(fs.readFileSync(dir + "/manifest.json"));
const chapters = catalog.products.filter((p) => p.level === 2).map((p) => p.id);
assert.equal(chapters.length, 96);
assert.equal(manifest.archive_sha256, catalog.archive_sha256);
const digest = (b) => crypto.createHash("sha256").update(b).digest("hex");
const payloads = {};
let vectors = 0,
  reconciliations = 0,
  missing = 0;
for (const iso of Object.keys(catalog.countries)) {
  const bytes = fs.readFileSync(dir + "/" + iso + ".json.gz");
  assert.equal(bytes.length, manifest.files[iso].bytes);
  assert.equal(digest(bytes), manifest.files[iso].sha256);
  const p = (payloads[iso] = JSON.parse(zlib.gunzipSync(bytes)));
  assert.equal(p.country, iso);
  assert.equal(p.version, catalog.version);
  assert.equal(p.archive_sha256, catalog.archive_sha256);
}
// Every derived vector must exactly equal its delivered source snapshot.
for (const year of catalog.years)
  for (const [i, chapter] of ["all", ...chapters].entries()) {
    const filename = catalog.datasets[year + "/" + chapter],
      raw = fs.readFileSync(base + "/data/" + filename);
    assert.equal(digest(raw), manifest.sources[filename]);
    const source = JSON.parse(raw);
    for (const [iso, p] of Object.entries(payloads)) {
      const y = p.years[year],
        derived = i === 0 ? y.all : y.chapters[i - 1].slice(1);
      if (i) assert.equal(y.chapters[i - 1][0], chapter);
      const r = source.countries[iso] || { x: [], m: [] };
      assert.deepEqual(derived, [r.x, r.m]);
      vectors += 2;
    }
  }
for (const [iso, p] of Object.entries(payloads))
  for (const [compareYear, year] of [
    [2022, 2023],
    [2023, 2024],
    [2024, 2022],
  ])
    for (const flow of ["export", "import"]) {
      const field = flow === "export" ? 0 : 1;
      const sample = p.years[year].all[field].slice(0, 2).map((r) => r[0]);
      for (const partner of ["", ...sample]) {
        const d = model.analyze(p, { year, compareYear, flow, partner });
        assert.equal(d.rows.length, 96);
        if (d.totalDelta !== null) {
          assert.equal(
            d.commonDelta + d.coverageDelta + d.roundingDelta,
            d.totalDelta,
          );
          const direct =
            d.rows
              .filter((r) => r.status === "current_only")
              .reduce((n, r) => n + r.after, 0) -
            d.rows
              .filter((r) => r.status === "reference_only")
              .reduce((n, r) => n + r.before, 0);
          assert.equal(d.coverageDelta, direct);
          reconciliations++;
        }
        for (const r of d.rows) {
          if (r.before === null || r.after === null) {
            assert.equal(r.delta, null);
            assert.equal(r.contribution, null);
            assert.equal(r.shareChange, null);
            missing++;
          } else {
            assert.equal(r.delta, r.after - r.before);
            if (d.totalBefore > 0)
              assert.equal(r.contribution, (r.delta / d.totalBefore) * 100);
          }
        }
      }
    }
// Near-zero total growth must never change the contribution denominator.
const vector = (n) => [["USA", n]],
  year = (all, chapters) => ({
    all: [vector(all), []],
    chapters: chapters.map(([id, n]) => [id, n === null ? [] : vector(n), []]),
  });
const p = {
  years: {
    2023: year(100, [
      ["01", 60],
      ["02", 39],
      ["03", null],
    ]),
    2024: year(100, [
      ["01", 40],
      ["02", null],
      ["03", 59],
    ]),
  },
};
const d = model.analyze(p, { compareYear: 2023, year: 2024, flow: "export" });
assert.equal(d.growth, 0);
assert.equal(d.rows[0].contribution, -20);
assert.equal(d.coverageDelta, 20);
assert.equal(d.roundingDelta, 0);
assert.equal(d.rows[1].after, null);
assert.equal(d.rows[2].before, null);
assert.equal(
  model.analyze(p, { compareYear: 2024, year: 2023, flow: "export" }).rows[0]
    .contribution,
  20,
);
const none = model.analyze(p, {
  compareYear: 2023,
  year: 2024,
  flow: "export",
  partner: "JPN",
});
assert.equal(none.totalDelta, null);
assert.equal(none.growth, null);
console.log(
  JSON.stringify({
    result: "pass",
    countries: Object.keys(payloads).length,
    sourceSnapshots: Object.keys(manifest.sources).length,
    exactSourceVectors: vectors,
    reconciliations,
    missingEndpoints: missing,
    compressedBytes: Object.values(manifest.files).reduce(
      (n, r) => n + r.bytes,
      0,
    ),
  }),
);
