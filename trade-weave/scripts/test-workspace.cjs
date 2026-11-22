/* Run: node scripts/test-workspace.cjs. No browser or dependencies required. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const base = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(base, 'assets/app.js'), 'utf8');
const studio = fs.readFileSync(path.join(base, 'assets/studio.js'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(base, 'data/catalog.json')));
const math = require('../assets/analysis.js');

// Exercise the shipped functions, including the old-link recovery branch.
function functionSource(source, name) {
  const start = source.indexOf('  function ' + name + '(');
  assert.ok(start >= 0, 'Missing function: ' + name);
  const end = source.indexOf('\n  function ', start + 1);
  assert.ok(end > start);
  return source.slice(start, end);
}
const state = {iso:'KOR', flow:'export', partner:'CHN', section:'partners',
  tab:'partners', year:2024, compareYear:2023, product:'8542', peers:['JPN','S19']};
const historyCalls = [];
const location = {hash:''};
const context = vm.createContext({CATALOG:catalog, selection:state, URLSearchParams,
  location, history:Object.fromEntries(['pushState','replaceState'].map(method =>
    [method, (_, unused, hash) => { historyCalls.push(method); location.hash = hash; }]))});
for (const name of ['normalize','canonicalCode','defaultCompare','scopedPath','resultRoute',
  'rows','oppositeFlow','partnerRelationship','fmtPct','fmtUsd']) {
  vm.runInContext(functionSource(app, name), context);
}
const aliasesStart = app.indexOf('  var aliases =');
vm.runInContext(app.slice(aliasesStart, app.indexOf('\n  function nameOf', aliasesStart)), context);
const methodSource = name => {
  const start = app.indexOf('    ' + name + ': function');
  const end = app.indexOf('\n    },', start) + 7;
  return app.slice(start, end);
};
vm.runInContext('var handlers = {' + methodSource('setTab') + methodSource('matchesCountry') + '};', context);
const handlers = context.handlers;
handlers.setTab('countries');
assert.equal(state.section, '');
assert.equal(new URLSearchParams(location.hash.split('?')[1]).get('tab'), 'countries');
assert.ok(!location.hash.includes('/partners'));
assert.equal(historyCalls.at(-1), 'pushState');
const callCount = historyCalls.length;
handlers.setTab('countries');
assert.equal(historyCalls.length, callCount, 'Same tab must not add history');
handlers.setTab('countries', ['USA','CHN']);
assert.equal(historyCalls.at(-1), 'replaceState');
assert.equal(new URLSearchParams(location.hash.split('?')[1]).get('peers'), 'USA,CHN');
for (const [section, expectedTab] of [['partners','partners'],['comparison','trends'],['sources','trends']]) {
  const route = context.resultRoute('KOR','export',section,'CHN');
  const params = new URLSearchParams(route.split('?')[1]);
  assert.equal(params.get('tab') || 'trends', expectedTab);
}
const recoveryStart = app.indexOf('      // Recover links saved');
const recoveryEnd = app.indexOf('      var context =', recoveryStart);
const recover = vm.runInContext('(function(match,parameters,tab,name){' +
  app.slice(recoveryStart,recoveryEnd) + ';return {section:match[3],name};})', context);
assert.equal(recover(['','KOR','export','partners'],new URLSearchParams('tab=countries'),'countries','see/KOR/export/partners').section,'');
assert.equal(recover(['','KOR','export','partners'],new URLSearchParams(),'trends','see/KOR/export/partners').section,'partners');
assert.equal(recover(['','KOR','export','partners'],new URLSearchParams('tab=partners'),'partners','see/KOR/export/partners').section,'partners');
assert.equal(handlers.matchesCountry('CHN','chn'),true);
assert.equal(handlers.matchesCountry('LIE','CHN'),false);
assert.equal(handlers.matchesCountry('S19','TWN'),true);
assert.equal(handlers.matchesCountry('KOR','한국'),true);
assert.equal(handlers.matchesCountry('CHN',''),true);

const api = {state, catalog, rows:context.rows, relationship:context.partnerRelationship,
  usd:context.fmtUsd, pct:context.fmtPct};
context.api = api;
context.math = math;
for (const name of ['selectedCountries','comparisonMatrix','numberExplanation'])
  vm.runInContext(functionSource(studio,name), context);
let matrices = 0, missing = 0, numericChecks = 0;
for (const product of ['all','27','8542']) {
  api.series = Object.fromEntries(catalog.years.map(year => [year,
    JSON.parse(fs.readFileSync(path.join(base,'data',catalog.datasets[year+'/'+product])))]));
  for (const year of catalog.years) for (const flow of ['export','import']) {
    Object.assign(state,{year,compareYear:year===2022?2023:2022,flow,product,partner:'CHN',peers:['JPN','S19']});
    context.TRADE = api.series[year];
    const matrix = context.comparisonMatrix();
    assert.equal(matrix.countries.length,3);
    const field = flow === 'export' ? 'x' : 'm';
    const expected = new Set(matrix.countries.flatMap(code => api.series[year].countries[code][field].map(row=>row[0])));
    expected.add('CHN');
    assert.equal(matrix.rows.length,expected.size);
    for (const row of matrix.rows) row.cells.forEach((cell,index) => {
      const code = matrix.countries[index];
      const vector = api.series[year].countries[code][field];
      const raw = vector.find(entry=>entry[0]===row.code);
      if (!raw || code===row.code) { assert.equal(cell,null); missing++; }
      else {
        assert.equal(cell.v,raw[1]);
        assert.equal(cell.p,raw[1]/vector.reduce((sum,entry)=>sum+entry[1],0)*100);
        assert.equal(cell.rank,vector.indexOf(raw)+1);
      }
    });
    matrices++;
    for (const partner of ['CHN','USA','PRK']) {
      state.partner = partner;
      const explanation = context.numberExplanation();
      const old = context.partnerRelationship('KOR',flow,partner,api.series[state.compareYear]);
      const now = context.partnerRelationship('KOR',flow,partner,api.series[year]);
      if (!old.row || !now.row) assert.equal(explanation,null);
      else {
        const expectedGrowth = math.signed((now.row.v/old.row.v-1)*100,'%');
        assert.equal(explanation.rows[2][1],expectedGrowth);
        assert.equal(explanation.rows[2][3],math.signed(now.baseShare-old.baseShare,'%p'));
        numericChecks++;
      }
    }
    const before = context.rows('KOR',flow,api.series[state.compareYear]);
    const after = context.rows('KOR',flow,api.series[year]);
    const changes = math.changes(before,after);
    const union = new Set([...before.list,...after.list].map(row=>row.iso));
    assert.equal(changes.common.length+changes.entered.length+changes.absent.length,union.size);
    changes.entered.forEach(row=>assert.equal(row.before,undefined));
    changes.absent.forEach(row=>assert.equal(row.after,undefined));
  }
}
// Minimal DOM doubles cover pagination/filter boundaries without browser automation.
const element = () => ({value:'',children:[],dataset:{},style:{},
  append(...items){this.children.push(...items);},
  appendChild(item){this.children.push(item);},
  replaceChildren(...items){this.children=items;},
  setAttribute(){},addEventListener(){}});
const elements = Object.fromEntries(['change-list','change-query','change-direction','change-min',
  'change-sort','change-count','change-page','change-prev','change-next','change-all'].map(id=>[id,element()]));
elements['change-direction'].value='all';
elements['change-sort'].value='gain';
context.$ = id=>elements[id];
context.node = (tag,cls,text)=>Object.assign(element(),{textContent:text,className:cls});
api.name = code=>catalog.countries[code].ko;
api.matchesCountry = handlers.matchesCountry;
context.changeData = math.changes(context.rows('KOR','export',api.series[2023]), context.rows('KOR','export',api.series[2024]));
context.changePage=0;
context.showAllChanges=false;
const renderStart=studio.indexOf('  function renderChangeRows()');
vm.runInContext(studio.slice(renderStart,studio.indexOf('\n  ["change-sort"',renderStart)),context);
context.renderChangeRows();
assert.equal(elements['change-list'].children.length,15);
assert.equal(elements['change-prev'].disabled,true);
context.changePage=999;
context.renderChangeRows();
assert.equal(context.changePage,Math.ceil(context.changeData.common.length/15)-1);
assert.equal(elements['change-next'].disabled,true);
context.showAllChanges=true;
context.renderChangeRows();
assert.equal(elements['change-list'].children.length,context.changeData.common.length);
elements['change-query'].value='CHN';
elements['change-direction'].value='down';
context.renderChangeRows();
assert.equal(elements['change-list'].children.length,1);
assert.equal(elements['change-list'].children[0].dataset.partner,'CHN');
elements['change-min'].value='3';
context.renderChangeRows();
assert.equal(elements['change-list'].children[0].textContent,'조건에 맞는 상대국이 없습니다.');
console.log(JSON.stringify({result:'pass',routeRestore:'pass',exactCountrySearch:'pass',
  paginationAndFilters:'pass',matrices,missingCells:missing,numericExplanations:numericChecks},null,2));
