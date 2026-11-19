// Verify the actual app's exporters and bilingual routes without a browser or network.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),fixture=JSON.parse(fs.readFileSync(path.join(root,'data/cases/usa-chn-2017.json'),'utf8'));
const source=fs.readFileSync(path.join(root,'assets/mirrorline.js'),'utf8');
const nodes=new Map();
const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{textContent:'',innerHTML:'',hidden:true,dataset:{},setAttribute(){},toggleAttribute(){},addEventListener(){},focus(){},scrollIntoView(){}});return nodes.get(selector);};
const context={document:{documentElement:{dataset:{}},querySelector:node,querySelectorAll:()=>[],title:'',addEventListener(){}},matchMedia:()=>({matches:false,addEventListener(){}}),location:{hash:'#/',reload(){}},window:{addEventListener(){},scrollTo(){}},fetch:async()=>({ok:true,json:async()=>fixture}),requestAnimationFrame:fn=>fn(),setTimeout:()=>0,clearTimeout(){},Intl,console,navigator:{}};
Object.defineProperty(context,'localStorage',{get(){throw Error('Storage is disabled');}});
vm.createContext(context);
const instrumented=source.replace(/\}\)\(\);\s*$/, 'globalThis.test={csv,markdown,citation,casePage,comparison,aboutPage,methodPage,sourcesPage,render,setLang:v=>{lang=v},setFlow:v=>{flowId=v}};})();');
vm.runInContext(instrumented,context);
function parseCSV(text){return text.replace(/^\uFEFF/,'').trim().split('\r\n').map(line=>{const cells=[];let value='',quoted=false;for(let i=0;i<line.length;i++){if(line[i]==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(line[i]===','&&!quoted){cells.push(value);value='';}else value+=line[i];}cells.push(value);return cells;});}
(async()=>{
 for(let i=0;i<8;i++)await Promise.resolve();
 const t=context.test,rows=parseCSV(t.csv()),headers=rows.shift(),objects=rows.map(r=>Object.fromEntries(headers.map((k,i)=>[k,r[i]])));
 assert.equal(objects.length,12);
 for(const r of fixture.records){const out=objects.find(o=>o.kind==='comtrade_aggregate'&&o.reporter===r.reporter&&o.flow===r.flow);assert.equal(out.value_usd,r.value_usd);assert.equal(out.valuation,r.basis);assert.equal(out.retrieved_on,fixture.retrieved_on);assert.match(out.source,/^https:\/\//);}
 for(const f of fixture.flows){const out=objects.find(o=>o.kind==='unadjusted_import_minus_export'&&o.flow===f.id);const ex=fixture.records.find(r=>r.id===f.export_id),im=fixture.records.find(r=>r.id===f.import_id);assert.equal(BigInt(im.value_usd)-BigInt(ex.value_usd),BigInt(out.value_usd));}
 assert.equal(BigInt(fixture.census.import_usd)-BigInt(fixture.census.export_usd),BigInt(fixture.census.deficit_usd));
 const quote=objects.filter(o=>o.kind==='historical_quote');assert.deepEqual(quote.map(x=>x.value_usd),['375200000000','275800000000','395800000000']);
 for(const l of ['ko','en']){t.setLang(l);for(const view of ['case','about','method','sources']){context.location.hash=view==='case'?'#case/usa-chn-2017':'#'+view;t.render();const html=node('#content').innerHTML;assert.ok(html.length>1000);if(l==='en')assert.doesNotMatch(html,/[가-힣]/);assert.doesNotMatch(html,/undefined|NaN|Infinity|\.\.\//);}
  for(const direction of ['chn-usa','usa-chn']){t.setFlow(direction);const f=fixture.flows.find(x=>x.id===direction);assert.ok(t.citation().includes(BigInt(f.gap_usd).toLocaleString(l==='ko'?'ko-KR':'en-US')));assert.ok(t.markdown().includes(f.gap_usd));}
 }
 fs.writeFileSync(path.join(__dirname,'mirrorline-export-check.csv'),t.csv());
 fs.writeFileSync(path.join(__dirname,'mirrorline-evidence-check.md'),t.markdown());
 const report={checked_on:'2026-11-19',csv_rows:objects.length,exact_comtrade_records:4,exact_directional_differences:2,historical_quotations:3,census_reference_records:3,bilingual_routes:8,storage_disabled:true,status:'passed'};
 fs.writeFileSync(path.join(__dirname,'mirrorline-logic-check.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;});
