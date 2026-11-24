/* Evidence-led summaries, two-period comparison and portable service context. */
(function () {
  "use strict";
  const i18nText = (key, values = []) =>
    globalThis.TWI18n
      ? globalThis.TWI18n.t(key, values)
      : key.replace(/\{(\d+)\}/g, (_, i) => String(values[Number(i)]));

  const api = window.Tradeweave,
    math = window.TradeweaveAnalysis;
  const $ = (id) => document.getElementById(id);
  let periodsOpen = false;
  let queued = false,
    allRows = false,
    mapKey = "";
  function node(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function ready() {
    const s = api.state;
    return api.series && api.series[s.year] && api.series[s.compareYear];
  }
  function data() {
    const s = api.state;
    return math.periodRows(
      api.rows(s.iso, s.flow, api.series[s.compareYear]),
      api.rows(s.iso, s.flow, api.series[s.year]),
    );
  }
  function focusEvidence(tab, id, partner) {
    if (partner) api.selectPartner(partner);
    window.TWStudio.closePartner();
    window.TWStudio.activateTab(tab, true);
    const target = $(id);
    target.scrollIntoView({
      block: "start",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
    target.focus({
      preventScroll: true,
    });
  }
  function card(title, text, tab, id, partner) {
    const el = node("button", "insight-card");
    el.type = "button";
    el.append(
      node("strong", "", title),
      node("span", "", text),
      node("span", "", i18nText("근거 확인 →")),
    );
    el.addEventListener("click", () => focusEvidence(tab, id, partner));
    return el;
  }
  function renderInsights() {
    const s = api.state,
      wrap = $("insight-cards");
    $("insight-context").textContent =
      s.compareYear + " → " + s.year + " · " + api.scope();
    wrap.replaceChildren();
    if (!ready()) {
      wrap.append(
        node(
          "p",
          "caption",
          i18nText(
            "선택연도 지도는 준비됐습니다. 비교 자료가 준비되면 변화 요약을 보여줍니다.",
          ),
        ),
      );
      return;
    }
    const before = api.rows(s.iso, s.flow, api.series[s.compareYear]),
      now = api.rows(s.iso, s.flow, api.series[s.year]);
    const rows = data().filter((row) => row.status === "both");
    const oldCR = before.list.length ? api.concentration(before, 5) : null;
    const newCR = now.list.length ? api.concentration(now, 5) : null;
    wrap.append(
      card(
        i18nText("상위 5개 상대국의 쏠림"),
        oldCR === null || newCR === null
          ? i18nText("두 연도의 전체 교역 기록이 있어야 비교할 수 있습니다.")
          : i18nText("{0} → {1} · {2} · 각 연도의 상위 5개를 각각 합산합니다.", [
              api.pct(oldCR),
              api.pct(newCR),
              math.signed(newCR - oldCR, "%p"),
            ]),
        "trends",
        "r-concentration",
      ),
    );
    const gain = rows
      .filter((row) => row.pp > 1e-9)
      .sort((a, b) => b.pp - a.pp)[0];
    const loss = rows
      .filter((row) => row.pp < -1e-9)
      .sort((a, b) => a.pp - b.pp)[0];
    wrap.append(
      card(
        i18nText("비중 변화가 큰 상대국"),
        i18nText("{0} · {1}. 두 연도 모두 기록된 상대국 기준입니다.", [
          gain
            ? api.name(gain.iso) + " " + math.signed(gain.pp, "%p")
            : i18nText("비중 증가 상대국 없음"),
          loss
            ? api.name(loss.iso) + " " + math.signed(loss.pp, "%p")
            : i18nText("비중 감소 상대국 없음"),
        ]),
        "changes",
        "r-changes",
        gain?.iso || loss?.iso,
      ),
    );
    const relation = rows.find((row) => row.iso === s.partner);
    const totalGrowth =
      before.total && now.total ? (now.total / before.total - 1) * 100 : null;
    const message =
      relation && totalGrowth !== null
        ? i18nText(
            "{0} 교역액 {1}, 전체 교역액 {2} · 비중 {3}. 비중은 상대국 금액을 전체 금액으로 나눈 값입니다.",
            [
              api.name(s.partner),
              math.signed(relation.percentChange, "%"),
              math.signed(totalGrowth, "%"),
              math.signed(relation.pp, "%p"),
            ],
          )
        : i18nText(
            "선택 상대국은 두 연도 중 하나에 기록이 없어 증감률을 계산하지 않습니다.",
          );
    wrap.append(
      card(
        i18nText("선택 상대국의 금액과 비중"),
        message,
        "trends",
        "r-comparison",
        s.partner,
      ),
    );
  }
  function renderMaps() {
    const s = api.state,
      key = [TWI18n.lang, s.iso, s.flow, s.product, s.year, s.compareYear].join(
        "/",
      );
    if (mapKey === key && $("temporal-maps").children.length) return;
    mapKey = key;
    const wrap = $("temporal-maps");
    wrap.replaceChildren();
    [s.compareYear, s.year].forEach((year, index) => {
      const vector = api.rows(s.iso, s.flow, api.series[year]);
      const figure = node("figure", "temporal-map");
      figure.append(
        node(
          "h3",
          "",
          i18nText("{0}년 · {1}", [year, index ? i18nText("선택연도") : i18nText("비교연도")]),
        ),
        node(
          "p",
          "caption",
          vector.total
            ? i18nText("전체 {0} = 100%", [api.usd(vector.total)])
            : i18nText("교역 기록 없음"),
        ),
      );
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.id = "temporal-" + index + "-map";
      svg.classList.add("map-svg");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-labelledby", svg.id + "-desc");
      const desc = document.createElementNS(svg.namespaceURI, "desc");
      desc.id = svg.id + "-desc";
      svg.append(desc);
      figure.append(svg);
      const legend = $("r-map")
        .closest(".map-panel")
        .querySelector(".legend")
        .cloneNode(true);
      figure.append(
        legend,
        node(
          "figcaption",
          "caption",
          i18nText("같은 비중 구간 · 이 지도의 분모는 {0}년 합계", [year]),
        ),
      );
      wrap.append(figure);
      api.drawMap("temporal-" + index, s.iso, s.flow, vector, year);
    });
  }
  function sortedRows() {
    const mode = $("temporal-sort").value;
    return data()
      .filter((row) => api.matchesCountry(row.iso, $("temporal-query").value))
      .sort((a, b) => {
        if (mode === "gain" || mode === "loss")
          return (
            (a.pp === null) - (b.pp === null) ||
            (mode === "gain"
              ? (b.pp ?? 0) - (a.pp ?? 0)
              : (a.pp ?? 0) - (b.pp ?? 0))
          );
        if (mode === "amount")
          return (
            (a.valueChange === null) - (b.valueChange === null) ||
            Math.abs(b.valueChange ?? 0) - Math.abs(a.valueChange ?? 0)
          );
        return (b.after?.p ?? -1) - (a.after?.p ?? -1);
      });
  }
  function renderRows() {
    const wrap = $("temporal-table"),
      positions = window.TWStudio.captureRowPositions(wrap);
    wrap.replaceChildren();
    if (!ready()) {
      $("temporal-count").textContent = i18nText("비교 자료를 기다리고 있습니다.");
      $("temporal-more").hidden = true;
      return;
    }
    const s = api.state,
      rows = sortedRows(),
      table = node("table", "research-table");
    const caption = node(
      "caption",
      "",
      i18nText("같은 상대국의 두 시점 비교 · 미기록은 0으로 계산하지 않습니다."),
    );
    table.append(caption);
    const head = table.createTHead().insertRow();
    [
      i18nText("상대국"),
      i18nText("{0}년 금액", [s.compareYear]),
      i18nText("{0}년 금액", [s.year]),
      i18nText("{0}년 비중", [s.compareYear]),
      i18nText("{0}년 비중", [s.year]),
      i18nText("비중 차이"),
      i18nText("순위"),
    ].forEach((text) => {
      const th = node("th", "", text);
      th.scope = "col";
      head.append(th);
    });
    const body = table.createTBody();
    (allRows ? rows : rows.slice(0, 15)).forEach((row) => {
      const tr = body.insertRow(),
        th = node("th");
      th.scope = "row";
      tr.dataset.partner = row.iso;
      tr.classList.toggle("is-selected", row.iso === s.partner);
      const link = node("a", "", api.name(row.iso));
      link.href =
        "#" +
        api.resultRoute(s.iso, s.flow, "partner", row.iso, {
          ...s,
          tab: "trends",
        });
      th.append(link);
      tr.append(th);
      [
        row.before ? api.usd(row.before.v) : i18nText("기록 없음"),
        row.after ? api.usd(row.after.v) : i18nText("기록 없음"),
        row.before ? api.pct(row.before.p) : "—",
        row.after ? api.pct(row.after.p) : "—",
        row.pp === null ? i18nText("계산 안 함") : math.signed(row.pp, "%p"),
        row.status === "both" ? row.before.rank + " → " + row.after.rank : "—",
      ].forEach((value) => tr.append(node("td", "", value)));
    });
    wrap.append(table);
    window.TWStudio.animateTableRows(wrap, positions);
    if (!rows.length)
      wrap.append(
        node("p", "caption", i18nText("검색 조건에 맞는 상대국이 없습니다.")),
      );
    $("temporal-count").textContent = i18nText(
      "{0} / {1}곳 · 선택한 두 연도 전체 상대국 기준",
      [allRows ? rows.length : Math.min(15, rows.length), rows.length],
    );
    $("temporal-more").hidden = rows.length <= 15;
    $("temporal-more").textContent = allRows
      ? i18nText("15개만 보기")
      : i18nText("전체 상대국 펼치기");
    $("temporal-more").setAttribute("aria-expanded", String(allRows));
  }
  function render() {
    if (!api.series || $("view-see").hidden || $("r-body").hidden) return;
    renderInsights();
    const s = api.state;
    $("temporal-context").textContent =
      api.name(s.iso) +
      " · " +
      api.scope() +
      " · " +
      (s.flow === "export" ? i18nText("수출") : i18nText("수입")) +
      " · " +
      s.compareYear +
      " → " +
      s.year;
    $("temporal-csv").disabled = !ready();
    $("temporal-maps").hidden = !ready();
    if (ready() && periodsOpen) renderMaps();
    else {
      mapKey = "";
      $("temporal-maps").replaceChildren();
    }
    if (periodsOpen) renderRows();
    const partner = api.state.partner;
    $("temporal-maps")
      .querySelectorAll("[data-partner]")
      .forEach((el) =>
        el.classList.toggle("on", el.dataset.partner === partner),
      );
  }
  document.addEventListener("tw:render", () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        render();
      });
    }
  });
  $("toggle-periods").addEventListener("click", () => {
    periodsOpen = !periodsOpen;
    $("period-content").hidden = !periodsOpen;
    $("toggle-periods").setAttribute("aria-expanded", String(periodsOpen));
    render();
  });
  $("temporal-query").addEventListener("input", () => {
    allRows = false;
    renderRows();
  });
  $("temporal-sort").addEventListener("change", renderRows);
  $("temporal-more").addEventListener("click", () => {
    allRows = !allRows;
    renderRows();
  });
  $("temporal-csv").addEventListener("click", () => {
    if (!ready()) return;
    const s = api.state;
    const headers = [
      i18nText("상대국 코드"),
      i18nText("상대국"),
      i18nText("{0} 금액(천 달러)", [s.compareYear]),
      i18nText("{0} 금액(천 달러)", [s.year]),
      i18nText("{0} 비중(%)", [s.compareYear]),
      i18nText("{0} 비중(%)", [s.year]),
      i18nText("비중 차이(%p)"),
      i18nText("거래액 차이(천 달러)"),
      i18nText("비교연도 순위"),
      i18nText("선택연도 순위"),
      i18nText("기록 상태"),
      i18nText("기준국"),
      i18nText("교역 방향"),
      i18nText("품목"),
      i18nText("자료 버전"),
      i18nText("출처"),
    ];
    const rows = data().map((row) => [
      row.iso,
      api.name(row.iso),
      row.before?.v ?? null,
      row.after?.v ?? null,
      row.before?.p ?? null,
      row.after?.p ?? null,
      row.pp,
      row.valueChange,
      row.before?.rank ?? null,
      row.after?.rank ?? null,
      row.status,
      s.iso,
      s.flow,
      s.product,
      api.catalog.version,
      api.catalog.source,
    ]);
    api.downloadCsv(
      [headers, ...rows].map((row) => row.map(api.csvQuote).join(",")),
      "tradeweave_" +
        s.iso +
        "_" +
        s.product +
        "_" +
        s.compareYear +
        "_" +
        s.year +
        "_periods.csv",
    );
  });
  function contextBundle() {
    const s = api.state;
    return {
      schema: 1,
      application: "Tradeweave",
      language: TWI18n.lang,
      createdAt: new Date().toISOString(),
      country: s.iso,
      partner: s.partner,
      flow: s.flow,
      year: s.year,
      compareYear: s.compareYear,
      product: s.product,
      productName: api.scope(),
      source: api.catalog.source,
      version: api.catalog.version,
      archiveUrl: api.catalog.archive_url,
      archiveSha256: api.catalog.archive_sha256,
      url: new URL(
        "#" + api.resultRoute(s.iso, s.flow, "", s.partner),
        "https://trade-data-lab.vercel.app/",
      ).href,
    };
  }
  function downloadJSON(value, name) {
    const link = node("a");
    link.href = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], {
        type: "application/json",
      }),
    );
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
  $("copy-context").addEventListener("click", async () => {
    const c = contextBundle();
    const text = i18nText(
      "{0} → {1} · {2} · {3}년 (비교 {4}년) · {5}\n{6} · {7}\n원자료 SHA-256: {8}\n{9}",
      [
        api.name(c.country),
        c.partner ? api.name(c.partner) : i18nText("전체 상대국"),
        c.flow === "export" ? i18nText("수출") : i18nText("수입"),
        c.year,
        c.compareYear,
        c.productName,
        c.source,
        c.version,
        c.archiveSha256,
        c.url,
      ],
    );
    try {
      await navigator.clipboard.writeText(text);
      api.say(i18nText("분석 조건·출처·돌아올 주소를 복사했습니다."));
    } catch (error) {
      $("context-fallback").hidden = false;
      $("context-fallback").value = text;
      $("context-fallback").focus();
      $("context-fallback").select();
    }
  });
  $("download-context").addEventListener("click", () =>
    downloadJSON(contextBundle(), "tradeweave_context.json"),
  );
  window.TradeweaveResearch = {
    render,
    contextBundle,
    getView: () => ({
      query: $("temporal-query").value,
      sort: $("temporal-sort").value,
      all: allRows,
      open: periodsOpen,
    }),
    restoreView: (view) => {
      if (!view) return;
      $("temporal-query").value = String(view.query || "").slice(0, 100);
      if (["current", "gain", "loss", "amount"].includes(view.sort))
        $("temporal-sort").value = view.sort;
      allRows = view.all === true;
      periodsOpen = view.open === true;
      $("period-content").hidden = !periodsOpen;
      $("toggle-periods").setAttribute("aria-expanded", String(periodsOpen));
      render();
    },
  };
})();
