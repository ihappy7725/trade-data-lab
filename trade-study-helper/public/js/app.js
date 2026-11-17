// Muma 화면 동작
// - 처음: 가운데 점 지구본 (천천히 돎, 마우스로 돌리기)
// - 질문 링크를 누르면 하단 입력창이 나타남
// - 답이 나오면: 지구본이 2D 지도로 펼쳐지고, 답변이 위에 쌓이고, 답에 나온 나라가 빛남
// - 왼쪽 기록 사이드바: 지난 질문을 열고 닫기

// ---------- 공통 ----------
const 기록키 = "muma-history-v3";
const 나라_위치 = {
  // 학습용 대략 좌표 [경도, 위도] (위치 표시용, 정확한 국경 아님)
  "베트남": [106, 16], "태국": [101, 15], "스웨덴": [18, 62], "한국": [127.8, 36.5],
  "미국": [-98, 39], "중국": [104, 35], "일본": [138, 36], "독일": [10, 51],
  "싱가포르": [103.8, 1.35], "인도": [78, 21], "브라질": [-52, -10], "영국": [-2, 54],
};
const 라디안 = Math.PI / 180;
const 이즈 = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const 섞기 = (a, b, t) => a + (b - a) * t;

function 기록_읽기() {
  try { return JSON.parse(localStorage.getItem(기록키) || "[]"); } catch (_) { return []; }
}
function 기록_저장(목록) {
  try { localStorage.setItem(기록키, JSON.stringify(목록.slice(-30))); } catch (_) { /* 저장 실패는 무시 */ }
}

// 빛 방향 (왼쪽 위 앞쪽)
const 빛 = (() => {
  const v = [-0.5, 0.62, 0.6];
  const 길이 = Math.hypot(...v);
  return v.map((x) => x / 길이);
})();

// ---------- 지구 데이터 ----------
let 육지점 = [];   // 촘촘한 점 (1.2도 간격)
let 로고점 = [];   // 로고용 성긴 점
let 준비됨 = false;

