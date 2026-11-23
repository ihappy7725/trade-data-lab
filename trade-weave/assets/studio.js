/* Workspace interaction, analysis and local exports. No network or third-party runtime. */
(function () {
  "use strict";
  var api = window.Tradeweave,
    math = window.TradeweaveAnalysis;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var small = window.matchMedia("(max-width: 850px)");
  var queued = false,
    peerReady = false,
    lastPartner = "",
    lastDeep = "",
    oldRanks = new Map(),
    changeData = null,
    changePage = 0,
    showAllChanges = false,
    exporting = false;
  var cameras = new Map(),
    storageKey = "tradeweave.saved.v1";
  function node(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function animate(el, frames, options) {
    if (el && !reduced.matches && el.animate)
      el.animate(
        frames,
        Object.assign(
          { duration: 240, easing: "cubic-bezier(.2,.7,.2,1)" },
          options,
        ),
      );
  }
  function resultVisible() {
    return !$("view-see").hidden && !$("r-body").hidden;
  }
  function captureRanks() {
    oldRanks.clear();
    document
      .querySelectorAll("#r-rank li,#hero-rank li")
      .forEach(function (li) {
        var item = li.querySelector("[data-partner]"),
          bar = li.querySelector(".bar");
        if (item)
          oldRanks.set(li.parentElement.id + item.dataset.partner, {
            top: li.getBoundingClientRect().top,
            width: bar ? bar.getBoundingClientRect().width : 0,
          });
      });
  }
  document.addEventListener("tw:before", captureRanks);
  function animateRanks() {
    document
      .querySelectorAll("#r-rank li,#hero-rank li")
      .forEach(function (li) {
        var item = li.querySelector("[data-partner]");
        if (!item) return;
        var old = oldRanks.get(li.parentElement.id + item.dataset.partner),
          rect = li.getBoundingClientRect();
        if (old && rect.height) {
          var delta = old.top - rect.top;
          if (Math.abs(delta) < 400 && Math.abs(delta) > 1)
            animate(
              li,
              [
                { transform: "translateY(" + delta + "px)" },
                { transform: "translateY(0)" },
              ],
              { duration: 320 },
            );
          var bar = li.querySelector(".bar");
          if (bar && old.width)
            animate(
              bar,
              [
                { width: old.width + "px" },
                { width: bar.getBoundingClientRect().width + "px" },
              ],
              { duration: 320 },
            );
        }
      });
    oldRanks.clear();
  }
  function schedule() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        refresh();
      });
    }
  }
  document.addEventListener("tw:render", schedule);
  function metric(label, value) {
    var el = node("div", "meta-stat");
    el.append(node("span", "", label), node("strong", "", value));
    return el;
  }
  function refresh() {
    if (!api.catalog || !api.series) return;
    installProductButtons();
    installCameras();
    updateSavedCount();
    var s = api.state,
      data = api.rows(s.iso, s.flow);
    var insight = $("home-insight");
    insight.replaceChildren(
      node(
        "strong",
        "",
        data.list.length ? api.pct(api.concentration(data, 5)) : "—",
      ),
      node("span", "", "상위 5개 상대국의 합계"),
    );
    if (!resultVisible()) return;
    $("workspace-meta").replaceChildren(
      metric("교역액", data.list.length ? api.usd(data.total) : "기록 없음"),
      metric("상대국", data.list.length.toLocaleString("ko-KR") + "곳"),
      metric(
        "상위 5개 비중",
        data.list.length ? api.pct(api.concentration(data, 5)) : "—",
      ),
      metric(
        "HHI",
        data.list.length
          ? Math.round(math.hhi(data)).toLocaleString("ko-KR")
          : "—",
      ),
    );
    var partnerKey =
      s.iso + "/" + s.partner + "/" + s.year + "/" + s.product + "/" + s.flow;
    if (lastPartner && lastPartner !== partnerKey)
      animate($("r-partner"), [
        { opacity: 0.45, transform: "translateY(5px)" },
        { opacity: 1, transform: "translateY(0)" },
      ]);
    lastPartner = partnerKey;
    renderCondition();
    renderPartnerQuick();
    syncWorkspaceDraft();
    initPeers();
    activateTab(s.tab, false);
    renderTrend();
    renderChanges();
    renderNumberExplanation();
    animateRanks();
    if (s.section === "partner" && lastDeep !== location.hash) {
      openPartner();
      lastDeep = location.hash;
    }
    document.body.dataset.printTab = s.tab;
  }
  // Hover links the map, rank and table; selected state remains independent.
  function codeAt(target) {
    var el =
      target instanceof Element ? target.closest("[data-partner]") : null;
    return el ? el.dataset.partner : null;
  }
  var hoverCode = null;
  function highlight(code) {
    if (hoverCode === code) return;
    hoverCode = code;
    document
      .querySelectorAll(
        ".map-svg [data-partner],#hero-rank [data-partner],#r-rank [data-partner],#partner-rows tr[data-partner],#matrix-table tr[data-partner],#temporal-table tr[data-partner]",
      )
      .forEach(function (el) {
        el.classList.toggle("is-hover", el.dataset.partner === code);
      });
  }
  document.addEventListener("pointerover", function (e) {
    var code = codeAt(e.target);
    if (code) highlight(code);
  });
  document.addEventListener("pointerout", function (e) {
    if (codeAt(e.target) && codeAt(e.target) !== codeAt(e.relatedTarget))
      highlight(null);
  });
  document.addEventListener("focusin", function (e) {
    highlight(codeAt(e.target));
  });
  document.addEventListener("focusout", function () {
    highlight(null);
  });
  // Mobile detail panel. Close returns focus to the selecting control.
  var backdrop = node("div", "sheet-backdrop");
  backdrop.hidden = true;
  document.body.appendChild(backdrop);
  var lastFocus = null;
  function openPartner() {
    if (
      !$("r-partner") ||
      $("r-partner").hidden ||
      $("r-partner").classList.contains("sheet-open")
    )
      return;
    if (small.matches) {
      lastFocus = document.activeElement;
      $("r-partner").classList.add("sheet-open");
      $("r-partner").setAttribute("role", "dialog");
      $("r-partner").setAttribute("aria-modal", "true");
      backdrop.hidden = false;
      $("close-partner").focus({ preventScroll: true });
    } else animate($("r-partner"), [{ opacity: 0.6 }, { opacity: 1 }]);
  }
  function closePartner() {
    var wasOpen = $("r-partner").classList.contains("sheet-open");
    $("r-partner").classList.remove("sheet-open");
    $("r-partner").removeAttribute("role");
    $("r-partner").removeAttribute("aria-modal");
    backdrop.hidden = true;
    if (
      wasOpen &&
      lastFocus &&
      lastFocus.isConnected &&
      lastFocus !== document.body
    )
      lastFocus.focus({ preventScroll: true });
  }
  $("close-partner").addEventListener("click", closePartner);
  backdrop.addEventListener("click", closePartner);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePartner();
    if (
      e.key === "Tab" &&
      small.matches &&
      $("r-partner").classList.contains("sheet-open")
    ) {
      var items = Array.from(
        $("r-partner").querySelectorAll(
          "button:not([disabled]),a[href],input,select,summary",
        ),
      );
      items = items.filter(
        (el) => !el.closest("details:not([open])") || el.tagName === "SUMMARY",
      );
      var first = items[0],
        last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  window.addEventListener("hashchange", closePartner);
  small.addEventListener("change", closePartner);
  // Tab navigation is URL-backed and supports the complete keyboard interaction.
  var paneFor = {
    trends: "r-trends",
    changes: "r-changes",
    partners: "pane-partners",
    countries: "r-countries",
  };
  function activateTab(tab, persist) {
    tab = paneFor[tab] ? tab : "trends";
    Object.keys(paneFor).forEach(function (key) {
      var selected = key === tab,
        button = $("tab-" + key);
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
      $(paneFor[key]).hidden = !selected;
    });
    if (persist !== false) api.setTab(tab);
    document.body.dataset.printTab = tab;
    if (tab === "countries" && api.series) renderCountries();
  }
  document.querySelectorAll("[data-tab]").forEach(function (button) {
    button.addEventListener("click", function () {
      activateTab(button.dataset.tab, true);
      animate($(paneFor[button.dataset.tab]), [
        { opacity: 0.4, transform: "translateY(4px)" },
        { opacity: 1, transform: "translateY(0)" },
      ]);
    });
    button.addEventListener("keydown", function (e) {
      var keys = Object.keys(paneFor),
        i = keys.indexOf(button.dataset.tab),
        next;
      if (e.key === "ArrowRight") next = (i + 1) % keys.length;
      if (e.key === "ArrowLeft") next = (i + keys.length - 1) % keys.length;
      if (e.key === "Home") next = 0;
      if (e.key === "End") next = keys.length - 1;
      if (next !== undefined) {
        e.preventDefault();
        $("tab-" + keys[next]).focus();
        activateTab(keys[next], true);
      }
    });
  });
  // Stable camera per main map; neither zoom nor region selection changes data.
  function installCameras() {
    document.querySelectorAll(".map-stage").forEach(function (stage) {
      var svg = stage.querySelector(".map-svg");
      if (!svg || !svg.querySelector(".map-scene") || cameras.has(svg.id))
        return;
      var camera = { k: 1, x: 0, y: 0, svg: svg, stage: stage },
        controls = node("div", "map-controls");
      function button(text, label, action) {
        var b = node("button", "", text);
        b.type = "button";
        b.setAttribute("aria-label", label);
        b.addEventListener("click", action);
        controls.appendChild(b);
      }
      button("+", "지도 확대", function () {
        zoom(camera, 1.4);
      });
      button("−", "지도 축소", function () {
        zoom(camera, 1 / 1.4);
      });
      button("↺", "세계 전체 지도", function () {
        applyCamera(camera, 1, 0, 0, true);
        region.value = "world";
      });
      var level = node("span", "zoom-level", "100%");
      controls.appendChild(level);
      camera.level = level;
      var region = node("select");
      region.setAttribute("aria-label", "지도 지역");
      [
        ["world", "세계"],
        ["asia", "아시아"],
        ["europe", "유럽"],
        ["americas", "미주"],
        ["africa", "아프리카"],
        ["oceania", "오세아니아"],
      ].forEach(function (p) {
        var o = node("option", "", p[1]);
        o.value = p[0];
        region.appendChild(o);
      });
      var regions = {
        asia: ["CHN", "IND", "JPN", "KOR", "IDN", "THA"],
        europe: ["FRA", "DEU", "ESP", "ITA", "POL", "GBR"],
        americas: ["USA", "BRA", "ARG", "COL", "MEX"],
        africa: ["DZA", "ZAF", "KEN", "NGA", "EGY"],
        oceania: ["AUS", "NZL", "PNG"],
      };
      region.addEventListener("change", function () {
        if (region.value === "world") {
          applyCamera(camera, 1, 0, 0, true);
          return;
        }
        var boxes = regions[region.value]
          .map(function (code) {
            var p = svg.querySelector(
              '.map-land [data-partner="' + code + '"]',
            );
            return p ? p.getBBox() : null;
          })
          .filter(Boolean);
        var left = Math.min.apply(
            null,
            boxes.map(function (r) {
              return r.x;
            }),
          ),
          top = Math.min.apply(
            null,
            boxes.map(function (r) {
              return r.y;
            }),
          ),
          right = Math.max.apply(
            null,
            boxes.map(function (r) {
              return r.x + r.width;
            }),
          ),
          bottom = Math.max.apply(
            null,
            boxes.map(function (r) {
              return r.y + r.height;
            }),
          );
        var k = Math.min(
          4,
          Math.max(
            1,
            Math.min(
              api.map.w / (right - left + 45),
              api.map.h / (bottom - top + 35),
            ),
          ),
        );
        applyCamera(
          camera,
          k,
          api.map.w / 2 - ((left + right) / 2) * k,
          api.map.h / 2 - ((top + bottom) / 2) * k,
          true,
        );
      });
      controls.appendChild(region);
      stage.appendChild(controls);
      cameras.set(svg.id, camera);
      var start = null;
      svg.addEventListener("pointerdown", function (e) {
        if (camera.k <= 1 || e.button !== 0) return;
        start = {
          px: e.clientX,
          py: e.clientY,
          x: camera.x,
          y: camera.y,
          moved: false,
        };
        svg.setPointerCapture(e.pointerId);
      });
      svg.addEventListener("pointermove", function (e) {
        if (!start) return;
        var dx = e.clientX - start.px,
          dy = e.clientY - start.py;
        if (Math.hypot(dx, dy) > 5) start.moved = true;
        if (start.moved) {
          stage.classList.add("is-panning");
          svg.dataset.dragged = "true";
          var r = svg.getBoundingClientRect();
          applyCamera(
            camera,
            camera.k,
            start.x + (dx * api.map.w) / r.width,
            start.y + (dy * api.map.h) / r.height,
            false,
          );
        }
      });
      function end() {
        if (!start) return;
        start = null;
        stage.classList.remove("is-panning");
        setTimeout(function () {
          svg.dataset.dragged = "false";
        }, 0);
      }
      svg.addEventListener("pointerup", end);
      svg.addEventListener("pointercancel", end);
    });
  }
  function applyCamera(c, k, x, y, motion) {
    var w = api.map.w,
      h = api.map.h;
    k = Math.max(1, Math.min(5, k));
    x = Math.max(w * (1 - k), Math.min(0, x));
    y = Math.max(h * (1 - k), Math.min(0, y));
    var scene = c.svg.querySelector(".map-scene"),
      from = "translate(" + c.x + "px," + c.y + "px) scale(" + c.k + ")",
      to = "translate(" + x + "px," + y + "px) scale(" + k + ")";
    c.stage.dataset.zoomed = String(k > 1.5);
    c.k = k;
    c.x = x;
    c.y = y;
    scene.style.transform = to;
    if (motion)
      animate(scene, [{ transform: from }, { transform: to }], {
        duration: 320,
      });
    c.level.textContent = Math.round(k * 100) + "%";
    c.svg.style.touchAction = k > 1 ? "none" : "pan-y";
  }
  function zoom(c, factor) {
    var k = Math.max(1, Math.min(5, c.k * factor));
    applyCamera(
      c,
      k,
      api.map.w / 2 - ((api.map.w / 2 - c.x) * k) / c.k,
      api.map.h / 2 - ((api.map.h / 2 - c.y) * k) / c.k,
      true,
    );
  }
  // SVG trend uses gaps for missing values and categorical year positions.
  var ns = "http://www.w3.org/2000/svg";
  function svgNode(tag, attrs, text) {
    var e = document.createElementNS(ns, tag);
    Object.keys(attrs || {}).forEach(function (k) {
      e.setAttribute(k, attrs[k]);
    });
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function renderTrend() {
    var s = api.state,
      years = api.catalog.years,
      values = years.map(function (y) {
        if (!api.series[y]) return null;
        var r = api.relationship(s.iso, s.flow, s.partner, api.series[y]);
        return r.baseShare;
      });
    var container = $("trend-plot");
    container.replaceChildren();
    var heading = node("div", "trend-heading");
    heading.append(
      node("h3", "", "선택 상대국 비중의 흐름"),
      node(
        "span",
        "caption",
        s.partner
          ? api.name(s.partner) + " · " + api.scope()
          : "선택 상대국 없음",
      ),
    );
    container.appendChild(heading);
    if (
      !values.some(function (v) {
        return v !== null;
      })
    ) {
      container.appendChild(
        node(
          "p",
          "caption",
          years.some((year) => !api.series[year])
            ? "비교 자료를 준비하고 있습니다."
            : "선택 상대국의 비교 가능한 교역 기록이 없습니다.",
        ),
      );
      return;
    }
    var w = 900,
      h = 190,
      left = 45,
      right = 50,
      top = 28,
      bottom = 35,
      max = Math.max.apply(
        null,
        values.filter(function (v) {
          return v !== null;
        }),
      ),
      ceiling = Math.min(100, Math.max(1, Math.ceil(max / 5) * 5)),
      x = function (i) {
        return left + (i * (w - left - right)) / Math.max(1, years.length - 1);
      },
      y = function (v) {
        return h - bottom - (v / ceiling) * (h - top - bottom);
      };
    var chart = svgNode("svg", {
      viewBox: "0 0 " + w + " " + h,
      role: "img",
      "aria-label": years
        .map(function (yr, i) {
          return (
            yr +
            "년 " +
            (!api.series[yr]
              ? "자료 미준비"
              : values[i] === null
                ? "기록 없음"
                : api.pct(values[i]))
          );
        })
        .join(", "),
    });
    [0, 0.5, 1].forEach(function (f) {
      var value = ceiling * f;
      chart.append(
        svgNode("line", {
          x1: left,
          y1: y(value),
          x2: w - right,
          y2: y(value),
          class: "grid-line",
        }),
        svgNode(
          "text",
          { x: left - 10, y: y(value) + 4, "text-anchor": "end" },
          value.toFixed(value < 1 ? 1 : 0) + "%",
        ),
      );
    });
    var path = "",
      previous = false;
    values.forEach(function (v, i) {
      if (v === null) {
        previous = false;
        return;
      }
      path += (previous ? " L" : " M") + x(i) + "," + y(v);
      previous = true;
    });
    chart.appendChild(svgNode("path", { d: path, class: "series-line" }));
    years.forEach(function (year, i) {
      chart.appendChild(
        svgNode("text", { x: x(i), y: h - 7, "text-anchor": "middle" }, year),
      );
      if (values[i] === null) {
        chart.appendChild(
          svgNode(
            "text",
            { x: x(i), y: h - 23, "text-anchor": "middle" },
            !api.series[year] ? "자료 미준비" : "기록 없음",
          ),
        );
        return;
      }
      var dot = svgNode("circle", {
        cx: x(i),
        cy: y(values[i]),
        r: year === s.year ? 5 : 4,
        class: "series-dot" + (year === s.year ? " active" : ""),
        tabindex: "0",
        role: "button",
        "aria-label": year + "년 선택 · " + api.pct(values[i]),
      });
      function choose() {
        var context = Object.assign({}, api.state, { year: year });
        if (context.compareYear === year)
          context.compareYear = years.find(function (v) {
            return v !== year;
          });
        api.go(
          api.resultRoute(s.iso, s.flow, "comparison", s.partner, context),
        );
      }
      dot.addEventListener("click", choose);
      dot.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          choose();
        }
      });
      chart.append(
        dot,
        svgNode(
          "text",
          { x: x(i), y: y(values[i]) - 12, "text-anchor": "middle" },
          api.pct(values[i]),
        ),
      );
    });
    container.appendChild(chart);
  }
  function renderCondition() {
    const s = api.state;
    $("condition-context").textContent =
      api.name(s.iso) +
      " · " +
      (s.flow === "export" ? "수출" : "수입") +
      " · " +
      s.year +
      "년 / " +
      s.compareYear +
      "년 비교";
  }
  function renderPartnerQuick() {
    const s = api.state;
    const relation = s.partner
      ? api.relationship(s.iso, s.flow, s.partner)
      : null;
    const quick = $("partner-quick");
    quick.replaceChildren();
    if (!relation) return;
    quick.append(
      metric(
        "기준국 내 비중",
        relation.row ? api.pct(relation.baseShare) : "기록 없음",
      ),
    );
    if (api.series[s.compareYear]) {
      const old = api.relationship(
        s.iso,
        s.flow,
        s.partner,
        api.series[s.compareYear],
      );
      quick.append(
        metric(
          s.compareYear + "년 대비",
          old.row && relation.row
            ? math.signed(relation.baseShare - old.baseShare, "%p")
            : "비교 기록 없음",
        ),
      );
    }
  }
  function renderChanges() {
    var s = api.state;
    const pairReady = api.series[s.compareYear] && api.series[s.year];
    changeData = pairReady
      ? math.changes(
          api.rows(s.iso, s.flow, api.series[s.compareYear]),
          api.rows(s.iso, s.flow, api.series[s.year]),
        )
      : null;
    const compare = $("change-year");
    compare.replaceChildren(
      ...api.catalog.years
        .filter((year) => year !== s.year)
        .map((year) => {
          const option = node("option", "", year + "년");
          option.value = year;
          return option;
        }),
    );
    compare.value = s.compareYear;
    $("changes-context").textContent =
      s.compareYear +
      " → " +
      s.year +
      " · " +
      api.name(s.iso) +
      " " +
      (s.flow === "export" ? "수출" : "수입") +
      " · " +
      api.scope();
    if (pairReady) renderChangeRows();
    else {
      $("change-list").replaceChildren(
        node(
          "p",
          "caption",
          "비교연도 자료가 준비되면 구조 변화를 계산합니다.",
        ),
      );
      $("change-count").textContent = "비교 자료 미준비";
    }
    $("change-prev").disabled = !pairReady || $("change-prev").disabled;
    $("change-next").disabled = !pairReady || $("change-next").disabled;
    $("change-all").disabled = !pairReady;
    var missing = $("change-missing");
    missing.replaceChildren();
    if (!pairReady) return;
    [
      ["비교연도 미기록 → 선택연도 기록", changeData.entered],
      ["비교연도 기록 → 선택연도 미기록", changeData.absent],
    ].forEach(function (group) {
      var wrap = node("div", "change-missing-group");
      wrap.appendChild(
        node("strong", "", group[0] + " · " + group[1].length + "곳"),
      );
      group[1].forEach(function (r) {
        var a = node("a", "", api.name(r.iso));
        a.href = "#" + api.resultRoute(s.iso, s.flow, "partner", r.iso);
        wrap.appendChild(a);
      });
      missing.appendChild(wrap);
    });
  }
  function renderChangeRows() {
    if (!changeData) return;
    const list = $("change-list");
    const query = $("change-query").value;
    const direction = $("change-direction").value;
    const min = Math.max(0, Number($("change-min").value) || 0);
    const items = math.sortChanges(
      changeData.common.filter((row) => {
        const sign =
          Math.abs(row.pp) < 1e-9 ? "same" : row.pp > 0 ? "up" : "down";
        return (
          api.matchesCountry(row.iso, query) &&
          Math.abs(row.pp) >= min &&
          (direction === "all" || sign === direction)
        );
      }),
      $("change-sort").value,
    );
    const pageSize = 15;
    const pages = Math.max(1, Math.ceil(items.length / pageSize));
    changePage = Math.min(changePage, pages - 1);
    const visible = showAllChanges
      ? items
      : items.slice(changePage * pageSize, (changePage + 1) * pageSize);
    const max = Math.max(0.1, ...items.map((row) => Math.abs(row.pp)));
    $("change-count").textContent =
      items.length +
      "곳 / 비교 가능한 상대국 " +
      changeData.common.length +
      "곳";
    $("change-page").textContent = showAllChanges
      ? "전체"
      : changePage + 1 + " / " + pages;
    $("change-prev").disabled = showAllChanges || changePage === 0;
    $("change-next").disabled = showAllChanges || changePage + 1 === pages;
    $("change-all").setAttribute("aria-pressed", String(showAllChanges));
    $("change-all").textContent = showAllChanges
      ? "페이지로 보기"
      : "전체 펼치기";
    list.replaceChildren();
    if (!items.length) {
      list.appendChild(
        node("p", "empty-state", "조건에 맞는 상대국이 없습니다."),
      );
      return;
    }
    visible.forEach(function (r) {
      var button = node("button", "change-row");
      button.type = "button";
      button.dataset.partner = r.iso;
      var track = node("span", "change-track"),
        bar = node("i", r.pp < 0 ? "negative" : "");
      bar.style.width = (Math.abs(r.pp) / max) * 50 + "%";
      track.appendChild(bar);
      button.append(
        node("span", "", api.name(r.iso)),
        track,
        node(
          "span",
          "change-value" + (r.pp < 0 ? " negative" : ""),
          math.signed(r.pp, "%p"),
        ),
        node(
          "span",
          "rank-change",
          r.before.rank +
            "위 → " +
            r.after.rank +
            "위 · " +
            math.signed(r.percentChange, "%"),
        ),
      );
      button.setAttribute(
        "aria-label",
        api.name(r.iso) +
          " 비중 " +
          math.signed(r.pp, "%p") +
          ", " +
          r.before.rank +
          "위에서 " +
          r.after.rank +
          "위, 교역액 " +
          math.signed(r.percentChange, "%"),
      );
      button.addEventListener("click", function () {
        api.selectPartner(r.iso);
      });
      list.appendChild(button);
    });
  }
  ["change-sort", "change-query", "change-direction", "change-min"].forEach(
    (id) => {
      $(id).addEventListener(
        id === "change-query" || id === "change-min" ? "input" : "change",
        () => {
          changePage = 0;
          renderChangeRows();
        },
      );
    },
  );
  $("change-prev").addEventListener("click", () => {
    changePage--;
    renderChangeRows();
  });
  $("change-next").addEventListener("click", () => {
    changePage++;
    renderChangeRows();
  });
  $("change-all").addEventListener("click", () => {
    showAllChanges = !showAllChanges;
    renderChangeRows();
  });
  $("change-year").addEventListener("change", () => {
    const state = api.state;
    api.go(
      api.resultRoute(state.iso, state.flow, "", state.partner, {
        ...state,
        tab: "changes",
        compareYear: Number($("change-year").value),
      }),
    );
  });
  $("changes-csv").addEventListener("click", function () {
    var s = api.state,
      lines = [
        [
          "기준국 코드",
          "상대국 코드",
          "교역 방향",
          "품목 범위",
          "비교연도",
          "선택연도",
          "비교연도 금액(천 달러)",
          "선택연도 금액(천 달러)",
          "비교연도 비중(%)",
          "선택연도 비중(%)",
          "비중 변화(%p)",
          "거래액 변화(%)",
          "비교연도 순위",
          "선택연도 순위",
          "기록 상태",
          "출처",
          "자료 버전",
          "단위",
          "라이선스",
          "원자료 링크",
        ].join(","),
      ];
    changeData.common.forEach(function (r) {
      lines.push(
        [
          s.iso,
          r.iso,
          s.flow,
          api.scope(),
          s.compareYear,
          s.year,
          r.before.v,
          r.after.v,
          r.before.p,
          r.after.p,
          r.pp,
          r.percentChange,
          r.before.rank,
          r.after.rank,
          "두 연도 기록",
          api.source(),
          api.catalog.version,
          api.catalog.unit,
          api.catalog.license,
          api.catalog.archive_url,
        ]
          .map(api.csvQuote)
          .join(","),
      );
    });
    changeData.entered.concat(changeData.absent).forEach(function (r) {
      lines.push(
        [
          s.iso,
          r.iso,
          s.flow,
          api.scope(),
          s.compareYear,
          s.year,
          r.before ? r.before.v : null,
          r.after ? r.after.v : null,
          r.before ? r.before.p : null,
          r.after ? r.after.p : null,
          null,
          null,
          r.before ? r.before.rank : null,
          r.after ? r.after.rank : null,
          r.after ? "비교연도 미기록" : "선택연도 미기록",
          api.source(),
          api.catalog.version,
          api.catalog.unit,
          api.catalog.license,
          api.catalog.archive_url,
        ]
          .map(api.csvQuote)
          .join(","),
      );
    });
    api.downloadCsv(
      lines,
      "tradeweave_" +
        s.iso +
        "_" +
        s.product +
        "_" +
        s.compareYear +
        "_" +
        s.year +
        "_changes.csv",
    );
  });
  // Country comparison uses the same year, flow, product and fixed map buckets.
  function initPeers() {
    if (peerReady) return;
    var codes = Object.keys(api.catalog.countries).sort(function (a, b) {
      return api.name(a).localeCompare(api.name(b), "ko");
    });
    ["peer-one", "peer-two"].forEach(function (id) {
      codes.forEach(function (code) {
        var o = node("option", "", api.name(code) + " · " + code);
        o.value = code;
        $(id).appendChild(o);
      });
    });
    peerReady = true;
  }
  function selectedCountries() {
    var s = api.state,
      unique = [s.iso];
    (s.peers || [])
      .concat(["KOR", "JPN", "S19", "CHN", "USA"])
      .forEach(function (code) {
        if (
          unique.length < 3 &&
          !unique.includes(code) &&
          api.catalog.countries[code]
        )
          unique.push(code);
      });
    return unique;
  }
  function renderCountries() {
    if (!api.series) return;
    initPeers();
    var s = api.state,
      countries = selectedCountries();
    $("peer-one").value = countries[1];
    $("peer-two").value = countries[2];
    ["peer-one", "peer-two"].forEach(function (id, index) {
      Array.from($(id).options).forEach(function (o) {
        o.disabled =
          o.value === s.iso || o.value === countries[index === 0 ? 2 : 1];
      });
    });
    if ((s.peers || []).join(",") !== countries.slice(1).join(","))
      api.setTab(s.tab, countries.slice(1));
    $("countries-context").textContent =
      s.year +
      "년 · " +
      api.scope() +
      " · " +
      (s.flow === "export" ? "수출" : "수입");
    var wrap = $("country-cards");
    wrap.replaceChildren();
    countries.forEach(function (code, index) {
      var data = api.rows(code, s.flow),
        card = node("article", "country-card");
      card.appendChild(node("h3", "", api.name(code)));
      card.appendChild(
        node(
          "p",
          "caption",
          code +
            " · " +
            s.year +
            " · " +
            (s.flow === "export" ? "수출" : "수입"),
        ),
      );
      var svg = svgNode("svg", {
        id: "peer-" + index + "-map",
        class: "map-svg",
        role: "img",
        "aria-labelledby": "peer-" + index + "-map-desc",
      });
      svg.appendChild(
        svgNode("desc", { id: "peer-" + index + "-map-desc" }, ""),
      );
      card.appendChild(svg);
      card.appendChild(
        node(
          "strong",
          "mini-total",
          data.list.length ? api.usd(data.total) : "교역 기록 없음",
        ),
      );
      var dl = node("dl");
      [
        ["상대국", data.list.length + "곳"],
        [
          "상위 5개 비중",
          data.list.length ? api.pct(api.concentration(data, 5)) : "—",
        ],
        [
          "HHI",
          data.list.length
            ? Math.round(math.hhi(data)).toLocaleString("ko-KR")
            : "—",
        ],
      ].forEach(function (row) {
        dl.append(node("dt", "", row[0]), node("dd", "", row[1]));
      });
      card.appendChild(dl);
      var rank = node("ol", "rank");
      data.list.slice(0, 5).forEach(function (r) {
        var li = node("li");
        var a = node("a", "partner-button", api.name(r.iso));
        a.href = "#" + api.resultRoute(code, s.flow, "partner", r.iso);
        li.append(
          node("span", "pos", r.rank),
          a,
          node("span", "val", api.pct(r.p)),
        );
        rank.appendChild(li);
      });
      card.appendChild(rank); // Use the same fixed legend for every comparison map.
      var key = document.querySelector("#r-body .legend").cloneNode(true);
      card.appendChild(key);
      var link = node("a", "btn btn-text", "이 국가 자세히 보기 →");
      link.href = "#" + api.resultRoute(code, s.flow, "", null);
      card.appendChild(link);
      wrap.appendChild(card);
      api.drawMap("peer-" + index, code, s.flow, data);
    });
    renderMatrix();
  }
  ["peer-one", "peer-two"].forEach(function (id) {
    $(id).addEventListener("change", function () {
      api.setTab("countries", [$("peer-one").value, $("peer-two").value]);
      renderCountries();
    });
  });
  $("countries-csv").addEventListener("click", function () {
    var s = api.state,
      lines = [
        [
          "기준국",
          "기준국 코드",
          "교역 방향",
          "연도",
          "품목 범위",
          "교역액(천 달러)",
          "상대국 수",
          "CR1(%)",
          "CR3(%)",
          "CR5(%)",
          "HHI",
          "출처",
          "자료 버전",
          "단위",
          "라이선스",
          "원자료 링크",
        ].join(","),
      ];
    selectedCountries().forEach(function (code) {
      var data = api.rows(code, s.flow);
      lines.push(
        [
          api.name(code),
          code,
          s.flow,
          s.year,
          api.scope(),
          data.list.length ? data.total : null,
          data.list.length,
          data.list.length ? api.concentration(data, 1) : null,
          data.list.length ? api.concentration(data, 3) : null,
          data.list.length ? api.concentration(data, 5) : null,
          math.hhi(data),
          api.source(),
          api.catalog.version,
          api.catalog.unit,
          api.catalog.license,
          api.catalog.archive_url,
        ]
          .map(api.csvQuote)
          .join(","),
      );
    });
    api.downloadCsv(
      lines,
      "tradeweave_countries_" +
        s.year +
        "_" +
        s.product +
        "_" +
        s.flow +
        ".csv",
    );
  });
  // Searchable product explorer, grouped in the scope selectors as well.
  function comparisonMatrix() {
    const state = api.state;
    const countries = selectedCountries();
    const vectors = countries.map(
      (code) =>
        new Map(api.rows(code, state.flow).list.map((row) => [row.iso, row])),
    );
    const partners = new Set(
      vectors.flatMap((vector) => Array.from(vector.keys())),
    );
    if (state.partner) partners.add(state.partner);
    return {
      countries,
      rows: Array.from(partners, (code) => ({
        code,
        cells: vectors.map((vector, index) =>
          code === countries[index] ? null : vector.get(code) || null,
        ),
      })),
    };
  }

  function makeTable(headers, rows, caption) {
    const table = node("table", "research-table");
    table.appendChild(node("caption", "", caption));
    const head = table.createTHead().insertRow();
    headers.forEach((label) => {
      const th = node("th", "", label);
      th.scope = "col";
      head.appendChild(th);
    });
    const body = table.createTBody();
    rows.forEach((cells) => {
      const row = body.insertRow();
      cells.forEach((value, index) => {
        const cell = node(index ? "td" : "th");
        if (!index) cell.scope = "row";
        if (value instanceof Node) cell.appendChild(value);
        else cell.textContent = value;
        row.appendChild(cell);
      });
    });
    return table;
  }

  function matrixCells(matrix, row, highlight) {
    const state = api.state;
    const metric = $("matrix-metric").value || "share";
    return [
      api.name(row.code) + " · " + row.code,
      ...row.cells.map((value, index) => {
        if (!value)
          return matrix.countries[index] === row.code ? "기준국" : "기록 없음";
        const fullText =
          api.pct(value.p) +
          " · " +
          api.usd(value.v) +
          " · " +
          value.rank +
          "위";
        if (!highlight) return fullText;
        const label =
          metric === "amount"
            ? api.usd(value.v)
            : metric === "rank"
              ? value.rank + "위"
              : api.pct(value.p);
        const link = node("a", "matrix-value", label);
        if (metric === "share")
          link.dataset.band =
            value.p >= 20
              ? "5"
              : value.p >= 10
                ? "4"
                : value.p >= 5
                  ? "3"
                  : value.p >= 1
                    ? "2"
                    : "1";
        link.title = fullText;
        link.setAttribute(
          "aria-label",
          api.name(matrix.countries[index]) +
            " → " +
            api.name(row.code) +
            ": " +
            fullText,
        );
        link.href =
          "#" +
          api.resultRoute(
            matrix.countries[index],
            state.flow,
            "partner",
            row.code,
          );
        return link;
      }),
    ];
  }

  function captureRowPositions(container) {
    if (reduced.matches) return new Map();
    return new Map(
      Array.from(
        container.querySelectorAll("tbody tr[data-partner]"),
        (row) => [row.dataset.partner, row.getBoundingClientRect().top],
      ),
    );
  }
  function animateTableRows(container, positions) {
    if (reduced.matches) return;
    container.querySelectorAll("tbody tr[data-partner]").forEach((row) => {
      const old = positions.get(row.dataset.partner);
      const delta =
        old === undefined ? 0 : old - row.getBoundingClientRect().top;
      if (Math.abs(delta) > 1 && Math.abs(delta) < 500)
        animate(row, [
          { transform: "translateY(" + delta + "px)" },
          { transform: "translateY(0)" },
        ]);
    });
  }
  function renderMatrix() {
    const positions = captureRowPositions($("matrix-table"));
    const matrix = comparisonMatrix();
    const sort = $("matrix-sort");
    const previous = sort.value;
    sort.replaceChildren(
      ...matrix.countries.map((code, index) => {
        const option = node(
          "option",
          "",
          api.name(code) +
            ($("matrix-metric").value === "rank"
              ? " 순위 순"
              : $("matrix-metric").value === "amount"
                ? " 금액 큰 순"
                : " 비중 큰 순"),
        );
        option.value = String(index);
        return option;
      }),
    );
    sort.value = previous || "0";
    const column = Number(sort.value);
    const field =
      $("matrix-metric").value === "amount"
        ? "v"
        : $("matrix-metric").value === "rank"
          ? "rank"
          : "p";
    const score = (cell) =>
      !cell ? -Infinity : field === "rank" ? -cell.rank : cell[field];
    const rows = matrix.rows
      .filter((row) => api.matchesCountry(row.code, $("matrix-query").value))
      .sort(
        (a, b) =>
          score(b.cells[column]) - score(a.cells[column]) ||
          api.name(a.code).localeCompare(api.name(b.code), "ko"),
      );
    $("matrix-count").textContent =
      rows.length + "곳 / " + matrix.rows.length + "곳";
    $("matrix-table").replaceChildren(
      makeTable(
        ["상대국", ...matrix.countries.map(api.name)],
        rows.map((row) => matrixCells(matrix, row, true)),
        "상대국별 " +
          ({
            share: "비중 · 각 보고국 합계 = 100%",
            amount: "교역액 · 경상 달러",
            rank: "순위 · 각 보고국 내 순위",
          }[$("matrix-metric").value] || "비중"),
      ),
    );
    $("matrix-table")
      .querySelectorAll("tbody tr")
      .forEach((row, index) => {
        row.dataset.partner = rows[index].code;
        row.classList.toggle(
          "is-selected",
          rows[index].code === api.state.partner,
        );
      });
    animateTableRows($("matrix-table"), positions);
    if (!rows.length)
      $("matrix-table").appendChild(
        node("p", "caption", "검색 조건에 맞는 상대국이 없습니다."),
      );
  }

  $("matrix-metric").addEventListener("change", renderMatrix);
  $("matrix-query").addEventListener("input", renderMatrix);
  $("matrix-sort").addEventListener("change", renderMatrix);
  $("matrix-csv").addEventListener("click", () => {
    const matrix = comparisonMatrix();
    const state = api.state;
    const header = [
      "보고국 코드",
      "상대국 코드",
      "금액(천 달러)",
      "분모(천 달러)",
      "비중(%)",
      "순위",
      "기록 상태",
      "연도",
      "교역 방향",
      "품목 범위",
      "출처",
    ];
    const totals = matrix.countries.map(
      (country) => api.rows(country, state.flow).total,
    );
    const data = matrix.rows.flatMap((row) =>
      row.cells.map((cell, index) => {
        const country = matrix.countries[index];
        const total = totals[index];
        return [
          country,
          row.code,
          cell?.v ?? null,
          total || null,
          cell?.p ?? null,
          cell?.rank ?? null,
          country === row.code ? "기준국" : cell ? "기록 있음" : "기록 없음",
          state.year,
          state.flow,
          api.scope(),
          api.source(),
        ];
      }),
    );
    api.downloadCsv(
      [header, ...data].map((row) => row.map(api.csvQuote).join(",")),
      "tradeweave_" + state.year + "_" + state.product + "_partner_matrix.csv",
    );
  });

  function numberExplanation() {
    const state = api.state;
    if (
      !state.partner ||
      !api.series[state.compareYear] ||
      !api.series[state.year]
    )
      return null;
    const old = api.relationship(
      state.iso,
      state.flow,
      state.partner,
      api.series[state.compareYear],
    );
    const now = api.relationship(
      state.iso,
      state.flow,
      state.partner,
      api.series[state.year],
    );
    if (!old.row || !now.row) return null;
    const growth = (next, before) => (next / before - 1) * 100;
    return {
      rows: [
        [
          state.compareYear + "년",
          api.usd(old.row.v),
          api.usd(old.baseTotal),
          api.pct(old.baseShare),
        ],
        [
          state.year + "년",
          api.usd(now.row.v),
          api.usd(now.baseTotal),
          api.pct(now.baseShare),
        ],
        [
          "변화",
          math.signed(growth(now.row.v, old.row.v), "%"),
          math.signed(growth(now.baseTotal, old.baseTotal), "%"),
          math.signed(now.baseShare - old.baseShare, "%p"),
        ],
      ],
      message:
        Math.abs(now.baseShare - old.baseShare) < 1e-9
          ? "상대국 교역액과 기준국 전체 교역액의 변화율이 같아 비중이 유지됐습니다."
          : "상대국 교역액의 변화율이 기준국 전체 교역액의 변화율보다 " +
            (now.baseShare > old.baseShare
              ? "높아 비중이 올랐습니다."
              : "낮아 비중이 내려갔습니다."),
    };
  }

  function renderNumberExplanation() {
    const section = $("number-explanation");
    const explanation = numberExplanation();
    section.replaceChildren(
      node("h3", "", "금액과 비중은 왜 다르게 움직일까?"),
    );
    if (!explanation) {
      section.appendChild(
        node(
          "p",
          "caption",
          "두 연도 자료가 준비되고 선택 상대국과의 기록이 모두 있을 때 계산할 수 있습니다.",
        ),
      );
      return;
    }
    section.append(
      node("p", "", explanation.message),
      makeTable(
        [
          "연도",
          api.name(api.state.partner) + " 교역액",
          "기준국 전체 교역액",
          "상대국 비중",
        ],
        explanation.rows,
        "선택한 연도·품목·방향 기준",
      ),
      node(
        "p",
        "caption",
        "비중 = 상대국 교역액 ÷ 기준국 전체 교역액 × 100. 변화율은 반올림 전 금액으로 계산합니다.",
      ),
    );
  }

  function installProductButtons() {
    document.querySelectorAll(".scope-controls").forEach(function (group) {
      if (group.querySelector(".product-explore")) return;
      var label = group.querySelector("[data-product]").parentElement;
      label.classList.add("product-label");
      var b = node("button", "product-explore", "품목 탐색 ↗");
      b.type = "button";
      b.addEventListener("click", function () {
        openProduct();
      });
      label.appendChild(b);
    });
  }
  function openProduct() {
    if (!api.catalog) return;
    $("product-query").value = "";
    renderProducts();
    $("product-dialog").showModal();
    $("product-query").focus();
  }
  function renderProducts() {
    var q = api.normalize($("product-query").value),
      items = api.catalog.products.filter(function (p) {
        return api.normalize(p.scope + " " + p.description).includes(q);
      });
    $("product-count").textContent =
      items.length + "개 범위 · HS 2단위 산업군과 주요 4단위 품목";
    var list = $("product-results");
    list.replaceChildren();
    items.forEach(function (p) {
      var b = node("button", "product-item");
      b.type = "button";
      b.dataset.productId = p.id;
      b.setAttribute("aria-pressed", String(api.state.product === p.id));
      b.append(
        node("strong", "", p.code ? "HS " + p.code : "ALL"),
        node("span", "", p.label),
        node(
          "small",
          "",
          p.level === 4 ? "주요 품목" : p.level === 2 ? "산업군" : "전체",
        ),
      );
      b.addEventListener("click", function () {
        $("product-dialog").close();
        api.chooseProduct(p.id);
      });
      list.appendChild(b);
    });
    if (!items.length)
      list.appendChild(
        node(
          "p",
          "empty-state",
          "일치하는 품목이 없습니다. 산업군 이름이나 HS 코드로 검색해 주세요.",
        ),
      );
  }
  $("product-query").addEventListener("input", renderProducts);
  document.querySelectorAll("[data-close-dialog]").forEach(function (b) {
    b.addEventListener("click", function () {
      b.closest("dialog").close();
    });
  });
  document.querySelectorAll("dialog").forEach(function (d) {
    d.addEventListener("click", function (e) {
      var r = d.getBoundingClientRect();
      if (
        e.target === d &&
        (e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom)
      )
        d.close();
    });
  });
  // Local saved analyses: explicit opt-in, validated schema, storage errors visible.
  const workspaceModel = window.TradeweaveWorkspaceState;
  const drafts = new Map();
  let draftKey = "",
    pendingRestore = null;
  function workspaceKey() {
    const s = api.state;
    return [
      s.iso,
      s.flow,
      s.year,
      s.compareYear,
      s.product,
      s.partner,
      (s.peers || []).join(","),
    ].join("/");
  }
  function syncWorkspaceDraft() {
    const key = workspaceKey();
    if (draftKey !== key) {
      draftKey = key;
      $("report-note").value = drafts.get(key) || "";
      $("workspace-note").value = $("report-note").value;
      document.querySelector(".partner-details").open = false;
    }
    if (pendingRestore) {
      const expected = workspaceModel.routeScope(
          pendingRestore.hash,
          api.catalog,
        ),
        s = api.state;
      if (
        expected &&
        ["iso", "flow", "year", "compareYear", "product"].every(
          (key) => expected[key] === s[key],
        ) &&
        (!expected.partner || expected.partner === s.partner)
      ) {
        const item = pendingRestore;
        pendingRestore = null;
        drafts.set(key, item.note || "");
        $("report-note").value = item.note || "";
        $("workspace-note").value = item.note || "";
        for (const id of workspaceModel.controls) {
          const el = $(id),
            value = item.ui?.[id];
          if (!el || value === undefined) continue;
          if (
            el.tagName === "SELECT" &&
            !Array.from(el.options).some((option) => option.value === value)
          )
            continue;
          el.value = value;
        }
        changePage = item.changePage || 0;
        showAllChanges = item.showAllChanges === true;
        if (changeData) renderChangeRows();
        if (s.tab === "countries") renderMatrix();
        $("partner-query").dispatchEvent(new Event("input", { bubbles: true }));
        $("partner-sort").dispatchEvent(new Event("change", { bubbles: true }));
        window.TradeweaveResearch?.restoreView(item.temporal);
        api.say("분석 조건·메모·표시 설정을 복원했습니다.");
      }
    }
    $("open-note").textContent = $("report-note").value.trim()
      ? "메모 있음"
      : "메모";
  }
  function applyDraft(value) {
    const note = value.slice(0, 2000);
    drafts.set(workspaceKey(), note);
    if (drafts.size > 60) drafts.delete(drafts.keys().next().value);
    $("workspace-note").value = note;
    $("report-note").value = note;
    $("open-note").textContent = note.trim() ? "메모 있음" : "메모";
  }
  $("open-note").addEventListener("click", () => {
    syncWorkspaceDraft();
    $("note-scope").textContent =
      $("r-title").textContent + " · " + api.state.year + "년 · " + api.scope();
    $("workspace-note").value = $("report-note").value;
    $("note-dialog").showModal();
    $("workspace-note").focus();
  });
  $("save-note").addEventListener("click", () => {
    applyDraft($("workspace-note").value);
    $("note-dialog").close();
    api.say(
      "현재 분석에 메모를 적용했습니다. 분석 저장을 누르면 이 브라우저에 보관됩니다.",
    );
  });
  $("report-note").addEventListener("input", () =>
    applyDraft($("report-note").value),
  );
  function readSaved() {
    try {
      const items = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(items) && api.catalog
        ? items
            .map((item) => workspaceModel.normalizeSaved(item, api.catalog))
            .filter(Boolean)
            .slice(0, 30)
        : [];
    } catch (error) {
      return [];
    }
  }

  function writeSaved(items) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
      updateSavedCount();
      return true;
    } catch (e) {
      $("storage-message").textContent =
        "브라우저 저장 공간을 사용할 수 없습니다. 링크 복사를 이용해 주세요.";
      api.say("분석을 저장하지 못했습니다. 링크 복사를 이용해 주세요.");
      return false;
    }
  }
  function updateSavedCount() {
    $("saved-count").textContent = readSaved().length;
  }
  $("save-analysis").addEventListener("click", function () {
    if (!resultVisible() || document.body.classList.contains("is-loading"))
      return;
    syncWorkspaceDraft();
    var s = api.state,
      hash = "#" + api.resultRoute(s.iso, s.flow, s.section, s.partner),
      items = readSaved(),
      existing = items.find(function (r) {
        return r.hash === hash;
      }),
      name =
        api.name(s.iso) +
        " " +
        (s.flow === "export" ? "수출" : "수입") +
        " · " +
        s.year +
        " · " +
        api.scope() +
        (s.partner ? " · " + api.name(s.partner) : "");
    name = name.slice(0, 100);
    if (existing)
      items = items.filter(function (r) {
        return r !== existing;
      });
    items.unshift({
      id: existing
        ? existing.id
        : Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: existing ? existing.name : name,
      hash: hash,
      scope: name,
      note: $("report-note").value,
      snapshot: {
        version: api.catalog.version,
        archiveSha256: api.catalog.archive_sha256,
      },
      savedAt: new Date().toISOString(),
      ui: Object.fromEntries(
        workspaceModel.controls.map((id) => [id, $(id)?.value || ""]),
      ),
      changePage,
      showAllChanges,
      temporal: window.TradeweaveResearch?.getView(),
    });
    if (writeSaved(items.slice(0, 30)))
      api.say(
        existing
          ? "저장한 분석을 갱신했습니다."
          : "이 브라우저에 분석을 저장했습니다.",
      );
  });
  function renderSaved() {
    var list = $("saved-list"),
      items = readSaved();
    list.replaceChildren();
    $("storage-message").textContent = "";
    if (!items.length) {
      list.appendChild(
        node(
          "p",
          "empty-state",
          "저장한 분석이 없습니다. 결과 화면에서 ‘분석 저장’을 눌러 보세요.",
        ),
      );
      return;
    }
    items.forEach(function (item) {
      var row = node("article", "saved-item"),
        link = node("a", "", item.name);
      link.href = item.hash;
      function restore() {
        pendingRestore = item;
        $("saved-dialog").close();
        api.go(item.hash.slice(1));
      }
      link.addEventListener("click", function (event) {
        event.preventDefault();
        if (!workspaceModel.versionMatches(item, api.catalog)) {
          $("storage-message").textContent =
            "저장 당시 자료 버전과 현재 자료가 다릅니다. 아래 ‘현재 자료로 다시 분석’을 선택하면 현재 자료로 조건과 메모를 복원합니다.";
          return;
        }
        restore();
      });
      row.append(link, node("p", "", item.scope || ""));
      row.append(
        node(
          "p",
          "saved-version",
          item.snapshot
            ? "저장 기준 · " +
                item.snapshot.version +
                " · SHA-256 " +
                item.snapshot.archiveSha256.slice(0, 12) +
                "…"
            : "이전 저장 항목 · 자료 버전 미지정",
        ),
      );
      if (item.note)
        row.append(node("p", "draft-notice", item.note.slice(0, 120)));
      if (!workspaceModel.versionMatches(item, api.catalog)) {
        row.append(
          node(
            "p",
            "version-warning",
            "저장 당시 자료와 현재 배포판이 다릅니다. 이전 배포판의 수치를 자동 복원하지 않습니다.",
          ),
        );
        const current = node(
          "button",
          "btn btn-secondary",
          "현재 자료로 다시 분석",
        );
        current.type = "button";
        current.addEventListener("click", restore);
        row.append(current);
      }
      var actions = node("div", "saved-actions"),
        input = node("input");
      input.value = item.name;
      input.maxLength = 100;
      input.setAttribute("aria-label", item.name + " 이름");
      var rename = node("button", "btn btn-secondary", "이름 변경"),
        remove = node("button", "btn btn-text", "삭제");
      rename.type = remove.type = "button";
      rename.addEventListener("click", function () {
        var name = input.value.trim();
        if (!name) {
          input.focus();
          return;
        }
        var next = readSaved();
        next.forEach(function (r) {
          if (r.id === item.id) r.name = name;
        });
        if (writeSaved(next)) renderSaved();
      });
      remove.addEventListener("click", function () {
        var before = readSaved();
        if (
          writeSaved(
            before.filter(function (r) {
              return r.id !== item.id;
            }),
          )
        ) {
          renderSaved();
          var undo = node("button", "btn btn-text", "방금 삭제 취소");
          undo.addEventListener("click", function () {
            if (writeSaved(before)) renderSaved();
          });
          $("saved-list").appendChild(undo);
        }
      });
      actions.append(input, rename, remove);
      row.appendChild(actions);
      list.appendChild(row);
    });
  }
  $("open-saved").addEventListener("click", function () {
    renderSaved();
    $("saved-dialog").showModal();
  });
  $("backup-saved").addEventListener("click", () => {
    const bundle = {
      schema: 2,
      application: "Tradeweave",
      exportedAt: new Date().toISOString(),
      items: readSaved(),
    };
    const link = node("a");
    link.href = URL.createObjectURL(
      new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }),
    );
    link.download = "tradeweave_workspace_backup.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });
  $("import-saved-button").addEventListener("click", () =>
    $("import-saved").click(),
  );
  $("import-saved").addEventListener("change", async () => {
    const file = $("import-saved").files[0];
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error("file too large");
      const imported = workspaceModel.decodeBackup(
        JSON.parse(await file.text()),
        api.catalog,
      );
      const existing = readSaved(),
        seen = new Set(),
        merged = [];
      for (const item of [...imported, ...existing]) {
        if (seen.has(item.hash)) continue;
        seen.add(item.hash);
        merged.push({
          ...item,
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 10),
        });
      }
      if (writeSaved(merged.slice(0, 30))) {
        renderSaved();
        $("storage-message").textContent =
          imported.length +
          "개 분석을 가져왔습니다. 중복 주소는 합치고 최근 30개까지 보관합니다.";
      }
    } catch (error) {
      $("storage-message").textContent =
        "백업을 가져오지 못했습니다. Tradeweave 백업 JSON 형식·지원 국가/품목·파일 크기(1MB 이하)를 확인하세요. 기존 저장은 유지됩니다.";
    } finally {
      $("import-saved").value = "";
    }
  });
  window.addEventListener("storage", function (e) {
    if (e.key === storageKey) updateSavedCount();
  });
  // Animate visible table rows after sorting, preserving exact final values.
  var tablePositions = null;
  document.addEventListener(
    "change",
    function (e) {
      if (e.target.id !== "partner-sort" || reduced.matches) return;
      tablePositions = new Map();
      document
        .querySelectorAll("#partner-rows tr[data-partner]")
        .forEach(function (row) {
          var r = row.getBoundingClientRect();
          if (r.bottom > 0 && r.top < innerHeight)
            tablePositions.set(row.dataset.partner, r.top);
        });
      queueMicrotask(function () {
        document
          .querySelectorAll("#partner-rows tr[data-partner]")
          .forEach(function (row) {
            var old = tablePositions.get(row.dataset.partner),
              r = row.getBoundingClientRect();
            if (
              old !== undefined &&
              r.top < innerHeight &&
              r.bottom > 0 &&
              Math.abs(old - r.top) < 500
            )
              animate(
                row,
                [
                  { transform: "translateY(" + (old - r.top) + "px)" },
                  { transform: "translateY(0)" },
                ],
                { duration: 280 },
              );
          });
      });
    },
    true,
  );
  // Canvas export is deterministic and carries scope, denominator, source and license.
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    var words = Array.from(text),
      line = "";
    words.forEach(function (char) {
      var trial = line + char;
      if (ctx.measureText(trial).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        line = char;
        y += lineHeight;
      } else line = trial;
    });
    if (line) ctx.fillText(line, x, y);
    return y + lineHeight;
  }
  function colors() {
    var style = getComputedStyle(document.documentElement);
    return {
      me: style.getPropertyValue("--ochre").trim(),
      land: style.getPropertyValue("--land").trim(),
      buckets: [1, 2, 3, 4, 5].map(function (i) {
        return style.getPropertyValue("--map-" + i).trim();
      }),
    };
  }
  function paintMap(ctx, code, flow, x, y, w, h, selected) {
    var data = api.rows(code, flow),
      shares = new Map(
        data.list.map(function (r) {
          return [r.iso, r.p];
        }),
      ),
      palette = colors(),
      scale = Math.min(w / api.map.w, h / api.map.h);
    ctx.save();
    ctx.translate(
      x + (w - api.map.w * scale) / 2,
      y + (h - api.map.h * scale) / 2,
    );
    ctx.scale(scale, scale);
    function fill(iso) {
      var p = shares.get(iso);
      return iso === code
        ? palette.me
        : p === undefined
          ? palette.land
          : palette.buckets[
              p >= 20 ? 4 : p >= 10 ? 3 : p >= 5 ? 2 : p >= 1 ? 1 : 0
            ];
    }
    api.map.shapes.forEach(function (shape) {
      var path = new Path2D(shape[1]);
      ctx.fillStyle = fill(shape[0]);
      ctx.strokeStyle = shape[0] === selected ? "#182d3d" : "#fffefa";
      ctx.lineWidth = shape[0] === selected ? 1.7 : 0.6;
      ctx.fill(path);
      ctx.stroke(path);
    });
    api.map.dots.forEach(function (dot) {
      ctx.beginPath();
      ctx.arc(dot[1], dot[2], 2.6, 0, Math.PI * 2);
      ctx.fillStyle = fill(dot[0]);
      ctx.fill();
    });
    ctx.restore();
  }
  function paintLegend(ctx, x, y, width) {
    var p = colors(),
      labels = ["1% 미만", "1–5%", "5–10%", "10–20%", "20% 이상"];
    ctx.font = "15px sans-serif";
    labels.forEach(function (label, i) {
      ctx.fillStyle = p.buckets[i];
      ctx.fillRect(x + (i * width) / 5, y, width / 5, 9);
      ctx.fillStyle = "#62717b";
      ctx.fillText(label, x + (i * width) / 5, y + 32);
    });
  }
  async function exportImage() {
    if (exporting || !resultVisible()) return;
    exporting = true;
    $("export-image").disabled = true;
    api.say("출처를 포함한 지도 이미지를 만드는 중입니다.");
    try {
      await document.fonts.ready;
      var s = api.state,
        compare = s.tab === "countries",
        canvas = document.createElement("canvas");
      canvas.width = 1800;
      canvas.height = compare ? 1350 : 1200;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#f5f3ed";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#182d3d";
      ctx.font = '600 28px "IBM Plex Sans KR",sans-serif';
      ctx.fillText("Tradeweave", 65, 70);
      ctx.font = '500 40px "IBM Plex Sans KR",sans-serif';
      ctx.fillText(
        compare
          ? "같은 기준으로, 나란히"
          : api.name(s.iso) +
              "의 " +
              (s.flow === "export" ? "수출" : "수입") +
              " 상대국",
        65,
        145,
      );
      ctx.font = '20px "IBM Plex Sans KR",sans-serif';
      ctx.fillStyle = "#62717b";
      ctx.fillText(
        s.year +
          " · " +
          api.scope() +
          " · " +
          (s.flow === "export" ? "수출" : "수입") +
          " · 경상 미국 달러",
        65,
        190,
      );
      if (compare) {
        selectedCountries().forEach(function (code, i) {
          var x = 65 + i * 565,
            data = api.rows(code, s.flow);
          ctx.fillStyle = "#fffefa";
          ctx.fillRect(x, 240, 535, 825);
          ctx.fillStyle = "#182d3d";
          ctx.font = '500 28px "IBM Plex Sans KR",sans-serif';
          ctx.fillText(api.name(code), x + 25, 285);
          paintMap(ctx, code, s.flow, x + 15, 330, 505, 285, null);
          ctx.fillStyle = "#182d3d";
          ctx.font = '500 28px "IBM Plex Sans KR",sans-serif';
          ctx.fillText(
            data.list.length ? api.usd(data.total) : "교역 기록 없음",
            x + 25,
            670,
          );
          ctx.font = '17px "IBM Plex Sans KR",sans-serif';
          ctx.fillText(
            "상위 5개 " +
              (data.list.length ? api.pct(api.concentration(data, 5)) : "—") +
              " · HHI " +
              (data.list.length
                ? Math.round(math.hhi(data)).toLocaleString("ko-KR")
                : "—"),
            x + 25,
            715,
          );
          data.list.slice(0, 5).forEach(function (r, j) {
            ctx.fillStyle = "#62717b";
            ctx.font = '18px "IBM Plex Sans KR",sans-serif';
            ctx.fillText(j + 1 + ". " + api.name(r.iso), x + 25, 770 + j * 45);
            ctx.textAlign = "right";
            ctx.fillText(api.pct(r.p), x + 505, 770 + j * 45);
            ctx.textAlign = "left";
          });
        });
        paintLegend(ctx, 65, 1100, 1100);
        ctx.fillStyle = "#62717b";
        ctx.font = '16px "IBM Plex Sans KR",sans-serif';
        ctx.fillText(
          "각 국가의 선택 범위 합계 = 각각 100% · 공통 색 구간 · 황토색 = 기준국",
          65,
          1160,
        );
      } else {
        ctx.fillStyle = "#fffefa";
        ctx.fillRect(65, 230, 1670, 640);
        paintMap(ctx, s.iso, s.flow, 90, 255, 1130, 540, s.partner);
        var data = api.rows(s.iso, s.flow);
        ctx.fillStyle = "#182d3d";
        ctx.font = '500 21px "IBM Plex Sans KR",sans-serif';
        ctx.fillText("상위 5개 상대국", 1270, 285);
        data.list.slice(0, 5).forEach(function (r, i) {
          ctx.font = '20px "IBM Plex Sans KR",sans-serif';
          ctx.fillStyle = "#62717b";
          ctx.fillText(i + 1 + ". " + api.name(r.iso), 1270, 345 + i * 75);
          ctx.textAlign = "right";
          ctx.fillText(api.pct(r.p), 1700, 345 + i * 75);
          ctx.textAlign = "left";
        });
        paintLegend(ctx, 100, 805, 1060);
        ctx.fillStyle = "#182d3d";
        ctx.font = '500 26px "IBM Plex Sans KR",sans-serif';
        ctx.fillText(
          "합계 " +
            (data.list.length ? api.usd(data.total) : "교역 기록 없음") +
            " · 상위 5개 " +
            (data.list.length ? api.pct(api.concentration(data, 5)) : "—"),
          65,
          925,
        );
        ctx.font = '18px "IBM Plex Sans KR",sans-serif';
        ctx.fillStyle = "#62717b";
        var relation = api.relationship(s.iso, s.flow, s.partner);
        if (s.partner)
          wrapText(
            ctx,
            "선택 상대국 " +
              api.name(s.partner) +
              " · " +
              (relation.row
                ? api.usd(relation.row.v) +
                  " · 기준국 비중 " +
                  api.pct(relation.baseShare) +
                  " · 상대국 비중 " +
                  api.pct(relation.partnerShare)
                : "교역 기록 없음"),
            65,
            970,
            1665,
            26,
          );
        ctx.fillText(
          "분모 " +
            (data.list.length
              ? data.total.toLocaleString("ko-KR") + " 천 달러"
              : "교역 기록 없음") +
            " · 황토색 = 기준국 · 바탕색 = 교역 기록 또는 자료 없음",
          65,
          1020,
        );
      }
      var footer = compare ? 1220 : 1090;
      ctx.fillStyle = "#62717b";
      ctx.font = '15px "IBM Plex Sans KR",sans-serif';
      footer = wrapText(ctx, api.source(), 65, footer, 1665, 24);
      ctx.fillText(
        "Etalab Open Licence 2.0 · Natural Earth / world-atlas 2.0.2 · 정거원통 도법",
        65,
        footer + 5,
      );
      ctx.fillText(
        "https://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37",
        65,
        footer + 30,
      );
      var blob = await new Promise(function (resolve) {
        canvas.toBlob(resolve, "image/png");
      });
      if (!blob) throw new Error("image");
      var link = document.createElement("a"),
        url = URL.createObjectURL(blob);
      link.href = url;
      link.download =
        "tradeweave_" +
        (compare ? "comparison" : s.iso) +
        "_" +
        s.year +
        "_" +
        s.product +
        "_" +
        s.flow +
        ".png";
      link.click();
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
      api.say("출처를 포함한 PNG를 저장했습니다.");
    } catch (e) {
      console.error("Tradeweave PNG export failed", e);
      api.say("이미지를 만들지 못했습니다. 인쇄 또는 CSV를 이용해 주세요.");
    } finally {
      exporting = false;
      $("export-image").disabled = false;
    }
  }
  $("open-report").addEventListener("click", () => {
    if (!resultVisible() || document.body.classList.contains("is-loading"))
      return;
    $("report-scope").textContent =
      $("r-title").textContent + " · " + api.state.year + "년 · " + api.scope();
    $("report-dialog").showModal();
  });

  function reportMap(year) {
    const s = api.state;
    const map = svgNode("svg", {
      viewBox: "0 0 " + api.map.w + " " + api.map.h,
      role: "img",
      "aria-label": $("r-title").textContent + " · " + year + "년",
    });
    const palette = colors();
    const vector = new Map(
      api
        .rows(s.iso, s.flow, api.series[year])
        .list.map((row) => [row.iso, row]),
    );
    function add(shape, tag) {
      const code = shape[0],
        row = vector.get(code);
      const band = !row
        ? null
        : row.p >= 20
          ? 4
          : row.p >= 10
            ? 3
            : row.p >= 5
              ? 2
              : row.p >= 1
                ? 1
                : 0;
      const attrs =
        tag === "path"
          ? { d: shape[1] }
          : { cx: shape[1], cy: shape[2], r: 2.6 };
      map.append(
        svgNode(tag, {
          ...attrs,
          fill:
            code === s.iso
              ? palette.me
              : band === null
                ? palette.land
                : palette.buckets[band],
          stroke: code === s.partner ? "#182d3d" : "#fffefa",
          "stroke-width": code === s.partner ? "1.4" : ".5",
        }),
      );
    }
    api.map.shapes.forEach((shape) => add(shape, "path"));
    api.map.dots.forEach((shape) => add(shape, "circle"));
    return map;
  }

  $("download-report").addEventListener("click", () => {
    if (
      !resultVisible() ||
      document.body.classList.contains("is-loading") ||
      api.catalog.years.some((year) => !api.series[year])
    )
      return;
    syncWorkspaceDraft();
    const state = api.state;
    const title = $("r-title").textContent;
    const report = document.implementation.createHTMLDocument(
      title + " · Tradeweave",
    );
    report.documentElement.lang = "ko";
    const charset = report.createElement("meta");
    charset.setAttribute("charset", "utf-8");
    report.head.prepend(charset);
    const viewport = report.createElement("meta");
    viewport.name = "viewport";
    viewport.content = "width=device-width,initial-scale=1";
    const style = node(
      "style",
      "",
      `
      body{font:15px/1.65 system-ui,sans-serif;color:#182d3d;margin:0;background:#f5f3ed}
      main{max-width:1080px;margin:auto;padding:clamp(16px,4vw,52px)}
      header,section{background:#fffefa;border:1px solid #dde2df;border-radius:10px;padding:clamp(14px,3vw,28px);margin-bottom:20px}
      h1,h2,p{margin:0 0 12px}h1{font-size:clamp(24px,5vw,38px)}h2{font-size:20px}
      svg{display:block;width:100%;height:auto}.report-maps{display:grid;grid-template-columns:1fr 1fr;gap:20px}.report-maps figure{margin:0}.report-maps h3{margin:0 0 8px}@media(max-width:600px){.report-maps{grid-template-columns:1fr}}table{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}
      caption{text-align:left;padding:0 0 8px;color:#536575}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #dde2df;padding:8px}
      thead{background:#e8eef0}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}.table-wrap{overflow:auto}
      @media print{body{background:white}main{padding:0}section,header{border:0;padding:0}thead{display:table-header-group}tr,svg{break-inside:avoid}.table-wrap{overflow:visible}}
    `,
    );
    report.head.append(viewport, style);
    const main = node("main");
    const header = node("header");
    header.append(
      node("p", "", "Tradeweave · 분석 보고서"),
      node("h1", "", title),
      node(
        "p",
        "",
        state.compareYear +
          " → " +
          state.year +
          " · " +
          api.scope() +
          " · " +
          api.catalog.version,
      ),
    );
    main.appendChild(header);

    function section(title, ...content) {
      const block = node("section");
      block.append(node("h2", "", title), ...content);
      main.appendChild(block);
    }
    function table(headers, rows, caption) {
      const wrap = node("div", "table-wrap");
      wrap.appendChild(makeTable(headers, rows, caption));
      return wrap;
    }
    const note = $("report-note").value.trim();
    if (note) section("사용자 메모", node("pre", "", note));

    const data = api.rows(state.iso, state.flow);
    const insights = Array.from(
      document.querySelectorAll("#insight-cards .insight-card"),
    ).map((card) =>
      node(
        "p",
        "",
        card.querySelector("strong").textContent +
          ": " +
          card.querySelectorAll("span")[0].textContent,
      ),
    );
    section(
      "관측된 변화 요약",
      ...insights,
      node("p", "", "관측값의 산술 비교이며 변화 원인을 뜻하지 않습니다."),
    );
    const mapPair = node("div", "report-maps");
    [state.compareYear, state.year].forEach((year) => {
      const figure = node("figure");
      const vector = api.rows(state.iso, state.flow, api.series[year]);
      figure.append(
        node("h3", "", year + "년"),
        reportMap(year),
        node(
          "figcaption",
          "",
          vector.total
            ? "분모 · " + api.usd(vector.total) + " = 100%"
            : "교역 기록 없음",
        ),
      );
      mapPair.append(figure);
    });
    section(
      "교역 지도 · 두 시점",
      mapPair,
      node("p", "", $("r-denominator").textContent),
      node(
        "p",
        "",
        "공통 비중 구간: 1% 미만 · 1~5% · 5~10% · 10~20% · 20% 이상. 황토색은 기준국, 회색은 기록 없음입니다.",
      ),
      table(
        ["상대국", "교역액(천 달러)", "비중", "순위"],
        data.list
          .slice(0, 5)
          .map((row) => [
            api.name(row.iso),
            row.v.toLocaleString("ko-KR"),
            api.pct(row.p),
            row.rank,
          ]),
        "선택연도 상위 상대국",
      ),
    );

    if (state.partner) {
      section(
        "선택 상대국 추이 · " + api.name(state.partner),
        table(
          ["연도", "교역액(천 달러)", "기준국 분모(천 달러)", "상대국 비중"],
          api.catalog.years.map((year) => {
            const relation = api.relationship(
              state.iso,
              state.flow,
              state.partner,
              api.series[year],
            );
            return [
              year,
              relation.row?.v.toLocaleString("ko-KR") ?? "기록 없음",
              relation.baseTotal
                ? relation.baseTotal.toLocaleString("ko-KR")
                : "기록 없음",
              relation.row ? api.pct(relation.baseShare) : "기록 없음",
            ];
          }),
          "동일 품목·교역 방향의 연도별 자료",
        ),
      );
    }
    const explanation = numberExplanation();
    if (explanation)
      section(
        "금액·비중 변화 해석",
        node("p", "", explanation.message),
        table(
          ["연도", "상대국 교역액", "기준국 전체 교역액", "비중"],
          explanation.rows,
          "교역액과 전체 교역액의 변화",
        ),
      );

    const periods = math.periodRows(
      api.rows(state.iso, state.flow, api.series[state.compareYear]),
      data,
    );
    section(
      "두 시점 상대국 비교",
      table(
        [
          "상대국",
          state.compareYear + "년 금액(천 달러)",
          state.year + "년 금액(천 달러)",
          state.compareYear + "년 비중",
          state.year + "년 비중",
          "비중 차이",
        ],
        periods.map((row) => [
          api.name(row.iso),
          row.before?.v.toLocaleString("ko-KR") ?? "기록 없음",
          row.after?.v.toLocaleString("ko-KR") ?? "기록 없음",
          row.before ? api.pct(row.before.p) : "—",
          row.after ? api.pct(row.after.p) : "—",
          row.pp === null ? "계산 안 함" : math.signed(row.pp, "%p"),
        ]),
        "동일 상대국 전체 · 필터와 무관하게 모든 기록을 포함합니다.",
      ),
    );
    const changes = math.changes(
      api.rows(state.iso, state.flow, api.series[state.compareYear]),
      data,
    );
    const changeRows = math
      .sortChanges(changes.common, "gain")
      .map((row) => [
        api.name(row.iso),
        api.pct(row.before.p),
        api.pct(row.after.p),
        math.signed(row.pp, "%p"),
        row.before.rank + " → " + row.after.rank,
      ]);
    for (const row of [...changes.entered, ...changes.absent]) {
      changeRows.push([
        api.name(row.iso),
        row.before ? api.pct(row.before.p) : "기록 없음",
        row.after ? api.pct(row.after.p) : "기록 없음",
        "—",
        "—",
      ]);
    }
    section(
      "구조 변화 전체",
      table(
        [
          "상대국",
          state.compareYear + "년 비중",
          state.year + "년 비중",
          "차이",
          "순위",
        ],
        changeRows,
        "한 연도라도 기록이 없으면 차이를 계산하지 않습니다.",
      ),
    );

    const matrix = comparisonMatrix();
    section(
      "동일 상대국 비교",
      table(
        ["상대국", ...matrix.countries.map(api.name)],
        matrix.rows.map((row) => matrixCells(matrix, row, false)),
        state.year +
          "년 · 비중 · 교역액 · 순위. 분모는 각 보고국의 해당 품목·방향 합계입니다.",
      ),
    );

    const source = node("a", "", "CEPII BACI 원자료");
    source.href = api.catalog.archive_url;
    section(
      "출처와 재현 정보",
      node("p", "", api.source()),
      node("p", "", api.catalog.unit + " · " + api.catalog.license),
      node("p", "", "원자료 SHA-256: " + api.catalog.archive_sha256),
      node("p", "", "지도: " + api.map.source + " · " + api.map.projection),
      source,
    );
    report.body.appendChild(main);

    const blob = new Blob(
      ["<!doctype html>\n", report.documentElement.outerHTML],
      { type: "text/html;charset=utf-8" },
    );
    const link = node("a");
    link.href = URL.createObjectURL(blob);
    link.download =
      "tradeweave_" +
      state.iso +
      "_" +
      state.year +
      "_" +
      state.product +
      "_report.html";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1500);
    $("report-dialog").close();
    api.say("분석 보고서를 저장했습니다.");
  });

  $("export-image").addEventListener("click", exportImage);
  $("print-analysis").addEventListener("click", function () {
    window.print();
  });
  window.TWStudio = {
    activateTab: activateTab,
    openPartner: openPartner,
    closePartner: closePartner,
    refreshWorkspace: schedule,
    captureRowPositions,
    animateTableRows,
  };
  updateSavedCount();
  schedule();
})();
