/* Portable workspace schema. Imported files never provide executable routes or markup. */
(function (root) {
  "use strict";
  const controls = [
    "change-query",
    "change-sort",
    "change-direction",
    "change-min",
    "matrix-query",
    "matrix-sort",
    "matrix-metric",
    "partner-query",
    "partner-sort",
  ];
  function routeScope(hash, catalog) {
    if (typeof hash !== "string" || hash.length > 2000) return null;
    const [path, query = ""] = hash.split("?");
    const match =
      /^#see\/([A-Z0-9]{3})\/(export|import)(?:\/(concentration|sources|partner|partners|related|comparison))?$/.exec(
        path,
      );
    if (!match || !catalog.countries[match[1]]) return null;
    const params = new URLSearchParams(query),
      year = params.has("year")
        ? Number(params.get("year"))
        : catalog.default.year,
      product = params.get("product") || catalog.default.product;
    const earlier = catalog.years.filter((y) => y < year);
    const compareYear = params.has("compare")
      ? Number(params.get("compare"))
      : earlier.at(-1) || catalog.years.find((y) => y !== year);
    const partner = params.get("partner");
    if (
      !catalog.years.includes(year) ||
      !catalog.years.includes(compareYear) ||
      year === compareYear ||
      !catalog.products.some((p) => p.id === product) ||
      (partner && (!catalog.countries[partner] || partner === match[1]))
    )
      return null;
    return {
      iso: match[1],
      flow: match[2],
      year,
      compareYear,
      product,
      partner,
    };
  }
  function normalizeSaved(item, catalog) {
    if (
      !item ||
      typeof item !== "object" ||
      !routeScope(item.hash, catalog) ||
      typeof item.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      item.name.length > 100 ||
      (item.note !== undefined &&
        (typeof item.note !== "string" || item.note.length > 2000))
    )
      return null;
    let snapshot = null;
    if (item.snapshot !== undefined && item.snapshot !== null) {
      if (
        typeof item.snapshot.version !== "string" ||
        item.snapshot.version.length > 100 ||
        !item.snapshot.version ||
        !/[a-f0-9]{64}/i.test(item.snapshot.archiveSha256) ||
        item.snapshot.archiveSha256.length !== 64
      )
        return null;
      snapshot = {
        version: item.snapshot.version,
        archiveSha256: item.snapshot.archiveSha256,
      };
    }
    const ui = {};
    for (const id of controls)
      if (typeof item.ui?.[id] === "string") ui[id] = item.ui[id].slice(0, 100);
    const temporal =
      item.temporal && typeof item.temporal === "object"
        ? {
            query: String(item.temporal.query || "").slice(0, 100),
            sort: ["current", "gain", "loss", "amount"].includes(
              item.temporal.sort,
            )
              ? item.temporal.sort
              : "current",
            all: item.temporal.all === true,
            open: item.temporal.open === true,
          }
        : null;
    return {
      id: item.id,
      name: item.name.trim(),
      hash: item.hash,
      scope: typeof item.scope === "string" ? item.scope.slice(0, 300) : "",
      note: item.note || "",
      snapshot,
      ui,
      temporal,
      changePage:
        Number.isInteger(item.changePage) && item.changePage >= 0
          ? Math.min(item.changePage, 100)
          : 0,
      showAllChanges: item.showAllChanges === true,
      savedAt:
        typeof item.savedAt === "string" ? item.savedAt.slice(0, 40) : null,
    };
  }
  function decodeBackup(value, catalog) {
    if (
      !value ||
      value.application !== "Tradeweave" ||
      value.schema !== 2 ||
      !Array.isArray(value.items) ||
      value.items.length > 30
    )
      throw new Error("invalid backup schema");
    const items = value.items.map((item) => normalizeSaved(item, catalog));
    if (items.some((item) => !item)) throw new Error("invalid workspace");
    return items;
  }
  function versionMatches(item, catalog) {
    return (
      !item.snapshot ||
      (item.snapshot.version === catalog.version &&
        item.snapshot.archiveSha256 === catalog.archive_sha256)
    );
  }
  const api = {
    controls,
    routeScope,
    normalizeSaved,
    decodeBackup,
    versionMatches,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TradeweaveWorkspaceState = api;
})(typeof window !== "undefined" ? window : this);
