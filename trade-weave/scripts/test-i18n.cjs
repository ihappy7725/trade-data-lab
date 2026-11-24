const assert = require("node:assert/strict");
const fs = require("node:fs");
const { boot, tick, waitFor } = require("./test-research-dom.cjs");
function untranslated(w) {
  const bad = [];
  const walker = w.document.createTreeWalker(
    w.document.body,
    w.NodeFilter.SHOW_TEXT,
  );
  let n;
  while ((n = walker.nextNode())) {
    if (
      n.parentElement?.closest(
        "script,style,textarea,[data-language],#saved-list",
      )
    )
      continue;
    const text = n.textContent.trim();
    if (/[가-힣]/.test(text)) bad.push(text);
  }
  return bad;
}
(async () => {
  const test = await boot({
    hash: "#see/KOR/export?product=8542&partner=CHN&lang=en",
  });
  test.releaseHistory();
  const { w, $, change } = test;
  await waitFor(() => $("series-notice").hidden);
  await tick(40);
  assert.equal(w.document.documentElement.lang, "en");
  assert.equal(w.TWI18n.lang, "en");
  assert.match($("r-title").textContent, /Korea/);
  assert.match($("r-title").textContent, /Exports/);
  assert.match($("partner-amount").textContent, /US\$47.01B/);
  assert.ok(w.location.hash.includes("lang=en"));
  assert.deepEqual(
    untranslated(w),
    [],
    "All static and dynamic English interface text must be translated",
  );
  assert.deepEqual(
    Array.from(w.TWI18n.missing),
    [],
    "All English message keys must exist",
  );
  assert.equal(w.Tradeweave.catalog.products.length, 116);
  assert.ok(
    w.Tradeweave.catalog.products.every(
      (p) => !/[가-힣]/.test(p.label + p.scope + p.description),
    ),
  );
  const scopeBefore = JSON.parse(JSON.stringify(w.Tradeweave.state)),
    valueBefore = w.Tradeweave.relationship("KOR", "export", "CHN").row.v;
  $("open-note").click();
  $("workspace-note").value = "내 메모 / my note";
  $("save-note").click();
  change("partner-query", "CHN", "input");
  $("save-analysis").click();
  const requestsBeforeLanguage = test.requests.length;
  w.document.querySelector("[data-language=ko]").click();
  await tick(70);
  assert.equal(w.document.documentElement.lang, "ko");
  assert.match($("r-title").textContent, /대한민국/);
  assert.equal($("partner-amount").textContent, "470억 달러");
  assert.equal($("report-note").value, "내 메모 / my note");
  assert.equal($("partner-query").value, "CHN");
  assert.equal(
    test.requests.length,
    requestsBeforeLanguage,
    "Language changes reuse the same data snapshots",
  );
  $("save-analysis").click();
  assert.equal(
    JSON.parse(w.localStorage.getItem("tradeweave.saved.v1")).length,
    1,
    "Language changes must not create duplicate saved analyses",
  );
  assert.deepEqual(JSON.parse(JSON.stringify(w.Tradeweave.state)), scopeBefore);
  assert.equal(
    w.Tradeweave.relationship("KOR", "export", "CHN").row.v,
    valueBefore,
  );
  w.document.querySelector("[data-language=en]").click();
  await tick(70);
  assert.equal($("report-note").value, "내 메모 / my note");
  assert.equal(w.localStorage.getItem("tradeweave.language"), "en");
  w.TWStudio.activateTab("countries", true);
  await tick(30);
  change("matrix-query", "CHN", "input");
  change("matrix-metric", "amount");
  assert.match($("matrix-table").textContent, /US\$47.01B/);
  w.TWStudio.activateTab("changes", true);
  change("change-query", "CHN", "input");
  assert.match($("change-list").textContent, /pp/);
  w.TWStudio.activateTab("trends", true);
  $("toggle-periods").click();
  assert.match($("temporal-0-map-desc").textContent, /2023/);
  assert.match($("temporal-0-map-desc").textContent, /Exports/);
  $("open-report").click();
  $("download-report").click();
  const report = await test.downloads.at(-1).blob.text();
  assert.match(report, /<html lang="en"/);
  assert.ok(report.includes("Analysis report"));
  assert.ok(report.includes("내 메모 / my note"));
  assert.ok(!report.includes("출처와 재현 정보"));
  $("r-csv").click();
  const csv = await test.downloads.at(-1).blob.text();
  assert.ok(csv.includes("Reporting-country code"));
  assert.ok(csv.includes("47009443"));
  w.document.querySelector(".product-explore").click();
  change("product-query", "반도체", "input");
  assert.match($("product-results").textContent, /Semiconductor/);
  $("product-dialog").close();
  w.Tradeweave.go("source?lang=en&product=8542");
  await waitFor(() => !$("view-source").hidden);
  assert.deepEqual(untranslated(w), []);
  w.Tradeweave.go("see/USA/export?product=8486&partner=CHN&lang=en");
  await waitFor(
    () => w.Tradeweave.state.product === "8486" && $("series-notice").hidden,
  );
  await tick(40);
  assert.match($("related-policies").textContent, /semiconductor/);
  assert.deepEqual(untranslated(w), []);
  const fit = w.document.querySelector("[data-fit-relation=r]");
  const beforeFit = JSON.stringify(w.Tradeweave.state);
  fit.click();
  const transform = $("r-map").querySelector(".map-scene").style.transform;
  const zoom = Number(/scale\(([^)]+)\)/.exec(transform)[1]);
  assert.ok(zoom > 1 && zoom <= 4.5);
  assert.equal(JSON.stringify(w.Tradeweave.state), beforeFit);
  w.Tradeweave.go("see/USA/export?product=8486&partner=CHN&lang=ko");
  await waitFor(() => w.TWI18n.lang === "ko");
  await tick(60);
  assert.match($("related-policies").textContent, /반도체/);
  assert.equal($("peer-one").options.length, 226);
  w.Tradeweave.go("see/USA/export?product=8486&partner=CHN&lang=en");
  await waitFor(() => w.TWI18n.lang === "en");
  await tick(60);
  assert.deepEqual(untranslated(w), []);
  assert.equal($("peer-one").options.length, 226);
  assert.deepEqual(Array.from(w.TWI18n.missing), []);
  assert.equal(test.errors.length, 0, test.errors.map(String).join("\n"));
  test.dom.window.close();
  const home = await boot({ hash: "#?product=8542&lang=en" });
  home.releaseHistory();
  await tick(70);
  assert.match(home.$("hero-map-title").textContent, /Korea/);
  assert.match(home.$("hero-map-title").textContent, /Exports/);
  assert.deepEqual(untranslated(home.w), []);
  home.w.document.querySelector("[data-language=ko]").click();
  await tick(40);
  assert.match(home.$("hero-map-title").textContent, /대한민국/);
  home.$("home-country").value = "not-a-country";
  home
    .$("home-search")
    .dispatchEvent(
      new home.w.Event("submit", { bubbles: true, cancelable: true }),
    );
  assert.match(home.$("home-error").textContent, /국가/);
  home.w.document.querySelector("[data-language=en]").click();
  await tick(30);
  assert.match(home.$("home-error").textContent, /No matching country/);
  home.$("home-country").value = "일본";
  home
    .$("home-search")
    .dispatchEvent(
      new home.w.Event("submit", { bubbles: true, cancelable: true }),
    );
  assert.match(home.$("hero-map-title").textContent, /Japan/);
  home.dom.window.close();
  const failed = await boot({
    hash: "#see/KOR/export?product=8542&partner=CHN&lang=en",
    failYear: 2023,
  });
  failed.releaseHistory();
  await waitFor(() => !failed.$("retry-series").hidden);
  assert.match(failed.$("series-status").textContent, /Could not load/);
  assert.deepEqual(untranslated(failed.w), []);
  failed.recover();
  failed.$("retry-series").click();
  await waitFor(() => failed.$("series-notice").hidden);
  assert.deepEqual(Array.from(failed.w.TWI18n.missing), []);
  failed.dom.window.close();
  const mobile = await boot({
    hash: "#see/KOR/export?product=8542&partner=CHN&lang=en",
    small: true,
  });
  mobile.releaseHistory();
  await tick(70);
  mobile.w.Tradeweave.selectPartner("JPN");
  await tick(40);
  assert.equal(mobile.$("r-partner").getAttribute("aria-modal"), "true");
  assert.match(mobile.$("partner-title").textContent, /Japan/);
  assert.deepEqual(untranslated(mobile.w), []);
  mobile.dom.window.close();
  console.log(
    "PASS: English direct links, complete interface/product translations, both-way switching, unchanged analysis/values/filters/notes, English reports and CSV, bilingual product search, source and home views",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
