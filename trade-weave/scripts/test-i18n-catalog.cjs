const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const locale = require("../assets/i18n.js"),
  data = require("../assets/locales/en.js");
const catalog = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/catalog.json")),
);
for (const [key, value] of Object.entries(data.messages)) {
  assert.ok(value && !/[가-힣]/.test(value), key);
  const placeholders = (s) => [...new Set(s.match(/\{\d+\}/g) || [])].sort();
  assert.deepEqual(placeholders(key), placeholders(value), key);
}
locale.localizeCatalog(catalog);
const ids = catalog.products.map((item) => item.id);
locale.setLanguage("en", { history: false });
assert.deepEqual(
  catalog.products.map((item) => item.id),
  ids,
);
assert.ok(
  catalog.products.every(
    (item) =>
      item.label &&
      item.scope &&
      item.description &&
      !/[가-힣]/.test(item.label + item.scope + item.description),
  ),
);
assert.equal(
  catalog.products.find((item) => item.id === "8542").label,
  "Electronic integrated circuits",
);
assert.equal(locale.unit("%p"), " pp");
locale.setLanguage("ko", { history: false });
assert.equal(
  catalog.products.find((item) => item.id === "8542").label,
  "전자집적회로",
);
assert.equal(locale.unit("%p"), "%p");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
assert.ok(
  !/세계 교역의 연결을 읽다|WORLD TRADE MAP|GLOBAL TRADE ATLAS|SELECTED RELATIONSHIP|STRUCTURAL CHANGE|PRODUCT EXPLORER|YOUR WORKSPACE/.test(
    html,
  ),
);
const styles = ["studio.css", "research.css", "atlas.css"].map((name) =>
  fs.readFileSync(path.join(__dirname, "../assets", name), "utf8"),
);
assert.ok(styles.every((css) => !/:root\s*\{/.test(css)));
console.log(
  JSON.stringify(
    {
      result: "pass",
      translatedMessages: Object.keys(data.messages).length,
      productScopes: ids.length,
      singleTokenSource: "pass",
      removedSlogans: "pass",
    },
    null,
    2,
  ),
);
