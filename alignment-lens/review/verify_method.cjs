const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),code=html.match(/function methodMarkup\([^]*?\n(?=function sourcesMarkup)/)[0];
const meta=JSON.parse(fs.readFileSync('data/meta.json','utf8')),ex=meta.method_example;
const A=JSON.parse(fs.readFileSync('data/country/KOR.json')),B=JSON.parse(fs.readFileSync('data/country/CHN.json')),index=A.years.indexOf(ex.year);
assert.equal(ex.score_a,A.score[index]);assert.equal(ex.score_b,B.score[index]);assert.equal(ex.distance,A.partners.CHN.dist[index]);assert.equal(ex.source_file,meta.sources.unga.filename);assert.equal(ex.source_version,meta.sources.unga.version);
const context={state:{meta:structuredClone(meta)},L:(ko,en)=>en,escapeHtml:s=>String(s),name:c=>({KOR:'South Korea',CHN:'China'}[c]||c),number:v=>v.toFixed(2),sourceU:()=>`UNGA ${meta.sources.unga.version}`,sourceT:()=>`BACI ${meta.sources.baci.version}`,sourceCaptions:()=>'<p>Sources</p>'};vm.createContext(context);vm.runInContext(code,context);
const rendered=vm.runInContext('methodMarkup()',context);assert.ok(rendered.includes('|1.00 − (-0.80)| ≈ 1.80'));assert.ok(rendered.includes('What does diplomatic distance mean here?'));
delete context.state.meta.method_example;const fallback=vm.runInContext('methodMarkup()',context);assert.ok(fallback.includes('What does diplomatic distance mean here?'));assert.ok(!fallback.includes('class="method-example"'));
console.log('PASS: real method scores and source match the validated country files; rounded equation; missing old metadata renders without crashing');
