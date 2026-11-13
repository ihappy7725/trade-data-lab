// world-atlas(Natural Earth, 퍼블릭 도메인)에서 지도 SVG 경로를 미리 계산한다.
// 사용법: node scripts/build_map.mjs data/trade-2024.json data/world-map.json
// 필요 패키지: d3-geo@3.1.1 topojson-client@3.1.0 world-atlas@2.0.2
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/");
const { geoEqualEarth, geoPath } = require("d3-geo");
const { feature } = require("topojson-client");
const [tradePath, outPath] = process.argv.slice(2);
const trade = JSON.parse(fs.readFileSync(tradePath, "utf8")).countries;
const want = new Map(Object.entries(trade).map(([iso3, c]) => [c.num, iso3]));

const W = 960, H = 470;
const t110 = require("world-atlas/countries-110m.json");
const t50 = require("world-atlas/countries-50m.json");
const f110 = feature(t110, t110.objects.countries).features.filter(f => f.id !== "010");
const f50 = feature(t50, t50.objects.countries).features.filter(f => f.id !== "010");
const proj = geoEqualEarth().fitExtent([[4, 4], [W - 4, H - 4]], { type: "FeatureCollection", features: f110 });
const path = geoPath(proj).digits(1);

const shapes = [];   // [iso3 또는 null, path]
const seen = new Set();
for (const f of f110) {
  const iso3 = want.get(f.id) || null;
  if (iso3) seen.add(iso3);
  shapes.push([iso3, path(f)]);
}
// 110m에 없는 작은 나라(싱가포르, 홍콩 등)는 50m 중심점에 점으로 찍는다.
const dots = [];
for (const f of f50) {
  const iso3 = want.get(f.id);
  if (!iso3 || seen.has(iso3)) continue;
  const [x, y] = path.centroid(f);
  if (!isFinite(x)) continue;
  dots.push([iso3, Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
  seen.add(iso3);
}
const missing = Object.keys(trade).filter(k => !seen.has(k));
fs.writeFileSync(outPath, JSON.stringify({ w: W, h: H, projection: "Equal Earth", source: "Natural Earth via world-atlas 2.0.2", shapes, dots }));
console.log("shapes", shapes.length, "dots", dots.length, "not on map", missing.join(" "));
