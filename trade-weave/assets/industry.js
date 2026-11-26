/* Lazy country slices, HS2 composition, accounting reconciliation and portable exports. */
(function () {
  "use strict";
  const api = window.Tradeweave,
    model = window.TradeweaveIndustryModel;
  const $ = (id) => document.getElementById(id);
  const t = (key, values = []) => TWI18n.t(key, values);
  const cache = new Map(),
    pending = new Map();
  let pendingMap = null;
  let generation = 0,
    queued = false,
    current = null;
  const explanation =
    "기여도는 산업 증감액을 비교연도 상품 전체 금액으로 나눈 전체 증감률 기여(%p)입니다. 한쪽 연도 미기록 산업의 증감은 계산하지 않습니다.";
  const scopeNote =
    "HS 2단위 전체 산업을 비교합니다. 상단 품목 선택과 관계없이 상품 전체를 분모로 사용합니다.";
  const reconciliationNote =
    "기록 범위 차이는 한쪽 연도에만 기록된 금액의 순차이입니다. 실제 신규·중단 교역을 뜻하지 않습니다. 반올림 차이는 상품 전체와 산업별 합계의 차이에서 발생합니다. 원인 분석이 아닌 산술 분해입니다.";
  function el(tag, cls, value) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (value !== undefined) n.textContent = value;
    return n;
  }
  const money = (n) => (n === null ? "—" : api.usd(n));
  const signedMoney = (n) =>
    n === null ? "—" : (n > 0 ? "+" : n < 0 ? "−" : "") + api.usd(Math.abs(n));
  const number = (n, signed = false) =>
    n === null
      ? "—"
      : (signed && n > 0 ? "+" : "") +
        new Intl.NumberFormat(TWI18n.locale, {
          maximumFractionDigits: 2,
        }).format(n);
  const pp = (n) =>
    number(n, true) + (n === null ? "" : " " + TWI18n.unit("%p"));
  const status = (s) =>
    t(
      {
        both: "양쪽 연도 기록",
        current_only: "선택연도만 기록",
        reference_only: "비교연도만 기록",
        neither: "양쪽 연도 미기록",
      }[s],
    );
  function label(id) {
    return api.catalog.products.find((p) => p.id === id)?.label || id;
  }
  function validate(payload, iso) {
    const chapters = api.catalog.products
      .filter((p) => p.level === 2)
      .map((p) => p.id);
    if (
      payload.schema !== 1 ||
      payload.country !== iso ||
      payload.version !== api.catalog.version ||
      payload.archive_sha256 !== api.catalog.archive_sha256
    )
      throw new Error("Industry source mismatch");
    const vector = (v) =>
      Array.isArray(v) &&
      v.every(
        (r) =>
          Array.isArray(r) &&
          r.length === 2 &&
          api.catalog.countries[r[0]] &&
          Number.isSafeInteger(r[1]) &&
          r[1] > 0,
      ) &&
      new Set(v.map((r) => r[0])).size === v.length;
    for (const year of api.catalog.years) {
      const y = payload.years?.[year];
      if (
        !y ||
        !Array.isArray(y.all) ||
        y.all.length !== 2 ||
        !y.all.every(vector) ||
        !Array.isArray(y.chapters) ||
        y.chapters.length !== chapters.length ||
        !y.chapters.every(
          (r, i) =>
            r.length === 3 &&
            r[0] === chapters[i] &&
            vector(r[1]) &&
            vector(r[2]),
        )
      )
        throw new Error("Invalid industry records");
    }
    return payload;
  }
  async function ensure(iso = api.state.iso) {
    if (cache.has(iso)) {
      const value = cache.get(iso);
      cache.delete(iso);
      cache.set(iso, value);
      return value;
    }
    if (pending.has(iso)) return pending.get(iso);
    const promise = (async () => {
      if (!api.catalog.countries[iso]) throw new Error("Invalid country");
      const response = await fetch(
        "data/industry/HS22-V202601/" + iso + ".json.gz",
      );
      if (!response.ok) throw new Error("Industry request failed");
      const payload = validate(
        JSON.parse(
          fflate.strFromU8(
            fflate.gunzipSync(new Uint8Array(await response.arrayBuffer())),
          ),
        ),
        iso,
      );
      cache.set(iso, payload);
      while (cache.size > 3) cache.delete(cache.keys().next().value);
      return payload;
    })();
    pending.set(iso, promise);
    try {
      return await promise;
    } finally {
      pending.delete(iso);
    }
  }
  function context(s, partner) {
    return (
      api.name(s.iso) +
      (partner ? " ↔ " + api.name(partner) : "") +
      " · " +
      t(s.flow === "export" ? "수출" : "수입") +
      " · " +
      s.compareYear +
      " → " +
      s.year +
      " · " +
      t("상품 전체")
    );
  }
  function source(s) {
    return (
      "CEPII BACI · " +
      api.catalog.version +
      " · HS22 · " +
      s.compareYear +
      " / " +
      s.year +
      " · " +
      api.catalog.unit +
      " · " +
      api.catalog.license
    );
  }
  function tableData(d, s, partner) {
    const headers = [
      t("산업 / HS 2단위"),
      s.compareYear + " · " + t("금액"),
      s.year + " · " + t("금액"),
      t("금액 변화"),
      t("선택연도 산업 비중"),
      t("비중 변화"),
      t("전체 증감률 기여(%p)"),
      t("기록 상태"),
    ];
    if (partner) headers.push(t("국가 전체 산업 비중"));
    const cells = (r) => [
      "HS " + r.id + " · " + label(r.id),
      money(r.before),
      money(r.after),
      signedMoney(r.delta),
      number(r.shareAfter) + (r.shareAfter === null ? "" : "%"),
      pp(r.shareChange),
      pp(r.contribution),
      status(r.status),
      ...(partner
        ? [number(r.baselineShare) + (r.baselineShare === null ? "" : "%")]
        : []),
    ];
    return { headers, cells };
  }
  function reconciliation(d) {
    const block = el("div", "industry-reconcile-inner");
    block.append(el("h3", "", t("전체 증감액 대조")));
    const list = el("dl");
    for (const [key, value] of [
      ["양쪽 기록 산업 증감 합계", d.commonDelta],
      ["기록 범위 차이", d.coverageDelta],
      ["반올림 차이", d.roundingDelta],
      ["상품 전체 증감액", d.totalDelta],
    ])
      list.append(el("dt", "", t(key)), el("dd", "", signedMoney(value)));
    block.append(list, el("p", "caption", t(reconciliationNote)));
    return block;
  }
  function render(payload) {
    const s = { ...api.state };
    $("industry-target").querySelector('[value="partner"]').disabled =
      !s.partner;
    const partner = $("industry-target").value === "partner" ? s.partner : "";
    const d = model.analyze(payload, { ...s, partner });
    current = {
      payload,
      s,
      partner,
      d,
      lang: TWI18n.lang,
      signature: JSON.stringify(api.state),
    };
    $("industry-context").textContent = context(s, partner);
    $("industry-source").textContent = source(s);
    $("industry-metrics").replaceChildren();
    for (const [key, value] of [
      [s.compareYear + " · " + t("상품 전체"), money(d.totalBefore)],
      [s.year + " · " + t("상품 전체"), money(d.totalAfter)],
      [
        t("상품 전체 증감률"),
        number(d.growth, true) + (d.growth === null ? "" : "%"),
      ],
    ]) {
      const card = el("div", "industry-metric");
      card.append(el("span", "caption", key), el("strong", "", value));
      $("industry-metrics").append(card);
    }
    const query = api.normalize($("industry-query").value.trim());
    const sort = $("industry-sort").value;
    const rows = d.rows.filter(
      (r) =>
        ($("industry-records").value === "all" || r.status !== "neither") &&
        (!query ||
          api
            .normalize(
              "HS " +
                r.id +
                " " +
                api.catalog.products.find((p) => p.id === r.id).searchText,
            )
            .includes(query)),
    );
    rows.sort((a, b) => {
      if (sort === "code") return a.id.localeCompare(b.id);
      const key = sort === "current" ? "after" : "contribution";
      if (a[key] === null)
        return b[key] === null ? a.id.localeCompare(b.id) : 1;
      if (b[key] === null) return -1;
      return (
        (sort === "loss" ? a[key] - b[key] : b[key] - a[key]) ||
        a.id.localeCompare(b.id)
      );
    });
    $("industry-count").textContent = t(
      "{0}개 산업 · CSV는 검색과 관계없이 전체 96개 산업을 포함합니다.",
      [rows.length],
    );
    const { headers, cells } = tableData(d, s, partner),
      table = $("industry-table");
    const head = el("tr");
    for (const h of [...headers, t("지도 탐색")]) {
      const th = el("th", "", h);
      th.scope = "col";
      head.append(th);
    }
    table.tHead.replaceChildren(head);
    const body = table.tBodies[0];
    body.replaceChildren();
    for (const r of rows) {
      const row = el("tr");
      row.dataset.industry = r.id;
      cells(r).forEach((text, i) => {
        const cell = el(i ? "td" : "th", "", text);
        if (!i) cell.scope = "row";
        row.append(cell);
      });
      const cell = el("td"),
        a = el("a", "", t("상대국 지도"));
      a.href =
        "#" +
        api.resultRoute(s.iso, s.flow, "", s.partner, {
          ...s,
          product: r.id,
          tab: "trends",
        });
      a.setAttribute(
        "aria-label",
        t("HS {0} {1} 상대국 지도", [r.id, label(r.id)]),
      );
      a.addEventListener("click", (event) => {
        if (
          event.button ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        pendingMap = { iso: s.iso, product: r.id };
      });
      cell.append(a);
      row.append(cell);
      body.append(row);
    }
    if (!rows.length) {
      const row = el("tr"),
        cell = el("td", "", t("검색 결과가 없습니다."));
      cell.colSpan = headers.length + 1;
      row.append(cell);
      body.append(row);
    }
    const bars = $("industry-bars");
    bars.replaceChildren();
    const change = sort === "gain" || sort === "loss",
      key = change ? "contribution" : "shareAfter";
    const displayed = rows.filter((r) => r[key] !== null).slice(0, 10),
      max = Math.max(...displayed.map((r) => Math.abs(r[key])), 1);
    bars.append(
      el("h3", "", t(change ? "증감 기여 상위 산업" : "선택연도 산업 구성")),
    );
    for (const r of displayed) {
      const row = el("div", "industry-bar-row");
      row.append(
        el("span", "industry-bar-label", "HS " + r.id + " · " + label(r.id)),
      );
      const track = el("span", "industry-track"),
        fill = el(
          "span",
          change
            ? r[key] < 0
              ? "industry-fill negative"
              : "industry-fill positive"
            : "industry-fill",
        );
      fill.style.width = (Math.abs(r[key]) / max) * 100 + "%";
      track.append(fill);
      row.append(
        track,
        el("strong", "", change ? pp(r[key]) : number(r[key]) + "%"),
      );
      bars.append(row);
    }
    bars.append(
      el(
        "p",
        "caption",
        t(
          "막대는 현재 검색·정렬 결과의 앞 10개 산업입니다. 전체 값은 아래 표에서 확인합니다.",
        ),
      ),
    );
    $("industry-reconciliation").replaceChildren(reconciliation(d));
    $("industry-status").textContent = "";
    $("industry-content").hidden = false;
    $("industry-csv").disabled = false;
  }
  async function refresh() {
    const token = ++generation;
    if (
      pendingMap &&
      api.state.iso === pendingMap.iso &&
      api.state.product === pendingMap.product &&
      !document.body.classList.contains("is-loading")
    ) {
      pendingMap = null;
      const title = $("r-title");
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
      title.scrollIntoView({
        block: "start",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    }
    current = null;
    $("industry-csv").disabled = true;
    if (
      !api.catalog ||
      $("r-industry").hidden ||
      !location.hash.startsWith("#see/")
    )
      return;
    const iso = api.state.iso;
    $("industry-content").hidden = true;
    $("industry-retry").hidden = true;
    $("industry-status").textContent = t("산업 자료를 불러오는 중입니다.");
    try {
      const payload = await ensure(iso);
      if (
        token === generation &&
        iso === api.state.iso &&
        !$("r-industry").hidden
      )
        render(payload);
    } catch (error) {
      if (token !== generation) return;
      $("industry-status").textContent = t(
        "산업 자료를 불러오지 못했습니다. 다시 시도해 주세요.",
      );
      $("industry-retry").hidden = false;
    }
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      refresh();
    });
  }
  for (const id of [
    "industry-target",
    "industry-query",
    "industry-sort",
    "industry-records",
  ])
    $(id).addEventListener(
      id === "industry-query" ? "input" : "change",
      schedule,
    );
  $("industry-retry").addEventListener("click", schedule);
  document.addEventListener("tw:render", schedule);
  document.addEventListener("tw:tab", schedule);
  $("industry-csv").addEventListener("click", () => {
    if (
      !current ||
      current.signature !== JSON.stringify(api.state) ||
      current.lang !== TWI18n.lang
    )
      return;
    const { d, s, partner } = current;
    const metaHeaders = [
      t("행 유형"),
      t("기준국 코드"),
      t("상대국 코드"),
      t("방향"),
      t("비교연도"),
      t("선택연도"),
      "HS2",
      t("산업명"),
      t("비교연도 금액(천 달러)"),
      t("선택연도 금액(천 달러)"),
      t("금액 변화(천 달러)"),
      t("비교연도 산업 비중(%)"),
      t("선택연도 산업 비중"),
      t("비중 변화"),
      t("전체 증감률 기여(%p)"),
      t("기록 상태"),
      t("국가 전체 산업 비중"),
      t("비교연도 상품 전체(천 달러)"),
      t("선택연도 상품 전체(천 달러)"),
      t("자료 버전"),
      "archive_sha256",
      "source",
      "source_url",
      "license",
      "value_unit",
    ];
    const start = (kind) => [
      kind,
      s.iso,
      partner,
      s.flow,
      s.compareYear,
      s.year,
    ];
    const end = [
      d.totalBefore,
      d.totalAfter,
      api.catalog.version,
      api.catalog.archive_sha256,
      "CEPII BACI",
      api.catalog.archive_url,
      api.catalog.license,
      api.catalog.unit,
    ];
    const rows = d.rows.map((r) => [
      ...start("industry"),
      r.id,
      label(r.id),
      r.before,
      r.after,
      r.delta,
      r.shareBefore,
      r.shareAfter,
      r.shareChange,
      r.contribution,
      r.status,
      r.baselineShare,
      ...end,
    ]);
    for (const [kind, name, value] of [
      ["common_change", "양쪽 기록 산업 증감 합계", d.commonDelta],
      ["record_coverage", "기록 범위 차이", d.coverageDelta],
      ["rounding", "반올림 차이", d.roundingDelta],
      ["total_change", "상품 전체 증감액", d.totalDelta],
    ])
      rows.push([
        ...start(kind),
        "",
        t(name),
        null,
        null,
        value,
        null,
        null,
        null,
        value !== null && d.totalBefore > 0
          ? (value / d.totalBefore) * 100
          : null,
        "",
        null,
        ...end,
      ]);
    api.downloadCsv(
      [metaHeaders, ...rows].map((r) =>
        r.map((v) => api.csvQuote(v === null ? "" : v)).join(","),
      ),
      "tradeweave_" +
        s.iso +
        (partner ? "_" + partner : "") +
        "_" +
        s.compareYear +
        "_" +
        s.year +
        "_industry.csv",
    );
  });
  function appendReport(main, s, payload) {
    for (const partner of ["", ...(s.partner ? [s.partner] : [])]) {
      const d = model.analyze(payload, { ...s, partner });
      const section = el("section");
      section.append(
        el("h2", "", t("산업 구성과 증감 기여")),
        el("p", "", context(s, partner)),
        el("p", "", t(scopeNote)),
        el("p", "", t(explanation)),
      );
      const { headers, cells } = tableData(d, s, partner),
        table = el("table"),
        head = el("thead"),
        hr = el("tr");
      headers.forEach((h) => {
        const th = el("th", "", h);
        th.scope = "col";
        hr.append(th);
      });
      head.append(hr);
      table.append(head);
      const body = el("tbody");
      for (const r of d.rows) {
        const row = el("tr");
        cells(r).forEach((v, i) => {
          const cell = el(i ? "td" : "th", "", v);
          if (!i) cell.scope = "row";
          row.append(cell);
        });
        body.append(row);
      }
      table.append(body);
      const wrap = el("div", "table-wrap");
      wrap.append(table);
      section.append(wrap, reconciliation(d), el("p", "", source(s)));
      main.append(section);
    }
  }
  window.TradeweaveIndustry = { ensure, appendReport };
  schedule();
})();
