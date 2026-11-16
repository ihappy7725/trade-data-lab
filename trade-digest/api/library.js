// 내 서재 — 브라우저 익명 번호(key)로 내 것만 읽고 · 담고 · 뺀다
// GET ?key= : 목록 · POST {key, ref_id?, title, org?, url} : 담기 · DELETE ?key=&id= : 빼기
import { sql, json } from "../lib/db.js";

const KEY = /^[0-9a-f-]{36}$/;
const clean = (v) => (typeof v === "string" ? v.trim() : "");

export default async function handler(req, res) {
  try {
    const key = clean((req.query && req.query.key) || (req.body && req.body.key) || "");
    if (!KEY.test(key)) return json(res, 400, { ok: false, error: "invalid", fields: ["key"] });

    if (req.method === "GET") {
      const rows = await sql`select id, ref_id, title, org, url, created_at from library_items where owner_key = ${key} order by created_at desc limit 200`;
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
    if (!/^https:\/\//.test(f.url) || f.url.length > 500) errors.push("url");
    if (errors.length) return json(res, 400, { ok: false, error: "invalid", fields: errors });

    const dup = await sql`select 1 from library_items where owner_key = ${key} and url = ${f.url}`;
    if (dup.length) return json(res, 409, { ok: false, error: "duplicate" });

    const [row] = await sql`
      insert into library_items (owner_key, ref_id, title, org, url)
      values (${key}, ${f.ref_id || null}, ${f.title}, ${f.org || null}, ${f.url}) returning id`;
    return json(res, 201, { ok: true, id: row.id });
  } catch (e) {
    console.error("library", e.message);
    return json(res, 500, { ok: false, error: "server" });
  }
}