async function 지도_준비하기() {
  const 세계 = await (await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-50m.json")).json();
  const 육지 = topojson.feature(세계, 세계.objects.land);
  const 간격 = 1.2;

  // 육지 모양을 그림판에 한 번 그리고, 점 위치의 색을 읽어 육지 여부를 판단 (빠름)
  const 폭 = 1440, 높이 = 720;
  const 그림 = document.createElement("canvas");
  그림.width = 폭;
  그림.height = 높이;
  const 그림판 = 그림.getContext("2d");
  const 투영 = d3.geoEquirectangular().scale(폭 / (2 * Math.PI)).translate([폭 / 2, 높이 / 2]);
  그림판.fillStyle = "#000";
  그림판.beginPath();
  d3.geoPath(투영, 그림판)(육지);
  그림판.fill();
  const 픽셀 = 그림판.getImageData(0, 0, 폭, 높이).data;

  const 후보 = [];
  for (let 위도 = -58; 위도 <= 82; 위도 += 간격) {
    for (let 경도 = -180; 경도 < 180; 경도 += 간격) {
      const x = Math.min(폭 - 1, Math.floor(((경도 + 180) / 360) * 폭));
      const y = Math.min(높이 - 1, Math.floor(((90 - 위도) / 180) * 높이));
      if (픽셀[(y * 폭 + x) * 4 + 3] > 127) 후보.push({ lon: 경도, lat: 위도, 빛: 0 });
    }
  }
  육지점 = 후보;
  로고점 = 후보.filter((p) => Math.round((p.lon + 180) / 간격) % 5 === 0 && Math.round((p.lat + 58) / 간격) % 5 === 0);
  준비됨 = true;
}

// ---------- 배경 지구 / 지도 ----------
const canvas = document.getElementById("globe");
const ctx = canvas.getContext("2d");
let 가로 = 0, 세로 = 0, 배율 = 1;
let 모드목표 = 1;      // 1 = 3D 지구본, 0 = 2D 지도
let 현재 = 1;
let 회전 = 0.6;
const 기울기 = 0.32;
let 끌기중 = false, 마지막_x = 0;

function 화면_맞추기() {
  배율 = Math.min(window.devicePixelRatio || 1, 2);
  가로 = window.innerWidth;
  세로 = window.innerHeight;
  canvas.width = 가로 * 배율;
  canvas.height = 세로 * 배율;
  ctx.setTransform(배율, 0, 0, 배율, 0, 0);
}

function 평면_위치(p) {
  const 지도폭 = Math.min(가로 * 0.94, 세로 * 1.9);
  const 지도높이 = 지도폭 / 2;
  return [가로 / 2 + (p.lon / 180) * (지도폭 / 2), 세로 / 2 - (p.lat / 90) * (지도높이 / 2)];
}

function 구면_위치(p, 반지름, 중심x, 중심y, 회전각, 기울) {
  const 경 = p.lon * 라디안 + 회전각;
  const 위 = p.lat * 라디안;
  let x = Math.cos(위) * Math.sin(경);
  let y = Math.sin(위);
  let z = Math.cos(위) * Math.cos(경);
  const c = Math.cos(기울), s = Math.sin(기울);
  const y2 = y * c - z * s;
  const z2 = y * s + z * c;
  y = y2; z = z2;
  return { sx: 중심x + 반지름 * x, sy: 중심y - 반지름 * y, x, y, z };
}

function 밝기(x, y, z) {
  return Math.max(0, x * 빛[0] + y * 빛[1] + z * 빛[2]);
}

function 지구_그리기(시각) {
  ctx.clearRect(0, 0, 가로, 세로);
  if (!준비됨) return;

  const e = 이즈(현재);
  const 반지름 = Math.min(가로, 세로) * 0.38;
  const 중심x = 가로 / 2, 중심y = 세로 / 2;

  // 지구 둘레의 은은한 빛 (테두리 선은 그리지 않음)
  if (e > 0.01) {
    const 대기 = ctx.createRadialGradient(중심x, 중심y, 반지름 * 0.96, 중심x, 중심y, 반지름 * 1.2);
    대기.addColorStop(0, `rgba(31, 111, 107, ${0.12 * e})`);
    대기.addColorStop(1, "rgba(31, 111, 107, 0)");
    ctx.fillStyle = 대기;
    ctx.beginPath();
    ctx.arc(중심x, 중심y, 반지름 * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of 육지점) {
    const [fx, fy] = 평면_위치(p);
    const g = 구면_위치(p, 반지름, 중심x, 중심y, 회전, 기울기);
    const x = 섞기(fx, g.sx, e);
    const y = 섞기(fy, g.sy, e);

    const 앞 = g.z > 0;
    const b = 밝기(g.x, g.y, g.z);
    const 평면_투명 = 0.28;
    const 지구_투명 = 앞 ? 0.18 + 0.82 * Math.pow(b * 0.85 + 0.15, 1.1) : 0.035;
    const 투명 = 섞기(평면_투명, 지구_투명, e);
    const 크기 = 섞기(1.25, 0.8 + 1.2 * Math.max(g.z, 0) + 0.4, e);

    if (p.빛 > 0.01 && (e < 0.5 || 앞)) {
      const 맥박 = 0.75 + 0.25 * Math.sin(시각 / 420 + p.lon * 0.07);
      ctx.fillStyle = `rgba(31, 111, 107, ${0.22 * 맥박 * (앞 ? 1 : 0.3)})`;
      ctx.beginPath();
      ctx.arc(x, y, 크기 * 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(31, 111, 107, ${Math.min(1, 0.7 + 0.3 * 맥박)})`;
    } else {
      const 색 = Math.round(섞기(200, 23, 앞 ? b : 0.2));
      ctx.fillStyle = `rgba(${색}, ${색}, ${Math.round(색 * 1.02)}, ${투명})`;
    }
    ctx.fillRect(x - 크기 / 2, y - 크기 / 2, 크기, 크기);
  }
}

function 빛_정하기(나라_이름들) {
  const 나라들 = 나라_이름들.map((이름) => 나라_위치[이름]).filter(Boolean);
  for (const p of 육지점) {
    let 최고 = 0;
    for (const [경, 위] of 나라들) {
      const 거리 = Math.hypot(p.lon - 경, p.lat - 위);
      if (거리 < 7) 최고 = Math.max(최고, 1 - 거리 / 7);
    }
    p.빛 = 최고;
  }
}

function 지구_모양_바꾸기(목표) { 모드목표 = 목표; }

// ---------- 로고: 작은 점 지구본 (글자 Muma 와 한 세트) ----------
const 로고캔버스 = document.getElementById("logo-canvas");
const 로고ctx = 로고캔버스.getContext("2d");
let 로고_마우스 = false;
let 로고_회전 = 0;

function 로고_그리기() {
  const 크기 = 60;   // 내부 해상도 (화면에는 30px 로 보임)
  로고ctx.clearRect(0, 0, 크기, 크기);
  로고_회전 += 로고_마우스 ? 0.05 : 0.012;
  const 중심 = 크기 / 2;
  const 반지름 = 20;
  // 얇은 기울어진 축선 (지구본 느낌을 살림)
  로고ctx.strokeStyle = "rgba(31, 111, 107, 0.35)";
  로고ctx.lineWidth = 1.2;
  로고ctx.beginPath();
  로고ctx.ellipse(중심, 중심, 반지름 * 1.18, 반지름 * 0.36, -0.35, 0, Math.PI * 2);
  로고ctx.stroke();
  if (!준비됨) return;
  for (const p of 로고점) {
    const g = 구면_위치(p, 반지름, 중심, 중심, 로고_회전, 기울기);
    if (g.z <= 0) continue;
    const b = 밝기(g.x, g.y, g.z);
    로고ctx.fillStyle = (p.빛 > 0.01)
      ? "rgba(31, 111, 107, 1)"
      : `rgba(23, 23, 26, ${0.25 + 0.75 * b})`;
    로고ctx.beginPath();
    로고ctx.arc(g.sx, g.sy, 1.5 + 1.2 * b, 0, Math.PI * 2);
    로고ctx.fill();
  }
}

로고캔버스.parentElement.addEventListener("pointerenter", () => { 로고_마우스 = true; });
로고캔버스.parentElement.addEventListener("pointerleave", () => { 로고_마우스 = false; });

// ---------- 애니메이션 ----------
function 애니메이션(시각) {
  현재 += (모드목표 - 현재) * 0.075;
  if (Math.abs(모드목표 - 현재) < 0.001) 현재 = 모드목표;
  if (!끌기중 && 현재 > 0.9) 회전 += 0.0011;
  지구_그리기(시각);
  로고_그리기();
  requestAnimationFrame(애니메이션);
}

canvas.addEventListener("pointerdown", (e) => { 끌기중 = true; 마지막_x = e.clientX; });
window.addEventListener("pointermove", (e) => {
  if (!끌기중) return;
  회전 += (e.clientX - 마지막_x) * 0.005;
  마지막_x = e.clientX;
});
window.addEventListener("pointerup", () => { 끌기중 = false; });
window.addEventListener("resize", 화면_맞추기);

// ---------- 화면 요소 ----------
const 대화영역 = document.getElementById("thread");
const 메시지들 = document.getElementById("messages");
const 입력폼 = document.getElementById("composer");
const 입력창 = document.getElementById("question");
const 보내기 = document.getElementById("send");
const 상태줄 = document.getElementById("status");
const 사이드바 = document.getElementById("sidebar");
const 메뉴버튼 = document.getElementById("menu");
const 기록목록 = document.getElementById("history-list");

function 처음으로() {
  // 새 대화: 메시지를 지우고 지구본 상태로, 입력창은 다시 가운데로
  document.body.classList.remove("chatting");
  메시지들.innerHTML = "";
  상태줄.textContent = "";
  지구_모양_바꾸기(1);
  빛_정하기([]);
  입력창.focus();
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { 사이드바_닫기(); }
});

function 사이드바_열기(열기) {
  사이드바.classList.toggle("is-open", 열기);
  메뉴버튼.setAttribute("aria-expanded", String(열기));
  if (열기) 기록_그리기();
}
function 사이드바_닫기() { 사이드바_열기(false); }
메뉴버튼.addEventListener("click", () => 사이드바_열기(!사이드바.classList.contains("is-open")));
document.getElementById("side-close").addEventListener("click", 사이드바_닫기);
// 사이드바 바깥(화면 본문)을 누르면 닫힘
document.addEventListener("pointerdown", (e) => {
  if (!사이드바.classList.contains("is-open")) return;
  if (사이드바.contains(e.target) || 메뉴버튼.contains(e.target)) return;
  사이드바_닫기();
});

function 말풍선_넣기(종류, 글, 옵션 = {}) {
  const 묶음 = document.createElement("div");
  묶음.className = `msg-${종류}`;
  if (종류 === "user") {
    const 풍선 = document.createElement("div");
    풍선.className = "bubble";
    풍선.textContent = 글;
    묶음.appendChild(풍선);
  } else {
    const 본문 = document.createElement("div");
    본문.className = "text";
    본문.textContent = 글;
    묶음.appendChild(본문);
    if (옵션.sources) {
      const 출처 = document.createElement("p");
      출처.className = "sources";
      출처.textContent = 옵션.sources.length ? "출처: " + 옵션.sources.join(", ") : "출처 없음";
      묶음.appendChild(출처);
    }
    if (옵션.trace) {
      const 자세히 = document.createElement("details");
      const 요약 = document.createElement("summary");
      요약.textContent = "검색 과정 보기";
      const 내용 = document.createElement("pre");
      내용.textContent = 옵션.trace;
      자세히.append(요약, 내용);
      묶음.appendChild(자세히);
    }
  }
  메시지들.appendChild(묶음);
  대화영역.scrollTop = 대화영역.scrollHeight;
  return 묶음;
}

function 과정_글(결과) {
  const 줄 = [`다시 찾은 횟수: ${결과.rewrites ?? 0}번`];
  (결과.hits || []).forEach((h, i) => 줄.push(`${i + 1}. ${h.source} (점수 ${h.score})`));
  return 줄.join("\n");
}

function 나라_찾기(글) {
  return Object.keys(나라_위치).filter((이름) => 글.includes(이름));
}

function 한_번_보여주기(항목) {
  document.body.classList.add("chatting");
  메시지들.innerHTML = "";
  말풍선_넣기("user", 항목.질문);
  말풍선_넣기("bot", 항목.답, { sources: 항목.출처, trace: 항목.과정 });
  빛_정하기(나라_찾기(항목.질문 + " " + 항목.답));
  지구_모양_바꾸기(0);      // 지구본 → 2D 지도
}

async function 질문_보내기(질문) {
  document.body.classList.add("chatting");   // 입력창을 아래로 내림
  보내기.disabled = true;
  상태줄.classList.remove("is-error");
  상태줄.textContent = "";
  말풍선_넣기("user", 질문);
  const 생각중 = document.createElement("p");
  생각중.className = "thinking";
  생각중.textContent = "노트를 찾아보는 중…";
  메시지들.appendChild(생각중);
  대화영역.scrollTop = 대화영역.scrollHeight;

  try {
    const 응답 = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: 질문 }),
    });
    const 자료 = await 응답.json().catch(() => ({}));
    생각중.remove();

    if (!응답.ok) {
      말풍선_넣기("bot", 자료.error || "답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.").classList.add("msg-error");
      return;
    }

    const 항목 = { id: Date.now(), 질문, 답: 자료.answer, 출처: 자료.sources, 과정: 과정_글(자료) };
    말풍선_넣기("bot", 항목.답, { sources: 항목.출처, trace: 항목.과정 });
    빛_정하기(나라_찾기(질문 + " " + 항목.답));
    지구_모양_바꾸기(0);     // 답과 동시에 지도로 펼침

    const 기록 = 기록_읽기();
    기록.push(항목);
    기록_저장(기록);
  } catch (_) {
    생각중.remove();
    상태줄.classList.add("is-error");
    상태줄.textContent = "서버에 연결하지 못했어요. 서버가 켜져 있는지 확인해 주세요.";
    지구_모양_바꾸기(1);
  } finally {
    보내기.disabled = false;
  }
}

입력폼.addEventListener("submit", (e) => {
  e.preventDefault();
  const 질문 = 입력창.value.trim();
  if (!질문) return;
  입력창.value = "";
  질문_보내기(질문);
});

document.getElementById("new-chat").addEventListener("click", () => {
  처음으로();
  사이드바_닫기();
});

// ---------- 기록 사이드바 ----------
function 기록_그리기() {
  기록목록.innerHTML = "";
  const 목록 = 기록_읽기().slice().reverse();
  if (!목록.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "아직 질문이 없어요";
    기록목록.appendChild(li);
    return;
  }
  목록.forEach((항목) => {
    const li = document.createElement("li");
    const 버튼 = document.createElement("button");
    버튼.type = "button";
    버튼.textContent = 항목.질문;
    버튼.title = 항목.질문;
    버튼.addEventListener("click", () => {
      한_번_보여주기(항목);
      사이드바_닫기();
    });
    li.appendChild(버튼);
    기록목록.appendChild(li);
  });
}

// ---------- 시작 ----------
화면_맞추기();
requestAnimationFrame(애니메이션);
지도_준비하기().catch(() => {
  상태줄.classList.add("is-error");
  상태줄.textContent = "배경 지구를 불러오지 못했어요. 인터넷을 확인해 주세요. (질문 기능은 동작해요)";
});
입력창.focus();
