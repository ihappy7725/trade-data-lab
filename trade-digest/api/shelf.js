// 공용 서가 — GET: 방문자가 추가한 보고서(숨김 제외) · POST: 보고서 추가 · POST ?action=flag: 신고
// 분탕 막기: ① 공식 기관 주소만 ② 제목 걸러내기 ③ 링크가 실제로 열리는지 ④ 하루 횟수 제한 ⑤ 신고 3건이면 자동 숨김
// 쌓지 않는 것: 이름 · 이메일 · IP. 브라우저 익명 번호(key)만 쓴다.
import { sql, json } from "../lib/db.js";

const ORGS = ["WTO", "IMF", "OECD", "World Bank", "UNCTAD", "KIEP", "KITA", "KOTRA", "기타"];
const CATS = ["outlook", "policy", "supply", "digital", "energy", "korea"];
const KEY = /^[0-9a-f-]{36}$/;
const clean = (v) => (typeof v === "string" ? v.trim() : "");

// ① 공식 기관 · 정부 · 국제기구 주소만 받는다
const DOMAINS = [
  "wto.org", "imf.org", "oecd.org", "oecd-ilibrary.org", "worldbank.org", "unctad.org", "un.org", "kiep.re.kr", "kita.net", "kita.or.kr",
  "kotra.or.kr", "bok.or.kr", "kdi.re.kr", "kiet.re.kr", "bis.org", "adb.org", "iea.org", "ecb.europa.eu", "europa.eu", "wcoomd.org",
  "itc.org", "intracen.org", "apec.org", "aseanstats.org", "asean.org", "uncomtrade.org", "imf-elibrary.org",
];
const SUFFIXES = [".go.kr", ".re.kr", ".gov", ".gov.uk", ".int", ".gc.ca", ".gov.au", ".go.jp"];
function officialHost(u) {
  let host;
  try { host = new URL(u).hostname.toLowerCase(); } catch { return false; }
  return DOMAINS.some((d) => host === d || host.endsWith("." + d)) || SUFFIXES.some((s) => host.endsWith(s));
}

// ② 광고 · 욕설 · 장난 제목 걸러내기
const BAD = /(카지노|토토|바카라|슬롯|도박|베팅|성인|야동|19금|대출|코인\s*리딩|리딩방|텔레그램|카톡|오픈채팅|홍보|광고|무료\s*상담|씨발|시발|ㅅㅂ|병신|ㅂㅅ|좆|개새|fuck|shit|porn|casino|viagra|loan|crypto\s*signal)/i;
function badTitle(t) {
  if (BAD.test(t)) return true;
  if (/https?:\/\/|www\.|\.com\b|\.kr\b/i.test(t)) return true;          // 제목에 링크
  if (/(.)\1{5,}/.test(t)) return true;                                    // ㅋㅋㅋㅋㅋㅋ, !!!!!!
  const letters = (t.match(/[\p{L}\p{N}]/gu) || []).length;
  return letters < t.length * 0.5;                                          // 기호 투성이
}

// 제목을 한국어 · 영어 둘 다 갖추기 (영문 화면에서도 읽히게). 실패하면 원래 제목만 쓴다
async function bothTitles(t) {
  const isKo = /[가-힣]/.test(t);
  if (!process.env.OPENAI_API_KEY) return { ko: isKo ? t : null, en: isKo ? null : t };
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", signal: ctl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0,
        messages: [{ role: "system", content: `Translate this report title into ${isKo ? "English" : "Korean"}. Keep codes like [TF 25호] as natural equivalents. Reply with the title only.` }, { role: "user", content: t }] }),
    });
    const out = r.ok ? String((await r.json()).choices[0].message.content || "").trim().replace(/^["“]|["”]$/g, "").slice(0, 200) : "";
    return isKo ? { ko: t, en: out || null } : { ko: out || null, en: t };
  } catch { return { ko: isKo ? t : null, en: isKo ? null : t }; } finally { clearTimeout(tm); }
}

