const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const script=html.match(/<script id="app-script">([\s\S]*?)<\/script>/)[1];
const meta=JSON.parse(fs.readFileSync('data/meta.json'));const A=JSON.parse(fs.readFileSync('data/country/KOR.json')),B=JSON.parse(fs.readFileSync('data/country/CHN.json'));
const context={Intl,state:{lang:'en',meta,pair:{a:'KOR',b:'CHN',A,B}},sourceU:()=>`UNGA ${meta.sources.unga.version}`,sourceT:()=>`BACI HS92 ${meta.sources.baci.version}`};vm.createContext(context);
const number=script.match(/const number=([^\n]+);/)[1];vm.runInContext('var number='+number,context);
for(const fn of ['withUnit','makePairCsv','pathFor']){const match=script.match(new RegExp('function '+fn+'\\([^]*?\\n(?=function |let |const |async function )'));if(!match)throw Error('Missing '+fn);vm.runInContext(match[0],context)}
const csv=vm.runInContext('makePairCsv()',context);fs.writeFileSync('review/pair-export-current.csv',csv);
const lines=csv.trim().split(/\r?\n/).filter(l=>!l.replace(/^\uFEFF/,'').startsWith('#'));const head=lines.shift().split(',');const parse=line=>line.match(/"(?:[^"]|"")*"|(?<=,|^)(?=,|$)/g)?.map(s=>s.replace(/^"|"$/g,'').replace(/""/g,'"'));
assert.equal(lines.length,A.years.length);let comparisons=0;
lines.forEach((line,i)=>{const cells=parse(line);assert.equal(cells.length,head.length);const row=Object.fromEntries(head.map((key,j)=>[key,cells[j]]));for(const[key,value]of Object.entries({year:A.years[i],distance:A.partners.CHN.dist[i],agreement_0_to_1:A.partners.CHN.agreement[i],share_a_pct:A.partners.CHN.share[i],share_b_pct:B.partners.KOR.share[i],share_export_a_pct:A.partners.CHN.share_export[i],share_import_a_pct:A.partners.CHN.share_import[i]})){assert.equal(row[key],value===null?'':String(value));comparisons++}assert.equal(row.unga_version,'39.0');assert.equal(row.baci_version,'V202601')});
assert.equal(vm.runInContext('number(0.0001,3)',context),'<0.001');assert.equal(vm.runInContext('number(-0.0001,3)',context),'−<0.001');
assert.equal(vm.runInContext('pathFor([1,null,2,3],["a","a","a","b"],i=>i,v=>v)',context).trim(),'M0.00,1.00 M2.00,2.00 M3.00,3.00');
assert.deepEqual(JSON.parse(fs.readFileSync('data/interpretations.json')),{});
console.log(`PASS: current CSV ${lines.length} years, ${comparisons} numeric matches; source releases; missing cells; three-decimal bounds; null/scope SVG breaks; empty interpretations`);
