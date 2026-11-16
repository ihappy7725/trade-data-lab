// 모두의 서가 — GET: 방문자가 추가한 보고서(숨김 제외), POST: 보고서 추가
// POST 순서: ① 방식 확인 ② 내용 읽기 ③ 검사 ④ 저장 ⑤ 201 응답 ⑥ 실패 시 400 / 409 / 500
import { sql, json } from "../lib/db.js";

const ORGS = ["WTO", "IMF", "OECD", "World Bank", "UNCTAD", "KIEP", "KITA", "KOTRA", "기타"];
const CATS = ["outlook", "policy", "supply", "digital", "energy", "korea"];
const clean = (v) => (typeof v === "string" ? v.trim() : "");

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const rows = await sql`
        select id, title, org, published, category_id, url, status
        from shelf_reports where status <> '숨김' order by created_at desc limit 100`;
      return json(res, 200, { ok: true, reports: rows });
    }
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "method" });

    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const f = { title: clean(b.title), org: clean(b.org), published: clean(b.published), category: clean(b.category), url: clean(b.url) };
    const errors = [];
    if (f.title.length < 2 || f.title.length > 200) errors.push("title");
    if (!ORGS.includes(f.org)) errors.push("org");
    if (!/^\d{4}(-\d{2}){0,2}$/.test(f.published) || f.published < "2000") errors.push("published");
    if (!CATS.includes(f.category)) errors.push("category");
    if (!/^https:\/\//.test(f.url) || f.url.length > 500) errors.push("url");
    if (errors.length) return json(res, 400, { ok: false, error: "invalid", fields: errors });

    const dup = await sql`select 1 from shelf_reports where url = ${f.url}`;
    if (dup.length) return json(res, 409, { ok: false, error: "duplicate" });

    const [row] = await sql`
      insert into shelf_reports (title, org, published, category_id, url)
      values (${f.title}, ${f.org}, ${f.published}, ${f.category}, ${f.url}) returning id`;
    return json(res, 201, { ok: true, id: row.id });
  } catch (e) {
    console.error("shelf", e.message);
    return json(res, 500, { ok: false, error: "server" });
  }
}
