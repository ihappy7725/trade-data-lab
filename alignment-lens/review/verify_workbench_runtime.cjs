const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),C=require('../assets/comparison-core.js'),cat=JSON.parse(fs.readFileSync(path.join(root,'data/workbench/catalog.json')));
const nodes=new Map(),events={},requests=[];
function node(key){if(!nodes.has(key))nodes.set(key,{textContent:'',innerHTML:'',dataset:{},hidden:true,value:'',handlers:{},addEventListener(name,fn){this.handlers[name]=fn;},setAttribute(){},focus(){},scrollIntoView(){}});return nodes.get(key);}
const context={TradeCompare:C,document:{documentElement:{dataset:{}},querySelector:node,querySelectorAll:()=>[],addEventListener:(k,fn)=>events[k]=fn},matchMedia:()=>({matches:false,addEventListener(){}}),location:{hash:'#/'},history:{replaceState(_a,_b,hash){context.location.hash=hash;}},window:{addEventListener(){},scrollTo(){}},URL,URLSearchParams,Intl,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:fn=>fn(),fetch:async url=>{requests.push(url);assert.ok(url.startsWith('data/workbench/'));return {ok:true,json:async()=>structuredClone(cat)};}};
for(const target of [context,context.window])Object.defineProperty(target,'localStorage',{get(){throw Error('Storage access is blocked');}});
const script=fs.readFileSync(path.join(root,'assets/workbench.js'),'utf8').replace(/\}\)\(\);\s*$/,'globalThis.test={render,openNote,getNote,evidence,setLang:v=>{lang=v}};})();');
vm.createContext(context);vm.runInContext(script,context);
(async()=>{
 for(let i=0;i<12;i++)await Promise.resolve();
 const t=context.test;
 for(const lang of ['ko','en']){t.setLang(lang);for(const hash of ['#/','#compare?from=KOR&to=USA&year=2023&a=un-KOR-USA-2023-X&b=un-USA-KOR-2023-M','#about','#method','#sources']){context.location.hash=hash;t.render();assert.ok(node('#content').innerHTML.length>500);assert.doesNotMatch(node('#content').innerHTML,/undefined|NaN/);if(lang==='en')assert.doesNotMatch(node('#content').innerHTML,/[가-힣]/);}}
 t.setLang('en');context.location.hash='#compare?from=KOR&to=USA&year=2023&a=un-KOR-USA-2023-X&b=un-USA-KOR-2023-M';t.render();
 const n=t.getNote();n.memo='<img src=x onerror=alert(1)>';await t.openNote({size:JSON.stringify(n).length,text:async()=>JSON.stringify(n)});context.location.hash='#note';t.render();
 assert.ok(node('#content').innerHTML.includes('&lt;img'));assert.ok(!node('#content').innerHTML.includes('<img src=x'));
 const before=JSON.stringify(t.getNote());await t.openNote({size:20,text:async()=>'{bad'});assert.equal(JSON.stringify(t.getNote()),before);
 assert.ok(t.evidence(t.getNote()).includes(n.observations[0].source_url));assert.ok(t.evidence(t.getNote()).includes(n.observations[0].value));
 assert.equal(requests.length,1);
 console.log('PASS: bilingual runtime routes; disabled storage; local-only fetch; escaped memo; failed import preserves work; evidence provenance');
})().catch(e=>{console.error(e);process.exitCode=1;});
