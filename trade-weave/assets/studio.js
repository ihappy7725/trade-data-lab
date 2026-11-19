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
    initPeers();
    activateTab(s.tab, false);
    renderTrend();
    renderChanges();
    if (s.tab === "countries") renderCountries();
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
        "#hero-map [data-partner],#hero-rank [data-partner],#r-map [data-partner],#r-rank [data-partner],#partner-rows tr[data-partner]",
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
          "button:not([disabled]),a[href],input,select",
        ),
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
        node("p", "caption", "선택 상대국의 비교 가능한 교역 기록이 없습니다."),
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
            yr + "년 " + (values[i] === null ? "기록 없음" : api.pct(values[i]))
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
            "기록 없음",
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
  function renderChanges() {
    var s = api.state;
    changeData = math.changes(
      api.rows(s.iso, s.flow, api.series[s.compareYear]),
      api.rows(s.iso, s.flow, api.series[s.year]),
    );
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
    renderChangeRows();
    var missing = $("change-missing");
    missing.replaceChildren();
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
    var list = $("change-list"),
      items = math
        .sortChanges(changeData.common, $("change-sort").value)
        .slice(0, 15),
      max = Math.max.apply(
        null,
        items
          .map(function (r) {
            return Math.abs(r.pp);
          })
          .concat([0.1]),
      );
    list.replaceChildren();
    if (!items.length) {
      list.appendChild(
        node(
          "p",
          "empty-state",
          "두 연도 모두 교역 기록이 있는 상대국이 없습니다.",
        ),
      );
      return;
    }
    items.forEach(function (r) {
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
  $("change-sort").addEventListener("change", function () {
    renderChangeRows();
    animate($("change-list"), [{ opacity: 0.5 }, { opacity: 1 }]);
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
  function readSaved() {
    try {
      var v = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(v)
        ? v
            .filter(function (r) {
              return (
                r &&
                typeof r.id === "string" &&
                typeof r.name === "string" &&
                typeof r.hash === "string" &&
                /^#see\/[A-Z0-9]{3}\/(export|import)(?:[/?]|$)/.test(r.hash)
              );
            })
            .slice(0, 30)
        : [];
    } catch (e) {
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
    if (!resultVisible()) return;
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
        api.scope();
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
      link.addEventListener("click", function () {
        $("saved-dialog").close();
      });
      row.append(link, node("p", "", item.scope || ""));
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
  $("export-image").addEventListener("click", exportImage);
  $("print-analysis").addEventListener("click", function () {
    window.print();
  });
  window.TWStudio = {
    activateTab: activateTab,
    openPartner: openPartner,
    closePartner: closePartner,
  };
  updateSavedCount();
  schedule();
})();
