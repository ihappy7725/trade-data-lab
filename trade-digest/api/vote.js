// 같은 보고서를 나도 원해요 (+1). 누가 눌렀는지는 저장하지 않는다.
import { sql, json } from "../lib/db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "method" });
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const id = Number(b.id);
    if (!Number.isInteger(id) || id < 1) return json(res, 400, { ok: false, error: "invalid" });
    const found = await sql`select 1 from requests where id = ${id}`;
    if (!found.length) return json(res, 404, { ok: false, error: "not_found" });
    await sql`insert into votes (request_id) values (${id})`;
    const [{ votes }] = await sql`select count(*)::int as votes from votes where request_id = ${id}`;
    return json(res, 201, { ok: true, votes });
  } catch (e) {
    console.error("vote", e.message);
    return json(res, 500, { ok: false, error: "server" });
  }
}
