const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const storage = new Map();
function setup() {
  const context = {window:{}, Intl, Date, localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},document:{dispatchEvent(){}},CustomEvent:class {}};
  vm.createContext(context);
  for(const path of ['event-sample-data.js','event-record-store.js'])vm.runInContext(fs.readFileSync(path,'utf8'),context);
  return context;
}
const app = setup(), rows = app.window.EVENT_SEARCH_ROWS;
const grouped = new Map();
for(const r of rows) {const key=JSON.stringify([r.occurredAt.slice(0,10),r.transactionCode,r.errorCode]);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(r);}
assert.equal(rows.length,94); assert.equal(grouped.size,11);
assert.equal(new Set(rows.map(r=>r.rawId)).size,94);
assert.equal(new Set(rows.map(r=>r.globalId)).size,94);
const today=app.window.ERROR_BOARD_ROWS;
assert.equal(today.length,28);
assert.ok(today.every(r=>!r.batchGroupId && rows.includes(r)));
const previous=[...grouped.values()].find(g=>g.length===12 && g[0].batchGroupId);
const patterns=new Map();for(const r of previous){if(!patterns.has(r.batchGroupId))patterns.set(r.batchGroupId,[]);patterns.get(r.batchGroupId).push(r);}
assert.equal([...patterns.values()].map(g=>g.length).join(','),'8,3,1');
const same=[...patterns.values()][0]; assert.notEqual(same[0].errorDetailMessage,same[1].errorDetailMessage);assert.equal(same[0].normalizedError,same[1].normalizedError);
assert.notEqual(previous[0].batchGroupId,previous.at(-1).batchGroupId);
const raw=today[0], sibling=today[1];
app.window.EventRecordStore.save([raw],{actionContent:'test raw only',actionOwner:'tester',status:'조치중'});
assert.equal(rows.find(r=>r.rawId===raw.rawId).actionContent,'test raw only');assert.notEqual(sibling.actionContent,'test raw only');
const restored=setup().window.EVENT_SEARCH_ROWS.find(r=>r.rawId===raw.rawId);assert.equal(restored.actionContent,'test raw only');
app.window.EventRecordStore.save(previous.slice(0,3),{status:'결재요청'});assert.ok(previous.slice(0,3).every(r=>r.status==='결재요청'));assert.equal(previous[3].status,'미조치');
app.localStorage.setItem=()=>{throw Error('quota')};assert.throws(()=>app.window.EventRecordStore.save([sibling],{status:'결재요청'}));assert.notEqual(sibling.status,'결재요청');
console.log('PASS: diverse grouping, normalized patterns, shared raw identity, isolated persistence, reload, bulk approval, storage failure');
