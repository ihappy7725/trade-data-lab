/* Explicit interface localisation. User notes and saved names are never translated. */
(function (root) {
  "use strict";
  const data =
    typeof module !== "undefined" && module.exports
      ? require("./locales/en.js")
      : root.TW_LOCALE_EN;
  let language = "ko";
  const missing = new Set(),
    texts = [],
    attributes = [],
    prepared = new WeakSet(),
    localized = new WeakSet();
  const normalize = (s) => String(s).replace(/\s+/g, " ").trim();
  function t(key, values = []) {
    let message = key;
    if (language === "en") {
      if (Object.hasOwn(data.messages, key)) message = data.messages[key];
      else if (/[가-힣]/.test(key)) missing.add(key);
    }
    return message.replace(/\{(\d+)\}/g, (_, i) =>
      String(values[Number(i)] ?? ""),
    );
  }
  function bindStatic() {
    if (typeof document === "undefined") return;
    const walker = document.createTreeWalker(
      document.documentElement,
      NodeFilter.SHOW_TEXT,
    );
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest("script,style,textarea,[data-language]"))
        continue;
      const key = normalize(node.textContent);
      if (!/[가-힣]/.test(key)) continue;
      const raw = node.textContent;
      const start = raw.indexOf(raw.trim()[0]);
      texts.push({
        node,
        key,
        before: raw.slice(0, start),
        after: raw.slice(raw.trimEnd().length),
      });
    }
    for (const el of document.querySelectorAll("*"))
      for (const name of [
        "aria-label",
        "placeholder",
        "title",
        "alt",
        "content",
      ]) {
        const value = el.getAttribute(name);
        if (value && /[가-힣]/.test(value))
          attributes.push({ el, name, key: normalize(value) });
      }
  }
  function applyStatic() {
    if (typeof document === "undefined") return;
    document.documentElement.lang = language;
    for (const binding of texts)
      if (binding.node.isConnected)
        binding.node.textContent =
          binding.before + t(binding.key) + binding.after;
    for (const binding of attributes)
      if (binding.el.isConnected)
        binding.el.setAttribute(binding.name, t(binding.key));
    document
      .querySelectorAll("[data-language]")
      .forEach((el) =>
        el.setAttribute(
          "aria-pressed",
          String(el.dataset.language === language),
        ),
      );
  }
  function setLanguage(
    lang,
    { persist = false, history = true, notify = true } = {},
  ) {
    if (!["ko", "en"].includes(lang)) return false;
    const changed = language !== lang;
    language = lang;
    if (persist && typeof localStorage !== "undefined")
      try {
        localStorage.setItem("tradeweave.language", lang);
      } catch (error) {}
    if (history && typeof location !== "undefined") {
      const fragment = location.hash.slice(1),
        idx = fragment.indexOf("?"),
        path = idx < 0 ? fragment : fragment.slice(0, idx),
        params = new URLSearchParams(idx < 0 ? "" : fragment.slice(idx + 1));
      params.set("lang", lang);
      root.history.replaceState(null, "", "#" + path + "?" + params.toString());
    }
    applyStatic();
    if (changed && notify && typeof document !== "undefined")
      document.dispatchEvent(
        new CustomEvent("tw:language", { detail: { language } }),
      );
    return changed;
  }
  function country(catalog, code) {
    const item = catalog?.countries?.[code];
    return item
      ? language === "en"
        ? code === "S19"
          ? "Taiwan"
          : item.en
        : item.ko
      : t("자료 없음");
  }
  function product(item) {
    return language === "en" ? data.products[item.id] : item;
  }
  function localizeCatalog(catalog) {
    if (prepared.has(catalog)) return catalog;
    prepared.add(catalog);
    for (const p of catalog.products) {
      const original = { ...p },
        translated = data.products[p.id];
      if (!translated) throw new Error("Missing product translation: " + p.id);
      Object.defineProperty(p, "searchText", {
        value: [
          original.label,
          original.scope,
          original.description,
          translated.label,
          translated.scope,
          translated.description,
          p.id,
        ].join(" "),
      });
      for (const key of ["label", "scope", "description"])
        Object.defineProperty(p, key, {
          enumerable: true,
          configurable: true,
          get: () => (language === "en" ? translated[key] : original[key]),
        });
    }
    localizeMeta(catalog);
    return catalog;
  }
  function localizeMeta(meta) {
    if (localized.has(meta)) return meta;
    localized.add(meta);
    for (const key of ["source", "unit", "precision", "note"])
      if (typeof meta[key] === "string") {
        const original = meta[key];
        Object.defineProperty(meta, key, {
          enumerable: true,
          configurable: true,
          get: () => t(original),
        });
      }
    if (meta.product && data.products[meta.product]) {
      const original = meta.scope;
      Object.defineProperty(meta, "scope", {
        enumerable: true,
        configurable: true,
        get: () =>
          language === "en" ? data.products[meta.product].scope : original,
      });
    }
    return meta;
  }
  const api = {
    t,
    country,
    product,
    localizeCatalog,
    localizeMeta,
    setLanguage,
    get lang() {
      return language;
    },
    get locale() {
      return language === "en" ? "en-US" : "ko-KR";
    },
    unit: (value) => (language === "en" && value === "%p" ? " pp" : value),
    get missing() {
      return [...missing];
    },
    messages: data.messages,
    products: data.products,
  };
  root.TWI18n = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document !== "undefined") {
    bindStatic();
    let preferred = "ko";
    try {
      preferred = localStorage.getItem("tradeweave.language") || "ko";
    } catch (error) {}
    const query = location.hash.split("?")[1] || "";
    const explicit = new URLSearchParams(query).get("lang");
    setLanguage(explicit || preferred, { history: false, notify: false });
    document
      .querySelectorAll("[data-language]")
      .forEach((el) =>
        el.addEventListener("click", () =>
          setLanguage(el.dataset.language, { persist: true }),
        ),
      );
  }
})(globalThis);
