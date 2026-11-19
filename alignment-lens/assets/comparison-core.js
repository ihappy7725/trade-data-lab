(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TradeCompare=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const fields=['id','origin','destination','reporter','partner','flow','year','frequency','commodity','classification','currency','unit','valuation','value','publisher','retrieved_on','edition','source_url','source_hash','reported','aggregate','original_classification','partner_basis','trade_system','released_on'];
const decimal=/^\d{1,60}(?:\.\d{1,30})?$/;
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
const str=(v,max=200)=>typeof v==='string'&&v.length>0&&v.length<=max;
function validateRecord(x){
 if(!x||typeof x!=='object'||Array.isArray(x))throw Error('record');
 const r=Object.fromEntries(fields.map(k=>[k,x[k]??null]));
 for(const k of ['origin','destination','reporter','partner'])if(!/^[A-Z]{3}$/.test(r[k]||''))throw Error('country');
 if(r.origin===r.destination||!['X','M'].includes(r.flow)||!((r.flow==='X'&&r.reporter===r.origin&&r.partner===r.destination)||(r.flow==='M'&&r.reporter===r.destination&&r.partner===r.origin)))throw Error('direction');
 if(!Number.isInteger(r.year)||r.year<1900||r.year>2200||r.frequency!=='A')throw Error('period');
 for(const k of ['id','commodity','currency','unit','publisher','edition'])if(!str(r[k]))throw Error(k);
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(r.id)||!/^\d+$/.test(r.unit)||BigInt(r.unit)<1n)throw Error('id/unit');
 if(r.value!==null&&(typeof r.value!=='string'||!decimal.test(r.value)))throw Error('amount');
 if(r.released_on!==null&&!validDate(r.released_on))throw Error('release date');
 if(!validDate(r.retrieved_on)||!str(r.source_url,2000)||!str(r.source_hash,64)||!/^[a-f0-9]{64}$/.test(r.source_hash))throw Error('provenance');
 const u=new URL(r.source_url);if(u.protocol!=='https:'||u.username||u.password||!['comtradeapi.un.org','www.census.gov','www2.census.gov'].includes(u.hostname))throw Error('source');
 for(const k of ['classification','valuation','partner_basis','trade_system'])if(r[k]!==null&&!str(r[k]))throw Error(k);
 for(const k of ['reported','aggregate','original_classification'])if(r[k]!==null&&typeof r[k]!=='boolean')throw Error(k);
 return r;
}
function subtract(b,a){
 if(a===null||b===null)return null;
 if(!decimal.test(a)||!decimal.test(b))throw Error('decimal');
 const places=Math.max((a.split('.')[1]||'').length,(b.split('.')[1]||'').length);
 const fixed=s=>{const [i,f='']=s.split('.');return BigInt(i+f.padEnd(places,'0'));};
 const v=fixed(b)-fixed(a),neg=v<0n,digits=(neg?-v:v).toString().padStart(places+1,'0');
 let text=places?digits.slice(0,-places)+'.'+digits.slice(-places):digits;
 if(text.includes('.'))text=text.replace(/0+$/,'').replace(/\.$/,'');
 return (neg&&v!==0n?'-':'')+text;
}
function audit(a,b){
 a=validateRecord(a);b=validateRecord(b);
 const checks=[];
 const check=(key,av,bv,blocking=false)=>checks.push({key,a:av,b:bv,status:av===null||bv===null?'unknown':av===bv?'match':'different',blocking});
 check('direction',a.origin+'/'+a.destination,b.origin+'/'+b.destination,true);
 check('period',a.year+'/'+a.frequency,b.year+'/'+b.frequency,true);
 check('commodity',a.commodity,b.commodity,true);
 check('currency',a.currency,b.currency,true);check('unit',a.unit,b.unit,true);
 check('classification',a.classification,b.classification,a.commodity!=='TOTAL'||b.commodity!=='TOTAL');
 check('valuation',a.valuation,b.valuation);
 check('vintage',a.retrieved_on,b.retrieved_on);check('release',a.released_on,b.released_on);check('partner_basis',a.partner_basis,b.partner_basis);check('trade_system',a.trade_system,b.trade_system);
 check('original_classification',a.original_classification,b.original_classification);
 const available=a.value!==null&&b.value!==null;
 const blocked=checks.some(c=>c.blocking&&c.status!=='match')||a.id===b.id||!available;
 return {a,b,checks,blocked,gap:blocked?null:subtract(b.value,a.value),comparison_kind:a.flow!==b.flow?'mirror':'same-flow',missing:!available};
}
function makeNote(a,b,snapshot,memo='',created=new Date().toISOString()){
 if(!/^[a-f0-9]{64}$/.test(snapshot)||typeof memo!=='string'||memo.length>5000)throw Error('note');
 const result=audit(a,b);return {format:'trade-comparison-note',schema_version:1,snapshot_id:snapshot,created_at:created,memo,observations:[result.a,result.b]};
}
function readNote(value){
 if(typeof value!=='string'||value.length>200000)throw Error('file size');
 const n=JSON.parse(value);
 if(!n||n.format!=='trade-comparison-note'||n.schema_version!==1||!Array.isArray(n.observations)||n.observations.length!==2||typeof n.memo!=='string'||n.memo.length>5000||!str(n.created_at,40)||Number.isNaN(Date.parse(n.created_at))||!/^[a-f0-9]{64}$/.test(n.snapshot_id))throw Error('note format');
 const observations=n.observations.map(validateRecord);
 // Ignore any imported computed results: derive all conditions and arithmetic afresh.
 return {...makeNote(observations[0],observations[1],n.snapshot_id,n.memo,n.created_at)};
}
const sameRecord=(a,b)=>JSON.stringify(validateRecord(a))===JSON.stringify(validateRecord(b));
function csv(note){
 const n=readNote(JSON.stringify(note)),r=audit(...n.observations);
 const header=['kind','record_id','origin','destination','year','flow','publisher','valuation','currency','unit','value','source_url','source_hash','retrieved_on','edition','condition_key','condition_status','condition_a','condition_b','snapshot_id','saved_at'];
 const rows=n.observations.map((x,i)=>({kind:'observation',record_id:'AB'[i]+':'+x.id,...x,snapshot_id:n.snapshot_id,saved_at:n.created_at}));
 rows.push({kind:'unadjusted_difference',record_id:'B-A',origin:r.a.origin,destination:r.a.destination,year:r.a.year,currency:r.a.currency,unit:r.a.unit,value:r.gap,source_url:r.a.source_url+' | '+r.b.source_url,source_hash:r.a.source_hash+' | '+r.b.source_hash,snapshot_id:n.snapshot_id,saved_at:n.created_at});
 rows.push({kind:'calculation_status',value:r.blocked?'not calculated':'unadjusted difference only',snapshot_id:n.snapshot_id});
 for(const c of r.checks)rows.push({kind:'condition',condition_key:c.key,condition_status:c.status,condition_a:c.a,condition_b:c.b,snapshot_id:n.snapshot_id});
 const cell=value=>{let s=String(value??'');if(/^[=+@\t\r-]/.test(s)&&!(/^-?\d+(?:\.\d+)?$/).test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 return '\uFEFF'+[header,...rows.map(row=>header.map(k=>row[k]))].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}

return {validateRecord,subtract,audit,makeNote,readNote,sameRecord,csv,validDate};
});
