// 전망치 제보 — GET: 제보 목록(반려 제외), POST: 새 제보
// POST 순서: ① 방식 확인 ② 내용 읽기 ③ 검사 ④ 저장 ⑤ 201 응답 ⑥ 실패 시 400 / 500
import { sql, json } from "../lib/db.js";

const ORGS = ["WTO", "IMF", "OECD", "World Bank", "UNCTAD", "KIEP", "KITA", "기타"];
const BASIS = ["goods", "goods+services"];
const clean = (v) => (typeof v === "string" ? v.trim() : "");

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const rows = await sql`
        select id, indicator_id, org, to_char(released_on, 'YYYY-MM-DD') as released_on,
               value::float as value, basis, source_url, page, note, status
        from forecast_submissions where status <> '반려'
        order by released_on limit 200`;
      return json(res, 200, { ok: true, submissions: rows });
    }
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "method" });

    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const f = {
      indicator: clean(b.indicator) || "world-trade-2026", org: clean(b.org), released_on: clean(b.released_on),
      value: Number(b.value), basis: clean(b.basis), source_url: clean(b.source_url), page: clean(b.page), note: clean(b.note),
    };
    const errors = [];
    if (!ORGS.includes(f.org)) errors.push("org");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.released_on) || f.released_on < "2024-01-01" || f.released_on > new Date().toISOString().slice(0, 10)) errors.push("released_on");
    if (b.value === "" || b.value == null || !Number.isFinite(f.value) || f.value < -50 || f.value > 50) errors.push("value");
    if (!BASIS.includes(f.basis)) errors.push("basis");
    if (!/^https:\/\//.test(f.source_url) || f.source_url.length > 500) errors.push("source_url");
    if (f.page.length > 10) errors.push("page");
    if (f.note.length > 200) errors.push("note");
    if (errors.length) return json(res, 400, { ok: false, error: "invalid", fields: errors });

    const known = await sql`select 1 from indicators where id = ${f.indicator}`;
    if (!known.length) return json(res, 400, { ok: false, error: "invalid", fields: ["indicator"] });

    const [row] = await sql`
      insert into forecast_submissions (indicator_id, org, released_on, value, basis, source_url, page, note)
      values (${f.indicator}, ${f.org}, ${f.released_on}, ${f.value}, ${f.basis}, ${f.source_url}, ${f.page || null}, ${f.note || null})
      returning id`;
    return json(res, 201, { ok: true, id: row.id });
  } catch (e) {
    console.error("forecasts", e.message);
    return json(res, 500, { ok: false, error: "server" });
  }
}
