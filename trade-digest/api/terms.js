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

// 비슷한 말 · 초성 → 공식 사전에 있을 법한 용어 이름만 AI로 추려 다시 찾는다 (풀이는 언제나 공식 사전 원문)
async function expand(q) {
  if (!process.env.OPENAI_API_KEY) return { ko: [], en: [] };
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", signal: ctl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: '사용자가 경제 · 무역 용어를 찾는다. 입력은 오타, 초성(예: ㄱㅅㅅㅈ=경상수지), 줄임말, 비슷한 뜻의 말일 수 있다. 한국은행 경제 · 통계 용어사전에 있을 법한 한국어 표준 용어 이름 최대 5개(ko)와 WTO 영문 용어집에서 찾을 영어 핵심어 최대 3개(en)를 고른다. 설명은 쓰지 않는다. {"ko":[...],"en":[...]} JSON만 답한다.' },
          { role: "user", content: q },
        ],
      }),
    });
    if (!r.ok) return { ko: [], en: [] };
    const j = JSON.parse((await r.json()).choices[0].message.content);
    const pick = (a, n) => (Array.isArray(a) ? a : []).map((x) => String(x).trim().slice(0, 30)).filter((x) => x.length >= 2 && x !== q).slice(0, n);
    return { ko: pick(j.ko, 5), en: pick(j.en, 3) };
  } catch { return { ko: [], en: [] }; } finally { clearTimeout(tm); }
}
const uniq = (rows, k) => { const seen = new Set(); return rows.filter((x) => !seen.has(x[k]) && seen.add(x[k])); };

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { ok: false, error: "method" });
  const q = String((req.query && req.query.q) || "").trim();
  if (q.length < 2 || q.length > 40) return json(res, 400, { ok: false, error: "invalid", fields: ["q"] });
  const alt = String((req.query && req.query.alt) || "").trim().slice(0, 40);   // 한글 검색어의 영문 이름 (WTO용)
  const wtoQ = /[a-z]/i.test(q) ? q : (alt.length >= 2 ? alt : q);
  const [bok, wto] = await Promise.allSettled([searchBok(q), searchWto(wtoQ)]);
  let B = bok.status === "fulfilled" ? bok.value : null;   // null = 그 사전에 연결하지 못함
  let W = wto.status === "fulfilled" ? wto.value : null;
  let via = null;
  const jamo = /^[ㄱ-ㅎ\s]+$/.test(q);
  if (jamo || ((B && B.length === 0) || (W && W.length === 0))) {
    const ex = await expand(q);
    if (ex.ko.length || ex.en.length) {
      via = { ko: ex.ko, en: ex.en };
      if (B && B.length === 0 && ex.ko.length) {
        const more = await Promise.allSettled(ex.ko.map(searchBok));
        B = uniq(more.flatMap((m) => (m.status === "fulfilled" ? m.value : [])), "word").slice(0, 8).map((x) => ({ ...x, guess: true }));
      }
      if (W && W.length === 0 && ex.en.length) {
        const more = await Promise.allSettled(ex.en.map(searchWto));
        W = uniq(more.flatMap((m) => (m.status === "fulfilled" ? m.value : [])), "word").slice(0, 8).map((x) => ({ ...x, guess: true }));
      }
    }
  }
  return json(res, 200, { ok: true, bok: B, wto: W, via });
}
