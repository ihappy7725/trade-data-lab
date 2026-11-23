/* Geometry for illustrative bilateral connections, not transport routes. */
(function (root) {
  function connection(anchors, base, partner, flow, w, h) {
    const a = anchors?.[base],
      b = anchors?.[partner];
    if (!a || !b || base === partner || ![...a, ...b].every(Number.isFinite))
      return null;
    const start = flow === "import" ? b : a,
      end = flow === "import" ? a : b;
    const distance = Math.hypot(end[0] - start[0], end[1] - start[1]);
    if (distance < 1) return null;
    const dx = (end[0] - start[0]) / distance,
      dy = (end[1] - start[1]) / distance;
    const trim = Math.min(8, distance / 4);
    const from = [start[0] + dx * trim, start[1] + dy * trim],
      to = [end[0] - dx * trim, end[1] - dy * trim];
    const control = [
      (start[0] + end[0]) / 2,
      Math.max(
        10,
        (start[1] + end[1]) / 2 - Math.min(85, Math.max(22, distance * 0.18)),
      ),
    ];
    const labelW = 150,
      labelH = 46;
    let x = b[0] < a[0] ? b[0] - labelW - 14 : b[0] + 14;
    let y = b[1] - labelH / 2;
    x = Math.max(10, Math.min(w - labelW - 10, x));
    if (Math.abs(b[1] - a[1]) < 42 && x < a[0] + 70 && x + labelW > a[0] - 70)
      y = b[1] - labelH - 24;
    y = Math.max(10, Math.min(h - labelH - 10, y));
    return {
      base: a,
      partner: b,
      from,
      to,
      control,
      label: { x, y, w: labelW, h: labelH },
      path: `M${from[0]},${from[1]} Q${control[0]},${control[1]} ${to[0]},${to[1]}`,
    };
  }
  const api = { connection };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TradeweaveAtlasModel = api;
})(typeof window !== "undefined" ? window : this);
