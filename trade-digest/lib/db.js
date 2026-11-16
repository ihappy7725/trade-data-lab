// Neon 연결. 연결 주소는 Vercel 환경 변수 DATABASE_URL에만 둔다 (코드에 적지 않음).
import { neon } from "@neondatabase/serverless";
export const sql = neon(process.env.DATABASE_URL);

export function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(JSON.stringify(body));
}
