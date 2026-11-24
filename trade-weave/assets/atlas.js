/* Visual atlas: one observed relationship, with reversible hover previews. */
(function () {
  "use strict";
  const i18nText = (key, values = []) =>
    globalThis.TWI18n
      ? globalThis.TWI18n.t(key, values)
      : key.replace(/\{(\d+)\}/g, (_, i) => String(values[Number(i)]));

  const api = window.Tradeweave,
    model = window.TradeweaveAtlasModel;
  const $ = (id) => document.getElementById(id),
    ns = "http://www.w3.org/2000/svg";
  let enabled = true,
    preview = null,
    scopeKey = "",
    queued = false;
  const keys = new Map();
  function svg(tag, attrs = {}, text) {
    const el = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs))
      el.setAttribute(key, value);
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function targetView() {
    if (!$("view-home").hidden && !$("hero-map-body").hidden) return "hero";
    if (!$("view-see").hidden && !$("r-body").hidden) return "r";
    return null;
  }
  function layer(prefix, state, row) {
    const map = $(prefix + "-map"),
      scene = map?.querySelector(".map-scene");
    if (!scene) return;
    let group = scene.querySelector(".connection-layer");
    const geometry = row
      ? model.connection(
          api.map.anchors,
          state.iso,
          row.iso,
          state.flow,
          api.map.w,
          api.map.h,
        )
      : null;
    if (!enabled || !geometry) {
      if (group) group.remove();
      keys.delete(prefix);
      return;
    }
    const key = [
      TWI18n.lang,
      state.iso,
      state.flow,
      state.year,
      state.product,
      row.iso,
    ].join("/");
    if (group && keys.get(prefix) === key) return;
    if (!group) {
      group = svg("g", {
        class: "connection-layer",
        "aria-hidden": "true",
      });
      scene.append(group);
    }
    group.replaceChildren();
    keys.set(prefix, key);
    const markerId = "atlas-arrow-" + prefix;
    const defs = svg("defs"),
      marker = svg("marker", {
        id: markerId,
        viewBox: "0 0 8 8",
        refX: 7,
        refY: 4,
        markerWidth: 6,
        markerHeight: 6,
        orient: "auto",
        markerUnits: "strokeWidth",
      });
    marker.append(
      svg("path", {
        d: "M0,0 L8,4 L0,8 Z",
        class: "connection-arrow",
      }),
    );
    defs.append(marker);
    group.append(defs);
    group.append(
      svg("path", {
        d: geometry.path,
        class: "connection-arc",
        "marker-end": "url(#" + markerId + ")",
        "vector-effect": "non-scaling-stroke",
      }),
    );
    [
      [geometry.base, "base"],
      [geometry.partner, "partner"],
    ].forEach(([point, kind]) => {
      const pin = svg("g", {
        class: "connection-pin " + kind,
        transform: "translate(" + point.join(",") + ")",
      });
      pin.append(
        svg("circle", {
          r: 10,
          class: "pin-halo",
        }),
        svg("circle", {
          r: 5.2,
          class: "pin-core",
        }),
        svg("circle", {
          r: 1.8,
          class: "pin-center",
        }),
      );
      group.append(pin);
    });
    const label = geometry.label,
      callout = svg("g", {
        class: "connection-callout",
        transform: `translate(${label.x},${label.y})`,
      });
    callout.append(
      svg("rect", {
        width: label.w,
        height: label.h,
        rx: 10,
      }),
    );
    const name = api.name(row.iso);
    callout.append(
      svg(
        "text",
        {
          x: 12,
          y: 18,
          class: "callout-country",
        },
        name.length > 11 ? name.slice(0, 10) + "…" : name,
      ),
      svg(
        "text",
        {
          x: 12,
          y: 35,
          class: "callout-value",
        },
        api.pct(row.p) + " · " + api.usd(row.v),
      ),
    );
    group.append(callout);
    const baseLabel = svg(
      "text",
      {
        x: Math.min(api.map.w - 12, Math.max(12, geometry.base[0])),
        y: Math.min(api.map.h - 12, geometry.base[1] + 25),
        "text-anchor": geometry.base[0] > api.map.w - 110 ? "end" : "middle",
        class: "connection-base-label",
      },
      i18nText("기준국 · {0}", [api.name(state.iso)]),
    );
    group.append(baseLabel);
    if (
      !matchMedia("(prefers-reduced-motion: reduce)").matches &&
      group.animate
    )
      group.animate(
        [
          {
            opacity: 0,
          },
          {
            opacity: 1,
          },
        ],
        {
          duration: 240,
          easing: "ease-out",
        },
      );
  }
  function render() {
    const prefix = targetView();
    if (!prefix || !api.map || !api.catalog) return;
    const s = api.state,
      key = [s.iso, s.flow, s.year, s.product, s.partner].join("/");
    if (scopeKey !== key) {
      scopeKey = key;
      preview = null;
    }
    const rows = api.rows(s.iso, s.flow).list;
    const code = preview || (prefix === "hero" ? rows[0]?.iso : s.partner),
      row = rows.find((item) => item.iso === code) || null;
    layer(prefix, s, row);
    const selectedCode = prefix === "hero" ? rows[0]?.iso : s.partner;
    document
      .querySelectorAll('[data-fit-relation="' + prefix + '"]')
      .forEach((button) => {
        button.disabled =
          !selectedCode ||
          !api.map.anchors?.[s.iso] ||
          !api.map.anchors?.[selectedCode] ||
          !rows.some((item) => item.iso === selectedCode);
      });
    if (prefix === "r") {
      $("selected-relationship-state").textContent = i18nText("선택한 상대국: {0}", [
        s.partner ? api.name(s.partner) : i18nText("선택 상대국 없음"),
      ]);
      $("preview-relationship-state").hidden =
        !preview || preview === s.partner;
      $("preview-relationship-state").textContent = preview
        ? i18nText("미리보기: {0}", [api.name(preview)])
        : "";
    }

    $("example-compare-link").href =
      "#" +
      api.resultRoute(s.iso, s.flow, "", s.partner, {
        ...s,
        tab: "countries",
      });
    if (prefix === "hero") {
      const link = $("atlas-focus-link");
      link.hidden = !row;
      if (row) {
        const from = s.flow === "export" ? s.iso : row.iso,
          to = s.flow === "export" ? row.iso : s.iso;
        $("atlas-focus-copy").textContent =
          api.name(from) +
          " → " +
          api.name(to) +
          " · " +
          api.pct(row.p) +
          " · " +
          api.usd(row.v);
        link.href = "#" + api.resultRoute(s.iso, s.flow, "partner", row.iso);
        link.classList.toggle("is-preview", !!preview);
      }
      document
        .querySelectorAll("#hero-rank .partner-button")
        .forEach((el) =>
          el
            .closest("li")
            .classList.toggle("atlas-active", el.dataset.partner === row?.iso),
        );
    } else {
      $("r-connection-caption").textContent =
        enabled && row
          ? i18nText("{0} · {1}의 교역 관계. 연결선은 실제 운송 경로가 아닙니다.", [
              (preview ? i18nText("미리보기 · ") : "") + api.name(s.iso),
              api.name(row.iso),
            ])
          : i18nText(
              "핀은 대표 위치, 연결선은 선택한 교역 관계입니다. 실제 운송 경로를 뜻하지 않습니다.",
            );
    }
  }
  function schedule() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        render();
      });
    }
  }
  function codeAt(target) {
    if (!(target instanceof Element)) return null;
    return target.closest("[data-partner]")?.dataset.partner || null;
  }
  function previewFrom(target) {
    const code = codeAt(target);
    if (!code || code === api.state.iso) return;
    const prefix = targetView();
    if (!prefix) return;
    if (
      !target.closest(
        "#" +
          prefix +
          "-map,#" +
          prefix +
          "-rank,#partner-rows,#matrix-table,#temporal-table",
      )
    )
      return;
    preview = code;
    schedule();
  }
  document.addEventListener("pointerover", (event) =>
    previewFrom(event.target),
  );
  document.addEventListener("focusin", (event) => previewFrom(event.target));
  document.addEventListener("pointerout", (event) => {
    if (
      codeAt(event.target) &&
      codeAt(event.target) !== codeAt(event.relatedTarget)
    ) {
      preview = null;
      schedule();
    }
  });
  document.addEventListener("focusout", (event) => {
    if (codeAt(event.target)) {
      preview = null;
      schedule();
    }
  });
  document.querySelectorAll("[data-connection-toggle]").forEach((button) =>
    button.addEventListener("click", () => {
      enabled = !enabled;
      document
        .querySelectorAll("[data-connection-toggle]")
        .forEach((el) => el.setAttribute("aria-pressed", String(enabled)));
      render();
    }),
  );
  document.querySelectorAll("[data-fit-relation]").forEach((button) =>
    button.addEventListener("click", () => {
      const prefix = button.dataset.fitRelation,
        s = api.state,
        partner =
          prefix === "hero" ? api.rows(s.iso, s.flow).list[0]?.iso : s.partner;
      window.TWStudio.fitRelationship(prefix, partner);
    }),
  );
  document.addEventListener("tw:render", schedule);
  window.TradeweaveAtlas = {
    render,
  };
  schedule();
})();