// ③ 링크가 정말 열리는지 (공식 사이트가 프로그램 접근을 막는 401 · 403 · 429는 통과)
async function linkOpens(u) {
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 7000);
  try {
    const r = await fetch(u, { method: "GET", redirect: "follow", signal: ctl.signal, headers: { "User-Agent": "Mozilla/5.0 (TradeDigest link check)", Range: "bytes=0-1023" } });
    if ([401, 403, 429].includes(r.status)) return true;
    if (r.status >= 400) return false;
    if (/(^|[\/_.-])(404|not[-_]?found|error)([\/_.-]|$)/i.test(new URL(r.url).pathname)) return false;   // 오류 페이지로 넘긴 경우
    const head = (await r.text()).slice(0, 4000);
    return !/<title>[^<]*(404|not found|page not found|찾을 수 없)[^<]*<\/title>/i.test(head);
  } catch { return false; } finally { clearTimeout(tm); }
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const rows = await sql`
        select id, title, title_ko, title_en, org, published, category_id, url, status
        from shelf_reports where status <> '숨김' order by created_at desc limit 200`;
      return json(res, 200, { ok: true, reports: rows });
    }
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "method" });
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const key = clean(b.key);
    if (!KEY.test(key)) return json(res, 400, { ok: false, error: "invalid", fields: ["key"] });

    // ⑤ 신고: 서로 다른 브라우저 3곳이 신고하면 숨김
    if (req.query && req.query.action === "flag") {
      const id = Number(b.id);
      if (!Number.isInteger(id) || id < 1) return json(res, 400, { ok: false, error: "invalid", fields: ["id"] });
      await sql`insert into shelf_flags (report_id, flagged_by) select ${id}, ${key} where exists (select 1 from shelf_reports where id = ${id}) on conflict do nothing`;
      const [{ n }] = await sql`select count(*)::int as n from shelf_flags where report_id = ${id}`;
      if (n >= 3) await sql`update shelf_reports set status = '숨김' where id = ${id}`;
      return json(res, 200, { ok: true, hidden: n >= 3 });
    }

    const f = { title: clean(b.title).replace(/\s+/g, " "), org: clean(b.org), published: clean(b.published), category: clean(b.category), url: clean(b.url) };
    const errors = [];
    if (f.title.length < 4 || f.title.length > 200) errors.push("title");
    if (!ORGS.includes(f.org)) errors.push("org");
    if (!/^\d{4}(-\d{2}){0,2}$/.test(f.published) || f.published < "2000" || f.published.slice(0, 4) > String(new Date().getFullYear() + 1)) errors.push("published");
    if (!CATS.includes(f.category)) errors.push("category");
    if (!/^https:\/\//.test(f.url) || f.url.length > 500) errors.push("url");
    if (errors.length) return json(res, 400, { ok: false, error: "invalid", fields: errors });
    if (badTitle(f.title)) return json(res, 422, { ok: false, error: "blocked_title" });
    if (!officialHost(f.url)) return json(res, 422, { ok: false, error: "not_official" });

    // ④ 하루 횟수 제한: 브라우저당 5건, 전체 20건
    const [{ mine }] = await sql`select count(*)::int as mine from shelf_reports where added_by = ${key} and created_at > now() - interval '1 day'`;
    if (mine >= 5) return json(res, 429, { ok: false, error: "too_many" });
    const [{ all }] = await sql`select count(*)::int as "all" from shelf_reports where created_at > now() - interval '1 day'`;
    if (all >= 20) return json(res, 429, { ok: false, error: "too_many_all" });

    const dup = await sql`select 1 from shelf_reports where url = ${f.url}`;
    if (dup.length) return json(res, 409, { ok: false, error: "duplicate" });
    if (!(await linkOpens(f.url))) return json(res, 422, { ok: false, error: "dead_link" });

    const tt = await bothTitles(f.title);
    const [row] = await sql`
      insert into shelf_reports (title, title_ko, title_en, org, published, category_id, url, added_by)
      values (${f.title}, ${tt.ko}, ${tt.en}, ${f.org}, ${f.published}, ${f.category}, ${f.url}, ${key}) returning id`;
    return json(res, 201, { ok: true, id: row.id });
  } catch (e) {
    console.error("shelf", e.message);
    return json(res, 500, { ok: false, error: "server" });
  }
}
