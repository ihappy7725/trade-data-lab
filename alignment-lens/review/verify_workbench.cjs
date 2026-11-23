const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),C=require('../assets/comparison-core.js'),cat=JSON.parse(fs.readFileSync(path.join(root,'data/workbench/catalog.json')));
const checked=cat.records.map(C.validateRecord);const original=JSON.parse(fs.readFileSync(path.join(root,'data/workbench/snapshots/bc3fcd2a96675ebd32144f8662f2338985b23a6df489a6e064b44bbb9a3d5cab.json')));
for(const record of original.records) assert.deepEqual(checked.find(r=>r.id===record.id),C.validateRecord(record));
assert.ok(checked.length>original.records.length);
assert.deepEqual([...new Set(checked.filter(r=>r.commodity==='TOTAL').map(r=>r.year))].sort(),[2017,2018,2019,2020,2021,2022,2023]);
for(const r of checked.filter(r=>r.commodity!=='TOTAL')){
 assert.ok(['84','85','87'].includes(r.commodity));
 assert.ok(r.original_classification);
 assert.ok(checked.some(x=>x.origin===r.origin&&x.destination===r.destination&&x.year===r.year&&x.commodity===r.commodity&&x.classification===r.classification&&x.flow!==r.flow));
}
let comparisons=0,notes=0;
for(const a of checked){for(const b of checked){if(a.id===b.id||a.origin!==b.origin||a.destination!==b.destination||a.year!==b.year||a.commodity!==b.commodity)continue;
 const result=C.audit(a,b);assert.equal(result.blocked,false);assert.equal(result.gap,(BigInt(b.value)-BigInt(a.value)).toString());
 const n=C.makeNote(a,b,cat.snapshot_id,'메모 <script>alert(1)</script>');const opened=C.readNote(JSON.stringify({...n,computed_gap:'999',checks:[]}));assert.deepEqual(opened,n);
 assert.ok(C.sameRecord(opened.observations[0],a));assert.equal(C.audit(...opened.observations).gap,result.gap);assert.ok(C.csv(n).includes(a.source_url));
 assert.ok(result.checks.find(c=>c.key==='partner_basis').status==='unknown');comparisons++;notes++;
}}
const a=checked.find(r=>r.id==='un-CHN-USA-2017-X'),b=checked.find(r=>r.id==='un-USA-CHN-2017-M');
assert.equal(C.audit(a,b).gap,'95436567946');
for(const field of ['year','commodity','currency','unit']){const x={...b,[field]:field==='year'?2018:field==='unit'?'1000':field==='commodity'?'01':'EUR'};assert.equal(C.audit(a,x).gap,null);}
assert.equal(C.audit(a,{...b,value:null}).gap,null);assert.equal(C.audit({...a,value:'0'},{...b,value:'0'}).gap,'0');
assert.equal(C.audit(a,{...b,valuation:null}).checks.find(x=>x.key==='valuation').status,'unknown');
assert.equal(C.audit(a,a).blocked,true);
assert.equal(C.subtract('1.00','0.99999999999999999999'),'0.00000000000000000001');assert.equal(C.subtract('0','1.1'),'-1.1');assert.equal(C.subtract('100000000000000000000000000001','100000000000000000000000000000'),'1');
const note=C.makeNote(a,b,cat.snapshot_id,'saved');
for(const mutate of [n=>n.schema_version=9,n=>n.observations[0].value='NaN',n=>n.observations[0].value='-1',n=>n.observations[0].source_url='javascript:alert(1)',n=>n.observations[0].source_url='https://fake.example/',n=>n.observations[0].retrieved_on='2026-02-31',n=>n.observations[0].flow='M',n=>n.memo='x'.repeat(5001),n=>n.observations=[]]){const x=JSON.parse(JSON.stringify(note));mutate(x);assert.throws(()=>C.readNote(JSON.stringify(x)));}
assert.throws(()=>C.readNote('x'.repeat(200001)));assert.throws(()=>C.readNote('{bad'));
const changed={...a,value:C.subtract(a.value,'1')};assert.equal(C.sameRecord(a,changed),false);assert.equal(C.subtract(changed.value,a.value),'-1');assert.equal(note.observations[0].value,a.value);
fs.writeFileSync(path.join(__dirname,'workbench-roundtrip.json'),JSON.stringify(note,null,2));
fs.writeFileSync(path.join(__dirname,'workbench-export.csv'),C.csv(note));
const report={records:checked.length,directed_comparisons:comparisons,note_roundtrips:notes,decimal_precision:true,mismatch_and_missing_blocked:true,zero_preserved:true,untrusted_note_validation:true,imported_computed_values_ignored:true,status:'passed'};
fs.writeFileSync(path.join(__dirname,'workbench-core-check.json'),JSON.stringify(report,null,2));console.log(report);
