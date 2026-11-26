(function () {
  "use strict";
  const i18nText = (key, values = []) =>
    globalThis.TWI18n
      ? globalThis.TWI18n.t(key, values)
      : key.replace(/\{(\d+)\}/g, (_, i) => String(values[Number(i)]));

  var TRADE = null;
  var MAP = null;
  var CATALOG = null;
  var SERIES = null;
  var datasetCache = new Map();
  var seriesStatus = {};
  var cacheLimit = 12;
  var loadPromise = null;
  var renderId = 0;
  var selection = {
    iso: "KOR",
    flow: "export",
    section: "",
    partner: null,
    year: null,
    product: null,
    compareYear: null,
    peers: ["JPN", "S19"],
    tab: "trends",
  };
  var tableCountry = null;
  var countryIndex = [];
  var sourceUrl =
    "https://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37";
  var SVGNS = "http://www.w3.org/2000/svg";
  // Policyline의 정책 ID와 품목 설명은 정책 목록 원본에서 확인한 연결 대상이다.
  var policyLinks = [
    {
      exporter: "CHN",
      importer: "USA",
      id: "cn-ree-2025",
      hs: "850511",
      title: "2025년 희토류 통제 · 영구자석 수입",
    },
    {
      exporter: "CHN",
      importer: "USA",
      id: "cn-us-ga-ban-2024",
      hs: "811292",
      title: "2024년 갈륨·게르마늄 대미 수출 금지",
    },
    {
      exporter: "CHN",
      importer: "USA",
      id: "us-ev-301-2024",
      hs: "870380",
      title: "2024년 중국산 전기차 관세",
    },
    {
      exporter: "USA",
      importer: "CHN",
      id: "us-semi-2022",
      hs: "8486",
      title: "2022년 반도체 제조장비 수출통제",
    },
    {
      exporter: "JPN",
      importer: "KOR",
      id: "jp-kr-2019",
      hs: "281111",
      title: "2019년 일본의 대한국 수출규제 · 불화수소",
    },
  ];
  var aliases = {
    KOR: ["한국", "남한", "South Korea", "Korea", "Republic of Korea", "KR"],
    PRK: ["북조선", "North Korea", "DPRK", "KP"],
    CHN: ["China", "중화인민공화국", "CN"],
    USA: ["United States", "United States of America", "US", "미합중국"],
    GBR: ["United Kingdom", "UK", "Britain", "Great Britain"],
    S19: ["Taiwan", "TWN", "TW", "타이완"],
    VNM: ["Vietnam", "Viet Nam", "VN"],
    AUS: ["호주", "Australia", "AU"],
    ARE: ["UAE", "United Arab Emirates"],
    RUS: ["Russia"],
    TUR: ["Türkiye", "Turkiye", "Turkey", "튀르키예", "터키"],
  };
  function nameOf(iso) {
    return TWI18n.country(CATALOG, iso);
  }

  function normalize(value) {
    return value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\s.,()'’_-]/g, "");
  }
  function canonicalCode(code) {
    return code.toUpperCase() === "TWN" ? "S19" : code.toUpperCase();
  }
  function wordOf(flow) {
    return flow === "export" ? i18nText("수출") : i18nText("수입");
  }
  function activeProduct() {
    return CATALOG.products.find(function (product) {
      return product.id === selection.product;
    });
  }
  function scopeName() {
    return activeProduct().scope;
  }
  function defaultCompare(year) {
    if (!CATALOG) return null;
    var earlier = CATALOG.years.filter(function (candidate) {
      return candidate < year;
    });
    return earlier.length
      ? earlier[earlier.length - 1]
      : CATALOG.years.find(function (candidate) {
          return candidate !== year;
        });
  }
  function scopedPath(path, partner, context) {
    context = context || selection;
    var params = new URLSearchParams();
    params.set("lang", TWI18n.lang);
    if (path === "" || path === "features-title") {
      if (context.iso && context.iso !== "KOR")
        params.set("country", context.iso);
      if (context.flow && context.flow !== "export")
        params.set("flow", context.flow);
    }
    if (path.startsWith("see/") && context.peers)
      params.set("peers", context.peers.join(","));
    if (path.startsWith("see/") && context.tab && context.tab !== "trends")
      params.set("tab", context.tab);
    if (partner) params.set("partner", partner);
    if (context.year !== CATALOG.default.year) params.set("year", context.year);
    if (context.product !== CATALOG.default.product)
      params.set("product", context.product);
    if (
      context.compareYear &&
      context.compareYear !== defaultCompare(context.year)
    )
      params.set("compare", context.compareYear);
    var query = params.toString();
    return path + (query ? "?" + query : "");
  }
  const tabForSection = {
    partners: "partners",
    comparison: "trends",
    concentration: "trends",
    sources: "trends",
  };
  function resultRoute(iso, flow, section, partner, context) {
    const destinationTab = tabForSection[section];
    if (destinationTab)
      context = {
        ...(context || selection),
        tab: destinationTab,
      };
    return scopedPath(
      "see/" + iso + "/" + flow + (section ? "/" + section : ""),
      partner,
      context,
    );
  }
  function setBusy(busy) {
    document
      .querySelectorAll(
        '[data-search] input, [data-search] button[type="submit"], [data-year], [data-product], [data-rflow], [data-hflow], #compare-year, #comparison-csv, #save-analysis, #export-image, #countries-csv, #changes-csv, #peer-one, #peer-two, #change-year, #matrix-csv, #open-report',
      )
      .forEach(function (el) {
        el.disabled = busy;
      });
    document.getElementById("view-see").setAttribute("aria-busy", String(busy));
    document.body.classList.toggle("is-loading", busy);
    document
      .getElementById("view-home")
      .setAttribute("aria-busy", String(busy));
  }
  function fillScopeControls() {
    document.querySelectorAll("[data-year]").forEach(function (select) {
      select.replaceChildren();
      CATALOG.years
        .slice()
        .reverse()
        .forEach(function (year) {
          var option = document.createElement("option");
          option.value = year;
          option.textContent = year;
          select.appendChild(option);
        });
    });
    document.querySelectorAll("[data-product]").forEach(function (select) {
      select.replaceChildren();
      [null, 2, 4].forEach(function (level) {
        var group = document.createElement("optgroup");
        group.label =
          level === null
            ? i18nText("전체 상품")
            : level === 2
              ? i18nText("산업군 · HS 2단위")
              : i18nText("주요 품목 · HS 4단위");
        CATALOG.products
          .filter(function (p) {
            return level === null ? p.id === "all" : p.level === level;
          })
          .forEach(function (product) {
            var option = document.createElement("option");
            option.value = product.id;
            option.textContent = product.scope;
            group.appendChild(option);
          });
        select.appendChild(group);
      });
    });
  }
  function updateScopeControls() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.value = selection.year;
    });
    document.querySelectorAll("[data-product]").forEach(function (el) {
      el.value = selection.product;
    });
    document
      .querySelectorAll("[data-scope-description]")
      .forEach(function (el) {
        el.textContent = activeProduct().description;
      });
    document.querySelectorAll("[data-features-link]").forEach(function (el) {
      el.href = "#" + scopedPath("features-title", null);
    });
    document.querySelectorAll("[data-home]").forEach(function (el) {
      el.href = "#" + scopedPath("", null);
    });
    document.querySelectorAll("[data-source-link]").forEach(function (el) {
      el.href = "#" + scopedPath("source", null);
    });
    document.querySelectorAll("[data-pick-link]").forEach(function (el) {
      el.href = "#" + scopedPath("pick", null);
    });
    document.getElementById("example-kor-link").href =
      "#" + resultRoute("KOR", "export", "", null);
    document.getElementById("example-vnm-link").href =
      "#" + resultRoute("VNM", "import", "concentration", null);
    document.getElementById("example-qat-link").href =
      "#" + resultRoute("QAT", "export", "sources", null);
  }
  function getDataset(year, product) {
    var key = year + "/" + product;
    if (!datasetCache.has(key)) {
      var promise = fetch("data/" + CATALOG.datasets[key])
        .then(function (response) {
          if (!response.ok) throw new Error("snapshot");
          return response.json().then((dataset) => {
            if (dataset.meta) TWI18n.localizeMeta(dataset.meta);
            return dataset;
          });
        })
        .catch(function (error) {
          if (datasetCache.get(key) === promise) datasetCache.delete(key);
          throw error;
        });
      datasetCache.set(key, promise);
    }
    const cached = datasetCache.get(key);
    datasetCache.delete(key);
    datasetCache.set(key, cached);
    for (const candidate of datasetCache.keys()) {
      if (datasetCache.size <= cacheLimit) break;
      if (!candidate.endsWith("/" + selection.product) && candidate !== key)
        datasetCache.delete(candidate);
    }
    return cached;
  }
  async function loadScope(year, product) {
    const selected = await getDataset(year, product);
    return {
      selected,
      series: {
        [year]: selected,
      },
    };
  }
  function updateSeriesNotice() {
    const missing = CATALOG.years.filter((year) => !SERIES[year]);
    const failed = missing.filter((year) => seriesStatus[year] === "error");
    document.getElementById("series-notice").hidden = !missing.length;
    document.getElementById("series-status").textContent = failed.length
      ? i18nText(
          "{0}년 비교 자료를 불러오지 못했습니다. 선택연도 지도와 표는 계속 사용할 수 있습니다.",
          [failed.join("·")],
        )
      : i18nText(
          "{0}년 비교 자료를 준비하고 있습니다. 선택연도 지도와 표를 먼저 탐색하세요.",
          [missing.join("·")],
        );
    document.getElementById("retry-series").hidden = !failed.length;
    document.getElementById("download-report").disabled = !!missing.length;
    document.getElementById("report-availability").textContent = missing.length
      ? i18nText("전체 보고서는 모든 연도 자료가 준비된 뒤 저장할 수 있습니다.")
      : i18nText("모든 연도의 자료가 준비됐습니다.");
    document.getElementById("comparison-csv").disabled = !!missing.length;
    document.getElementById("changes-csv").disabled =
      !SERIES[selection.compareYear];
  }
  function hydrateSeries(product, retry) {
    CATALOG.years.forEach((year) => {
      if (SERIES[year] || (!retry && seriesStatus[year] === "error")) return;
      seriesStatus[year] = "loading";
      getDataset(year, product)
        .then((dataset) => {
          if (selection.product !== product) return;
          SERIES[year] = dataset;
          seriesStatus[year] = "ready";
        })
        .catch(() => {
          if (selection.product === product) seriesStatus[year] = "error";
        })
        .finally(() => {
          if (selection.product !== product || !SERIES) return;
          updateSeriesNotice();
          if (!document.getElementById("view-see").hidden) renderComparison();
          else emitRender();
        });
    });
    updateSeriesNotice();
  }
  function comparisonMetrics(dataset) {
    if (!dataset)
      return {
        relation: null,
        cr5: null,
        hhi: null,
        count: 0,
        total: null,
      };
    var data = rows(selection.iso, selection.flow, dataset);
    var relation = selection.partner
      ? partnerRelationship(
          selection.iso,
          selection.flow,
          selection.partner,
          dataset,
        )
      : null;
    return {
      relation: relation,
      cr5: data.list.length ? concentration(data, 5) : null,
      hhi: data.list.length
        ? data.list.reduce(function (sum, row) {
            return sum + row.p * row.p;
          }, 0)
        : null,
      total: data.total,
      count: data.list.length,
    };
  }
  function signedChange(value, unit) {
    unit = TWI18n.unit(unit);

    if (value === 0) return "0.0" + unit;
    var sign = value > 0 ? "+" : "−";
    if (Math.abs(value) < 0.05) return i18nText("{0}0.1{1} 미만", [sign, unit]);
    return sign + Math.abs(value).toFixed(1) + unit;
  }
  function renderComparison() {
    var container = document.getElementById("year-cards");
    container.replaceChildren();
    var partnerName = selection.partner
      ? nameOf(selection.partner)
      : i18nText("선택 상대국");
    document.getElementById("comparison-scope").textContent = i18nText(
      "{0} {1}에서 {2}의 비중 · {3}",
      [nameOf(selection.iso), wordOf(selection.flow), partnerName, scopeName()],
    );
    var compare = document.getElementById("compare-year");
    compare.replaceChildren();
    CATALOG.years
      .filter(function (year) {
        return year !== selection.year;
      })
      .forEach(function (year) {
        var option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        compare.appendChild(option);
      });
    compare.value = selection.compareYear;
    CATALOG.years.forEach(function (year) {
      var metrics = comparisonMetrics(SERIES[year]);
      var relation = metrics.relation;
      var card = document.createElement("button");
      card.type = "button";
      card.className = "year-card";
      card.dataset.historyYear = year;
      card.disabled = !SERIES[year];
      card.setAttribute("aria-pressed", String(year === selection.year));
      var label = document.createElement("span");
      label.className = "year-label";
      label.textContent = year;
      var state = document.createElement("span");
      state.className = "year-state";
      state.textContent =
        year === selection.year
          ? i18nText("선택연도")
          : year === selection.compareYear
            ? i18nText("비교연도")
            : "";
      label.appendChild(state);
      var share = document.createElement("strong");
      share.textContent =
        relation && relation.baseShare !== null
          ? fmtPct(relation.baseShare)
          : "—";
      var amount = document.createElement("span");
      amount.className = "caption";
      amount.textContent =
        relation && relation.row
          ? i18nText("교역액 {0}", [fmtUsd(relation.row.v)])
          : !SERIES[year]
            ? seriesStatus[year] === "error"
              ? i18nText("자료 불러오기 실패")
              : i18nText("자료 준비 중")
            : i18nText("상대국 교역 기록 없음");
      var structure = document.createElement("span");
      structure.className = "caption";
      structure.textContent =
        metrics.cr5 !== null
          ? i18nText("전체 상대국 CR5 {0} · HHI {1}", [
              fmtPct(metrics.cr5),
              Math.round(metrics.hhi).toLocaleString(TWI18n.locale),
            ])
          : !SERIES[year]
            ? i18nText("자료가 준비되면 비교지표를 표시합니다.")
            : i18nText("이 품목·방향의 교역 기록 없음");
      card.append(label, share, amount, structure);
      container.appendChild(card);
    });
    var previous = comparisonMetrics(SERIES[selection.compareYear]);
    var current = comparisonMetrics(SERIES[selection.year]);
    var changes = document.getElementById("comparison-change");
    changes.replaceChildren();
    var period = document.createElement("strong");
    period.textContent = selection.compareYear + " → " + selection.year;
    changes.appendChild(period);
    var before = previous.relation;
    var after = current.relation;
    var entries = [];
    if (before && after && before.row && after.row) {
      entries.push(
        i18nText("상대국 비중 {0}", [
          signedChange(after.baseShare - before.baseShare, "%p"),
        ]),
      );
      entries.push(
        i18nText("교역액 {0}", [
          signedChange((after.row.v / before.row.v - 1) * 100, "%"),
        ]),
      );
    } else
      entries.push(
        !SERIES[selection.compareYear]
          ? i18nText("비교연도 자료가 준비되면 변화를 계산합니다.")
          : i18nText("상대국 교역액·비중은 비교할 기록이 없습니다."),
      );
    if (previous.cr5 !== null && current.cr5 !== null)
      entries.push("CR5 " + signedChange(current.cr5 - previous.cr5, "%p"));
    entries.forEach(function (text) {
      var span = document.createElement("span");
      span.textContent = text;
      changes.appendChild(span);
    });
    document.getElementById("comparison-source").textContent = i18nText(
      "출처 · {0} · {1} · {2}년 · {3} · 교역액은 경상 달러 기준",
      [CATALOG.source, CATALOG.version, CATALOG.years.join("·"), scopeName()],
    );
    document.getElementById("r-comparison").hidden = false;
    updateSeriesNotice();
    emitRender();
  }
  function hideMapTooltip() {
    document.getElementById("map-tooltip").classList.remove("is-visible");
  }
  function positionMapTooltip(event) {
    var tooltip = document.getElementById("map-tooltip");
    var left = event.clientX + 16;
    var top = event.clientY + 16;
    if (left + tooltip.offsetWidth > innerWidth - 12)
      left = event.clientX - tooltip.offsetWidth - 16;
    if (top + tooltip.offsetHeight > innerHeight - 12)
      top = event.clientY - tooltip.offsetHeight - 16;
    tooltip.style.left = Math.max(12, left) + "px";
    tooltip.style.top = Math.max(12, top) + "px";
  }
  function showMapTooltip(event, code, iso, flow, row, mapYear) {
    if (event.pointerType === "touch") return;
    document.getElementById("tooltip-country").textContent = code
      ? nameOf(code)
      : i18nText("자료 없음");
    document.getElementById("tooltip-value").textContent =
      code === iso
        ? i18nText("기준국")
        : row
          ? fmtPct(row.p) + " · " + fmtUsd(row.v)
          : i18nText("교역 기록 또는 자료 없음");
    document.getElementById("tooltip-scope").textContent =
      (mapYear || selection.year) + " · " + scopeName() + " · " + wordOf(flow);
    positionMapTooltip(event);
    document.getElementById("map-tooltip").classList.add("is-visible");
  }
  function downloadCsv(lines, filename) {
    var blob = new Blob(["\ufeff" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(function () {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 1000);
  }
  function csvQuote(value) {
    var text = value === null ? "" : String(value);
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }
  function sourceLine() {
    var m = TRADE.meta;
    return i18nText("출처 · {0} · {1} · 기준연도 {2} · {3}", [
      m.source,
      m.version,
      m.year,
      scopeName(),
    ]);
  }
  function buildCountryIndex() {
    var options = document.getElementById("country-options");
    options.replaceChildren();
    countryIndex = Object.keys(CATALOG.countries)
      .map(function (iso) {
        var country = CATALOG.countries[iso];
        var names = [country.ko, country.en, iso].concat(aliases[iso] || []);
        var option = document.createElement("option");
        option.value = nameOf(iso);
        option.label = [nameOf(iso), iso].join(" · ");
        return {
          iso: iso,
          names: names.map(normalize),
          option: option,
        };
      })
      .sort(function (a, b) {
        return nameOf(a.iso).localeCompare(nameOf(b.iso), TWI18n.locale);
      });
    countryIndex.forEach(function (entry) {
      options.appendChild(entry.option);
    });
  }
  function updateMetadata() {
    var m = TRADE.meta;
    document.querySelectorAll("[data-period]").forEach(function (el) {
      el.textContent = i18nText("기준연도 {0} · CEPII BACI", [m.year]);
    });
    document.querySelectorAll("[data-source-line]").forEach(function (el) {
      el.textContent = sourceLine();
    });
    document.querySelectorAll("[data-unit-line]").forEach(function (el) {
      el.textContent = i18nText("원자료 단위 · {0} · {1}", [m.unit, m.license]);
    });
    document.querySelectorAll("[data-meta]").forEach(function (el) {
      el.textContent =
        el.dataset.meta === "scope" ? scopeName() : m[el.dataset.meta];
    });
    document.querySelectorAll("[data-years]").forEach(function (el) {
      el.textContent = CATALOG.years.join(" · ");
    });
    var definitions = document.getElementById("scope-definitions");
    definitions.replaceChildren();
    var item = document.createElement("li");
    item.textContent =
      activeProduct().scope + " — " + activeProduct().description;
    definitions.appendChild(item);
    var overview = document.createElement("li");
    overview.textContent = i18nText(
      "상품 전체, HS 2단위 산업군 {0}개와 주요 HS 4단위 품목 {1}개를 제공합니다. 4단위 목록은 주요 품목을 선별한 범위입니다.",
      [
        CATALOG.products.filter(function (p) {
          return p.level === 2;
        }).length,
        CATALOG.products.filter(function (p) {
          return p.level === 4;
        }).length,
      ],
    );
    definitions.appendChild(overview);
    updateScopeControls();
    var korean = rows("KOR", "export");
    var vietnam = rows("VNM", "import");
    document.getElementById("example-kor").textContent = korean.list.length
      ? i18nText("1위 상대국 {0}의 비중은 {1}, 상위 5개국 합계는 {2}입니다.", [
          nameOf(korean.list[0].iso),
          fmtPct(korean.list[0].p),
          fmtPct(concentration(korean, 5)),
        ])
      : i18nText("이 연도·품목의 한국 수출 기록이 없습니다.");
    document.getElementById("example-vnm").textContent = vietnam.list.length
      ? i18nText("1위 상대국 {0}의 비중은 {1}, 상위 5개국 합계는 {2}입니다.", [
          nameOf(vietnam.list[0].iso),
          fmtPct(vietnam.list[0].p),
          fmtPct(concentration(vietnam, 5)),
        ])
      : i18nText("이 연도·품목의 베트남 수입 기록이 없습니다.");
    document.querySelector('meta[name="description"]').content = i18nText(
      "국가별 상품 교역 상대국과 교역 집중도를 지도에서 살펴봅니다. 기준연도 {0} · {1} · {2} · CEPII BACI.",
      [m.year, m.version, scopeName()],
    );
  }
  function load() {
    if (!loadPromise) {
      loadPromise = Promise.all([
        fetch("data/catalog.json").then(function (response) {
          if (!response.ok) throw new Error("catalog");
          return response.json();
        }),
        fetch("data/world-map.json?v=equirectangular-atlas-2").then(
          function (response) {
            if (!response.ok) throw new Error("map");
            return response.json();
          },
        ),
      ])
        .then(async function (data) {
          CATALOG = TWI18n.localizeCatalog(data[0]);
          MAP = data[1];
          if (selection.year === null) {
            selection.year = CATALOG.default.year;
            selection.product = CATALOG.default.product;
            selection.compareYear = defaultCompare(selection.year);
          }
          buildCountryIndex();
          fillScopeControls();
        })
        .catch(function (error) {
          loadPromise = null;
          throw error;
        });
    }
    return loadPromise;
  }
  function fmtPct(value) {
    return value >= 0.05
      ? value.toFixed(1) + "%"
      : value > 0
        ? i18nText("0.1% 미만")
        : "0%";
  }
  function fmtUsd(thousands) {
    if (TWI18n.lang === "en")
      return (
        "US$" +
        new Intl.NumberFormat("en-US", {
          notation: "compact",
          maximumFractionDigits: 2,
        }).format(thousands * 1000)
      );

    if (thousands >= 1e5)
      return i18nText("{0}억 달러", [
        Math.round(thousands / 1e5).toLocaleString(TWI18n.locale),
      ]);
    if (thousands >= 10)
      return i18nText("{0}만 달러", [
        Math.round(thousands / 10).toLocaleString(TWI18n.locale),
      ]);
    return i18nText("{0}달러", [
      Math.round(thousands * 1000).toLocaleString(TWI18n.locale),
    ]);
  }
  function step(share) {
    if (share >= 20) return 5;
    if (share >= 10) return 4;
    if (share >= 5) return 3;
    if (share >= 1) return 2;
    return 1;
  }
  function rows(iso, flow, dataset) {
    var countries = (dataset || TRADE).countries;
    var country = countries[iso] || {
      x: [],
      m: [],
    };
    var list = country[flow === "export" ? "x" : "m"];
    var total = list.reduce(function (sum, row) {
      return sum + row[1];
    }, 0);
    return {
      total: total,
      list: list.map(function (row, index) {
        return {
          iso: row[0],
          v: row[1],
          p: total ? (row[1] / total) * 100 : 0,
          rank: index + 1,
        };
      }),
    };
  }
  function concentration(data, count) {
    return data.list.slice(0, count).reduce(function (sum, row) {
      return sum + row.p;
    }, 0);
  }
  function oppositeFlow(flow) {
    return flow === "export" ? "import" : "export";
  }
  function partnerRelationship(iso, flow, partner, dataset) {
    var base = rows(iso, flow, dataset);
    var counter = rows(partner, oppositeFlow(flow), dataset);
    var row = base.list.find(function (entry) {
      return entry.iso === partner;
    });
    return {
      row: row || null,
      baseTotal: base.total,
      partnerTotal: counter.total,
      baseShare: row ? row.p : null,
      partnerShare: row && counter.total ? (row.v / counter.total) * 100 : null,
    };
  }
  function tablePct(value) {
    if (value > 0 && value < 0.001) return i18nText("0.001% 미만");
    return value.toFixed(3) + "%";
  }
  function updatePartnerHighlights() {
    document.querySelectorAll("#r-map [data-partner]").forEach(function (el) {
      el.classList.toggle("on", el.dataset.partner === selection.partner);
    });
    document
      .querySelectorAll("#r-rank [data-partner], #partner-rows [data-partner]")
      .forEach(function (el) {
        var selected = el.dataset.partner === selection.partner;
        if (el.tagName === "BUTTON")
          el.setAttribute("aria-pressed", String(selected));
        if (el.tagName === "TR") el.classList.toggle("is-selected", selected);
      });
    var selectedRow = document.querySelector(
      '#partner-rows tr[data-partner="' + selection.partner + '"]',
    );
    var hasRecord = rows(selection.iso, selection.flow).list.some(
      function (row) {
        return row.iso === selection.partner;
      },
    );
    document.getElementById("partner-outside").hidden =
      !selection.partner || Boolean(selectedRow);
    document.getElementById("partner-outside-text").textContent = hasRecord
      ? i18nText("선택한 {0}이 검색 결과에 없습니다.", [
          nameOf(selection.partner),
        ])
      : i18nText("선택한 {0}은 이 방향의 교역 기록이 없습니다.", [
          nameOf(selection.partner),
        ]);
    document.getElementById("reveal-partner").hidden = !hasRecord;
  }
  function renderPartnerTable() {
    var data = rows(selection.iso, selection.flow);
    var query = normalize(document.getElementById("partner-query").value);
    var matchingCodes = new Set(
      countryIndex
        .filter(function (country) {
          return country.names.some(function (name) {
            return name.indexOf(query) !== -1;
          });
        })
        .map(function (country) {
          return country.iso;
        }),
    );
    var filtered = data.list.filter(function (row) {
      return matchingCodes.has(row.iso);
    });
    var sort = document.getElementById("partner-sort").value;
    if (sort === "amount-asc")
      filtered.sort(function (a, b) {
        return a.v - b.v || a.rank - b.rank;
      });
    if (sort === "name")
      filtered.sort(function (a, b) {
        return nameOf(a.iso).localeCompare(nameOf(b.iso), TWI18n.locale);
      });
    var body = document.getElementById("partner-rows");
    body.replaceChildren();
    filtered.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.dataset.partner = row.iso;
      var rank = document.createElement("td");
      rank.textContent = row.rank;
      var country = document.createElement("td");
      var button = document.createElement("button");
      button.type = "button";
      button.className = "partner-button";
      button.dataset.partner = row.iso;
      button.textContent = nameOf(row.iso);
      button.setAttribute(
        "aria-pressed",
        String(row.iso === selection.partner),
      );
      var code = document.createElement("span");
      code.className = "partner-code";
      code.textContent = row.iso;
      var mobileAmount = document.createElement("span");
      mobileAmount.className = "partner-mobile-amount";
      mobileAmount.textContent = i18nText("{0} 천 달러", [
        row.v.toLocaleString(TWI18n.locale),
      ]);
      country.append(button, code, mobileAmount);
      var amount = document.createElement("td");
      amount.className = "amount-col";
      amount.textContent = row.v.toLocaleString(TWI18n.locale);
      var share = document.createElement("td");
      share.className = "share-col";
      share.textContent = tablePct(row.p);
      tr.append(rank, country, amount, share);
      body.appendChild(tr);
    });
    if (!filtered.length) {
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 4;
      td.className = "partner-empty";
      td.textContent = data.list.length
        ? i18nText("검색 결과가 없습니다. 다른 이름이나 코드를 입력해 주세요.")
        : i18nText("이 연도·품목·방향의 교역 기록이 없습니다.");
      tr.appendChild(td);
      body.appendChild(tr);
    }
    document.getElementById("partner-count").textContent = i18nText(
      "{0} / {1}개 상대국 · 비중의 분모는 전체 {2}액",
      [filtered.length, data.list.length, wordOf(selection.flow)],
    );
    updatePartnerHighlights();
  }
  function renderRelated() {
    var exporter =
      selection.flow === "export" ? selection.iso : selection.partner;
    var importer =
      selection.flow === "export" ? selection.partner : selection.iso;
    document.getElementById("related-context").textContent = i18nText(
      "{0} → {1} · {2}년 · {3} 교역에서 출발합니다.",
      [nameOf(exporter), nameOf(importer), TRADE.meta.year, scopeName()],
    );
    var policies = policyLinks.filter(function (policy) {
      return (
        policy.exporter === exporter &&
        policy.importer === importer &&
        (selection.product === "all" ||
          policy.hs.startsWith(activeProduct().code) ||
          activeProduct().code.startsWith(policy.hs))
      );
    });
    var list = document.getElementById("related-policies");
    list.replaceChildren();
    policies.forEach(function (policy) {
      var li = document.createElement("li");
      var link = document.createElement("a");
      link.href = "https://policy-line-eight.vercel.app/#policy/" + policy.id;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = i18nText(policy.title) + " ↗";
      li.appendChild(link);
      list.appendChild(li);
    });
    list.hidden = !policies.length;
    document
      .querySelectorAll("#r-related .related-grid a[href]")
      .forEach((link) => {
        const url = new URL(link.href);
        const context = {
          tw_source: "tradeweave",
          tw_country: selection.iso,
          tw_partner: selection.partner,
          tw_flow: selection.flow,
          tw_year: selection.year,
          tw_compare: selection.compareYear,
          tw_product: selection.product,
          tw_version: CATALOG.version,
          tw_lang: TWI18n.lang,
        };
        Object.entries(context).forEach(([key, value]) => {
          if (value !== null) url.searchParams.set(key, value);
        });
        link.href = url.href;
      });
  }
  function renderPartner(warning) {
    var partner = selection.partner;
    var panel = document.getElementById("r-partner");
    panel.hidden = !partner;
    document.getElementById("r-related").hidden = !partner;
    renderComparison();
    if (!partner) return;
    var relation = partnerRelationship(selection.iso, selection.flow, partner);
    var row = relation.row;
    var word = wordOf(selection.flow);
    var counterWord = wordOf(oppositeFlow(selection.flow));
    var exporter = selection.flow === "export" ? selection.iso : partner;
    var importer = selection.flow === "export" ? partner : selection.iso;
    document.getElementById("partner-title").textContent =
      nameOf(exporter) + " → " + nameOf(importer);
    document.getElementById("partner-rank").textContent = row
      ? i18nText("{0} 상대국 {1}위", [word, row.rank])
      : i18nText("교역 기록 없음");
    document.getElementById("partner-amount").textContent = row
      ? fmtUsd(row.v)
      : i18nText("교역 기록 없음");
    document.getElementById("partner-exact").textContent = row
      ? i18nText("금액(천 달러) · {0} · {1}년", [
          row.v.toLocaleString(TWI18n.locale),
          TRADE.meta.year,
        ])
      : i18nText("{0}년 · {1}", [TRADE.meta.year, scopeName()]);
    document.getElementById("r-readout").textContent =
      nameOf(partner) +
      (row
        ? " · " + fmtPct(row.p) + " · " + fmtUsd(row.v)
        : i18nText(" · 교역 기록 없음"));
    document.getElementById("base-share-title").textContent = i18nText(
      "{0} {1} {2}에서 {3}의 비중",
      [nameOf(selection.iso), scopeName(), word, nameOf(partner)],
    );
    document.getElementById("partner-share-title").textContent = i18nText(
      "{0} {1} {2}에서 {3}의 비중",
      [nameOf(partner), scopeName(), counterWord, nameOf(selection.iso)],
    );
    document.getElementById("base-share").textContent =
      relation.baseShare === null
        ? i18nText("기록 없음")
        : fmtPct(relation.baseShare);
    document.getElementById("partner-share").textContent =
      relation.partnerShare === null
        ? i18nText("기록 없음")
        : fmtPct(relation.partnerShare);
    document.getElementById("base-denominator").textContent = i18nText(
      "분모 · {0} {1}액 · {2}",
      [
        scopeName(),
        word,
        relation.baseTotal
          ? i18nText("{0} 천 달러", [
              relation.baseTotal.toLocaleString(TWI18n.locale),
            ])
          : i18nText("교역 기록 없음"),
      ],
    );
    document.getElementById("partner-denominator").textContent = i18nText(
      "분모 · {0} {1}액 · {2}",
      [
        scopeName(),
        counterWord,
        relation.partnerTotal
          ? i18nText("{0} 천 달러", [
              relation.partnerTotal.toLocaleString(TWI18n.locale),
            ])
          : i18nText("교역 기록 없음"),
      ],
    );
    var note = row
      ? i18nText(
          "같은 거래액을 선택한 품목 범위의 두 나라 수출입액에 각각 나눈 비중입니다.",
        )
      : i18nText(
          "이 방향의 교역 기록이 자료에 없습니다. 반대 방향 교역이나 다른 상대국을 선택해 보세요.",
        );
    var mapped =
      MAP.shapes.some(function (shape) {
        return shape[0] === partner;
      }) ||
      MAP.dots.some(function (dot) {
        return dot[0] === partner;
      });
    if (!mapped)
      note += i18nText(
        " 이 축척에서 위치가 표시되지 않는 상대국이며, 표·합계·CSV에는 포함됩니다.",
      );
    document.getElementById("partner-note").textContent = note;
    document.getElementById("partner-warning").textContent = warning || "";
    document.getElementById("partner-warning").hidden = !warning;
    document.getElementById("selected-partner-link").href =
      "#" + resultRoute(selection.iso, selection.flow, "partner", partner);
    updatePartnerHighlights();
    renderRelated();
  }
  function selectPartner(code) {
    if (!CATALOG.countries[code] || code === selection.iso) return;
    selection.partner = code;
    selection.section = "";
    history.pushState(
      null,
      "",
      "#" + resultRoute(selection.iso, selection.flow, "", code),
    );
    document.getElementById("share-fallback").hidden = true;
    renderPartner();
    var panel = document.getElementById("r-partner");
    if (window.TWStudio) window.TWStudio.openPartner();
    emitRender();
    say(i18nText("{0} 상대국 상세를 표시했습니다.", [nameOf(code)]));
  }
  function renderRank(id, data, showAmount) {
    var rank = document.getElementById(id);
    rank.replaceChildren();
    var top = data.list.slice(0, 5);
    top.forEach(function (row, i) {
      var li = document.createElement("li");
      var position = document.createElement("span");
      position.className = "pos num";
      position.textContent = i + 1;
      var country = document.createElement("span");
      country.className = "rank-country";
      var name = document.createElement(showAmount ? "button" : "a");
      name.className = "partner-button";
      name.dataset.partner = row.iso;
      name.textContent = nameOf(row.iso);
      if (showAmount) {
        name.type = "button";
        name.dataset.partner = row.iso;
        name.setAttribute(
          "aria-pressed",
          String(row.iso === selection.partner),
        );
      } else
        name.href =
          "#" + resultRoute(selection.iso, selection.flow, "partner", row.iso);
      country.appendChild(name);
      var value = document.createElement("span");
      value.className = "val";
      value.textContent = fmtPct(row.p);
      if (showAmount) {
        li.className = "real";
        var track = document.createElement("span");
        track.className = "bar-track";
        track.setAttribute("aria-hidden", "true");
        var bar = document.createElement("span");
        bar.className = "bar";
        bar.style.width = (row.p / top[0].p) * 100 + "%";
        track.appendChild(bar);
        country.appendChild(track);
        var amount = document.createElement("span");
        amount.className = "val2";
        amount.textContent = fmtUsd(row.v);
        value.appendChild(amount);
      }
      li.append(position, country, value);
      rank.appendChild(li);
    });
    if (!top.length) {
      var empty = document.createElement("li");
      empty.textContent = i18nText("이 방향의 교역 기록이 없습니다.");
      rank.appendChild(empty);
    }
  }
  var mapBindings = {};
  function drawMap(prefix, iso, flow, data, mapYear) {
    var svg = document.getElementById(prefix + "-map");
    if (!svg) return;
    var readout = document.getElementById(prefix + "-readout");
    svg.setAttribute("viewBox", "0 0 " + MAP.w + " " + MAP.h);
    mapBindings[prefix] = {
      year: mapYear || selection.year,
      iso: iso,
      flow: flow,
      shares: new Map(
        data.list.map(function (row) {
          return [row.iso, row];
        }),
      ),
    };
    var scene = svg.querySelector(".map-scene");
    if (!scene) {
      scene = document.createElementNS(SVGNS, "g");
      scene.classList.add("map-scene");
      var depth = document.createElementNS(SVGNS, "g");
      depth.classList.add("map-depth");
      depth.setAttribute("transform", "translate(0, 1.5)");
      depth.setAttribute("aria-hidden", "true");
      scene.appendChild(depth);
      var land = document.createElementNS(SVGNS, "g");
      land.classList.add("map-land");
      scene.appendChild(land);
      svg.appendChild(scene);
      function add(shape, tag) {
        var code = shape[0],
          el = document.createElementNS(SVGNS, tag);
        if (tag === "path") el.setAttribute("d", shape[1]);
        else {
          el.setAttribute("cx", shape[1]);
          el.setAttribute("cy", shape[2]);
          el.setAttribute("r", 2.6);
        }
        if (code) el.dataset.partner = code;
        var shadow = el.cloneNode(false);
        shadow.removeAttribute("data-partner");
        depth.appendChild(shadow);
        el.addEventListener("pointerenter", function (event) {
          var state = mapBindings[prefix];
          showMapTooltip(
            event,
            code,
            state.iso,
            state.flow,
            state.shares.get(code),
            state.year,
          );
        });
        el.addEventListener("pointermove", positionMapTooltip);
        el.addEventListener("pointerleave", hideMapTooltip);
        el.addEventListener("click", function (event) {
          if (svg.closest(".is-panning") || svg.dataset.dragged === "true")
            return;
          var state = mapBindings[prefix],
            row = state.shares.get(code);
          if (readout)
            readout.textContent =
              nameOf(code) +
              (row
                ? " · " + fmtPct(row.p) + " · " + fmtUsd(row.v)
                : i18nText(" · 교역 기록 없음"));
          if (!code || code === state.iso) return;
          if (prefix === "r" || prefix.startsWith("temporal-"))
            selectPartner(code);
          else go(resultRoute(state.iso, state.flow, "partner", code));
        });
        land.appendChild(el);
      }
      MAP.shapes.forEach(function (shape) {
        add(shape, "path");
      });
      MAP.dots.forEach(function (shape) {
        add(shape, "circle");
      });
      svg.addEventListener("pointerleave", hideMapTooltip);
    }
    scene
      .querySelectorAll(".map-land > path, .map-land > circle")
      .forEach(function (el) {
        var code = el.dataset.partner,
          row = mapBindings[prefix].shares.get(code);
        var color = code === iso ? "me" : row ? "c" + step(row.p) : "";
        el.setAttribute("class", color + (code ? " hit" : ""));
        el.setAttribute(
          "aria-label",
          code === iso
            ? i18nText("{0} · 기준국", [nameOf(code)])
            : nameOf(code) +
                (row
                  ? " · " + fmtPct(row.p) + " · " + fmtUsd(row.v)
                  : i18nText(" · 교역 기록 또는 자료 없음")),
        );
        if (el.tagName === "circle")
          el.setAttribute("r", code === iso ? 3.6 : 2.6);
      });
    var desc = document.getElementById(prefix + "-map-desc");
    if (desc)
      desc.textContent = i18nText(
        "{0}의 {1}년 {2} {3} 상대국 지도. 상위 5개: {4}",
        [
          nameOf(iso),
          mapYear || TRADE.meta.year,
          scopeName(),
          wordOf(flow),
          data.list
            .slice(0, 5)
            .map(function (row) {
              return nameOf(row.iso) + " " + fmtPct(row.p);
            })
            .join(", "),
        ],
      );
    if (readout)
      readout.textContent = i18nText(
        "지도에서 상대국을 선택하면 비중과 금액을 확인할 수 있습니다.",
      );
  }
  function setFlow(attribute, flow) {
    document.querySelectorAll("[" + attribute + "]").forEach(function (button) {
      button.setAttribute(
        "aria-pressed",
        button.getAttribute(attribute) === flow ? "true" : "false",
      );
    });
  }
  function renderHero() {
    document.dispatchEvent(new CustomEvent("tw:before"));
    var iso = selection.iso;
    var flow = selection.flow;
    var data = rows(iso, flow);
    document.getElementById("home-country").value = nameOf(iso);
    document.getElementById("hero-map-title").textContent = i18nText(
      "{0}의 {1} 상대국",
      [nameOf(iso), wordOf(flow)],
    );
    document.getElementById("hero-scope").textContent = i18nText(
      "{0}년 · {1} {2}{3}",
      [
        TRADE.meta.year,
        scopeName(),
        wordOf(flow),
        data.list.length
          ? i18nText("액 {0} = 100%", [fmtUsd(data.total)])
          : i18nText(" 교역 기록 없음"),
      ],
    );
    document.getElementById("hero-rank-title").textContent = i18nText(
      "상위 5개 {0} 상대국",
      [wordOf(flow)],
    );
    document.getElementById("hero-selected").textContent = i18nText(
      "기준국 · {0}",
      [nameOf(iso)],
    );
    document.getElementById("hero-detail").href =
      "#" + resultRoute(iso, flow, "", null);
    drawMap("hero", iso, flow, data);
    renderRank("hero-rank", data, false);
    setFlow("data-hflow", flow);
    document.getElementById("hero-status").hidden = true;
    document.getElementById("hero-map-body").hidden = false;
    emitRender();
  }
  function renderResult() {
    document.dispatchEvent(new CustomEvent("tw:before"));
    var iso = selection.iso;
    var flow = selection.flow;
    var word = wordOf(flow);
    var data = rows(iso, flow);
    var partnerWarning = resolvePartner(data);
    if (tableCountry !== iso)
      document.getElementById("partner-query").value = "";
    tableCountry = iso;
    document.title = i18nText("{0}의 {1} 상대국 · Tradeweave", [
      nameOf(iso),
      word,
    ]);
    document.getElementById("result-country").value = nameOf(iso);
    document.getElementById("r-eyebrow").textContent = i18nText(
      "기준연도 {0} · {1} · {2}",
      [TRADE.meta.year, scopeName(), TRADE.meta.version],
    );
    document.getElementById("r-title").textContent = i18nText(
      "{0}의 {1} 상대국",
      [nameOf(iso), word],
    );
    document.getElementById("r-sub").textContent = i18nText("{0}년 {1}{2}", [
      TRADE.meta.year,
      word,
      data.list.length
        ? i18nText(" 합계 {0} · 상대국 {1}곳", [
            fmtUsd(data.total),
            data.list.length,
          ])
        : i18nText(" 교역 기록 없음"),
    ]);
    document.getElementById("r-denominator").textContent = i18nText(
      "비중의 분모 · {0}의 {1} {2}{3}",
      [
        nameOf(iso),
        scopeName(),
        word,
        data.list.length
          ? i18nText("액 {0} = 100%", [fmtUsd(data.total)])
          : i18nText(" 교역 기록 없음"),
      ],
    );
    document.getElementById("r-rank-title").textContent = i18nText(
      "상위 5개 {0} 상대국",
      [word],
    );
    [1, 3, 5].forEach(function (count) {
      document.getElementById("r-cr" + count).textContent = data.list.length
        ? fmtPct(concentration(data, count))
        : "—";
    });
    document.getElementById("r-sentence").textContent = data.list.length
      ? i18nText(
          "{0}의 {1}년 {2}에서 1위 상대국 {3}의 비중은 {4}, 상위 5개 상대국의 합계는 {5}입니다.",
          [
            nameOf(iso),
            TRADE.meta.year,
            word,
            nameOf(data.list[0].iso),
            fmtPct(concentration(data, 1)),
            fmtPct(concentration(data, 5)),
          ],
        )
      : i18nText("이 방향의 교역 기록이 없습니다.");
    drawMap("r", iso, flow, data);
    renderRank("r-rank", data, true);
    document.getElementById("r-hhi").textContent = data.list.length
      ? data.list
          .reduce(function (sum, row) {
            return sum + row.p * row.p;
          }, 0)
          .toLocaleString(TWI18n.locale, {
            maximumFractionDigits: 0,
          })
      : "—";
    renderPartnerTable();
    renderPartner(partnerWarning);
    document.getElementById("partner-table-scroll").scrollTop = 0;
    setFlow("data-rflow", flow);
    document.querySelectorAll("[data-rflow]").forEach(function (button) {
      button.disabled = false;
    });
    document.getElementById("r-loading").hidden = true;
    document.getElementById("r-body").hidden = false;
    document.getElementById("copy-link").disabled = false;
    emitRender();
  }
  function showView(view) {
    document.querySelectorAll("[data-view]").forEach(function (el) {
      el.hidden = el.dataset.view !== view;
    });
    document.getElementById("share-fallback").hidden = true;
    document.getElementById("r-error").hidden = true;
    document.getElementById("copy-link").disabled = true;
    document.querySelectorAll("[data-rflow]").forEach(function (button) {
      button.disabled = true;
    });
    document.querySelectorAll("[data-search] .error").forEach(function (el) {
      el.hidden = true;
    });
    document
      .querySelectorAll("[data-search] input[name=country]")
      .forEach(function (el) {
        el.removeAttribute("aria-invalid");
      });
  }
  function resolvePartner(data) {
    var requested = selection.partner;
    var valid =
      requested && requested !== selection.iso && CATALOG.countries[requested];
    if (!valid) selection.partner = data.list.length ? data.list[0].iso : null;
    return requested && !valid
      ? i18nText(
          "주소의 상대국 코드를 확인해 주세요. 첫 번째 상대국을 표시했습니다.",
        )
      : "";
  }
  function focusResultSection() {
    if (!selection.section) return;
    if (tabForSection[selection.section] && window.TWStudio) {
      selection.tab = tabForSection[selection.section];
      history.replaceState(
        null,
        "",
        "#" +
          resultRoute(
            selection.iso,
            selection.flow,
            selection.section,
            selection.partner,
          ),
      );
      window.TWStudio.activateTab(selection.tab, false);
    }
    if (selection.section === "partner" && window.TWStudio)
      window.TWStudio.openPartner();
    var section = document.getElementById("r-" + selection.section);
    if (!section) return;
    if (
      !(
        selection.section === "partner" &&
        matchMedia("(max-width: 850px)").matches
      )
    )
      section.scrollIntoView({
        block: "start",
      });
    section.focus({
      preventScroll: true,
    });
  }
  async function route() {
    var id = ++renderId;
    var fragment = location.hash.slice(1);
    var separator = fragment.indexOf("?");
    var name = separator < 0 ? fragment : fragment.slice(0, separator);
    var parameters = new URLSearchParams(
      separator < 0 ? "" : fragment.slice(separator + 1),
    );
    const routeLang = parameters.get("lang");
    const languageChanged = routeLang && routeLang !== TWI18n.lang;
    if (languageChanged) {
      TWI18n.setLanguage(routeLang, { history: false, notify: false });
      document.dispatchEvent(new CustomEvent("tw:language-controls"));
    }
    var partner = parameters.get("partner");
    if (partner) partner = canonicalCode(partner.trim());
    if (name === "map" || name === "share") {
      if (selection.year) parameters.set("year", selection.year);
      if (selection.product) parameters.set("product", selection.product);
      name =
        "see/" +
        selection.iso +
        "/" +
        selection.flow +
        (name === "share" ? "/concentration" : "");
    }
    var legacy =
      name === "see"
        ? null
        : /^(?:see\/)?([a-z0-9]{3})(?:\/(export|import))?$/i.exec(name);
    if (legacy)
      name =
        "see/" +
        canonicalCode(legacy[1]) +
        "/" +
        (legacy[2] || "export").toLowerCase();
    var match =
      /^see\/([a-z0-9]{3})\/(export|import)(?:\/(concentration|sources|partner|partners|related|comparison))?$/i.exec(
        name,
      );
    if (match) {
      match = [
        match[0],
        canonicalCode(match[1]),
        match[2].toLowerCase(),
        (match[3] || "").toLowerCase(),
      ];
      name =
        "see/" + match[1] + "/" + match[2] + (match[3] ? "/" + match[3] : "");
    }
    var anchor = name === "features-title" || name === "proof-title";
    var view = "see";
    if (name === "" || anchor) view = "";
    else if (name === "source") view = "source";
    else if (name === "pick" || name === "see") view = "pick";
    var previousSelection = selection;
    var previousResult =
      !document.getElementById("view-see").hidden &&
      !document.getElementById("r-body").hidden;
    if (!CATALOG) {
      showView(view);
      setBusy(true);
    }
    hideMapTooltip();
    document.getElementById("scope-error").hidden = true;
    try {
      await load();
      if (id !== renderId) return;
      var year = parameters.has("year")
        ? Number(parameters.get("year"))
        : CATALOG.default.year;
      var product = parameters.get("product") || CATALOG.default.product;
      var compareYear = parameters.has("compare")
        ? Number(parameters.get("compare"))
        : defaultCompare(year);
      var validContext =
        CATALOG.years.indexOf(year) !== -1 &&
        CATALOG.products.some(function (item) {
          return item.id === product;
        }) &&
        CATALOG.years.indexOf(compareYear) !== -1;
      if (!validContext) {
        showView(view);
        document.getElementById("r-body").hidden = true;
        document.getElementById("r-comparison").hidden = true;
        document.getElementById("r-loading").hidden = true;
        document.getElementById("hero-map-body").hidden = true;
        document.getElementById("hero-status").hidden = false;
        document.getElementById("hero-status").textContent =
          i18nText("연도·품목을 다시 선택해 주세요.");
        document.getElementById("scope-error").hidden = false;
        document.getElementById("scope-error-text").textContent = i18nText(
          "지원하는 연도·품목을 확인해 주세요. 제공 연도는 {0}년입니다.",
          [CATALOG.years.join("·")],
        );
        setBusy(false);
        return;
      }
      if (compareYear === year) compareYear = defaultCompare(year);
      var peers = (parameters.get("peers") || "JPN,S19")
        .split(",")
        .map(canonicalCode)
        .filter(function (code) {
          return CATALOG.countries[code];
        })
        .slice(0, 2);
      while (peers.length < 2)
        peers.push(peers.indexOf("JPN") === -1 ? "JPN" : "S19");
      var tab = [
        "trends",
        "changes",
        "partners",
        "countries",
        "industry",
      ].includes(parameters.get("tab"))
        ? parameters.get("tab")
        : "trends";
      // Recover links saved by earlier versions with a conflicting tab and anchor.
      if (
        match &&
        parameters.get("tab") === tab &&
        tabForSection[match[3]] &&
        tabForSection[match[3]] !== tab
      ) {
        match[3] = "";
        name = "see/" + match[1] + "/" + match[2];
      }
      var context = {
        year: year,
        product: product,
        compareYear: compareYear,
        peers: peers,
        tab: tab,
        iso: match
          ? match[1]
          : view === ""
            ? canonicalCode(parameters.get("country") || "KOR")
            : previousSelection.iso,
        flow: match
          ? match[2]
          : view === ""
            ? parameters.get("flow") === "import"
              ? "import"
              : "export"
            : previousSelection.flow,
      };
      var canonical = scopedPath(name, match ? partner : null, context);
      if (canonical !== fragment)
        history.replaceState(null, "", "#" + canonical);
      if (languageChanged) {
        buildCountryIndex();
        fillScopeControls();
      }
      var sameResult =
        !languageChanged &&
        previousResult &&
        match &&
        previousSelection.iso === match[1] &&
        previousSelection.flow === match[2] &&
        previousSelection.year === year &&
        previousSelection.product === product;
      if (sameResult) {
        selection.partner = partner;
        selection.section = match[3];
        selection.compareYear = compareYear;
        selection.peers = peers;
        selection.tab = tab;
        updateMetadata();
        renderPartner(resolvePartner(rows(selection.iso, selection.flow)));
        document.getElementById("share-fallback").hidden = true;
        focusResultSection();
        hydrateSeries(product);
        return;
      }
      var keepWorkspace =
        previousResult &&
        match &&
        previousSelection.iso === match[1] &&
        previousSelection.flow === match[2];
      showView(view);
      setBusy(true);
      document.title =
        view === "source"
          ? i18nText("방법·출처 · Tradeweave")
          : view === "pick"
            ? i18nText("국가 검색 · Tradeweave")
            : "Tradeweave";
      document.getElementById("r-body").hidden = !keepWorkspace;
      document.getElementById("r-comparison").hidden = !keepWorkspace;
      document.getElementById("hero-map-body").hidden = true;
      document.getElementById("hero-status").hidden = false;
      document.getElementById("hero-status").textContent = i18nText(
        "선택한 연도·품목의 교역 자료를 불러오는 중입니다.",
      );
      if (!keepWorkspace)
        document.getElementById("r-title").textContent =
          i18nText("교역 상대국");
      if (!keepWorkspace) document.getElementById("r-sub").textContent = "";
      document.getElementById("r-eyebrow").textContent = "";
      document.getElementById("r-loading").hidden = view !== "see";
      document.getElementById("load-error").hidden = true;
      if (!keepWorkspace) window.scrollTo(0, 0);
      var scope = await loadScope(year, product);
      if (id !== renderId) return;
      TRADE = scope.selected;
      SERIES = scope.series;
      seriesStatus = Object.fromEntries(
        CATALOG.years.map((value) => [
          value,
          value === year ? "ready" : "loading",
        ]),
      );
      selection = Object.assign({}, previousSelection, context);
      if (
        view === "" &&
        CATALOG.countries[canonicalCode(parameters.get("country") || "KOR")]
      ) {
        selection.iso = canonicalCode(parameters.get("country") || "KOR");
        selection.flow =
          parameters.get("flow") === "import" ? "import" : "export";
      }
      if (match && CATALOG.countries[match[1]])
        Object.assign(selection, {
          iso: match[1],
          flow: match[2],
          section: match[3],
          partner: partner,
        });
      updateMetadata();
      setBusy(false);
      if (view === "see") {
        if (!match || !CATALOG.countries[match[1]]) {
          document.title = i18nText("국가를 확인해 주세요 · Tradeweave");
          document.getElementById("r-loading").hidden = true;
          var error = document.getElementById("r-error");
          error.textContent = i18nText(
            "결과 주소의 국가 코드나 경로를 확인해 주세요. 위 검색창에서 국가를 다시 선택할 수 있습니다.",
          );
          error.hidden = false;
          return;
        }
        renderResult();
        focusResultSection();
      } else if (view === "") {
        renderHero();
        if (anchor) document.getElementById("features-title").scrollIntoView();
      } else if (view === "pick") {
        document.getElementById("pick-country").value = nameOf(selection.iso);
        document.querySelector(
          '#pick-form input[value="' + selection.flow + '"]',
        ).checked = true;
      }
      hydrateSeries(product);
    } catch (error) {
      console.error("Tradeweave data render failed", error);
      if (id !== renderId) return;
      document.getElementById("load-error").hidden = false;
      document.getElementById("r-loading").hidden = true;
      document.getElementById("hero-status").textContent =
        i18nText("자료를 불러오지 못했습니다.");
      setBusy(!SERIES);
      if (SERIES) updateScopeControls();
      document.querySelector("#load-error p").textContent = SERIES
        ? i18nText(
            "선택한 자료를 불러오지 못했습니다. 표시 중인 숫자는 이전 조건의 자료입니다. 다시 불러오기를 눌러 재시도해 주세요.",
          )
        : i18nText(
            "교역 자료를 불러오지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.",
          );
    }
  }
  document
    .getElementById("retry-series")
    .addEventListener("click", function () {
      hydrateSeries(selection.product, true);
    });
  function go(name) {
    if (location.hash.slice(1) === name) route();
    else location.hash = name;
  }
  document.querySelectorAll("[data-go]").forEach(function (el) {
    el.addEventListener("click", function (event) {
      event.preventDefault();
      go(el.hasAttribute("data-home") ? scopedPath("", null) : el.dataset.go);
    });
  });
  document
    .querySelector(".skip-link")
    .addEventListener("click", function (event) {
      event.preventDefault();
      document.getElementById("main-content").focus();
    });
  document.querySelectorAll("[data-search]").forEach(function (form) {
    var input = form.elements.country;
    var error = form.querySelector(".error");
    input.addEventListener("input", function () {
      error.hidden = true;
      input.removeAttribute("aria-invalid");
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var query = normalize(input.value);
      var exact = countryIndex.filter(function (entry) {
        return entry.names.indexOf(query) !== -1;
      });
      var matches = exact.length
        ? exact
        : countryIndex.filter(function (entry) {
            return entry.names.some(function (name) {
              return name.indexOf(query) !== -1;
            });
          });
      if (!query || matches.length !== 1) {
        error.dataset.messageKey = !query
          ? "국가 이름 또는 코드를 입력해 주세요."
          : matches.length
            ? "여러 국가가 검색됩니다. 목록에서 이름을 고르거나 국가 코드를 입력해 주세요."
            : "일치하는 국가를 찾지 못했습니다. 국가 이름이나 코드를 확인해 주세요.";
        error.textContent = i18nText(error.dataset.messageKey);
        error.hidden = false;
        input.setAttribute("aria-invalid", "true");
        input.focus();
        return;
      }
      var iso = matches[0].iso;
      if (form.dataset.search === "home") {
        selection = Object.assign({}, selection, {
          iso: iso,
          section: "",
          partner: null,
        });
        history.replaceState(null, "", "#" + scopedPath("", null));
        renderHero();
        say(
          i18nText("{0}의 {1} 지도를 표시했습니다.", [
            nameOf(iso),
            wordOf(selection.flow),
          ]),
        );
      } else {
        var flow =
          form.dataset.search === "pick"
            ? form.elements.flow.value
            : selection.flow;
        go(resultRoute(iso, flow, ""));
      }
    });
  });
  document.querySelectorAll("[data-hflow]").forEach(function (button) {
    button.addEventListener("click", function () {
      selection.flow = button.dataset.hflow;
      history.replaceState(null, "", "#" + scopedPath("", null));
      if (TRADE && MAP) renderHero();
      else route();
    });
  });
  document.querySelectorAll("[data-rflow]").forEach(function (button) {
    button.addEventListener("click", function () {
      go(
        resultRoute(
          selection.iso,
          button.dataset.rflow,
          selection.section,
          selection.partner,
        ),
      );
    });
  });
  var toastTimer;
  function say(message) {
    var toast = document.getElementById("toast");
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.hidden = true;
    }, 3500);
  }
  document
    .getElementById("copy-link")
    .addEventListener("click", async function () {
      var url = new URL(location.href);
      url.hash = resultRoute(
        selection.iso,
        selection.flow,
        selection.section,
        selection.partner,
      );
      try {
        await navigator.clipboard.writeText(url.href);
        say(i18nText("결과 링크를 복사했습니다."));
      } catch (error) {
        var input = document.getElementById("share-url");
        input.value = url.href;
        document.getElementById("share-fallback").hidden = false;
        input.focus();
        input.select();
      }
    });
  document.getElementById("r-csv").addEventListener("click", function () {
    var data = rows(selection.iso, selection.flow);
    var meta = TRADE.meta;
    function quote(value) {
      var text = String(value);
      return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
    }
    var counterWord = wordOf(oppositeFlow(selection.flow));
    var lines = [
      [
        i18nText("보고국"),
        i18nText("보고국 코드"),
        i18nText("상대국"),
        i18nText("상대국 코드"),
        i18nText("흐름"),
        i18nText("금액(천 달러)"),
        i18nText("비중(%)"),
        i18nText("기준연도"),
        i18nText("출처"),
        i18nText("비중 분모(천 달러)"),
        i18nText("자료 범위"),
        i18nText("원자료 단위"),
        i18nText("라이선스"),
        i18nText("원자료 링크"),
        i18nText("상대국 {0} 분모(천 달러)", [counterWord]),
        i18nText("상대국 {0}에서의 비중(%)", [counterWord]),
        i18nText("순위"),
      ].join(","),
    ];
    data.list.forEach(function (row) {
      var relation = partnerRelationship(
        selection.iso,
        selection.flow,
        row.iso,
      );
      lines.push(
        [
          nameOf(selection.iso),
          selection.iso,
          nameOf(row.iso),
          row.iso,
          wordOf(selection.flow),
          row.v,
          row.p.toFixed(3),
          meta.year,
          meta.source + " · " + meta.version,
          data.total,
          i18nText("{0} · 연간 {1}", [scopeName(), wordOf(selection.flow)]),
          meta.unit,
          meta.license,
          sourceUrl,
          relation.partnerTotal,
          relation.partnerShare === null
            ? ""
            : relation.partnerShare.toFixed(3),
          row.rank,
        ]
          .map(quote)
          .join(","),
      );
    });
    var suffix = selection.product === "all" ? "" : "_HS" + selection.product;
    downloadCsv(
      lines,
      "tradeweave_" +
        selection.iso +
        "_" +
        selection.flow +
        "_" +
        meta.year +
        suffix +
        ".csv",
    );
    say(i18nText("상대국 {0}곳의 CSV를 내려받았습니다.", [data.list.length]));
  });
  document
    .getElementById("partner-query")
    .addEventListener("input", function () {
      renderPartnerTable();
      document.getElementById("partner-table-scroll").scrollTop = 0;
    });
  document
    .getElementById("partner-sort")
    .addEventListener("change", function () {
      renderPartnerTable();
      document.getElementById("partner-table-scroll").scrollTop = 0;
    });
  document
    .getElementById("partner-rows")
    .addEventListener("click", function (event) {
      var row = event.target.closest("tr[data-partner]");
      if (row) selectPartner(row.dataset.partner);
    });
  document.getElementById("r-rank").addEventListener("click", function (event) {
    var button = event.target.closest("button[data-partner]");
    if (button) selectPartner(button.dataset.partner);
  });
  document
    .getElementById("reveal-partner")
    .addEventListener("click", function () {
      document.getElementById("partner-query").value = "";
      renderPartnerTable();
      var button = document.querySelector(
        '#partner-rows button[data-partner="' + selection.partner + '"]',
      );
      if (button) {
        button.scrollIntoView({
          block: "nearest",
        });
        button.focus({
          preventScroll: true,
        });
      }
    });
  document
    .getElementById("reverse-flow")
    .addEventListener("click", function () {
      go(
        resultRoute(
          selection.iso,
          oppositeFlow(selection.flow),
          "partner",
          selection.partner,
        ),
      );
    });
  document
    .getElementById("swap-partner")
    .addEventListener("click", function () {
      go(
        resultRoute(
          selection.partner,
          oppositeFlow(selection.flow),
          "partner",
          selection.iso,
        ),
      );
    });
  document
    .querySelectorAll("[data-year], [data-product]")
    .forEach(function (select) {
      select.addEventListener("change", function () {
        var group = select.closest(".scope-controls");
        var context = Object.assign({}, selection, {
          year: Number(group.querySelector("[data-year]").value),
          product: group.querySelector("[data-product]").value,
        });
        if (context.compareYear === context.year)
          context.compareYear = defaultCompare(context.year);
        var view = document.querySelector("main[data-view]:not([hidden])")
          .dataset.view;
        go(
          view === "see"
            ? resultRoute(
                selection.iso,
                selection.flow,
                "",
                selection.partner,
                context,
              )
            : scopedPath(view, null, context),
        );
      });
    });
  document
    .getElementById("compare-year")
    .addEventListener("change", function (event) {
      var context = Object.assign({}, selection, {
        compareYear: Number(event.target.value),
      });
      go(
        resultRoute(
          selection.iso,
          selection.flow,
          "",
          selection.partner,
          context,
        ),
      );
    });
  document
    .getElementById("year-cards")
    .addEventListener("click", function (event) {
      var card = event.target.closest("[data-history-year]");
      if (!card) return;
      var context = Object.assign({}, selection, {
        year: Number(card.dataset.historyYear),
      });
      if (context.year === context.compareYear)
        context.compareYear = defaultCompare(context.year);
      go(
        resultRoute(
          selection.iso,
          selection.flow,
          "comparison",
          selection.partner,
          context,
        ),
      );
    });
  document
    .getElementById("comparison-csv")
    .addEventListener("click", function () {
      var lines = [
        [
          i18nText("기준국"),
          i18nText("기준국 코드"),
          i18nText("상대국"),
          i18nText("상대국 코드"),
          i18nText("흐름"),
          i18nText("기준연도"),
          i18nText("품목 범위"),
          i18nText("교역액(천 달러)"),
          i18nText("기준국 비중(%)"),
          i18nText("상대국 비중(%)"),
          i18nText("기준국 분모(천 달러)"),
          i18nText("상대국 분모(천 달러)"),
          "CR5(%)",
          "HHI",
          i18nText("자료 버전"),
          i18nText("출처"),
          i18nText("원자료 링크"),
        ].join(","),
      ];
      CATALOG.years.forEach(function (year) {
        var metrics = comparisonMetrics(SERIES[year]);
        var relation = metrics.relation;
        lines.push(
          [
            nameOf(selection.iso),
            selection.iso,
            selection.partner ? nameOf(selection.partner) : "",
            selection.partner || "",
            wordOf(selection.flow),
            year,
            scopeName(),
            relation && relation.row ? relation.row.v : null,
            relation ? relation.baseShare : null,
            relation ? relation.partnerShare : null,
            metrics.count ? metrics.total : null,
            relation && relation.partnerTotal ? relation.partnerTotal : null,
            metrics.cr5,
            metrics.hhi,
            CATALOG.version,
            CATALOG.source,
            sourceUrl,
          ]
            .map(csvQuote)
            .join(","),
        );
      });
      downloadCsv(
        lines,
        "tradeweave_" +
          selection.iso +
          "_" +
          (selection.partner || "partners") +
          "_" +
          selection.flow +
          "_" +
          selection.product +
          "_years.csv",
      );
      say(i18nText("연도 비교 CSV를 내려받았습니다."));
    });
  document
    .getElementById("reset-scope")
    .addEventListener("click", function (event) {
      event.preventDefault();
      go("");
    });
  window.addEventListener("scroll", hideMapTooltip, true);
  window.addEventListener("blur", hideMapTooltip);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") hideMapTooltip();
  });
  document.addEventListener("pointerdown", function (event) {
    if (!event.target.closest(".map-svg")) hideMapTooltip();
  });
  function refreshLanguage() {
    clearTimeout(toastTimer);
    document.getElementById("toast").hidden = true;
    document.getElementById("toast").textContent = "";
    document
      .querySelectorAll("[data-search] .error[data-message-key]")
      .forEach((el) => (el.textContent = i18nText(el.dataset.messageKey)));
    if (!document.getElementById("load-error").hidden)
      document.querySelector("#load-error p").textContent = i18nText(
        SERIES
          ? "선택한 자료를 불러오지 못했습니다. 표시 중인 숫자는 이전 조건의 자료입니다. 다시 불러오기를 눌러 재시도해 주세요."
          : "교역 자료를 불러오지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.",
      );
    if (!CATALOG) return;
    if (
      !document.getElementById("scope-error").hidden ||
      !document.getElementById("r-error").hidden
    ) {
      route();
      return;
    }
    const drafts = Array.from(
      document.querySelectorAll('[data-search] input[name="country"]'),
    ).map((el) => [el, el.value]);
    const known = CATALOG.countries[selection.iso];
    buildCountryIndex();
    fillScopeControls();
    if (!TRADE) return;
    const tableScroll = document.getElementById(
      "partner-table-scroll",
    ).scrollTop;
    updateMetadata();
    if (!document.getElementById("view-see").hidden) renderResult();
    else if (!document.getElementById("view-home").hidden) renderHero();
    drafts.forEach(([el, value]) => {
      if (value && ![known?.ko, known?.en, selection.iso].includes(value))
        el.value = value;
      else if (value) el.value = nameOf(selection.iso);
    });
    document.getElementById("partner-table-scroll").scrollTop = tableScroll;
    emitRender();
  }
  document.addEventListener("tw:language", refreshLanguage);
  function emitRender() {
    document.dispatchEvent(new CustomEvent("tw:render"));
  }
  window.Tradeweave = {
    get state() {
      return Object.assign({}, selection, {
        peers: (selection.peers || []).slice(),
      });
    },
    get catalog() {
      return CATALOG;
    },
    get trade() {
      return TRADE;
    },
    get series() {
      return SERIES;
    },
    get seriesStatus() {
      return {
        ...seriesStatus,
      };
    },
    get cacheSize() {
      return datasetCache.size;
    },
    get map() {
      return MAP;
    },
    rows: rows,
    relationship: partnerRelationship,
    concentration: concentration,
    name: nameOf,
    normalize: normalize,
    matchesCountry: function (code, query) {
      const term = normalize(query);
      const exactCode = canonicalCode(term);
      if (Object.hasOwn(CATALOG.countries, exactCode))
        return code === exactCode;
      const country = CATALOG.countries[code];
      return [code, country?.ko, country?.en, ...(aliases[code] || [])].some(
        (name) => name && normalize(name).includes(term),
      );
    },
    canonical: canonicalCode,
    pct: fmtPct,
    usd: fmtUsd,
    scope: scopeName,
    source: sourceLine,
    go: go,
    resultRoute: resultRoute,
    scopedPath: scopedPath,
    selectPartner: selectPartner,
    drawMap: drawMap,
    downloadCsv: downloadCsv,
    csvQuote: csvQuote,
    say: say,
    setTab: function (tab, peers) {
      const changedTab = tab !== selection.tab;
      const manualTab = !peers;
      if (manualTab) selection.section = "";
      selection.tab = tab;
      if (peers) selection.peers = peers;
      const hash =
        "#" +
        resultRoute(
          selection.iso,
          selection.flow,
          selection.section,
          selection.partner,
        );
      if (hash === location.hash) return;
      if (manualTab && changedTab) history.pushState(null, "", hash);
      else history.replaceState(null, "", hash);
    },
    chooseProduct: function (product) {
      var context = Object.assign({}, selection, {
        product: product,
      });
      var view = document.querySelector("main[data-view]:not([hidden])").dataset
        .view;
      go(
        view === "see"
          ? resultRoute(
              selection.iso,
              selection.flow,
              "",
              selection.partner,
              context,
            )
          : scopedPath(view, null, context),
      );
    },
  };
  document.getElementById("retry-load").addEventListener("click", route);
  window.addEventListener("hashchange", route);
  route();
})();
