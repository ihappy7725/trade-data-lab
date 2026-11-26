/* DOM integration only; this does not replace physical browser visual QA. */
const assert = require("node:assert/strict");
const { boot, tick, waitFor } = require("./test-research-dom.cjs");
(async () => {
  const test = await boot({
    hash: "#see/KOR/export?product=8542&partner=CHN&lang=en",
  });
  const { w, $, change, requests, downloads } = test;
  assert.ok(
    !requests.some((p) => p.includes("/industry/")),
    "Country slices must be lazy",
  );
  w.TWStudio.activateTab("industry", true);
  await waitFor(() => !$("industry-content").hidden);
  assert.equal(w.Tradeweave.state.tab, "industry");
  assert.equal($("tab-industry").getAttribute("aria-selected"), "true");
  assert.equal($("industry-table").tBodies[0].rows.length, 96);
  assert.match($("industry-context").textContent, /All products/);
  const allFirst = $("industry-table").tBodies[0].rows[0].dataset.industry;
  assert.equal(allFirst, "85");
  assert.ok(!$("industry-content").textContent.match(/[가-힣]/));
  change("industry-target", "partner");
  await waitFor(() => $("industry-table").tHead.rows[0].cells.length === 10);
  assert.match($("industry-context").textContent, /China/);
  assert.equal(
    requests.filter((p) => p.includes("/industry/")).length,
    1,
    "Partner switch reuses country data",
  );
  change("industry-query", "반도체", "input");
  await tick(60);
  // HS2 search is by chapter, not selected HS4 headings.
  assert.equal($("industry-table").tBodies[0].rows.length, 1);
  assert.match($("industry-table").textContent, /No results/);
  change("industry-query", "electrical", "input");
  await waitFor(
    () => $("industry-table").tBodies[0].rows[0].dataset.industry === "85",
  );
  assert.ok($("industry-table").tBodies[0].rows.length >= 1);
  $("industry-csv").click();
  const csv = await downloads.at(-1).blob.text();
  assert.equal(
    csv.trim().split(/\r?\n/).length,
    101,
    "All 96 industries + four accounting rows + header",
  );
  assert.ok(csv.includes("record_coverage"));
  assert.ok(csv.includes("Contribution to total growth (pp)"));
  assert.equal(
    w.Tradeweave.state.product,
    "8542",
    "Industry scope must not silently change map product",
  );
  const link = $("industry-table").querySelector("tbody a");
  assert.match(link.hash, /product=85(?:&|$)/);
  assert.match(link.hash, /partner=CHN(?:&|$)/);
  change("industry-sort", "loss");
  await tick(60);
  w.document.querySelector("[data-language=ko]").click();
  await waitFor(() =>
    $("industry-content").textContent.includes("전체 증감액 대조"),
  );
  assert.equal($("industry-query").value, "electrical");
  assert.equal($("industry-target").value, "partner");
  assert.equal($("industry-sort").value, "loss");
  $("save-analysis").click();
  const saved = JSON.parse(w.localStorage.getItem("tradeweave.saved.v1"))[0];
  assert.equal(saved.ui["industry-target"], "partner");
  assert.equal(saved.ui["industry-query"], "electrical");
  assert.equal(saved.ui["industry-sort"], "loss");
  change("industry-target", "all");
  change("industry-query", "");
  change("industry-sort", "code");
  w.Tradeweave.selectPartner("USA");
  await tick(70);
  $("open-saved").click();
  w.document.querySelector(".saved-item>a").click();
  await waitFor(
    () =>
      w.Tradeweave.state.partner === "CHN" &&
      $("industry-query").value === "electrical" &&
      !$("industry-content").hidden,
  );
  assert.equal(w.Tradeweave.state.tab, "industry");
  assert.equal($("industry-target").value, "partner");
  assert.equal($("industry-sort").value, "loss");
  // Failed country requests expose retry without retaining the previous table.
  const original = w.fetch;
  let fail = true;
  w.fetch = async (url) =>
    String(url).includes("/USA.json.gz") && fail
      ? { ok: false }
      : original(url);
  w.Tradeweave.go("see/USA/import?tab=industry&partner=JPN&lang=ko");
  await waitFor(() => !$("industry-retry").hidden);
  assert.equal($("industry-content").hidden, true);
  assert.equal($("industry-csv").disabled, true);
  fail = false;
  $("industry-retry").click();
  await waitFor(() => !$("industry-content").hidden);
  assert.match($("industry-context").textContent, /미국/);
  assert.match($("industry-context").textContent, /일본/);
  assert.match($("industry-context").textContent, /수입/);
  assert.deepEqual([...w.TWI18n.missing], []);
  assert.deepEqual(test.errors.map(String), []);
  w.close();
  // A late old-country response must not overwrite the current country.
  const stale = await boot({ hash: "#see/KOR/export?lang=en" }),
    sw = stale.w;
  stale.releaseHistory();
  await waitFor(() => stale.$("series-notice").hidden);
  const sf = sw.fetch;
  let release;
  const gate = new Promise((r) => (release = r));
  sw.fetch = async (url) => {
    if (String(url).includes("/KOR.json.gz")) await gate;
    return sf(url);
  };
  sw.TWStudio.activateTab("industry", true);
  await tick(50);
  stale.$("open-report").click();
  stale.$("download-report").click();
  assert.match(stale.$("report-status").textContent, /Preparing/);
  sw.Tradeweave.go("see/USA/export?tab=industry&lang=en");
  try {
    await waitFor(
      () =>
        !stale.$("industry-content").hidden &&
        stale
          .$("industry-context")
          .textContent.includes(sw.Tradeweave.name("USA")),
    );
  } catch (e) {
    console.error({
      state: sw.Tradeweave.state,
      status: stale.$("industry-status").textContent,
      context: stale.$("industry-context").textContent,
      hidden: stale.$("r-industry").hidden,
      errors: stale.errors.map(String),
      requests: stale.requests.slice(-6),
    });
    throw e;
  }
  release();
  await tick(100);
  assert.ok(
    stale
      .$("industry-context")
      .textContent.startsWith(sw.Tradeweave.name("USA")),
  );
  await waitFor(() => !stale.$("download-report").disabled);
  assert.equal(
    stale.downloads.length,
    0,
    "Conditions changed while preparing report",
  );
  assert.match(stale.$("report-status").textContent, /conditions changed/);
  assert.equal(stale.$("report-dialog").open, true);
  let reportFail = true;
  sw.fetch = async (url) =>
    String(url).includes("/DEU.json.gz") && reportFail
      ? { ok: false }
      : sf(url);
  sw.Tradeweave.go("see/DEU/export?lang=en");
  await waitFor(
    () =>
      sw.Tradeweave.state.iso === "DEU" &&
      !sw.document.body.classList.contains("is-loading"),
  );
  stale.$("download-report").click();
  await waitFor(() =>
    stale.$("report-status").textContent.includes("could not be prepared"),
  );
  assert.equal(stale.downloads.length, 0);
  assert.equal(stale.$("download-report").disabled, false);
  reportFail = false;
  stale.$("download-report").click();
  await waitFor(() => stale.downloads.length === 1);
  const recoveredReport = await stale.downloads[0].blob.text();
  assert.ok(
    recoveredReport.includes("Industry composition and growth contributions"),
  );
  assert.ok(!recoveredReport.includes("<script"));
  assert.deepEqual(stale.errors.map(String), []);
  sw.close();
  console.log(
    JSON.stringify({
      result: "pass",
      lazySlices: true,
      search: "bilingual",
      csv: "96 chapters + reconciliation",
      retry: true,
      staleResponse: true,
      localePreservesFilters: true,
    }),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
