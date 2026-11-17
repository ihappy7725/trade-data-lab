// 내 PDF 바로 요약 — 브라우저가 보낸 "쪽별 글자"를 OpenAI로 요약한다.
// - API 키는 Vercel 환경 변수 OPENAI_API_KEY에만 둔다. (모델은 OPENAI_MODEL, 기본 gpt-4o-mini)
// - 받은 글자와 요약은 저장하지 않고, 기록(log)에도 남기지 않는다.
// 순서: ① 방식 확인 ② 내용 읽기 ③ 검사(쪽 수·글자 수 상한) ④ OpenAI 호출 ⑤ 200 응답 ⑥ 실패 시 400 / 413 / 502 / 500

const MAX_PAGES = 160;
const MAX_CHARS = 60000;   // 브라우저가 쪽마다 잘라 이 안에 맞춰 보낸다

const SYSTEM = `너는 국제기구·무역기관 보고서를 쉬운 한국어로 요약하는 도우미다.
반드시 아래 JSON 형식으로만 답한다.
{"title":"보고서 제목(원문에서 보이면, 없으면 빈 문자열)","gist":"한두 문장 요지","items":[{"role":"claim|evidence|limit","ko":"쉬운 한국어 한 문장","page":"쪽 번호(입력의 p 값 그대로)","quote":"그 쪽 글자에 실제로 있는 구절을 한 글자도 바꾸지 않고 6~25단어"}]}
규칙:
- claim(주장) 2~4개, evidence(근거: 숫자·사실) 2~5개, limit(한계: 가정·위험·불확실성) 2~4개.
- 보고서 주장은 "보고서는 ~라고 본다"처럼 쓰고, 단정하지 않는다.
- 숫자는 원문에 있는 값만 쓰고, 단위와 연도를 붙인다.
- quote는 반드시 해당 page의 글자에서 그대로 복사한다. 찾지 못하면 그 항목을 넣지 않는다.
- quote는 문장 중간에서 끝나도 되며, 원문에 없는 마침표나 따옴표를 붙이지 않는다.`;

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(JSON.stringify(body));
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "method" });
    if (!process.env.OPENAI_API_KEY) return json(res, 500, { ok: false, error: "no_key" });

    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const pages = Array.isArray(b.pages) ? b.pages : null;
    if (!pages || !pages.length) return json(res, 400, { ok: false, error: "invalid", fields: ["pages"] });
    if (pages.length > MAX_PAGES) return json(res, 413, { ok: false, error: "too_many_pages", max: MAX_PAGES });

    let total = 0;
    const clean = [];
    for (const p of pages) {
      const label = String(p && p.p != null ? p.p : "").slice(0, 10);
      const text = String((p && p.text) || "").slice(0, 8000);
      if (!label) return json(res, 400, { ok: false, error: "invalid", fields: ["p"] });
      total += text.length;
      clean.push({ p: label, text });
    }
    if (total < 200) return json(res, 400, { ok: false, error: "no_text" });          // 스캔본 등 글자 없는 PDF
    if (total > MAX_CHARS) return json(res, 413, { ok: false, error: "too_long", max: MAX_CHARS });

    const body = clean.map((x) => `[p=${x.p}]\n${x.text}`).join("\n\n");
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: body }],
      }),
    });
    if (!r.ok) return json(res, 502, { ok: false, error: "upstream", status: r.status });
    const data = await r.json();
    let out;
    try { out = JSON.parse(data.choices[0].message.content); } catch { return json(res, 502, { ok: false, error: "bad_output" }); }

    const items = (Array.isArray(out.items) ? out.items : [])
      .filter((i) => ["claim", "evidence", "limit"].includes(i.role) && i.ko && i.page != null)
      .slice(0, 14)
      .map((i) => ({ role: i.role, ko: String(i.ko).slice(0, 300), page: String(i.page).slice(0, 10), quote: String(i.quote || "").slice(0, 400) }));
    return json(res, 200, { ok: true, title: String(out.title || "").slice(0, 200), gist: String(out.gist || "").slice(0, 400), items });
  } catch (e) {
    console.error("summarize failed");          // 글자 내용은 남기지 않는다
    return json(res, 500, { ok: false, error: "server" });
  }
}
