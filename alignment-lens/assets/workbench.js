'use strict';
(()=>{
const C=TradeCompare,$=s=>document.querySelector(s),E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let lang='ko',catalog,imported=null,current=null,memo='',revision=false,manualTheme=false,loadError=false,importSeq=0;
const state={origin:'',destination:'',year:'',left:'',right:''};
const L=(ko,en)=>lang==='ko'?ko:en;
const country=x=>{const c=catalog.countries.find(c=>c.iso3===x);return c?c[lang==='ko'?'name_ko':'name_en']:x;};
const num=x=>{if(x===null)return L('기록 없음','No record');const [i,f]=String(x).split('.');return BigInt(i).toLocaleString(lang==='ko'?'ko-KR':'en-US')+(f?'.'+f:'');};
const readable=x=>x===null?L('기록 없음','No record'):new Intl.NumberFormat(lang==='ko'?'ko-KR':'en-US',{maximumFractionDigits:2,minimumFractionDigits:2}).format(Number(x)/1e9);
const options=(values,selected,placeholder)=>`<option value="">${placeholder}</option>`+values.map(([v,label])=>`<option value="${E(v)}" ${String(v)===String(selected)?'selected':''}>${E(label)}</option>`).join('');
const records=()=>catalog.records.filter(r=>r.origin===state.origin&&r.destination===state.destination&&String(r.year)===state.year);
const label=r=>`${r.publisher} · ${country(r.reporter)} ${r.flow==='X'?L('수출','exports'):L('수입','imports')} · ${r.valuation||L('기준 미확인','basis unknown')}`;
const ref=r=>`<a target="_blank" rel="noopener noreferrer" href="${E(r.source_url)}">${E(r.publisher)}</a> · ${r.year} · ${E(r.commodity)} · ${E(r.edition)}<br>${L('조회일','Retrieved')} ${E(r.retrieved_on)} · ${E(r.currency)} / ${L('단위','unit')} ${E(r.unit)}`;
const descriptions={direction:['교역 방향','Trade direction'],period:['기간·빈도','Period and frequency'],commodity:['품목 범위','Commodity scope'],currency:['통화','Currency'],unit:['금액 단위','Amount unit'],classification:['품목분류 판','Classification edition'],valuation:['가격 기준','Valuation'],vintage:['조회 시점','Retrieval date'],release:['자료 발표·개정일','Data release/revision date'],partner_basis:['상대국 지정 기준','Partner attribution'],trade_system:['무역 집계 체계','Trade system'],original_classification:['원분류 여부','Original classification']};
const show=x=>x===null?L('미확인','Unknown'):typeof x==='boolean'?(x?L('예','Yes'):L('아니오','No')):String(x);
function chrome(){
 document.documentElement.lang=lang;
 const texts={navNew:L('새 대조','New comparison'),navAbout:L('존재 이유','Why it exists'),navMethod:L('방법','Method'),navSources:L('출처','Sources'),footer:L('출처와 비교 조건을 남기는 무역 데이터 점검 도구.','Compare trade records with sources and conditions preserved.')};
 document.querySelectorAll('[data-i18n]').forEach(n=>n.textContent=texts[n.dataset.i18n]);
 $('#language').textContent=L('EN','한');$('#language').setAttribute('aria-label',L('Switch to English','한국어로 전환'));
 $('#theme').setAttribute('aria-label',document.documentElement.dataset.theme==='dark'?L('밝은 화면으로 전환','Switch to light theme'):L('어두운 화면으로 전환','Switch to dark theme'));
 $('.skip').textContent=L('본문으로','Skip to content');$('#note-file').setAttribute('aria-label',L('근거 노트 JSON 파일','Evidence note JSON file'));$('header nav').setAttribute('aria-label',L('주 메뉴','Main navigation'));
 document.title='CrossCite · '+L('무역 숫자 대조·근거 기록','Trade comparison and evidence notes');
}
const exampleHash = '#compare?from=KOR&to=USA&year=2023&a=un-KOR-USA-2023-X&b=un-USA-KOR-2023-M';
const recordName = r => r.flow === 'X'
 ? L(country(r.reporter)+'의 수출 기록', country(r.reporter)+' export record')
 : L(country(r.reporter)+'의 수입 기록', country(r.reporter)+' import record');

function conditionSummary(audit){
 const items = status => audit.checks.filter(c => c.status === status);
 const basis = {FOB:L('FOB는 수출 쪽에서 가격을 매기는 기준입니다. 수입항까지의 국제 운임과 보험료는 포함하지 않습니다.','FOB values goods at export and excludes international freight and insurance to the importing port.'), CIF:L('CIF는 수입항까지의 운임과 보험료를 포함합니다.','CIF includes freight and insurance to the port of import.')};
 const price = audit.checks.find(c => c.key === 'valuation');
 const guidance = price.status === 'different'
  ? [...new Set([price.a,price.b])].map(key => Object.hasOwn(basis,key) ? basis[key] : '').filter(Boolean).join(' ')
  : '';
 return `<section class="condition-summary"><h3>${L('인용 전에 확인할 조건','Conditions to check before citing')}</h3>
 <dl><dt>${L('차이 있음','Different')}</dt><dd>${items('different').map(c=>E(L(...descriptions[c.key]))+': '+E(show(c.a))+' / '+E(show(c.b))).join(' · ')||L('확인된 차이 없음','No differences found')}</dd>
 <dt>${L('확인 불가','Unknown')}</dt><dd>${items('unknown').map(c=>E(L(...descriptions[c.key]))).join(' · ')||L('없음','None')}</dd></dl>
 ${guidance ? `<p>${guidance}</p>` : ''}
 ${items('unknown').length ? `<p>${L('인용에 필요한 미확인 조건은 출처에서 추가로 확인하세요.','Check the original sources for any missing conditions relevant to your citation.')}</p>` : ''}</section>`;
}

function citation(audit){
 const {a,b,gap} = audit;
 const unit = r => r.currency + (r.unit === '1' ? '' : ' × '+r.unit);
 const scope = r => r.commodity === 'TOTAL' ? L('상품 전체','all goods') : r.commodity;
 const records = [a,b].map((r,i) => L(
  `${'AB'[i]}. ${r.year}년 ${country(r.origin)} → ${country(r.destination)} (${scope(r)}): ${recordName(r)} ${r.value===null?'금액 미확인':num(r.value)+' '+unit(r)} (가격 기준 ${show(r.valuation)}). 출처: ${r.publisher}, ${r.edition}, ${r.retrieved_on} 조회. ${r.source_url}`,
  `${'AB'[i]}. ${r.year}, ${country(r.origin)} → ${country(r.destination)} (${scope(r)}): ${recordName(r)}, ${r.value===null?'amount unavailable':num(r.value)+' '+unit(r)} (valuation: ${show(r.valuation)}). Source: ${r.publisher}, ${r.edition}, retrieved ${r.retrieved_on}. ${r.source_url}`));
 const difference = gap === null
  ? L('비교 조건이 맞지 않거나 금액이 빠진 경우 차액 계산을 보류합니다.','The difference is withheld because the amounts or required comparison conditions do not support calculation.')
  : L(`단순 차액(B−A)은 ${num(gap)} ${unit(a)}입니다. 가격·신고 기준을 조정하지 않은 값이며, 차이의 원인이나 통계 오류는 이 계산으로 판단할 수 없습니다.`,`The unadjusted difference (B−A) is ${num(gap)} ${unit(a)}. Valuation and reporting bases were not adjusted, and the calculation cannot establish causes or statistical errors.`);
 const differences = audit.checks.filter(c=>c.status==='different').map(c=>L(...descriptions[c.key]));
 if(differences.length) records.push(L('서로 다른 조건: ','Conditions that differ: ')+differences.join(', ')+'.');
 const unknown = audit.checks.filter(c=>c.status==='unknown').map(c=>L(...descriptions[c.key]));
 if(unknown.length) records.push(L('확인되지 않은 조건: ','Unconfirmed conditions: ')+unknown.join(', ')+'.');
 if(imported && !imported.verified) records.push(L('불러온 파일의 기록이며, 출처와 금액을 보존 조회본으로 확인하지 못했습니다.','These records came from an imported file and could not be verified against a preserved snapshot.'));
 return [...records,difference].join('\n\n');
}

function builder(){
 const origins=catalog.countries.filter(c=>catalog.records.some(r=>r.origin===c.iso3));
 const destinations=catalog.countries.filter(c=>catalog.records.some(r=>r.origin===state.origin&&r.destination===c.iso3));
 const years=[...new Set(catalog.records.filter(r=>r.origin===state.origin&&r.destination===state.destination).map(r=>r.year))].sort();
 const list=records(),a=list.find(r=>r.id===state.left),b=list.find(r=>r.id===state.right);
 const coverage = [catalog.countries.map(c=>country(c.iso3)).join(' · '),
  [...new Set(catalog.records.map(r=>r.year))].sort().join(' · '), L('연간 상품 전체','Annual totals for all goods')];
 return `<section class="workspace-intro"><h1>${L('무역 기록 대조','Compare trade records')}</h1>
 <p class="hero-sub">${L('같은 교역의 두 기록을 비교하고 인용 근거를 남깁니다.','Compare two records of the same trade flow and keep the evidence for citation.')}</p></section>
 <section class="builder-layout"><div class="builder-panel"><div class="section-heading"><h2>${L('새 대조 만들기','Create a comparison')}</h2></div>
 <p class="coverage">${coverage.map(E).join(' / ')}</p>
 <form id="compare-form"><div class="form-grid"><label>${L('물건을 보내는 나라','Goods leave from')}<select name="origin" id="origin" required>${options(origins.map(c=>[c.iso3,country(c.iso3)]),state.origin,L('나라 선택','Select country'))}</select></label><label>${L('물건을 받는 나라','Goods arrive in')}<select name="destination" id="destination" required ${!state.origin?'disabled':''}>${options(destinations.map(c=>[c.iso3,country(c.iso3)]),state.destination,L('나라 선택','Select country'))}</select></label><label>${L('기준연도','Reference year')}<select name="year" id="year" required ${!state.destination?'disabled':''}>${options(years.map(y=>[y,y]),state.year,L('연도 선택','Select year'))}</select></label><div class="scope-field"><span>${L('지원 범위','Available scope')}</span><strong>${L('상품 전체 · 연간','All goods · annual')}</strong><small>${L('품목별·월별 대조는 아직 제공하지 않습니다.','Product-level and monthly comparisons are not available yet.')}</small></div></div>
 <fieldset class="record-fields" ${!state.year?'disabled':''}><legend>${L('대조할 기록','Records to compare')}</legend><label>${L('기록 A','Record A')}<select id="left" required>${options(list.map(r=>[r.id,label(r)]),state.left,L('기록 선택','Select a record'))}</select></label><label>${L('기록 B','Record B')}<select id="right" required>${options(list.filter(r=>r.id!==state.left).map(r=>[r.id,label(r)]),state.right,L('다른 기록 선택','Select another record'))}</select></label></fieldset>
 ${a&&b?`<p class="source selected-summary">${country(a.origin)} → ${country(a.destination)} · ${a.year} · ${L('기록 A와 B의 가격 기준을 결과에서 점검합니다.','Valuation bases are checked in the results.')}</p>`:''}
 <button type="submit" class="primary" ${!a||!b?'disabled':''}>${L('조건 점검하고 대조하기','Check conditions and compare')}</button></form></div>
 <aside class="builder-aside"><h3>${L('실제 대조 예시','Try a real comparison')}</h3>
 <p>${L('같은 교역을 한국은 수출로, 미국은 수입으로 기록합니다. 두 금액과 가격 기준을 확인해 보세요.','Korea records the flow as an export, and the US as an import. See how their amounts and valuation bases compare.')}</p>
 <a class="example-link" href="${exampleHash}">${L('한국 → 미국 · 2023년','Korea → US · 2023')} <span aria-hidden="true">↗</span></a>
 <div class="aside-links"><button data-action="open">${L('노트 파일 열기','Open a saved note')}</button><a class="source" href="mirrorline-case.html#case/usa-chn-2017">${L('미·중 사례 읽기','Read the US–China case')}</a></div></aside></section>`;

}
function result(){
 const {a,b}=current,r=C.audit(a,b);
 const max = r.blocked ? 0 : Math.max(Number(a.value),Number(b.value));
 const bar = value => r.blocked ? '' : `<div class="amount-track" aria-hidden="true"><span style="width:${max ? Number(value)/max*100 : 0}%"></span></div>`;
 return `<section id="result" class="section result-section"><div class="section-heading"><div><p class="eyeline">${r.comparison_kind==='mirror'?L('같은 교역의 수출·수입 기록 대조','Exporter / importer comparison'):L('같은 흐름의 자료 간 대조','Same-flow source comparison')}</p><h2 tabindex="-1">${country(a.origin)} → ${country(a.destination)} · ${a.year}</h2></div><div class="result-actions"><button data-action="edit">${L('조건 바꾸기','Edit selection')}</button><button data-action="swap">${L('기록 A·B 바꾸기','Swap records A and B')}</button></div></div>
 ${imported?`<div class="note import-banner"><strong>${imported.verified?L('파일의 두 기록이 보존된 서비스 조회본과 일치합니다.','The two file records match a preserved service snapshot.'):L('파일에 담긴 기록을 불러왔습니다. 원자료 진위는 확인하지 않았습니다.','Records loaded from the file. Source authenticity has not been verified.')}</strong><p>${L('검사 결과와 차액은 이 화면에서 다시 계산했습니다.','Conditions and differences have been recalculated here.')}</p><button data-action="recheck">${L('현재 내장자료와 다시 대조','Compare with the current catalog')}</button></div>`:''}
 <div class="record-pair">${[a,b].map((x,i)=>`<article><p class="eyeline">${L('기록','Record')} ${'AB'[i]}</p><h3>${E(recordName(x))}</h3><div class="record-amount">${readable(x.value)} <small>${L('십억','billion')}${x.unit==='1'?'':' × '+E(x.unit)} ${E(x.currency)}</small></div>${bar(x.value)}<p class="exact-amount">${num(x.value)} ${E(x.currency)}${x.unit==='1'?'':' / '+L('단위','unit')+' '+E(x.unit)} · ${E(x.valuation??L('기준 미확인','basis unknown'))}</p><p class="source">${ref(x)}</p><details><summary>${L('자료 상태와 원본 해시','Record flags and source hash')}</summary><p class="source">${L('집계','Aggregate')}: ${show(x.aggregate)} · ${L('직접 신고 플래그','Reported flag')}: ${show(x.reported)}<br>${L('집계 기록을 개별 세관 신고서로 해석하지 않습니다.','Aggregate records are not individual customs declarations.')}<br>SHA-256 <code>${E(x.source_hash)}</code></p></details></article>`).join('')}</div>
 <div class="difference"><div><span>${L('단순 차액 · 기록 B − 기록 A','Unadjusted difference · record B − record A')}</span><strong>${r.gap===null?L('차액 계산 보류','Difference not calculated'):num(r.gap)+' '+E(a.currency)+(a.unit==='1'?'':' / '+L('단위','unit')+' '+E(a.unit))}</strong></div><p>${r.blocked?L('기간·방향·통화·단위·품목이 다르거나 기록이 빠져 있어 차액을 계산하지 않습니다.','A required scope differs or a value is missing, so a difference is not calculated.'):L('가격·신고 기준을 보정하지 않은 산술적 차이입니다. 오류 금액이나 원인 기여액을 뜻하지 않습니다.','An arithmetic difference without valuation or reporting adjustments. It is not an estimate of error or causal contribution.')}</p></div>
 ${conditionSummary(r)}
 <section class="citation-panel"><h3>${L('인용 문장','Citation text')}</h3>
 <button class="primary" data-action="copy">${L('출처와 함께 복사','Copy with sources')}</button>
 <details id="citation-preview"><summary>${L('인용 문장 보기','View citation text')}</summary>
 <textarea id="citation-text" aria-label="${L('복사할 인용 문장','Citation text to copy')}" readonly rows="7">${E(citation(r))}</textarea></details></section>
 <details class="full-audit"><summary>${L('전체 비교 조건 보기','View all comparison conditions')}</summary><p class="source">${L('일치는 해당 항목의 정보가 같다는 뜻입니다. 통계 전체의 정확성을 보증하지 않습니다.','A match means that condition agrees. It does not certify the statistics as a whole.')}</p>
 <div class="audit-list">${r.checks.map(c=>`<article class="audit-row"><h4>${L(...descriptions[c.key])}</h4><div><span>A</span> ${E(show(c.a))}<br><span>B</span> ${E(show(c.b))}</div><strong class="audit-status ${c.status}">${c.status==='match'?L('일치','Match'):c.status==='different'?L('차이 있음','Different'):L('확인 불가','Unknown')}</strong></article>`).join('')}</div>
 <p class="source">${L('자료 발표·개정일, 상대국 지정 기준과 무역 집계 체계는 이 조회 응답만으로 확정하지 않아 ‘확인 불가’로 남깁니다. FOB는 Comtrade 필드 이름이며 미국 원통계의 FAS와 구분합니다.','Data release/revision date, partner attribution, and trade system are not established from these responses and remain unknown. FOB is the Comtrade field label, distinguished from FAS in US national statistics.')} <a target="_blank" rel="noopener noreferrer" href="https://uncomtrade.org/docs/bilateral-asymmetries/">${L('UN 비교 기준 설명','UN comparison guidance')}</a> / <a target="_blank" rel="noopener noreferrer" href="https://www.census.gov/foreign-trade/reference/guides/tradestatsinfo.html">${L('Census 가격 기준','Census valuation')}</a></p>
 </details>
 ${revision?revisionPanel():''}
 <section class="note-editor"><h3>${L('내 근거 노트','My evidence note')}</h3><label for="memo">${L('메모 · 파일에만 저장됩니다','Memo · saved only in the file')}</label><textarea id="memo" maxlength="5000" rows="4" placeholder="${L('어디에 인용할지, 무엇을 더 확인할지 적어 두세요.','Record how you will cite this and what remains to check.')}">${E(memo)}</textarea><div class="button-group"><button class="primary" data-action="save">${L('다시 열 수 있는 노트 저장','Save a reopenable note')}</button><button data-action="csv">${L('정확한 값 CSV','Exact amounts CSV')}</button><button data-action="md">${L('인용용 근거 문서','Evidence document')}</button></div><p class="source">${L('노트 JSON은 금액·조건·출처와 메모를 보존합니다. CSV·문서는 읽기와 인용용입니다. 언어·테마·메모를 브라우저 저장소에 기록하지 않습니다.','Note JSON preserves values, conditions, sources, and your memo. CSV and evidence documents are for reading and citation. Language, theme, and memo are not written to browser storage.')}</p></section></section>`;
}
function revisionPanel(){
 const old=[current.a,current.b],fresh=old.map(r=>catalog.records.find(x=>x.id===r.id));
 return `<div class="revision-panel"><h3>${L('현재 내장자료와의 차이','Changes against the current catalog')}</h3><p>${L('실시간 API 조회가 아닙니다. 파일의 원래 값은 그대로 보존합니다.','This is not a live API query. The original file values stay intact.')}</p>${old.map((r,i)=>{const n=fresh[i],delta=n&&r.currency===n.currency&&r.unit===n.unit?C.subtract(n.value,r.value):null;return `<article><strong>${'AB'[i]} · ${E(r.publisher)}</strong><p>${L('저장된 값','Saved')}: ${num(r.value)} ${E(r.currency)} · ${r.retrieved_on}<br>${L('현재 내장 값','Current catalog')}: ${n?num(n.value)+' '+E(n.currency)+' · '+n.retrieved_on:L('해당 기록 없음','No matching record')}<br>${L('새 값 − 저장 값','Current − saved')}: ${delta===null?L('계산 불가','Not calculated'):num(delta)+' '+E(r.currency)}</p>${n?`<p class="source">${C.sameRecord(r,n)?L('보존된 조건과 금액이 같습니다.','Preserved conditions and amounts match.'):L('금액 또는 조건·출처 정보가 달라졌습니다. 원인이나 개정 내역을 자동 추정하지 않습니다.','Amounts or condition/source metadata differ. No explanation for the change is inferred.')}</p>`:''}</article>`;}).join('')}<p class="source">${L('현재 내장 조회본','Current catalog snapshot')}: ${E(catalog.snapshot_id)}</p></div>`;
}
function infoPage(which){
 const titles={about:[L('숫자와 함께,<br>비교한 근거를 남깁니다.','Keep the comparison<br>behind the number.'),L('과제나 업무에 무역 숫자를 쓰려는 사람이, 비교 조건을 점검하고 출처가 붙은 근거를 저장·재확인하는 도구입니다.','A tool for people using trade numbers in coursework or work to check comparability and preserve source-linked evidence.')],method:[L('계산보다 먼저,<br>비교 조건을 확인합니다.','Check conditions<br>before calculating.'),L('같은 방향·기간·범위인지 점검하고, 가격 기준과 미확인 정보를 구분합니다.','Check direction, period, and scope, while separating valuation differences from missing metadata.')],sources:[L('선택할 수 있는 자료와<br>사용한 조회본.','Available records<br>and preserved snapshots.'),L('수집에 성공한 국가·연도 조합만 제공합니다. 실시간·전 세계 자료가 아닙니다.','Only successfully collected country–year combinations are available. These are not live or worldwide data.')]}[which];
 let body='';
 if(which==='about')body=`<h2>${L('어디서 출발했나','Starting point')}</h2><p>${L('같은 교역을 설명하는 숫자라도 신고국, 포함된 비용, 품목 범위, 자료 시점이 다를 수 있습니다. 미·중 사례를 대조하며 문서의 당시 인용값과 현재 조회값을 바꿔 쓸 수 없다는 문제에서 출발했습니다.','Numbers describing the same trade can differ in reporter, included costs, commodity scope, and vintage. Comparing the US–China case exposed why historical quotations and current extracts are not interchangeable.')}</p><h2>${L('반복해서 할 수 있는 일','A repeatable task')}</h2><ol><li>${L('내가 비교할 기록을 고릅니다.','Choose the records you need.')}</li><li>${L('같은 조건·다른 조건·모르는 조건을 확인합니다.','Check matching, different, and unknown conditions.')}</li><li>${L('근거 노트를 저장하고 다시 열어 같은 결과를 확인합니다.','Save a note and reopen it to reproduce the result.')}</li></ol><h2>${L('다른 서비스와의 역할','Role in Trade Data Lab')}</h2><p>${L('Tradeweave는 거래 상대국과 쏠림, Policyline은 정책 발표 전후의 교역 추이를 다룹니다. 이 도구는 숫자를 인용하기 전 비교 조건과 근거 기록에 집중합니다.','Tradeweave covers partners and concentration; Policyline covers trade around policy announcements. This tool focuses on comparison conditions and evidence records before citation.')}</p><p>${L('실제 이용 수요는 아직 검증되지 않았습니다. 실제 과제·업무에서 비교 실수를 발견하고 근거 노트를 재사용하는지 확인한 뒤 확장합니다.','Demand remains unverified. Expansion depends on whether real coursework and work users find comparison mistakes and reuse the evidence notes.')}</p>`;
 if(which==='method')body=`<h2>${L('공통 기록 형식','Common observation format')}</h2><p>${L('신고국·상대국·실제 교역 방향·기간·품목분류·통화·단위·가격 필드·금액·출처·원본 해시·조회일을 각 기록에 보존합니다. 모르는 정보는 null로 두고 추측하지 않습니다.','Each observation preserves reporter, partner, physical direction, period, classification, currency, unit, valuation field, amount, source, raw hash, and retrieval date. Unknown information stays null.')}</p><h2>${L('계산식과 보류 조건','Arithmetic and blocking conditions')}</h2><p><strong>${L('단순 차액 = 기록 B − 기록 A','Unadjusted difference = record B − record A')}</strong></p><p>${L('방향·기간·품목·통화·단위가 다르면 차액을 계산하지 않습니다. 세부 품목은 분류 판도 일치해야 합니다. 상품 전체에서는 분류 판의 차이 또는 미확인을 그대로 알립니다. 같은 기록을 두 번 선택하거나 값이 빠진 경우도 보류합니다.','Direction, period, commodity, currency, and unit must match for a difference. Detailed commodities also require a matching classification. For all-goods totals, classification differences or unknowns remain visible. Identical records or missing amounts block calculation.')}</p><p>${L('가격 기준이 달라도 미조정 차액은 표시할 수 있지만, 가격 보정·오류 추정·원인 판정으로 해석하지 않습니다. 소수 금액은 자릿수를 맞춘 정수 연산으로 정확히 뺍니다. 그래프용 십억 단위 표시만 반올림합니다.','Different valuations allow an explicitly unadjusted difference, not a valuation correction, error estimate, or causal diagnosis. Decimal subtraction uses aligned integer arithmetic. Only the billion-unit display is rounded.')}</p><h2>${L('조회본과 노트','Snapshots and notes')}</h2><p>${L('조회 날짜와 원본 해시를 기록합니다. Comtrade API가 판 번호를 제공하지 않아 판 번호를 만들어 넣지 않습니다. 서비스가 보존한 조회본에만 접근할 수 있으며 보존하지 않은 과거 값을 복원하지 않습니다.','Retrieval dates and raw hashes identify the inputs. No Comtrade release number is invented. Only snapshots preserved by this service are available; earlier unsaved values cannot be reconstructed.')}</p><p>${L('노트의 계산 결과는 가져오지 않고 저장된 두 관측값으로 재계산합니다. 해시는 파일·조회본을 식별하며 정부 자료의 진위를 보증하는 서명이 아닙니다. 현재 내장자료와 다시 대조할 때도 저장된 값을 덮어쓰지 않습니다.','Imported computed results are ignored and recalculated from the two observations. Hashes identify files and snapshots; they are not government authenticity signatures. Comparing against the current catalog does not overwrite the saved values.')}</p><h2>${L('개인정보와 한계','Privacy and limits')}</h2><p>${L('노트는 브라우저에서만 읽고 내려받습니다. 서버 전송·로그인·방문자 추적·localStorage·AI 해석이 없습니다. 현재는 연간 상품 전체만 지원하며 정치적 해석·통계 신뢰도 등급·원인 기여액은 제공하지 않습니다.','Notes are read and downloaded locally in the browser. No uploads, login, tracking, localStorage, or AI interpretation. Current coverage is annual all-goods totals, without political interpretation, statistical reliability grades, or causal attribution.')}</p><p><a href="https://uncomtrade.org/docs/bilateral-asymmetries/" target="_blank" rel="noopener noreferrer">UN Comtrade · Bilateral asymmetries</a><br><a href="https://uncomtrade.org/docs/data-availability/" target="_blank" rel="noopener noreferrer">UN Comtrade · Data availability and revisions</a></p>`;
 if(which==='sources'){
 const seen=new Set(),unique=catalog.records.filter(r=>{const k=r.source_url+r.source_hash;if(seen.has(k))return false;seen.add(k);return true;});
 body=`<h2>${L('지원 범위','Supported scope')}</h2><p>${catalog.countries.map(c=>country(c.iso3)).join(' · ')}<br>${[...new Set(catalog.records.map(r=>r.year))].sort().join(' · ')} · ${L('연간 · 상품 전체','annual · all goods')}</p><p class="source">${L('현재 조회본 식별자','Current snapshot ID')}<br><code>${E(catalog.snapshot_id)}</code></p>${unique.map(r=>`<section class="source-item"><h2>${E(r.publisher)} · ${country(r.reporter)} · ${r.year}</h2><p class="source">${ref(r)}<br>SHA-256 <code>${E(r.source_hash)}</code></p></section>`).join('')}<p><a href="https://uncomtrade.org/docs/policy-on-comtrade-data-use/" target="_blank" rel="noopener noreferrer">UN Comtrade · Policy on data use</a></p>`;
 }
 return `<article class="prose"><h1>${titles[0]}</h1><p class="lead">${titles[1]}</p>${body}<p><a href="#/">${L('새 대조 만들기','Create a comparison')}</a></p></article>`;
}
function fillDefaults(){const rs=records();if(!rs.find(r=>r.id===state.left))state.left=rs.find(r=>r.flow==='X'&&r.publisher==='UN Comtrade')?.id||rs.find(r=>r.flow==='X')?.id||rs[0]?.id||'';if(state.right===state.left||!rs.find(r=>r.id===state.right))state.right=rs.find(r=>r.flow==='M'&&r.publisher==='UN Comtrade'&&r.id!==state.left)?.id||rs.find(r=>r.flow==='M'&&r.id!==state.left)?.id||rs.find(r=>r.id!==state.left)?.id||'';}
function buildHash(){const p=new URLSearchParams({from:state.origin,to:state.destination,year:state.year,a:state.left,b:state.right});return '#compare?'+p;}
function render(scroll=false){
 if(!catalog)return;
 const raw=location.hash.slice(1),[route,query='']=raw.split('?');
 if(route==='content'){$('#content').focus();return;}
 if(['about','method','sources'].includes(route)){$('#content').innerHTML=infoPage(route);chrome();if(scroll)window.scrollTo({top:0,behavior:'instant'});return;}
 let warning='';
 if(route==='compare'){
 const p=new URLSearchParams(query),a=catalog.records.find(r=>r.id===p.get('a')),b=catalog.records.find(r=>r.id===p.get('b'));
 if(a&&b&&a.id!==b.id&&a.origin===p.get('from')&&a.destination===p.get('to')&&String(a.year)===p.get('year')){
 Object.assign(state,{origin:a.origin,destination:a.destination,year:String(a.year),left:a.id,right:b.id});current={a,b,snapshot:catalog.snapshot_id};imported=null;
 }else{current=null;warning=L('이 주소의 기록을 사용할 수 없습니다. 지원 목록에서 다시 선택해 주세요.','The linked records are unavailable. Choose from the supported catalog.');}
 }else if(route!=='note'){current=null;imported=null;revision=false;if(!['','/'].includes(route))warning=L('이 주소의 대조는 제공하지 않습니다. 지원 목록에서 선택해 주세요.','This comparison is unavailable. Choose from the supported catalog.');}
 $('#content').innerHTML=(warning?`<p class="note" role="alert">${warning}</p>`:'')+builder()+(current?result():route==='note'?`<p class="note">${L('새로고침하면 파일을 다시 열어 주세요. 노트는 브라우저 저장소에 보관하지 않습니다.','After a refresh, reopen the note file. Notes are not stored in browser storage.')}</p>`:'');
 chrome();if(scroll&&current)requestAnimationFrame(()=>{
  $('#result')?.scrollIntoView({block:'start',behavior:'instant'});
  $('#result h2')?.focus({preventScroll:true});
 });else if(scroll)window.scrollTo({top:0,behavior:'instant'});
}
function getNote(){if(!current)throw Error('selection');return C.makeNote(current.a,current.b,current.snapshot,memo,imported?.note.created_at);}
function evidence(n){const r=C.audit(...n.observations);return `# CrossCite — ${L('무역 데이터 대조 근거','Trade comparison evidence')}\n\n${n.observations.map((x,i)=>`${'AB'[i]}: ${x.publisher} / ${x.reporter} ${x.flow} / ${x.origin} → ${x.destination} / ${x.year} / ${x.commodity}\n${x.value??L('기록 없음','No record')} ${x.currency} (unit ${x.unit}); ${x.valuation??'unknown'}\nSource: ${x.source_url}\nEdition: ${x.edition}; retrieved: ${x.retrieved_on}\nSHA-256: ${x.source_hash}`).join('\n\n')}\n\nB − A: ${r.gap??L('계산 보류','Not calculated')} ${r.gap===null?'':r.a.currency}\n${L('가격 기준 미조정 차액이며 원인·오류를 입증하지 않는다.','Unadjusted difference; it does not establish causation or error.')}\n\n## ${L('조건 점검','Conditions')}\n${r.checks.map(c=>`- ${L(...descriptions[c.key])}: ${c.status}; A=${show(c.a)}, B=${show(c.b)}`).join('\n')}\n\n## ${L('사용자 메모','User memo')}\n${n.memo}\n\nSnapshot: ${n.snapshot_id}\nSaved: ${n.created_at}\n`;}
function download(kind){const n=getNote(),text=kind==='json'?JSON.stringify(n,null,2):kind==='csv'?C.csv(n):evidence(n);const blob=new Blob([text],{type:kind==='json'?'application/json;charset=utf-8':kind==='csv'?'text/csv;charset=utf-8':'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`crosscite-note-${n.observations[0].origin}-${n.observations[0].destination}-${n.observations[0].year}.${kind}`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);message(L('출처와 비교 조건을 포함한 파일을 내려받았습니다.','The file includes source and condition information.'));}
async function copyCitation(){
 const text = citation(C.audit(current.a,current.b));
 try {
  await navigator.clipboard.writeText(text);
  message(L('출처가 포함된 인용 문장을 복사했습니다.','Citation text with sources copied.'));
 } catch {
  const preview = $('#citation-preview');
  if (!preview) return;
  preview.open = true;
  const field = $('#citation-text');
  field.focus();
  field.select();
  message(L('자동 복사를 사용할 수 없습니다. 선택한 문장을 직접 복사하세요.','Automatic copy is unavailable. Copy the selected text manually.'));
 }
}
let timer;function message(s){clearTimeout(timer);$('#message').textContent=s;$('#message').hidden=false;timer=setTimeout(()=>$('#message').hidden=true,5000);}
async function openNote(file){
 const seq=++importSeq;
 try{
 if(!file||file.size>200000)throw Error('size');const n=C.readNote(await file.text());
 let stored=catalog;if(n.snapshot_id!==catalog.snapshot_id){try{const res=await fetch('data/workbench/snapshots/'+n.snapshot_id+'.json');if(!res.ok)throw Error();stored=await res.json();}catch{stored=null;}}
 const verified=stored?.snapshot_id===n.snapshot_id&&n.observations.every(r=>stored.records.some(x=>x.id===r.id&&C.sameRecord(x,r)));
 if(seq!==importSeq)return;
 imported={note:n,verified};current={a:n.observations[0],b:n.observations[1],snapshot:n.snapshot_id};memo=n.memo;revision=false;
 if(location.hash==='#note')render(true);else location.hash='#note';
 }catch{message(L('노트 형식·금액·출처를 확인하지 못했습니다. 올바른 노트 JSON을 선택해 주세요. 현재 작업은 유지됩니다.','Invalid note format, amount, or source. Select a valid note JSON. Your current work is preserved.'));}
 finally{if(seq===importSeq)$('#note-file').value='';}
}
const m=matchMedia('(prefers-color-scheme: dark)');document.documentElement.dataset.theme=m.matches?'dark':'light';m.addEventListener('change',e=>{if(!manualTheme){document.documentElement.dataset.theme=e.matches?'dark':'light';if(catalog)chrome();}});
$('.skip').addEventListener('click',e=>{e.preventDefault();$('#content').focus();$('#content').scrollIntoView({block:'start'});});
$('#language').addEventListener('click',()=>{lang=lang==='ko'?'en':'ko';if(catalog)render();else{chrome();if(loadError)showLoadError();}});
$('#theme').addEventListener('click',()=>{manualTheme=true;document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';chrome();});
document.addEventListener('input',e=>{if(e.target.id==='memo')memo=e.target.value;});
document.addEventListener('change',e=>{
 const id=e.target.id;if(id==='note-file'){openNote(e.target.files[0]);return;}
 if(!['origin','destination','year','left','right'].includes(id))return;
 state[id]=e.target.value;if(id==='origin')Object.assign(state,{destination:'',year:'',left:'',right:''});if(id==='destination')Object.assign(state,{year:'',left:'',right:''});if(id==='year')Object.assign(state,{left:'',right:''});if(state.year)fillDefaults();current=null;imported=null;revision=false;
 // Keep a partially edited comparison local; do not leak memo or file content into the address.
 history.replaceState(null,'','#/');render();$('#'+id)?.focus();
});
document.addEventListener('submit',e=>{if(e.target.id!=='compare-form')return;e.preventDefault();memo='';revision=false;const hash=buildHash();if(location.hash===hash)render(true);else location.hash=hash;});
document.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b)return;const action=b.dataset.action;
 if(action==='edit') { $('#origin').focus(); }
 if(action==='copy') copyCitation();
 if(action==='open')$('#note-file').click();if(action==='save')download('json');if(action==='csv')download('csv');if(action==='md')download('md');
 if(action==='swap'&&current){const old=current.a;current.a=current.b;current.b=old;if(imported){imported.note.observations=[current.a,current.b];render();}else{state.left=current.a.id;state.right=current.b.id;location.hash=buildHash();}}
 if(action==='recheck'){revision=true;render();$('#result')?.scrollIntoView({block:'start',behavior:'instant'});}
 if(action==='retry')location.reload();
});
window.addEventListener('hashchange',()=>render(true));
function showLoadError(){$('#content').innerHTML=`<article class="prose"><h1>${L('자료 목록을 불러오지 못했습니다.','The catalog could not be loaded.')}</h1><p>${L('자료를 대신 만들지 않습니다. 연결을 확인한 뒤 다시 시도해 주세요.','No substitute data are invented. Check the connection and retry.')}</p><button data-action="retry">${L('다시 불러오기','Retry')}</button></article>`;}
fetch('data/workbench/catalog.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{if(d.schema_version!==1||!/^[a-f0-9]{64}$/.test(d.snapshot_id)||!Array.isArray(d.records)||!d.records.length)throw Error();d.records=d.records.map(C.validateRecord);if(new Set(d.records.map(r=>r.id)).size!==d.records.length)throw Error();catalog=d;render(true);}).catch(()=>{loadError=true;showLoadError();});
})();
