const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path");
const model = require("../assets/atlas-model.js");
const map = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/world-map.json"), "utf8"),
);
const catalog = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/catalog.json"), "utf8"),
);
const codes = Object.keys(map.anchors);
let pairs = 0;
for (const code of codes) {
  assert.ok(catalog.countries[code]);
  const [x, y] = map.anchors[code];
  assert.ok(
    Number.isFinite(x) &&
      Number.isFinite(y) &&
      x >= 0 &&
      x <= map.w &&
      y >= 0 &&
      y <= map.h,
  );
}
for (const base of codes)
  for (const partner of codes) {
    if (base === partner) {
      assert.equal(
        model.connection(map.anchors, base, partner, "export", map.w, map.h),
        null,
      );
      continue;
    }
    const forward = model.connection(
        map.anchors,
        base,
        partner,
        "export",
        map.w,
        map.h,
      ),
      reverse = model.connection(
        map.anchors,
        base,
        partner,
        "import",
        map.w,
        map.h,
      );
    if (!forward) {
      assert.equal(reverse, null);
      continue;
    }
    assert.deepEqual(forward.from, reverse.to);
    assert.deepEqual(forward.to, reverse.from);
    assert.ok(!/NaN|Infinity/.test(forward.path));
    assert.ok(
      forward.label.x >= 0 && forward.label.x + forward.label.w <= map.w,
    );
    assert.ok(
      forward.label.y >= 0 && forward.label.y + forward.label.h <= map.h,
    );
    pairs++;
  }
assert.equal(
  model.connection(map.anchors, "KOR", "TKL", "export", map.w, map.h),
  null,
  "No guessed location for unmapped countries",
);
console.log(
  JSON.stringify(
    {
      result: "pass",
      representativePoints: codes.length,
      directionAndLabelChecks: pairs,
    },
    null,
    2,
  ),
);
