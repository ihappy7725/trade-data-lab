// 내 서재 — 브라우저 익명 번호(key)로 내 것만 읽고 · 담고 · 뺀다
// GET ?key= : 목록 · POST {key, ref_id?, title, org?, url?, summary?} : 담기 (url 또는 summary 중 하나는 있어야 함) · DELETE ?key=&id= : 빼기
import { sql, json } from "../lib/db.js";

const KEY = /^[0-9a-f-]{36}$/;
const clean = (v) => (typeof v === "string" ? v.trim() : "");

// 요약: 요지 + 항목(주장 · 근거 · 한계)만, 길이를 잘라서 받는다
function cleanSummary(v) {
  if (!v || typeof v !== "object" || !Array.isArray(v.items)) return null;
  const items = v.items.filter((i) => i && ["claim", "evidence", "limit"].includes(i.role) && i.ko).slice(0, 14).map((i) => ({
    role: i.role, ko: String(i.ko).slice(0, 300), page: String(i.page ?? "").slice(0, 10),
    quote: String(i.quote || "").slice(0, 400), found: i.found === true,
  }));
  if (!items.length) return null;
  return { gist: String(v.gist || "").slice(0, 400), items, auto: true };
}

export default async function handler(req, res) {
  try {
    const key = clean((req.query && req.query.key) || (req.body && req.body.key) || "");
    if (!KEY.test(key)) return json(res, 400, { ok: false, error: "invalid", fields: ["key"] });

    if (req.method === "GET") {
      const rows = await sql`select id, ref_id, title, org, url, summary, created_at from library_items where owner_key = ${key} order by created_at desc limit 200`;
      return json(res, 200, { ok: true, items: rows });
    }
    if (req.method === "DELETE") {
      const id = Number(req.query && req.query.id);
      if (!Number.isInteger(id) || id < 1) return json(res, 400, { ok: false, error: "invalid", fields: ["id"] });
      await sql`delete from library_items where id = ${id} and owner_key = ${key}`;
      return json(res, 200, { ok: true });
    }
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "method" });

    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const f = { ref_id: clean(b.ref_id), title: clean(b.title), org: clean(b.org), url: clean(b.url) };
    const errors = [];
    if (f.ref_id.length > 80) errors.push("ref_id");
    if (f.title.length < 2 || f.title.length > 200) errors.push("title");
    if (f.org.length > 40) errors.push("org");
    const summary = cleanSummary(b.summary);
    if (b.summary != null && !summary) errors.push("summary");
    if (f.url && (!/^https:\/\//.test(f.url) || f.url.length > 500)) errors.push("url");
    if (!f.url && !summary) errors.push("url");
    if (errors.length) return json(res, 400, { ok: false, error: "invalid", fields: errors });

    if (f.url) {
      const dup = await sql`select 1 from library_items where owner_key = ${key} and url = ${f.url}`;
      if (dup.length) return json(res, 409, { ok: false, error: "duplicate" });
    }

    const [row] = await sql`
      insert into library_items (owner_key, ref_id, title, org, url, summary)
      values (${key}, ${f.ref_id || null}, ${f.title}, ${f.org || null}, ${f.url || null}, ${summary ? JSON.stringify(summary) : null}) returning id`;
    return json(res, 201, { ok: true, id: row.id });
  } catch (e) {
    console.error("library", e.message);
    return json(res, 500, { ok: false, error: "server" });
  }
}
