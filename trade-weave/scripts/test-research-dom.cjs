/* Optional DOM integration suite: requires jsdom on NODE_PATH. No browser automation. */
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const base = path.resolve(__dirname, "..");
const tick = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(check) {
  for (let i = 0; i < 200; i++) {
    if (check()) return;
    await tick(10);
  }
  throw new Error("Timed out waiting for DOM state");
}
async function boot({
  hash = "#see/KOR/export?product=8542&partner=CHN",
  failYear = null,
  small = false,
  locale = null,
} = {}) {
  const errors = [],
    requests = [],
    downloads = [];
  let fail = failYear;
  let releaseHistory;
  const historyGate = new Promise((resolve) => {
    releaseHistory = resolve;
  });
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(e));
  vc.on("error", (...args) => console.error(...args));
  const dom = new JSDOM(fs.readFileSync(base + "/index.html", "utf8"), {
    url: "http://localhost/" + hash,
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  const w = dom.window;
  // jsdom parses CSS but does not apply viewport media queries; mobile focus tests use DOM state only.
  for (const file of small
    ? []
    : [
        "tokens.css",
        "studio.css",
        "research.css",
        "atlas.css",
        "layout.css",
        "industry.css",
      ]) {
    const style = w.document.createElement("style");
    style.textContent = fs.readFileSync(
      path.join(base, "assets", file),
      "utf8",
    );
    w.document.head.append(style);
  }

  w.scrollTo = () => {};
  w.matchMedia = (q) => ({
    matches: q.includes("850px") ? small : false,
    addEventListener() {},
    removeEventListener() {},
  });
  w.Element.prototype.scrollIntoView = function () {};
  w.Element.prototype.animate = function () {
    return { finished: Promise.resolve() };
  };
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  w.HTMLAnchorElement.prototype.click = function () {
    if (this.download)
      downloads.push({ name: this.download, blob: w._blobs.get(this.href) });
    else
      this.dispatchEvent(
        new w.MouseEvent("click", { bubbles: true, cancelable: true }),
      );
  };
  w._blobs = new Map();
  w.URL.createObjectURL = (blob) => {
    const id = "blob:test/" + w._blobs.size;
    w._blobs.set(id, blob);
    return id;
  };
  w.URL.revokeObjectURL = () => {};
  w.Blob = Blob;
  w.fetch = async (url) => {
    const file = String(url).split("?")[0];
    requests.push(file);
    const m = /\/(202[234])\//.exec(file);
    if (m && m[1] !== "2024") await historyGate;
    return {
      ok: !(m && Number(m[1]) === fail),
      arrayBuffer: async () => {
        const bytes = fs.readFileSync(path.join(base, file));
        return bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        );
      },
      json: async () =>
        JSON.parse(fs.readFileSync(path.join(base, file), "utf8")),
    };
  };
  w.addEventListener("error", (e) => errors.push(e.error));
  w.addEventListener("unhandledrejection", (e) => errors.push(e.reason));
  for (const file of [
    "locales/en.js",
    "i18n.js",
    "app.js",
    "analysis.js",
    "workspace-state.js",
    "studio.js",
    "research.js",
    "atlas-model.js",
    "atlas.js",
    "vendor/fflate.js",
    "industry-model.js",
    "industry.js",
  ])
    w.eval(fs.readFileSync(base + "/assets/" + file, "utf8"));
  const $ = (id) => w.document.getElementById(id),
    change = (id, value, type = "change") => {
      $(id).value = value;
      $(id).dispatchEvent(new w.Event(type, { bubbles: true }));
    };
  try {
    await waitFor(() =>
      hash.startsWith("#see/")
        ? !$("r-body").hidden
        : !$("hero-map-body").hidden,
    );
  } catch (error) {
    console.error(
      "BOOT ERRORS",
      errors.map(String),
      $("load-error").textContent,
    );
    throw error;
  }
  assert.equal(
    hash.startsWith("#see/") ? $("r-body").hidden : $("hero-map-body").hidden,
    false,
    "Selected year appears before delayed histories",
  );
  assert.equal($("series-notice").hidden, false);
  assert.ok(
    !hash.includes("product=8542") ||
      !requests.some((file) => file.endsWith("/all.json")),
    "No eager unrelated default product",
  );
  if (locale) w.TWI18n.setLanguage(locale, { persist: true });
  return {
    w,
    dom,
    $,
    change,
    errors,
    requests,
    downloads,
    releaseHistory,
    recover: () => {
      fail = null;
    },
  };
}
async function run() {
  const t = await boot();
  const { w, $, change } = t;
  assert.equal(
    w.document.querySelectorAll(".compare-control #compare-year").length,
    1,
  );
  assert.equal(
    w.document.querySelectorAll(".export-menu #export-image").length,
    1,
  );
  assert.equal(
    w.document.querySelector("#partner-exact").closest("details").open,
    false,
  );
  t.releaseHistory();
  await waitFor(() => $("series-notice").hidden);
  assert.equal($("series-notice").hidden, true);
  assert.equal(w.document.querySelectorAll(".insight-card").length, 3);
  assert.equal(
    w.document.querySelectorAll("#r-map .connection-layer").length,
    1,
  );
  assert.match(
    w.document.querySelector("#r-map .callout-country").textContent,
    /중국/,
  );
  assert.equal(
    w.getComputedStyle(w.document.querySelector("#r-map .connection-arc")).fill,
    "none",
    "The original map path rule must not fill the connection curve",
  );
  const selectedPartner = w.Tradeweave.state.partner;
  w.document
    .querySelector('#r-rank [data-partner="S19"]')
    .dispatchEvent(new w.MouseEvent("pointerover", { bubbles: true }));
  await tick(30);
  assert.equal(
    w.Tradeweave.state.partner,
    selectedPartner,
    "Hover preview does not mutate the analysis selection",
  );
  assert.equal(
    w.document.querySelector("#r-map .callout-country").textContent,
    w.Tradeweave.name("S19"),
  );
  w.document
    .querySelector('#r-rank [data-partner="S19"]')
    .dispatchEvent(new w.MouseEvent("pointerout", { bubbles: true }));
  await tick(30);
  assert.match(
    w.document.querySelector("#r-map .callout-country").textContent,
    /중국/,
  );
  w.document.querySelector("#view-see [data-connection-toggle]").click();
  assert.equal(
    w.document.querySelectorAll("#r-map .connection-layer").length,
    0,
  );
  w.document.querySelector("#view-see [data-connection-toggle]").click();
  assert.equal(
    w.document.querySelectorAll("#r-map .connection-layer").length,
    1,
  );

  assert.match($("insight-cards").textContent, /27.8%/);
  $("toggle-periods").click();
  assert.equal($("period-content").hidden, false);
  assert.equal(w.document.querySelectorAll("#temporal-maps svg").length, 2);
  assert.match($("temporal-0-map-desc").textContent, /2023/);
  assert.match($("temporal-1-map-desc").textContent, /2024/);
  w.document
    .querySelector("#temporal-0-map [data-partner=CHN]")
    .dispatchEvent(
      new w.MouseEvent("pointerenter", { clientX: 100, clientY: 100 }),
    );
  assert.match($("tooltip-scope").textContent, /2023/);
  change("temporal-query", "CHN", "input");
  assert.equal(
    w.document.querySelectorAll("#temporal-table tbody tr").length,
    1,
  );
  assert.match($("temporal-table").textContent, /−2.2%p/);
  $("temporal-csv").click();
  assert.match(await t.downloads.at(-1).blob.text(), /CHN,中国|CHN,중국/);
  w.TWStudio.activateTab("countries", true);
  await tick(50);
  change("matrix-query", "CHN", "input");
  change("matrix-metric", "amount");
  assert.match($("matrix-table").textContent, /470억 달러/);
  change("matrix-metric", "rank");
  assert.match($("matrix-table").textContent, /1위/);
  $("open-note").click();
  $("workspace-note").value = "검증 메모 <표> & 출처";
  $("save-note").click();
  assert.equal($("report-note").value, "검증 메모 <표> & 출처");
  $("save-analysis").click();
  const saved = JSON.parse(w.localStorage.getItem("tradeweave.saved.v1"));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].ui["matrix-metric"], "rank");
  assert.equal(saved[0].note, "검증 메모 <표> & 출처");
  assert.ok(saved[0].snapshot.archiveSha256);
  w.Tradeweave.selectPartner("USA");
  await tick(50);
  assert.equal($("report-note").value, "", "Note isolation by context");
  $("open-saved").click();
  w.document.querySelector(".saved-item>a").click();
  await tick(80);
  assert.equal(w.Tradeweave.state.partner, "CHN");
  assert.equal($("report-note").value, "검증 메모 <표> & 출처");
  assert.equal($("matrix-metric").value, "rank");
  const reportCount = t.downloads.length;
  $("download-report").click();
  await waitFor(() => t.downloads.length > reportCount);
  const report = await t.downloads.at(-1).blob.text();
  assert.ok(report.includes("검증 메모 &lt;표&gt; &amp; 출처"));
  assert.ok(report.includes("관측된 변화 요약"));
  assert.ok(!report.includes("<script"));
  const reportDOM = new JSDOM(report);
  assert.equal(reportDOM.window.document.querySelectorAll("svg").length, 2);
  assert.ok(
    reportDOM.window.document.body.textContent.includes("두 시점 상대국 비교"),
  );
  const industrySections = [
    ...reportDOM.window.document.querySelectorAll("section"),
  ].filter(
    (s) => s.querySelector("h2")?.textContent === "산업 구성과 증감 기여",
  );
  assert.equal(
    industrySections.length,
    2,
    "Country and selected-partner industry reports",
  );
  for (const section of industrySections) {
    assert.equal(section.querySelectorAll("tbody tr").length, 96);
    assert.ok(section.textContent.includes("반올림 차이"));
  }
  reportDOM.window.close();
  $("backup-saved").click();
  const backup = JSON.parse(await t.downloads.at(-1).blob.text());
  assert.equal(backup.schema, 2);
  assert.equal(backup.items[0].note, saved[0].note);
  const inject = async (content) => {
    Object.defineProperty($("import-saved"), "files", {
      configurable: true,
      value: [{ size: content.length, text: async () => content }],
    });
    $("import-saved").dispatchEvent(new w.Event("change"));
    await tick(40);
  };
  const storedBefore = w.localStorage.getItem("tradeweave.saved.v1");
  await inject("{bad json");
  assert.equal(w.localStorage.getItem("tradeweave.saved.v1"), storedBefore);
  assert.match($("storage-message").textContent, /기존 저장은 유지/);
  await inject(JSON.stringify(backup));
  assert.equal(
    JSON.parse(w.localStorage.getItem("tradeweave.saved.v1"))[0].note,
    saved[0].note,
  );
  const originalSet = w.Storage.prototype.setItem;
  w.Storage.prototype.setItem = () => {
    throw new Error("quota");
  };
  $("save-analysis").click();
  assert.match($("toast").textContent, /저장하지 못/);
  w.Storage.prototype.setItem = originalSet;

  const bad = {
    ...saved[0],
    snapshot: { version: "old version", archiveSha256: "0".repeat(64) },
  };
  w.localStorage.setItem("tradeweave.saved.v1", JSON.stringify([bad]));
  $("open-saved").click();
  const hash = w.location.hash;
  w.document.querySelector(".saved-item>a").click();
  assert.equal(w.location.hash, hash);
  assert.match($("storage-message").textContent, /다릅니다/);
  const url = new URL(
    w.document.querySelector("#r-related .related-grid a").href,
  );
  assert.equal(url.searchParams.get("tw_product"), "8542");
  assert.equal(w.TradeweaveResearch.contextBundle().product, "8542");
  assert.equal(t.errors.length, 0, t.errors.map(String).join("\n"));
  t.dom.window.close();
  const failure = await boot({ failYear: 2023 });
  failure.releaseHistory();
  await waitFor(() => !failure.$("retry-series").hidden);
  assert.equal(failure.$("r-body").hidden, false);
  assert.equal(failure.$("retry-series").hidden, false);
  assert.equal(failure.$("download-report").disabled, true);
  assert.equal(
    failure.$("r-concentration").querySelector("#r-cr5").textContent,
    "87.6%",
  );
  assert.equal(
    failure.w.document.querySelectorAll("#temporal-table tbody tr").length,
    0,
    "No current-year fallback for unavailable history",
  );
  failure.recover();
  failure.$("retry-series").click();
  await waitFor(() => failure.$("series-notice").hidden);
  assert.equal(failure.$("series-notice").hidden, true);
  assert.equal(failure.$("download-report").disabled, false);
  assert.equal(failure.errors.length, 0, failure.errors.map(String).join("\n"));
  failure.dom.window.close();
  const rapid = await boot();
  rapid.w.Tradeweave.chooseProduct("27");
  await waitFor(() => rapid.w.Tradeweave.state.product === "27");
  rapid.w.Tradeweave.chooseProduct("85");
  await waitFor(() => rapid.w.Tradeweave.state.product === "85");
  rapid.releaseHistory();
  await waitFor(() => rapid.$("series-notice").hidden);
  assert.equal(rapid.w.Tradeweave.state.product, "85");
  assert.deepEqual(
    JSON.parse(JSON.stringify(rapid.w.Tradeweave.trade.meta)),
    JSON.parse(
      fs.readFileSync(base + "/data/series/HS22-V202601/2024/85.json", "utf8"),
    ).meta,
  );
  assert.equal(rapid.errors.length, 0, rapid.errors.map(String).join("\n"));
  rapid.dom.window.close();
  const absent = await boot({
    hash: "#see/KOR/export?product=8542&partner=PRK",
  });
  absent.releaseHistory();
  await tick(60);
  assert.equal(
    absent.w.document.querySelectorAll("#r-map .connection-layer").length,
    0,
    "No line for an unrecorded trade",
  );
  absent.dom.window.close();
  const home = await boot({ hash: "#?product=8542" });
  home.releaseHistory();
  await tick(80);
  assert.equal(
    home.w.document.querySelectorAll("#hero-map .connection-layer").length,
    1,
  );
  assert.equal(home.w.document.querySelectorAll(".feature").length, 4);
  assert.match(home.$("atlas-focus-copy").textContent, /중국/);
  const direction = home.w.Tradeweave.state.flow;
  home.w.document
    .querySelector('#hero-rank [data-partner="S19"]')
    .dispatchEvent(new home.w.MouseEvent("pointerover", { bubbles: true }));
  await tick(30);
  assert.match(home.$("atlas-focus-copy").textContent, /대만/);
  assert.equal(home.w.Tradeweave.state.flow, direction);
  home.w.document
    .querySelector('#hero-rank [data-partner="S19"]')
    .dispatchEvent(new home.w.MouseEvent("pointerout", { bubbles: true }));
  await tick(30);
  assert.match(home.$("atlas-focus-copy").textContent, /중국/);
  assert.ok(home.$("example-compare-link").hash.includes("tab=countries"));
  assert.equal(home.errors.length, 0, home.errors.map(String).join("\n"));
  home.dom.window.close();
  const mobile = await boot({ small: true });
  mobile.releaseHistory();
  await waitFor(() => mobile.$("series-notice").hidden);
  mobile.w.Tradeweave.selectPartner("JPN");
  await tick(50);
  mobile.w.TWStudio.openPartner();
  assert.ok(mobile.$("r-partner").classList.contains("sheet-open"));
  assert.equal(mobile.w.document.querySelector(".partner-details").open, false);
  mobile.w.document.dispatchEvent(
    new mobile.w.KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  assert.equal(mobile.w.document.activeElement.id, "swap-partner");
  mobile.w.document.dispatchEvent(
    new mobile.w.KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    }),
  );
  assert.equal(mobile.w.document.activeElement.id, "close-partner");
  mobile.w.document.dispatchEvent(
    new mobile.w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  assert.ok(!mobile.$("r-partner").classList.contains("sheet-open"));
  mobile.w.document.querySelectorAll(".insight-card")[1].click();
  assert.ok(
    !mobile.$("r-partner").classList.contains("sheet-open"),
    "Evidence navigation must not leave a mobile modal covering the evidence",
  );
  const ids = Array.from(
    mobile.w.document.querySelectorAll("[id]"),
    (el) => el.id,
  );
  assert.equal(ids.length, new Set(ids).size, "Unique document IDs");
  for (const el of mobile.w.document.querySelectorAll(
    "script[src],link[rel=stylesheet]",
  )) {
    const url = new URL(el.src || el.href);
    if (url.origin !== mobile.w.location.origin) continue;
    assert.ok(fs.existsSync(path.join(base, url.pathname)), url.pathname);
  }
  assert.equal(mobile.errors.length, 0, mobile.errors.map(String).join("\n"));
  mobile.dom.window.close();
  console.log(
    "PASS: selected-year-first loading, evidence summaries, correct year labels, CSV/report/backup downloads, metric switching, memo isolation/restoration, version guard, handoff metadata, partial failure/retry, mobile detail states, atlas hover/toggle/no-record states and CSS parsing",
  );
}
module.exports = { boot, tick, waitFor };
if (require.main === module)
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
