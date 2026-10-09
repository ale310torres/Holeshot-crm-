import {test} from 'node:test';
import assert from 'node:assert/strict';
import {intakeWindow,loadIntakeLeads} from '../src/utils/intake.js';
test('rolling windows preserve the dashboard cutoff and reject unsupported periods',()=>{
 for(const days of [1,7,30]){
  const result=intakeWindow(String(days),'2026-10-09T23:00:00Z');
  assert.equal(Date.parse(result.end)-Date.parse(result.start),days*86400000);
  assert.equal(result.end,'2026-10-09T23:00:00.000Z');
 }
 assert.equal(intakeWindow('90'),null);
});
test('fetches all intake pages with organization, timestamp and Zoho exclusion filters',async()=>{
 const calls=[];let ranges=0;
 const client={from(table){calls.push(['from',table]);const q={select(){return q;},eq(...args){calls.push(['eq',...args]);return q;},or(...args){calls.push(['or',...args]);return q;},gte(...args){calls.push(['gte',...args]);return q;},lte(...args){calls.push(['lte',...args]);return q;},order(){return q;},async range(start,end){calls.push(['range',start,end]);ranges++;return {data:Array.from({length:ranges===1?500:1},(_,i)=>({id:start+i}))};}};return q;}};
 const window=intakeWindow(7,'2026-10-09T23:00:00Z');
 const result=await loadIntakeLeads(client,'org',window);
 assert.equal(result.length,501);assert.equal(ranges,2);
 assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='organization_id'&&c[2]==='org'));
 assert.ok(calls.some(c=>c[0]==='gte'&&c[2]===window.start));assert.ok(calls.some(c=>c[0]==='lte'&&c[2]===window.end));
 assert.ok(calls.some(c=>c[0]==='or'&&c[1].includes('Zoho Books')));
});
