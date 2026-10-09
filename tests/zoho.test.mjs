import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
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
test('reuses encrypted access token for repeated searches and sends the supported name filter',async()=>{
 const key=crypto.randomBytes(32),iv=crypto.randomBytes(12),enc=crypto.createCipheriv('aes-256-gcm',key,iv);
 const value=Buffer.concat([enc.update('test-access-token'),enc.final()]);
 process.env.ZOHO_TOKEN_ENCRYPTION_KEY=key.toString('base64');
 const encrypted=[iv,enc.getAuthTag(),value].map(v=>v.toString('base64')).join('.');
 const saved=global.fetch;let searches=0;
 global.fetch=async raw=>{
  const url=new URL(raw);let data;
  if(url.pathname==='/auth/v1/user')data={id:'user-1'};
  else if(url.pathname.includes('crm_user_profiles'))data={organization_id:'org-1',role:'manager'};
  else if(url.pathname.includes('zoho_connections'))data={encrypted_access_token:encrypted,access_token_expires_at:new Date(Date.now()+3600000).toISOString()};
  else if(url.pathname==='/books/v3/contacts'){assert.equal(url.searchParams.get('contact_name_contains'),'Jorge');searches++;data={code:0,contacts:[{contact_id:'123',contact_name:'Jorge'}],page_context:{has_more_page:false}};}
  else throw new Error('Unexpected token refresh or request');
  return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{for(let i=0;i<2;i++){const res=response();await handler({query:{action:'contacts'},headers:{authorization:'Bearer test'},method:'POST',body:{search:'Jorge'}},res);assert.equal(res.code,200);assert.equal(res.body.contacts[0].name,'Jorge');}assert.equal(searches,2);}finally{global.fetch=saved;}
});
