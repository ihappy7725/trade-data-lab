// 보고서 요청 — GET: 목록, POST: 새 요청
// POST 순서: ① 방식 확인 ② 내용 읽기 ③ 검사 ④ 저장 ⑤ 201 응답 ⑥ 실패 시 400 / 500
import { sql, json } from "../lib/db.js";

const ORGS = ["WTO", "IMF", "OECD", "World Bank", "KITA", "KOTRA", "기타"];
const PURPOSES = ["과제", "스터디", "업무", "기타"];
const clean = (v) => (typeof v === "string" ? v.trim() : "");

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const rows = await sql`
        select r.id, r.title, r.org, r.url, r.reason, r.purpose, r.status, r.created_at,
               count(v.id)::int as votes
        from requests r left join votes v on v.request_id = r.id
        group by r.id order by votes desc, r.created_at desc limit 50`;
      return json(res, 200, { ok: true, requests: rows });
    }
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "method" });

    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const title = clean(b.title), org = clean(b.org), url = clean(b.url), reason = clean(b.reason), purpose = clean(b.purpose);
    const errors = [];
    if (title.length < 2 || title.length > 200) errors.push("title");
    if (!ORGS.includes(org)) errors.push("org");
    if (url && (!/^https:\/\//.test(url) || url.length > 500)) errors.push("url");
    if (reason.length > 200) errors.push("reason");
    if (!PURPOSES.includes(purpose)) errors.push("purpose");
    if (errors.length) return json(res, 400, { ok: false, error: "invalid", fields: errors });

    const [row] = await sql`
      insert into requests (title, org, url, reason, purpose)
      values (${title}, ${org}, ${url || null}, ${reason || null}, ${purpose})
      returning id, created_at`;
    return json(res, 201, { ok: true, id: row.id });
  } catch (e) {
    console.error("requests", e.message);
    return json(res, 500, { ok: false, error: "server" });
  }
}
