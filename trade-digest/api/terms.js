// 용어 검색 — 공식 사전 두 곳에서 바로 찾아온다
// - 한국은행 ECOS 통계용어사전 (Open API, 키: 환경 변수 ECOS_API_KEY, 없으면 공개 sample 키로 최대 10건)
// - WTO Glossary (WTO 누리집이 공개한 glossary.json, 키 없음)
// 받은 검색어는 저장하지 않는다. 결과는 원문 그대로 보여 주고 출처 링크를 붙인다.

const WTO_JSON = "https://www.wto.org/library/glossary/glossary.json";
let wtoCache = null, wtoAt = 0;

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", status === 200 ? "public, s-maxage=86400, stale-while-revalidate=604800" : "no-store");
  res.send(JSON.stringify(body));
}

async function getWto() {
  if (wtoCache && Date.now() - wtoAt < 864e5) return wtoCache;
  const r = await fetch(WTO_JSON, { headers: { "User-Agent": "Mozilla/5.0 (TradeDigest glossary)" } });
  if (!r.ok) throw new Error("wto " + r.status);
  const txt = (await r.text()).replace(/^﻿/, "");
  wtoCache = JSON.parse(txt).filter((x) => x.Published !== "NO" && x.EnglishWord);
  wtoAt = Date.now();
  return wtoCache;
}

const slug = (w) => w.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

async function searchWto(q) {
  const list = await getWto();
  const k = q.toLowerCase();
  const hits = list.filter((x) => x.EnglishWord.toLowerCase().includes(k) || (k.length >= 4 && x.EnglishDefinition.toLowerCase().includes(k)));
  hits.sort((a, b) => (a.EnglishWord.toLowerCase().includes(k) ? 0 : 1) - (b.EnglishWord.toLowerCase().includes(k) ? 0 : 1) || a.EnglishWord.length - b.EnglishWord.length);
  return hits.slice(0, 8).map((x) => ({
    word: x.EnglishWord,
    def: x.EnglishDefinition.replace(/<[^>]+>/g, "").trim(),
    url: `https://www.wto.org/english/thewto_e/glossary_e/${slug(x.EnglishWord)}_e.htm`,
  }));
}

async function searchBok(q) {
  const key = process.env.ECOS_API_KEY || "sample";
  const r = await fetch(`https://ecos.bok.or.kr/api/StatisticWord/${encodeURIComponent(key)}/json/kr/1/10/${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error("ecos " + r.status);
  const j = await r.json();
  const rows = (j.StatisticWord && j.StatisticWord.row) || [];
  return rows.slice(0, 8).map((x) => ({ word: x.WORD, def: String(x.CONTENT || "").trim() }));
}

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { ok: false, error: "method" });
  const q = String((req.query && req.query.q) || "").trim();
  if (q.length < 2 || q.length > 40) return json(res, 400, { ok: false, error: "invalid", fields: ["q"] });
  const alt = String((req.query && req.query.alt) || "").trim().slice(0, 40);   // 한글 검색어의 영문 이름 (WTO용)
  const wtoQ = /[a-z]/i.test(q) ? q : (alt.length >= 2 ? alt : q);
  const [bok, wto] = await Promise.allSettled([searchBok(q), searchWto(wtoQ)]);
  return json(res, 200, {
    ok: true,
    bok: bok.status === "fulfilled" ? bok.value : null,   // null = 그 사전에 연결하지 못함
    wto: wto.status === "fulfilled" ? wto.value : null,
  });
}
