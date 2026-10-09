import {test} from 'node:test';
import assert from 'node:assert/strict';
import {syncOrganization,validCronAuthorization} from '../api-lib/zoho-sync.js';
import handler from '../api/zoho/[action].js';
test('scheduled synchronization rejects missing and incorrect credentials',async()=>{
 const secret='a'.repeat(48);
 assert.equal(validCronAuthorization(undefined,secret),false);
 assert.equal(validCronAuthorization('Bearer wrong',secret),false);
 assert.equal(validCronAuthorization(`Bearer ${secret}`,undefined),false);
 assert.equal(validCronAuthorization(`Bearer ${secret}`,secret),true);
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test';process.env.CRON_SECRET=secret;
 const saved=global.fetch;global.fetch=()=>{throw new Error('Must not call external services');};
 const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
 try{await handler({method:'GET',query:{action:'scheduled-sync'},headers:{}},res);assert.equal(res.code,401);}finally{global.fetch=saved;}
});
function database(lease=true){
 const writes=[],imports=[];
 return {writes,imports,from(table){const query={
  upsert(value){writes.push({table,value});return query;},update(value){writes.push({table,value});return query;},
  eq(){return query;},lt(){return query;},select(){return query;},maybeSingle(){return Promise.resolve({data:lease?{resource:'contacts',page:1}:null});},
  then(resolve,reject){return Promise.resolve({error:null}).then(resolve,reject);}
 };return query;},async rpc(name,args){imports.push(args.p_contact.contact_id);return {data:'linked'};}};
}
test('imports every contact page, then both document types and records completion',async()=>{
 const client=database();const calls=[];
 const books=async(access,path)=>{calls.push(path);if(path.startsWith('contacts?')){
  const page=new URLSearchParams(path.split('?')[1]).get('page');return {contacts:[{contact_id:page,contact_type:'customer'}],page_context:{has_more_page:page==='1'}};
 }return {[path.startsWith('invoices')?'invoices':'estimates']:[{id:'doc'}]};};
 const result=await syncOrganization(client,'org','access',books,(org,type)=>({organization_id:org,document_type:type}));
 assert.equal(result.completed,true);assert.deepEqual(client.imports,['1','2']);assert.equal(calls.length,4);
 assert.ok(client.writes.some(w=>w.value.last_completed_at));
 assert.equal(client.writes.at(-1).value.locked_until,'1970-01-01T00:00:00Z');
});
test('concurrent run does not fetch or import anything',async()=>{
 const client=database(false);const result=await syncOrganization(client,'org','access',()=>{throw new Error('Unexpected fetch');},()=>{});
 assert.equal(result.busy,true);assert.equal(client.imports.length,0);
});
test('failed page records an error and releases lease without advancing cursor',async()=>{
 const client=database();await assert.rejects(syncOrganization(client,'org','access',async()=>{throw new Error('Failure');},()=>{}));
 assert.ok(client.writes.some(w=>w.value.last_error));assert.ok(!client.writes.some(w=>w.value.page));
 assert.equal(client.writes.at(-1).value.locked_until,'1970-01-01T00:00:00Z');
});
