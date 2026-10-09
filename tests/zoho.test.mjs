import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/zoho/[action].js';
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-server-key';
function response(){return {code:200,setHeader(){},status(n){this.code=n;return this;},json(v){this.body=v;return this;},send(v){this.body=v;return this;},end(){return this;}};}
test('rejects unauthenticated requests without network access',async()=>{
 const saved=global.fetch;global.fetch=()=>{throw new Error('Unexpected network');};
 try{const res=response();await handler({query:{action:'documents'},headers:{},method:'POST'},res);assert.equal(res.code,401);}finally{global.fetch=saved;}
});
test('rejects callback without a state and code',async()=>{
 const res=response();await handler({query:{action:'callback'},headers:{},method:'GET'},res);assert.equal(res.code,400);
});
test('callback only accepts GET',async()=>{
 const res=response();await handler({query:{action:'callback'},headers:{},method:'POST'},res);assert.equal(res.code,405);
});
test('sales representatives cannot access the accounting integration',async()=>{
 const saved=global.fetch;global.fetch=async url=>new Response(JSON.stringify(String(url).includes('/auth/v1/user')?{id:'user-1'}:{organization_id:'org-1',role:'sales_rep'}),{status:200,headers:{'Content-Type':'application/json'}});
 try{const res=response();await handler({query:{action:'status'},headers:{authorization:'Bearer test'},method:'POST'},res);assert.equal(res.code,401);}finally{global.fetch=saved;}
});
test('rejects a cross-site request from an authenticated manager',async()=>{
 const saved=global.fetch;global.fetch=async url=>new Response(JSON.stringify(String(url).includes('/auth/v1/user')?{id:'user-1'}:{organization_id:'org-1',role:'manager'}),{status:200,headers:{'Content-Type':'application/json'}});
 try{const res=response();await handler({query:{action:'status'},headers:{authorization:'Bearer test',origin:'https://other.example'},method:'POST'},res);assert.equal(res.code,403);}finally{global.fetch=saved;}
});
